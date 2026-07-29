import { execFile, spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  mkdir,
  readFile,
  rm,
  writeFile,
  stat
} from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { scanConversations } from "./cli.js";
import { conversationStatePage } from "./page-scripts.js";
import { SafariBridge } from "./safari.js";

const execFileAsync = promisify(execFile);
const SOURCE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIRECTORY = path.resolve(SOURCE_DIRECTORY, "..");
const WEB_DIRECTORY = path.join(PROJECT_DIRECTORY, "web");
const CLI_PATH = path.join(PROJECT_DIRECTORY, "bin", "xhs-chat-export.js");
const DEFAULT_EXPORTS_DIRECTORY = path.join(PROJECT_DIRECTORY, "exports");
const MAX_BODY_BYTES = 1_000_000;
const CHATLAB_TYPES = new Set([
  0, 1, 2, 3, 4, 5, 7, 8, 20, 21, 22, 23, 24, 25, 26, 27, 80, 81, 99
]);

const STATIC_FILES = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]]
]);

function json(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(`${JSON.stringify(payload)}\n`);
}

function safeFilenamePart(value) {
  const cleaned = String(value || "")
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 80);
  return cleaned || "conversation";
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw new Error("请求内容过大");
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw new Error("请求不是有效的 JSON");
  }
}

function normalizeKind(kind) {
  if (kind === "group") {
    return "group";
  }
  if (kind === "c2c" || kind === "private") {
    return "private";
  }
  return "";
}

function validateExportRequest(value) {
  if (!value || typeof value !== "object") {
    throw new Error("缺少导出设置");
  }
  const conversationId = String(value.conversationId || "").trim();
  if (!/^[0-9a-f]{8,64}$/i.test(conversationId)) {
    throw new Error("会话 ID 无效");
  }
  const conversationName = String(value.conversationName || conversationId).trim();
  if (!conversationName || conversationName.length > 120) {
    throw new Error("会话名称无效");
  }
  const kind = normalizeKind(value.kind);
  if (!kind) {
    throw new Error("会话类型无效");
  }
  const selfName = String(value.selfName || "我").trim();
  if (!selfName || selfName.length > 100) {
    throw new Error("自己的显示名称无效");
  }
  const start = value.allHistory ? "" : String(value.start || "").trim();
  const end = value.allHistory ? "" : String(value.end || "").trim();
  if (start.length > 64 || end.length > 64) {
    throw new Error("时间参数过长");
  }
  const messageTypes = Array.isArray(value.messageTypes)
    ? Array.from(new Set(value.messageTypes.map(Number)))
    : [];
  if (
    messageTypes.length === 0 ||
    messageTypes.some((type) => !Number.isInteger(type) || !CHATLAB_TYPES.has(type))
  ) {
    throw new Error("请至少选择一种有效消息类型");
  }
  const maxPages = Number(value.maxPages || (value.allHistory ? 2000 : 500));
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 10_000) {
    throw new Error("最大加载页数必须在 1 到 10000 之间");
  }
  return {
    conversationId,
    conversationName,
    kind,
    selfName,
    start,
    end,
    messageTypes,
    maxPages,
    embedAvatars: Boolean(value.embedAvatars),
    downloadMedia: Boolean(value.downloadMedia)
  };
}

function publicJob(job) {
  const result = {
    id: job.id,
    status: job.status,
    stage: job.stage,
    conversationName: job.conversationName,
    createdAt: job.createdAt,
    loadedMessages: job.loadedMessages,
    earliestLoaded: job.earliestLoaded,
    assetProgress: job.assetProgress,
    avatarProgress: job.avatarProgress,
    error: job.error || null
  };
  if (job.result) {
    result.result = job.result;
  }
  return result;
}

function parseProgressLine(job, line) {
  const progress = line.match(/已加载\s+(\d+)\s+条 DOM 消息，最早\s+(.+)$/);
  if (progress) {
    job.stage = "loading-history";
    job.loadedMessages = Number(progress[1]);
    job.earliestLoaded = progress[2].trim();
    return;
  }
  const mediaProgress = line.match(/媒体下载\s+(\d+)\/(\d+)$/);
  if (mediaProgress) {
    job.stage = "downloading-media";
    job.assetProgress = {
      completed: Number(mediaProgress[1]),
      total: Number(mediaProgress[2])
    };
    return;
  }
  const avatarProgress = line.match(/头像下载\s+(\d+)\/(\d+)$/);
  if (avatarProgress) {
    job.stage = "embedding-avatars";
    job.avatarProgress = {
      completed: Number(avatarProgress[1]),
      total: Number(avatarProgress[2])
    };
  }
}

