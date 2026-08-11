import {
  conversationStatePage,
  extractMessagesPage,
  historyStatePage,
  listConversationsPage,
  scrollConversationListPage,
  scrollHistoryToTopPage,
  selectConversationPage
} from "../src/page-scripts.js";
import {
  decodeXhsMessageTimestamp,
  formatEpoch,
  parseTimeBoundary
} from "../src/time.js";

const CHANNEL = "xhs-chatlab-exporter";
const TIME_ZONE = "Asia/Shanghai";
const ALLOWED_TYPES = new Set([
  0, 1, 2, 3, 4, 5, 7, 8, 20, 21, 22, 23, 24, 25, 26, 27, 80, 81, 99
]);

let currentJob = null;

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function publicJob() {
  return currentJob ? structuredClone(currentJob) : null;
}

function setJobProgress(stage, detail, progress = null) {
  if (!currentJob || currentJob.status !== "running") {
    return;
  }
  currentJob.stage = stage;
  currentJob.detail = detail;
  currentJob.progress = progress;
  currentJob.updatedAt = Date.now();
}

function normalizedKind(kind) {
  if (kind === "group") {
    return "group";
  }
  if (kind === "c2c" || kind === "private") {
    return "private";
  }
  return "";
}

function validateSettings(value) {
  const conversationId = String(value?.conversationId || "").trim();
  const conversationName = String(value?.conversationName || conversationId).trim();
  const kind = normalizedKind(value?.kind);
  const selfName = String(value?.selfName || "我").trim();
  const messageTypes = Array.isArray(value?.messageTypes)
    ? Array.from(new Set(value.messageTypes.map(Number)))
    : [];
  if (!/^(?:\d+|[0-9a-f]{24})$/i.test(conversationId)) {
    throw new Error("会话 ID 无效");
  }
  if (!conversationName || conversationName.length > 120) {
    throw new Error("会话名称无效");
  }
  if (!kind) {
    throw new Error("会话类型无效");
  }
  if (!selfName || selfName.length > 100) {
    throw new Error("自己的显示名称无效");
  }
  if (
    messageTypes.length === 0 ||
    messageTypes.some((type) => !Number.isInteger(type) || !ALLOWED_TYPES.has(type))
  ) {
    throw new Error("请至少选择一种有效消息类型");
  }
  const startTimestamp = value.allHistory
    ? null
    : parseTimeBoundary(value.start, { timeZone: TIME_ZONE });
  const endTimestamp = value.allHistory
    ? null
    : parseTimeBoundary(value.end, { timeZone: TIME_ZONE, endOfRange: true });
  if (
    startTimestamp !== null &&
    endTimestamp !== null &&
    startTimestamp > endTimestamp
  ) {
    throw new Error("开始日期不能晚于结束日期");
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
    messageTypes,
    startTimestamp,
    endTimestamp,
    maxPages,
    embedAvatars: Boolean(value.embedAvatars),
    downloadMedia: Boolean(value.downloadMedia)
  };
}

