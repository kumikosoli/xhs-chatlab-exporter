import { strToU8, zipSync } from "fflate";

import { sha256Hex } from "../src/sha256.js";
import { toChatLab } from "../src/xhs.js";

const MIME_EXTENSIONS = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/gif", ".gif"],
  ["image/webp", ".webp"],
  ["image/avif", ".avif"],
  ["video/mp4", ".mp4"],
  ["video/webm", ".webm"],
  ["audio/mpeg", ".mp3"],
  ["audio/mp4", ".m4a"],
  ["audio/ogg", ".ogg"],
  ["audio/wav", ".wav"]
]);
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const MAX_MEDIA_BYTES = 200 * 1024 * 1024;
const MAX_ARCHIVE_BYTES = 768 * 1024 * 1024;

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

function normalizedMimeType(value) {
  return String(value || "").split(";")[0].trim().toLocaleLowerCase();
}

function sniffMimeType(bytes, declaredType, sourceUrl) {
  const declared = normalizedMimeType(declaredType);
  if (MIME_EXTENSIONS.has(declared)) {
    return declared;
  }
  if (bytes.length >= 12) {
    if (bytes[0] === 0xff && bytes[1] === 0xd8) {
      return "image/jpeg";
    }
    if (bytes[0] === 0x89 && String.fromCharCode(...bytes.slice(1, 4)) === "PNG") {
      return "image/png";
    }
    if (String.fromCharCode(...bytes.slice(0, 3)) === "GIF") {
      return "image/gif";
    }
    if (
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    ) {
      return "image/webp";
    }
    if (String.fromCharCode(...bytes.slice(4, 8)) === "ftyp") {
      return declared.startsWith("audio/") ? "audio/mp4" : "video/mp4";
    }
  }
  try {
    const extension = new URL(sourceUrl).pathname.split(".").at(-1)?.toLocaleLowerCase();
    for (const [mimeType, candidate] of MIME_EXTENSIONS) {
      if (candidate.slice(1) === extension) {
        return mimeType;
      }
    }
  } catch {
    // The URL was already validated before download.
  }
  return declared || "application/octet-stream";
}

async function readWithLimit(response, maxBytes) {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) {
    throw new Error(`资源超过大小限制（${declaredLength} bytes）`);
  }
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > maxBytes) {
      throw new Error(`资源超过大小限制（>${maxBytes} bytes）`);
    }
    return bytes;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error(`资源超过大小限制（>${maxBytes} bytes）`);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function fetchAsset(sourceUrl, maxBytes) {
  let parsed;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    throw new Error("资源 URL 无效");
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`不支持的资源协议：${parsed.protocol}`);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(parsed.href, {
      credentials: "omit",
      redirect: "follow",
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`下载失败（HTTP ${response.status}）`);
    }
    const bytes = await readWithLimit(response, maxBytes);
    if (bytes.length === 0) {
      throw new Error("资源内容为空");
    }
    const contentType = sniffMimeType(
      bytes,
      response.headers.get("content-type"),
      parsed.href
    );
    return {
      bytes,
      contentType,
      extension: MIME_EXTENSIONS.get(contentType) || ".bin",
      sha256: sha256Hex(bytes)
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function mapConcurrent(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, Math.max(1, items.length)) },
      () => runWorker()
    )
  );
  return results;
}

function bytesToDataUrl(bytes, contentType) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return `data:${contentType};base64,${btoa(binary)}`;
}