async function runExportJob(job, settings, exportsDirectory) {
  job.status = "running";
  job.stage = "opening-conversation";
  await mkdir(exportsDirectory, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseName = `xiaohongshu-${safeFilenamePart(settings.conversationName)}-${timestamp}`;
  const jobDirectory = path.join(exportsDirectory, ".jobs", job.id);
  const archiveRoot = path.join(jobDirectory, baseName);
  const jsonFilename = settings.downloadMedia ? "chatlab.json" : `${baseName}.chatlab.json`;
  const jsonPath = settings.downloadMedia
    ? path.join(archiveRoot, jsonFilename)
    : path.join(exportsDirectory, jsonFilename);
  const mediaDirectory = path.join(archiveRoot, "media");
  if (settings.downloadMedia) {
    await mkdir(archiveRoot, { recursive: true });
  }

  const argumentsList = [
    CLI_PATH,
    "--conversation",
    settings.conversationId,
    "--kind",
    settings.kind,
    "--self-name",
    settings.selfName,
    "--message-types",
    settings.messageTypes.join(","),
    "--max-pages",
    String(settings.maxPages),
    "--output",
    jsonPath,
    "--force"
  ];
  if (settings.embedAvatars) {
    argumentsList.push("--embed-avatars");
  }
  if (settings.downloadMedia) {
    argumentsList.push(
      "--download-media",
      "--media-directory",
      mediaDirectory
    );
  }
  if (settings.start) {
    argumentsList.push("--start", settings.start);
  }
  if (settings.end) {
    argumentsList.push("--end", settings.end);
  }

  const child = spawn(process.execPath, argumentsList, {
    cwd: PROJECT_DIRECTORY,
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stdout = "";
  let stderr = "";
  let stderrRemainder = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout = `${stdout}${chunk}`.slice(-32_000);
  });
  child.stderr.on("data", (chunk) => {
    stderr = `${stderr}${chunk}`.slice(-32_000);
    const combined = stderrRemainder + chunk;
    const lines = combined.split(/\r?\n/);
    stderrRemainder = lines.pop() || "";
    for (const line of lines) {
      parseProgressLine(job, line);
    }
  });

  const exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
  if (stderrRemainder) {
    parseProgressLine(job, stderrRemainder);
  }
  if (exitCode !== 0) {
    throw new Error(
      stderr.match(/错误：(.+)/)?.[1] ||
      stdout.match(/错误：(.+)/)?.[1] ||
      `导出进程退出，状态码 ${exitCode}`
    );
  }

  job.stage = "validating";
  const source = await readFile(jsonPath, "utf8");
  const data = JSON.parse(source);
  let outputPath = jsonPath;
  let filename = jsonFilename;
  let mediaSummary = null;
  if (settings.downloadMedia) {
    const manifest = JSON.parse(
      await readFile(path.join(mediaDirectory, "manifest.json"), "utf8")
    );
    mediaSummary = manifest.summary;
    await writeFile(
      path.join(archiveRoot, "README.txt"),
      [
        "小红书聊天本地归档",
        "",
        "chatlab.json        ChatLab v0.0.2 聊天记录",
        "media/              下载成功的图片、表情、卡片封面和音视频",
        "media/manifest.json 原始 URL、本地路径、文件哈希与失败记录",
        "",
        "chatlab.json 的消息 content 同时保留原始 URL 与 ZIP 内本地路径。",
        "请妥善保管，其中可能包含私人聊天内容。"
      ].join("\n"),
      { encoding: "utf8", mode: 0o600 }
    );
    job.stage = "packaging";
    filename = `${baseName}.zip`;
    outputPath = path.join(exportsDirectory, filename);
    await execFileAsync(
      "/usr/bin/zip",
      ["-r", "-q", outputPath, baseName],
      { cwd: jobDirectory }
    );
    await rm(jobDirectory, { recursive: true, force: true });
  }
  job.outputPath = outputPath;
  const fileStats = await stat(outputPath);
  const firstMessage = data.messages[0];
  const lastMessage = data.messages.at(-1);
  job.result = {
    filename,
    fileSize: fileStats.size,
    messageCount: data.messages.length,
    memberCount: data.members.length,
    firstTimestamp: firstMessage.timestamp,
    lastTimestamp: lastMessage.timestamp,
    meta: data.meta,
    packageType: settings.downloadMedia ? "zip" : "json",
    embeddedAvatarCount:
      data.members.filter((member) => member.avatar?.startsWith("data:image/")).length +
      (data.meta.groupAvatar?.startsWith("data:image/") ? 1 : 0),
    media: mediaSummary,
    downloadUrl: `/api/jobs/${job.id}/download`
  };
  job.status = "completed";
  job.stage = "completed";
}

async function serveStatic(pathname, response) {
  const definition = STATIC_FILES.get(pathname);
  if (!definition) {
    return false;
  }
  const [filename, contentType] = definition;
  const source = await readFile(path.join(WEB_DIRECTORY, filename));
  response.writeHead(200, {
    "Content-Type": contentType,
    "Content-Length": source.length,
    "Cache-Control": "no-cache",
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY"
  });
  response.end(source);
  return true;
}

export function createAppServer({
  exportsDirectory = DEFAULT_EXPORTS_DIRECTORY,
  bridge = new SafariBridge()
} = {}) {
  const token = randomBytes(24).toString("hex");
  const jobs = new Map();

  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      if (request.method === "GET" && (await serveStatic(url.pathname, response))) {
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/config") {
        json(response, 200, { token });
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/status") {
        try {
          const state = await bridge.runPageFunction(conversationStatePage);
          json(response, 200, {
            connected: Boolean(state.messageListReady),
            state: {
              id: state.id,
              name: state.name,
              kind: normalizeKind(state.kind),
              messageCount: state.messageCount
            }
          });
        } catch (error) {
          json(response, 200, {
            connected: false,
            error: error.message
          });
        }
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/conversations") {
        const items = (await scanConversations(bridge))
          .filter((item) => ["c2c", "group"].includes(item.kind))
          .map((item) => ({
            id: item.id,
            name: item.name,
            kind: normalizeKind(item.kind),
            active: item.active
          }));
        json(response, 200, { conversations: items });
        return;
      }

      const downloadMatch = url.pathname.match(/^\/api\/jobs\/([0-9a-f-]+)\/download$/);
      if (request.method === "GET" && downloadMatch) {
        const job = jobs.get(downloadMatch[1]);
        if (!job || job.status !== "completed" || !job.outputPath) {
          json(response, 404, { error: "导出文件不存在" });
          return;
        }
        const fileStats = await stat(job.outputPath);
        response.writeHead(200, {
          "Content-Type":
            job.result.packageType === "zip"
              ? "application/zip"
              : "application/json; charset=utf-8",
          "Content-Length": fileStats.size,
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(job.result.filename)}`,
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff"
        });
        createReadStream(job.outputPath).pipe(response);
        return;
      }

      const jobMatch = url.pathname.match(/^\/api\/jobs\/([0-9a-f-]+)$/);
      if (request.method === "GET" && jobMatch) {
        const job = jobs.get(jobMatch[1]);
        if (!job) {
          json(response, 404, { error: "导出任务不存在" });
          return;
        }
        json(response, 200, { job: publicJob(job) });
        return;
      }

      if (request.method === "POST") {
        if (request.headers["x-xhs-exporter-token"] !== token) {
          json(response, 403, { error: "本地会话令牌无效" });
          return;
        }
        if (url.pathname === "/api/open-login") {
          await execFileAsync("open", [
            "-a",
            "Safari",
            "https://www.xiaohongshu.com/chat"
          ]);
          json(response, 200, { opened: true });
          return;
        }
        if (url.pathname === "/api/export") {
          if (
            Array.from(jobs.values()).some((job) =>
              ["queued", "running"].includes(job.status)
            )
          ) {
            json(response, 409, { error: "已有导出任务正在运行，请等待完成" });
            return;
          }
          const settings = validateExportRequest(await readJsonBody(request));
          const job = {
            id: randomUUID(),
            status: "queued",
            stage: "queued",
            conversationName: settings.conversationName,
            createdAt: Date.now(),
            loadedMessages: 0,
            earliestLoaded: null,
            assetProgress: null,
            avatarProgress: null,
            error: null,
            result: null,
            outputPath: null
          };
          jobs.set(job.id, job);
          setImmediate(() => {
            runExportJob(job, settings, exportsDirectory).catch((error) => {
              job.status = "failed";
              job.stage = "failed";
              job.error = error.message;
            });
          });
          json(response, 202, { job: publicJob(job) });
          return;
        }
        if (url.pathname.match(/^\/api\/jobs\/[0-9a-f-]+\/reveal$/)) {
          const id = url.pathname.split("/")[3];
          const job = jobs.get(id);
          if (!job || job.status !== "completed" || !job.outputPath) {
            json(response, 404, { error: "导出文件不存在" });
            return;
          }
          await execFileAsync("open", ["-R", job.outputPath]);
          json(response, 200, { revealed: true });
          return;
        }
      }

      json(response, 404, { error: "页面或接口不存在" });
    } catch (error) {
      json(response, 500, { error: error.message });
    }
  });

  return { server, token, jobs };
}

export async function startAppServer({
  host = "127.0.0.1",
  port = 4177,
  openBrowser = true,
  exportsDirectory = DEFAULT_EXPORTS_DIRECTORY
} = {}) {
  const app = createAppServer({ exportsDirectory });
  await new Promise((resolve, reject) => {
    app.server.once("error", reject);
    app.server.listen(port, host, resolve);
  });
  const address = app.server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  const url = `http://${host}:${actualPort}`;
  if (openBrowser && process.platform === "darwin") {
    await execFileAsync("open", [url]);
  }
  return { ...app, url };
}