async function scanConversations() {
  const collected = new Map();
  const scroller = document.querySelector(".xhs-im-conv-list__scroll");
  const originalTop = scroller?.scrollTop || 0;
  scrollConversationListPage({ position: "top" });
  await sleep(180);
  let unchanged = 0;
  let previousTop = -1;
  for (let page = 0; page < 120; page += 1) {
    const state = listConversationsPage();
    for (const item of state.items) {
      if (item.id) {
        collected.set(item.id, {
          ...item,
          kind: normalizedKind(item.kind)
        });
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
    scrollConversationListPage({ position: "next" });
    await sleep(180);
  }
  if (scroller) {
    scroller.scrollTop = Math.min(originalTop, scroller.scrollHeight);
    scroller.dispatchEvent(new Event("scroll", { bubbles: true }));
  }
  return Array.from(collected.values()).sort((left, right) =>
    left.name.localeCompare(right.name, "zh-CN")
  );
}

async function selectConversation(id) {
  scrollConversationListPage({ position: "top" });
  await sleep(150);
  for (let page = 0; page < 120; page += 1) {
    if (selectConversationPage({ id }).selected) {
      return;
    }
    const state = listConversationsPage();
    const scroll = state.scroll;
    if (!scroll || scroll.top + scroll.clientHeight >= scroll.height - 2) {
      break;
    }
    scrollConversationListPage({ position: "next" });
    await sleep(180);
  }
  throw new Error("侧栏中找不到所选会话，请刷新会话列表后重试");
}

async function waitForConversation(id) {
  const deadline = Date.now() + 20_000;
  let latest = null;
  while (Date.now() < deadline) {
    latest = conversationStatePage();
    if (latest.id === String(id) && latest.messageListReady) {
      return latest;
    }
    await sleep(250);
  }
  throw new Error(`等待会话页面超时（当前 ${latest?.id || "未知"}）`);
}

async function waitForHistoryProgress(before) {
  const deadline = Date.now() + 5_000;
  await sleep(800);
  let latest = historyStatePage();
  while (Date.now() < deadline) {
    if (
      latest.firstMessageId !== before.firstMessageId ||
      latest.count !== before.count
    ) {
      return latest;
    }
    await sleep(300);
    latest = historyStatePage();
  }
  return latest;
}

async function loadHistory({ startTimestamp, maxPages }) {
  let noProgressAttempts = 0;
  let loadedPages = 0;
  let state = historyStatePage();
  while (state.firstMessageId) {
    const earliest = decodeXhsMessageTimestamp(state.firstMessageId);
    setJobProgress(
      "loading-history",
      `已读取 ${state.count} 条，最早 ${formatEpoch(earliest, TIME_ZONE)}`,
      { completed: loadedPages, total: null }
    );
    if (startTimestamp !== null && earliest <= startTimestamp) {
      break;
    }
    if (loadedPages >= maxPages) {
      throw new Error(`已达到最大加载页数 ${maxPages}，为避免不完整导出已停止`);
    }
    const before = state;
    scrollHistoryToTopPage();
    state = await waitForHistoryProgress(before);
    loadedPages += 1;
    const progressed =
      state.firstMessageId !== before.firstMessageId || state.count !== before.count;
    if (!progressed) {
      noProgressAttempts += 1;
      if (noProgressAttempts >= 3) {
        break;
      }
    } else {
      noProgressAttempts = 0;
    }
  }
  return state;
}

async function executeExport(settings) {
  try {
    setJobProgress("opening-conversation", "正在打开所选会话…");
    await selectConversation(settings.conversationId);
    const state = await waitForConversation(settings.conversationId);
    const pageKind = normalizedKind(state.kind);
    if (pageKind && pageKind !== settings.kind) {
      throw new Error(`会话类型不匹配：页面为 ${pageKind}，所选为 ${settings.kind}`);
    }
    await loadHistory(settings);
    setJobProgress("extracting", "正在读取页面中的聊天消息…");
    const rawMessages = extractMessagesPage();
    if (rawMessages.length === 0) {
      throw new Error("页面中没有可导出的消息");
    }
    setJobProgress("preparing-assets", "正在准备本地归档…");
    const response = await chrome.runtime.sendMessage({
      channel: CHANNEL,
      type: "BUILD_EXPORT",
      jobId: currentJob.id,
      payload: {
        rawMessages,
        conversationId: state.id,
        conversationKind: pageKind || settings.kind,
        conversationName: state.name || settings.conversationName,
        conversationAvatar: state.avatar || "",
        selfName: settings.selfName,
        startTimestamp: settings.startTimestamp,
        endTimestamp: settings.endTimestamp,
        includeMessageTypes: settings.messageTypes,
        embedAvatars: settings.embedAvatars,
        downloadMedia: settings.downloadMedia
      }
    });
    if (!response?.accepted) {
      throw new Error(response?.error || "扩展后台未接受归档任务");
    }
  } catch (error) {
    currentJob.status = "failed";
    currentJob.stage = "failed";
    currentJob.error = error.message;
    currentJob.updatedAt = Date.now();
  }
}

async function handleMessage(message) {
  switch (message.type) {
    case "PING":
      return { state: conversationStatePage(), job: publicJob() };
    case "LIST_CONVERSATIONS":
      return { conversations: await scanConversations(), state: conversationStatePage() };
    case "GET_JOB":
      return { job: publicJob() };
    case "START_EXPORT": {
      if (currentJob?.status === "running") {
        throw new Error("已有导出任务正在运行");
      }
      const settings = validateSettings(message.settings);
      currentJob = {
        id: crypto.randomUUID(),
        status: "running",
        stage: "queued",
        detail: "任务已创建",
        progress: null,
        result: null,
        error: null,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      void executeExport(settings);
      return { job: publicJob() };
    }
    case "EXPORT_PROGRESS":
      if (currentJob?.id === message.jobId && currentJob.status === "running") {
        setJobProgress(message.stage, message.detail, message.progress || null);
      }
      return { received: true };
    case "EXPORT_COMPLETE":
      if (currentJob?.id === message.jobId) {
        currentJob.status = "completed";
        currentJob.stage = "completed";
        currentJob.detail = "文件已交给浏览器下载";
        currentJob.progress = null;
        currentJob.result = message.result;
        currentJob.updatedAt = Date.now();
      }
      return { received: true };
    case "EXPORT_FAILED":
      if (currentJob?.id === message.jobId) {
        currentJob.status = "failed";
        currentJob.stage = "failed";
        currentJob.error = message.error || "导出失败";
        currentJob.updatedAt = Date.now();
      }
      return { received: true };
    default:
      return null;
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.channel !== CHANNEL) {
    return false;
  }
  handleMessage(message)
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});
