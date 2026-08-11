import { access, mkdir, rename, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";

import {
  conversationStatePage,
  extractMessagesPage,
  historyStatePage,
  listConversationsPage,
  navigateConversationPage,
  scrollConversationListPage,
  scrollHistoryToTopPage,
  selectConversationPage
} from "./page-scripts.js";
import { SafariBridge, sleep } from "./safari.js";
import {
  decodeXhsMessageTimestamp,
  formatEpoch,
  parseTimeBoundary
} from "./time.js";
import {
  attachMediaArchivePaths,
  downloadMediaAssets,
  embedAvatarData
} from "./media.js";
import { toChatLab } from "./xhs.js";

const VERSION = "0.4.0";
const VALUE_OPTIONS = new Map([
  ["--conversation", "conversation"],
  ["-c", "conversation"],
  ["--start", "start"],
  ["--end", "end"],
  ["--timezone", "timeZone"],
  ["--self-name", "selfName"],
  ["--output", "output"],
  ["-o", "output"],
  ["--kind", "kind"],
  ["--message-types", "messageTypes"],
  ["--media-directory", "mediaDirectory"],
  ["--tab-url-contains", "tabUrlContains"],
  ["--max-pages", "maxPages"],
  ["--settle-ms", "settleMilliseconds"]
]);

const HELP = `
xhs-chat-export — 将小红书网页版聊天导出为 ChatLab JSON

用法：
  xhs-chat-export --list
  xhs-chat-export --conversation <会话名称或 ID> [选项]

选项：
  -c, --conversation <值>   私聊联系人、群名或 data-conv-id
      --start <时间>        起始时间（包含）
      --end <时间>          结束时间（包含）
      --timezone <IANA>     无偏移时间使用的时区（默认 Asia/Shanghai）
      --self-name <名称>    ChatLab 中自己的名称（默认“我”）
      --kind <auto|private|group>
                            自动识别，或校验指定的会话类型
      --message-types <列表>
                            仅导出指定 ChatLab 类型，如 0,1,5,25
      --embed-avatars       下载头像并以 Data URL 写入 ChatLab JSON
      --download-media      将图片、表情、卡片封面和音视频保存到本地
      --media-directory <目录>
                            媒体保存目录；默认位于 JSON 文件旁
  -o, --output <文件>       输出 .json 路径
      --max-pages <数量>    最多向上加载的历史页数（默认 500）
      --settle-ms <毫秒>    每页最短等待时间（默认 800）
      --tab-url-contains <值>
                            用于选择 Safari 标签页的 URL 片段
      --list                列出 Safari 侧栏中的会话
      --dry-run             抓取并校验，但不写文件
      --force               允许覆盖已有输出文件
  -h, --help                显示帮助
      --version             显示版本

时间示例：
  2026-07-15
  2026-07-15T22:43:00
  2026-07-15T22:43:00+08:00
  1784126580
`.trim();

function positiveInteger(value, option) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${option} 必须是正整数`);
  }
  return parsed;
}

export function parseArgs(argv) {
  const options = {
    conversation: null,
    start: null,
    end: null,
    timeZone: "Asia/Shanghai",
    selfName: "我",
    output: null,
    kind: "auto",
    messageTypes: null,
    embedAvatars: false,
    downloadMedia: false,
    mediaDirectory: null,
    tabUrlContains: "xiaohongshu.com/chat/",
    maxPages: 500,
    settleMilliseconds: 800,
    list: false,
    dryRun: false,
    force: false,
    help: false,
    version: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (VALUE_OPTIONS.has(token)) {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("-")) {
        throw new Error(`${token} 缺少参数`);
      }
      options[VALUE_OPTIONS.get(token)] = value;
      index += 1;
      continue;
    }
    switch (token) {
      case "--list":
        options.list = true;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--force":
        options.force = true;
        break;
      case "--embed-avatars":
        options.embedAvatars = true;
        break;
      case "--download-media":
        options.downloadMedia = true;
        break;
      case "-h":
      case "--help":
        options.help = true;
        break;
      case "--version":
        options.version = true;
        break;
      default:
        throw new Error(`未知参数：${token}`);
    }
  }

  options.maxPages = positiveInteger(options.maxPages, "--max-pages");
  options.settleMilliseconds = positiveInteger(options.settleMilliseconds, "--settle-ms");
  if (!["auto", "private", "group"].includes(options.kind)) {
    throw new Error('--kind 必须是 "auto"、"private" 或 "group"');
  }
  if (options.messageTypes !== null) {
    const parsedTypes = String(options.messageTypes)
      .split(",")
      .map((value) => Number(value.trim()));
    const allowedTypes = new Set([
      0, 1, 2, 3, 4, 5, 7, 8, 20, 21, 22, 23, 24, 25, 26, 27, 80, 81, 99
    ]);
    if (
      parsedTypes.length === 0 ||
      parsedTypes.some((value) => !Number.isInteger(value) || !allowedTypes.has(value))
    ) {
      throw new Error("--message-types 包含无效的 ChatLab 消息类型");
    }
    options.messageTypes = Array.from(new Set(parsedTypes));
  }
  if (options.mediaDirectory && !options.downloadMedia) {
    throw new Error("--media-directory 只能与 --download-media 一起使用");
  }
  if (!options.help && !options.version && !options.list && !options.conversation) {
    throw new Error("请使用 --conversation 指定联系人/群聊，或使用 --list 查看会话");
  }
  return options;
}

export async function scanConversations(bridge) {
  const collected = new Map();
  await bridge.runPageFunction(scrollConversationListPage, { position: "top" });
  await sleep(200);

  let unchanged = 0;
  let previousTop = -1;
  for (let page = 0; page < 120; page += 1) {
    const state = await bridge.runPageFunction(listConversationsPage);
    for (const item of state.items) {
      if (item.id) {
        collected.set(item.id, item);
      }
    }
    const scroll = state.scroll;
    if (!scroll || scroll.top + scroll.clientHeight >= scroll.height - 2) {
      break;
    }
    if (scroll.top === previousTop) {
      unchanged += 1;
      if (unchanged >= 3) {
        break;
      }
    } else {
      unchanged = 0;
    }
    previousTop = scroll.top;
    await bridge.runPageFunction(scrollConversationListPage, { position: "next" });
    await sleep(200);
  }
  return Array.from(collected.values());
}

function displayKind(kind) {
  return kind === "group" ? "group" : kind === "c2c" ? "private" : kind || "unknown";
}

function printConversations(items) {
  const rows = items
    .sort((left, right) => left.name.localeCompare(right.name, "zh-CN"))
    .map((item) => ({
      type: displayKind(item.kind),
      name: item.name,
      id: item.id
    }));
  console.table(rows);
}

function resolveConversation(items, query) {
  const source = String(query).trim();
  const byId = items.filter((item) => item.id === source);
  if (byId.length === 1) {
    return byId[0];
  }
  const exact = items.filter((item) => item.name === source);
  if (exact.length === 1) {
    return exact[0];
  }
  const folded = source.toLocaleLowerCase();
  const caseInsensitive = items.filter(
    (item) => item.name.toLocaleLowerCase() === folded
  );
  if (caseInsensitive.length === 1) {
    return caseInsensitive[0];
  }
  const partial = items.filter((item) =>
    item.name.toLocaleLowerCase().includes(folded)
  );
  if (partial.length === 1) {
    return partial[0];
  }
  if (partial.length > 1 || exact.length > 1) {
    const candidates = (exact.length > 1 ? exact : partial)
      .slice(0, 12)
      .map((item) => `${item.name} (${item.id})`)
      .join("、");
    throw new Error(`会话名称不唯一，请改用 ID：${candidates}`);
  }
  return null;
}

function looksLikeConversationId(value) {
  return /^(?:\d+|[0-9a-f]{24})$/i.test(String(value));
}

async function clickConversation(bridge, id) {
  await bridge.runPageFunction(scrollConversationListPage, { position: "top" });
  await sleep(150);
  for (let page = 0; page < 120; page += 1) {
    const selected = await bridge.runPageFunction(selectConversationPage, { id });
    if (selected.selected) {
      return true;
    }
    const state = await bridge.runPageFunction(listConversationsPage);
    const scroll = state.scroll;
    if (!scroll || scroll.top + scroll.clientHeight >= scroll.height - 2) {
      return false;
    }
    await bridge.runPageFunction(scrollConversationListPage, { position: "next" });
    await sleep(200);
  }
  return false;
}

async function waitForConversation(bridge, id) {
  const deadline = Date.now() + 20_000;
  let lastState = null;
  while (Date.now() < deadline) {
    try {
      lastState = await bridge.runPageFunction(conversationStatePage);
      if (lastState.id === String(id) && lastState.messageListReady) {
        return lastState;
      }
    } catch {
      // A direct navigation can briefly destroy the old document.
    }
    await sleep(250);
  }
  throw new Error(
    `等待会话页面超时（期望 ${id}，当前 ${lastState?.id || "未知"}）`
  );
}

function normalizedConversationKind(kind) {
  if (kind === "group") {
    return "group";
  }
  if (kind === "c2c" || kind === "private") {
    return "private";
  }
  return "";
}

async function waitForHistoryProgress(bridge, before, settleMilliseconds) {
  const deadline = Date.now() + Math.max(4_000, settleMilliseconds * 5);
  await sleep(settleMilliseconds);
  let latest = await bridge.runPageFunction(historyStatePage);
  while (Date.now() < deadline) {
    if (
      latest.firstMessageId !== before.firstMessageId ||
      latest.count !== before.count
    ) {
      return latest;
    }
    await sleep(300);
    latest = await bridge.runPageFunction(historyStatePage);
  }
  return latest;
}

async function loadHistory(bridge, {
  startTimestamp,
  maxPages,
  settleMilliseconds,
  timeZone
}) {
  let noProgressAttempts = 0;
  let loadedPages = 0;
  let state = await bridge.runPageFunction(historyStatePage);

  while (state.firstMessageId) {
    const earliest = decodeXhsMessageTimestamp(state.firstMessageId);
    if (startTimestamp !== null && earliest <= startTimestamp) {
      break;
    }
    if (loadedPages >= maxPages) {
      throw new Error(
        `已达到 --max-pages=${maxPages}，仍未到达目标时间；为避免不完整导出，已停止`
      );
    }

    const before = state;
    await bridge.runPageFunction(scrollHistoryToTopPage);
    state = await waitForHistoryProgress(bridge, before, settleMilliseconds);
    loadedPages += 1;

    const progressed =
      state.firstMessageId !== before.firstMessageId || state.count !== before.count;
    if (!progressed) {
      noProgressAttempts += 1;
      if (noProgressAttempts >= 3) {
        break;
      }
      continue;
    }

    noProgressAttempts = 0;
    const currentEarliest = decodeXhsMessageTimestamp(state.firstMessageId);
    console.error(
      `已加载 ${state.count} 条 DOM 消息，最早 ${formatEpoch(currentEarliest, timeZone)}`
    );
  }

  return {
    loadedPages,
    messageCount: state.count,
    earliestTimestamp: state.firstMessageId
      ? decodeXhsMessageTimestamp(state.firstMessageId)
      : null
  };
}

function safeFilePart(value) {
  const cleaned = String(value)
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 80);
  return cleaned || "conversation";
}

async function exists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function writeJsonAtomically(filePath, data, force) {
  if (!force && (await exists(filePath))) {
    throw new Error(`输出文件已存在：${filePath}；如需覆盖请添加 --force`);
  }
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600
  });
  await rename(temporary, filePath);
}

function printSummary(data, {
  output,
  timeZone,
  dryRun,
  avatarResult = null,
  mediaResult = null
}) {
  const first = data.messages[0].timestamp;
  const last = data.messages.at(-1).timestamp;
  console.log(`会话：${data.meta.name} (${data.meta.type})`);
  console.log(`成员：${data.members.length}`);
  console.log(`消息：${data.messages.length}`);
  console.log(`范围：${formatEpoch(first, timeZone)} → ${formatEpoch(last, timeZone)}`);
  if (avatarResult) {
    console.log(
      `头像：已嵌入 ${avatarResult.embedded}/${avatarResult.total}，失败 ${avatarResult.failed}`
    );
  }
  if (mediaResult) {
    console.log(
      `媒体：已下载 ${mediaResult.downloaded}/${mediaResult.total}，失败 ${mediaResult.failed}`
    );
  }
  console.log(dryRun ? "结果：校验通过（dry-run，未写文件）" : `输出：${output}`);
}

export async function run(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(HELP);
    return;
  }
  if (options.version) {
    console.log(VERSION);
    return;
  }

  const startTimestamp = parseTimeBoundary(options.start, {
    timeZone: options.timeZone,
    endOfRange: false
  });
  const endTimestamp = parseTimeBoundary(options.end, {
    timeZone: options.timeZone,
    endOfRange: true
  });
  if (
    startTimestamp !== null &&
    endTimestamp !== null &&
    startTimestamp > endTimestamp
  ) {
    throw new Error("--start 不能晚于 --end");
  }

  const bridge = new SafariBridge({
    tabUrlContains: options.tabUrlContains
  });
  const conversations = await scanConversations(bridge);
  if (options.list) {
    printConversations(conversations);
    return;
  }

  let target = resolveConversation(conversations, options.conversation);
  if (!target && looksLikeConversationId(options.conversation)) {
    target = {
      id: String(options.conversation),
      name: String(options.conversation),
      kind: ""
    };
  }
  if (!target) {
    throw new Error(
      `没有找到会话“${options.conversation}”；请先在 Safari 打开聊天页并用 --list 查看可用名称/ID`
    );
  }

  console.error(`正在打开：${target.name} (${target.id})`);
  const clicked = await clickConversation(bridge, target.id);
  if (!clicked) {
    await bridge.runPageFunction(navigateConversationPage, { id: target.id });
  }
  const state = await waitForConversation(bridge, target.id);
  const conversationKind =
    normalizedConversationKind(state.kind) || normalizedConversationKind(target.kind);
  if (!conversationKind) {
    throw new Error("无法自动识别私聊/群聊，请使用 --kind private 或 --kind group");
  }
  if (options.kind !== "auto" && options.kind !== conversationKind) {
    throw new Error(
      `会话类型不匹配：页面识别为 ${conversationKind}，参数指定为 ${options.kind}`
    );
  }

  await loadHistory(bridge, {
    startTimestamp,
    maxPages: options.maxPages,
    settleMilliseconds: options.settleMilliseconds,
    timeZone: options.timeZone
  });
  const rawMessages = await bridge.runPageFunction(extractMessagesPage);
  const transformOptions = {
    conversationId: state.id,
    conversationKind,
    conversationName: state.name || target.name,
    selfName: options.selfName,
    startTimestamp,
    endTimestamp,
    includeMessageTypes: options.messageTypes,
    conversationAvatar: state.avatar || ""
  };

  const defaultName = `xiaohongshu-${safeFilePart(state.name || target.name)}.chatlab.json`;
  const output = path.resolve(options.output || defaultName);
  const preview = toChatLab(rawMessages, transformOptions);
  const selectedIds = new Set(
    preview.messages.map((message) => message.platformMessageId)
  );
  const selectedRawMessages = rawMessages.filter((message) =>
    selectedIds.has(message.messageId)
  );
  let preparedMessages = rawMessages;
  let avatarResult = null;
  let mediaResult = null;

  if (options.downloadMedia && !options.dryRun) {
    const mediaDirectory = path.resolve(
      options.mediaDirectory ||
        `${output.replace(/\.json$/i, "")}.media`
    );
    const relativeMediaDirectory =
      path.relative(path.dirname(output), mediaDirectory) ||
      path.basename(mediaDirectory);
    const archivePathPrefix = relativeMediaDirectory
      .split(path.sep)
      .join(path.posix.sep);
    console.error("正在下载聊天媒体…");
    mediaResult = await downloadMediaAssets(
      selectedRawMessages,
      mediaDirectory,
      {
        archivePathPrefix,
        onProgress: ({ completed, total }) => {
          if (completed === total || completed % 5 === 0) {
            console.error(`媒体下载 ${completed}/${total}`);
          }
        }
      }
    );
    preparedMessages = attachMediaArchivePaths(
      rawMessages,
      mediaResult.localPathByUrl
    );
  }

  if (options.embedAvatars) {
    console.error("正在嵌入头像…");
    avatarResult = await embedAvatarData(selectedRawMessages, {
      conversationAvatar: state.avatar || "",
      onProgress: ({ completed, total }) => {
        if (completed === total || completed % 5 === 0) {
          console.error(`头像下载 ${completed}/${total}`);
        }
      }
    });
  }

  const chatLab =
    preparedMessages === rawMessages && !avatarResult
      ? preview
      : toChatLab(preparedMessages, {
          ...transformOptions,
          avatarDataByUrl: avatarResult?.dataByUrl || null
        });
  if (!options.dryRun) {
    await writeJsonAtomically(output, chatLab, options.force);
  }
  printSummary(chatLab, {
    output,
    timeZone: options.timeZone,
    dryRun: options.dryRun,
    avatarResult,
    mediaResult
  });
}

export { HELP };