async function embedAvatars(rawMessages, conversationAvatar, onProgress) {
  const urls = Array.from(
    new Set([
      conversationAvatar,
      ...rawMessages.map((message) => message.avatar)
    ].filter(Boolean))
  );
  let completed = 0;
  const results = await mapConcurrent(urls, 5, async (sourceUrl) => {
    try {
      const asset = await fetchAsset(sourceUrl, MAX_AVATAR_BYTES);
      if (!asset.contentType.startsWith("image/")) {
        throw new Error(`头像不是图片（${asset.contentType}）`);
      }
      return {
        sourceUrl,
        dataUrl: bytesToDataUrl(asset.bytes, asset.contentType),
        error: null
      };
    } catch (error) {
      return { sourceUrl, dataUrl: null, error: error.message };
    } finally {
      completed += 1;
      onProgress({
        stage: "embedding-avatars",
        detail: `头像 ${completed}/${urls.length}`,
        progress: { completed, total: urls.length }
      });
    }
  });
  const dataByUrl = new Map(
    results.filter((item) => item.dataUrl).map((item) => [item.sourceUrl, item.dataUrl])
  );
  return {
    dataByUrl,
    total: urls.length,
    embedded: dataByUrl.size,
    failed: results.length - dataByUrl.size
  };
}

function folderForKind(kind) {
  switch (kind) {
    case "emoji":
      return "stickers";
    case "card-cover":
      return "card-covers";
    case "video":
      return "videos";
    case "audio":
      return "audio";
    default:
      return "images";
  }
}

function collectMedia(rawMessages) {
  const assets = new Map();
  for (const message of rawMessages) {
    for (const media of message.media || []) {
      if (!media.src) {
        continue;
      }
      const existing = assets.get(media.src);
      if (existing) {
        existing.messageIds.add(message.messageId);
      } else {
        assets.set(media.src, {
          sourceUrl: media.src,
          kind: media.kind || "image",
          alt: media.alt || "",
          messageIds: new Set([message.messageId])
        });
      }
    }
  }
  return Array.from(assets.values());
}

async function downloadMedia(rawMessages, onProgress) {
  const assets = collectMedia(rawMessages);
  let completed = 0;
  let totalBytes = 0;
  const results = await mapConcurrent(assets, 4, async (item) => {
    try {
      const asset = await fetchAsset(item.sourceUrl, MAX_MEDIA_BYTES);
      totalBytes += asset.bytes.length;
      if (totalBytes > MAX_ARCHIVE_BYTES) {
        throw new Error("归档媒体总量超过 768 MiB 的浏览器内存安全限制");
      }
      const folder = folderForKind(item.kind);
      const filename = `${sha256Hex(item.sourceUrl).slice(0, 24)}${asset.extension}`;
      return {
        originalUrl: item.sourceUrl,
        localPath: `media/${folder}/${filename}`,
        kind: item.kind,
        alt: item.alt,
        contentType: asset.contentType,
        size: asset.bytes.length,
        sha256: asset.sha256,
        messageIds: Array.from(item.messageIds),
        bytes: asset.bytes,
        error: null
      };
    } catch (error) {
      return {
        originalUrl: item.sourceUrl,
        localPath: null,
        kind: item.kind,
        alt: item.alt,
        messageIds: Array.from(item.messageIds),
        bytes: null,
        error: error.message
      };
    } finally {
      completed += 1;
      onProgress({
        stage: "downloading-media",
        detail: `媒体 ${completed}/${assets.length}`,
        progress: { completed, total: assets.length }
      });
    }
  });
  const succeeded = results.filter((item) => item.localPath);
  const failures = results.filter((item) => item.error);
  return {
    files: new Map(succeeded.map((item) => [item.localPath, item.bytes])),
    localPathByUrl: new Map(
      succeeded.map((item) => [item.originalUrl, item.localPath])
    ),
    manifest: {
      version: 1,
      generatedAt: Math.floor(Date.now() / 1000),
      summary: {
        total: results.length,
        downloaded: succeeded.length,
        failed: failures.length,
        totalBytes: succeeded.reduce((sum, item) => sum + item.size, 0)
      },
      assets: succeeded.map(({ bytes: _bytes, error: _error, ...item }) => item),
      failures: failures.map(({ bytes: _bytes, ...item }) => item)
    }
  };
}

function attachMediaPaths(rawMessages, localPathByUrl) {
  return rawMessages.map((message) => ({
    ...message,
    media: (message.media || []).map((media) => ({
      ...media,
      archivePath: localPathByUrl.get(media.src) || null
    }))
  }));
}

function resultSummary(chatLab, filename, blob, mediaResult) {
  const embeddedAvatarCount =
    chatLab.members.filter((member) => member.avatar?.startsWith("data:image/")).length +
    (chatLab.meta.groupAvatar?.startsWith("data:image/") ? 1 : 0);
  return {
    filename,
    packageType: mediaResult ? "zip" : "json",
    fileSize: blob.size,
    messageCount: chatLab.messages.length,
    memberCount: chatLab.members.length,
    firstTimestamp: chatLab.messages[0].timestamp,
    lastTimestamp: chatLab.messages.at(-1).timestamp,
    embeddedAvatarCount,
    media: mediaResult?.manifest.summary || null
  };
}

export async function buildExportArtifact(payload, onProgress = () => {}) {
  const transformOptions = {
    conversationId: payload.conversationId,
    conversationKind: payload.conversationKind,
    conversationName: payload.conversationName,
    selfName: payload.selfName,
    startTimestamp: payload.startTimestamp,
    endTimestamp: payload.endTimestamp,
    includeMessageTypes: payload.includeMessageTypes,
    conversationAvatar: payload.conversationAvatar
  };
  const preview = toChatLab(payload.rawMessages, transformOptions);
  const selectedIds = new Set(
    preview.messages.map((message) => message.platformMessageId)
  );
  const selectedRawMessages = payload.rawMessages.filter((message) =>
    selectedIds.has(message.messageId)
  );

  let avatarResult = null;
  if (payload.embedAvatars) {
    avatarResult = await embedAvatars(
      selectedRawMessages,
      payload.conversationAvatar,
      onProgress
    );
  }

  let mediaResult = null;
  let preparedMessages = payload.rawMessages;
  if (payload.downloadMedia) {
    mediaResult = await downloadMedia(selectedRawMessages, onProgress);
    preparedMessages = attachMediaPaths(
      payload.rawMessages,
      mediaResult.localPathByUrl
    );
  }

  const chatLab = toChatLab(preparedMessages, {
    ...transformOptions,
    avatarDataByUrl: avatarResult?.dataByUrl || null
  });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseName = `xiaohongshu-${safeFilenamePart(payload.conversationName)}-${timestamp}`;
  const jsonText = `${JSON.stringify(chatLab, null, 2)}\n`;

  if (!mediaResult) {
    const filename = `${baseName}.chatlab.json`;
    const blob = new Blob([jsonText], { type: "application/json" });
    return {
      blob,
      result: resultSummary(chatLab, filename, blob, null)
    };
  }

  onProgress({ stage: "packaging", detail: "正在生成 ZIP…", progress: null });
  const root = baseName;
  const files = {
    [`${root}/chatlab.json`]: strToU8(jsonText),
    [`${root}/README.txt`]: strToU8(
      [
        "小红书聊天本地归档（Chrome / Edge 扩展）",
        "",
        "chatlab.json        ChatLab v0.0.2 聊天记录",
        "media/              下载成功的图片、表情、卡片封面和音视频",
        "media/manifest.json 原始 URL、本地路径、文件哈希与失败记录",
        "",
        "所有数据均在本机浏览器中处理。请妥善保管私人聊天内容。"
      ].join("\n")
    ),
    [`${root}/media/manifest.json`]: strToU8(
      `${JSON.stringify(mediaResult.manifest, null, 2)}\n`
    )
  };
  for (const [localPath, bytes] of mediaResult.files) {
    files[`${root}/${localPath}`] = bytes;
  }
  const zipBytes = zipSync(files, { level: 0 });
  const filename = `${baseName}.zip`;
  const blob = new Blob([zipBytes], { type: "application/zip" });
  return {
    blob,
    result: resultSummary(chatLab, filename, blob, mediaResult)
  };
}
