const CHANNEL = "xhs-chatlab-exporter";

const state = {
  tabId: null,
  conversations: [],
  filteredConversations: [],
  job: null,
  pollTimer: null
};

const elements = {
  connectionPill: document.querySelector("#connection-pill"),
  connectionCard: document.querySelector("#connection-card"),
  connectionTitle: document.querySelector("#connection-title"),
  connectionDetail: document.querySelector("#connection-detail"),
  openChat: document.querySelector("#open-chat"),
  retry: document.querySelector("#retry"),
  exportForm: document.querySelector("#export-form"),
  refreshConversations: document.querySelector("#refresh-conversations"),
  conversationSearch: document.querySelector("#conversation-search"),
  conversation: document.querySelector("#conversation"),
  conversationCount: document.querySelector("#conversation-count"),
  allHistory: document.querySelector("#all-history"),
  dateFields: document.querySelector("#date-fields"),
  startDate: document.querySelector("#start-date"),
  endDate: document.querySelector("#end-date"),
  typeChoices: Array.from(document.querySelectorAll("[data-types]")),
  embedAvatars: document.querySelector("#embed-avatars"),
  mediaKindChoices: Array.from(document.querySelectorAll("[data-media-kind]")),
  selfName: document.querySelector("#self-name"),
  startExport: document.querySelector("#start-export"),
  jobPanel: document.querySelector("#job-panel"),
  jobIcon: document.querySelector("#job-icon"),
  jobTitle: document.querySelector("#job-title"),
  jobDetail: document.querySelector("#job-detail"),
  progressTrack: document.querySelector("#progress-track"),
  progressBar: document.querySelector("#progress-bar"),
  resultStats: document.querySelector("#result-stats"),
  resultMessages: document.querySelector("#result-messages"),
  resultAvatars: document.querySelector("#result-avatars"),
  resultMedia: document.querySelector("#result-media")
};

function setConnection(kind, title, detail) {
  elements.connectionPill.className = `pill is-${kind}`;
  elements.connectionPill.textContent = kind === "connected" ? "已连接" : kind === "error" ? "未连接" : "检查中";
  elements.connectionTitle.textContent = title;
  elements.connectionDetail.textContent = detail;
}

async function sendToTab(type, payload = {}) {
  if (!Number.isInteger(state.tabId)) {
    throw new Error("没有可用的小红书聊天标签页");
  }
  try {
    const response = await chrome.tabs.sendMessage(state.tabId, {
      channel: CHANNEL,
      type,
      ...payload
    });
    if (!response?.ok) {
      throw new Error(response?.error || "小红书页面没有响应");
    }
    return response;
  } catch (error) {
    throw new Error(
      /Receiving end does not exist/i.test(error.message)
        ? "扩展尚未注入此页面，请刷新小红书聊天页后重试"
        : error.message
    );
  }
}

function renderConversations(preferredId = "") {
  const query = elements.conversationSearch.value.trim().toLocaleLowerCase();
  state.filteredConversations = state.conversations.filter((item) =>
    !query || item.name.toLocaleLowerCase().includes(query)
  );
  const previous = preferredId || elements.conversation.value;
  elements.conversation.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = state.filteredConversations.length
    ? "请选择会话"
    : "没有匹配的会话";
  elements.conversation.append(placeholder);
  for (const item of state.filteredConversations) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.kind === "group" ? "群聊" : "私聊"} · ${item.name}`;
    elements.conversation.append(option);
  }
  if (state.filteredConversations.some((item) => item.id === previous)) {
    elements.conversation.value = previous;
  }
  elements.conversationCount.textContent = `共读取 ${state.conversations.length} 个会话，当前显示 ${state.filteredConversations.length} 个`;
}

async function loadConversations(preferredId = "") {
  elements.refreshConversations.disabled = true;
  elements.conversation.innerHTML = '<option value="">正在读取全部会话…</option>';
  try {
    const response = await sendToTab("LIST_CONVERSATIONS");
    state.conversations = response.conversations || [];
    renderConversations(preferredId || response.state?.id || "");
  } finally {
    elements.refreshConversations.disabled = false;
  }
}

function setDateMode() {
  const disabled = elements.allHistory.checked;
  elements.startDate.disabled = disabled;
  elements.endDate.disabled = disabled;
  elements.startDate.required = !disabled;
  elements.endDate.required = !disabled;
  elements.dateFields.classList.toggle("is-disabled", disabled);
}

function selectedMessageTypes() {
  return Array.from(
    new Set(
      elements.typeChoices
        .filter((choice) => choice.checked)
        .flatMap((choice) => choice.dataset.types.split(",").map(Number))
    )
  );
}

function selectedMediaKinds() {
  return elements.mediaKindChoices
    .filter((choice) => choice.checked)
    .map((choice) => choice.dataset.mediaKind);
}

function stageTitle(stage) {
  const titles = {
    queued: "准备导出",
    "opening-conversation": "打开会话",
    "loading-history": "加载历史记录",
    extracting: "读取聊天内容",
    "preparing-assets": "准备资源",
    "embedding-avatars": "下载头像",
    "downloading-media": "下载聊天媒体",
    packaging: "生成 ZIP",
    completed: "导出完成",
    failed: "导出失败"
  };
  return titles[stage] || "正在导出";
}

function renderJob(job) {
  state.job = job;
  if (!job) {
    elements.jobPanel.hidden = true;
    elements.startExport.disabled = false;
    return;
  }
  elements.jobPanel.hidden = false;
  elements.jobTitle.textContent = stageTitle(job.stage);
  elements.jobDetail.textContent = job.error || job.detail || "处理中…";
  elements.jobIcon.textContent = job.status === "completed" ? "✓" : job.status === "failed" ? "!" : "↗";
  elements.startExport.disabled = job.status === "running";
  const progress = job.progress;
  if (progress?.total > 0) {
    elements.progressTrack.hidden = false;
    elements.progressBar.style.width = `${Math.min(100, progress.completed / progress.total * 100)}%`;
  } else {
    elements.progressTrack.hidden = true;
  }
  if (job.status === "completed" && job.result) {
    elements.resultStats.hidden = false;
    elements.resultMessages.textContent = String(job.result.messageCount);
    elements.resultAvatars.textContent = String(job.result.embeddedAvatarCount);
    elements.resultMedia.textContent = job.result.media
      ? `${job.result.media.downloaded}/${job.result.media.total}`
      : "未下载";
    elements.jobDetail.textContent = `${job.result.filename} 已交给浏览器下载`;
  } else {
    elements.resultStats.hidden = true;
  }
}

async function pollJob() {
  clearTimeout(state.pollTimer);
  try {
    const response = await sendToTab("GET_JOB");
    renderJob(response.job);
    if (response.job?.status === "running") {
      state.pollTimer = setTimeout(pollJob, 700);
    }
  } catch (error) {
    renderJob({ status: "failed", stage: "failed", error: error.message });
  }
}

async function connect() {
  setConnection("checking", "正在连接小红书页面…", "请保持已登录的聊天页面打开。");
  elements.exportForm.hidden = true;
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];
  if (!activeTab?.id || !/^https:\/\/www\.xiaohongshu\.com\/chat(?:[/?#]|$)/.test(activeTab.url || "")) {
    state.tabId = null;
    setConnection("error", "当前不是小红书聊天页", "打开并登录小红书聊天页面，再点击扩展图标。");
    return;
  }
  state.tabId = activeTab.id;
  try {
    const response = await sendToTab("PING");
    if (!response.state?.messageListReady) {
      throw new Error("聊天页面还没有加载完成");
    }
    setConnection("connected", `已连接：${response.state.name || "小红书聊天"}`, "聊天内容只在本机浏览器中处理。");
    elements.connectionCard.hidden = true;
    elements.exportForm.hidden = false;
    renderJob(response.job);
    await loadConversations(response.state.id || "");
    if (response.job?.status === "running") {
      void pollJob();
    }
  } catch (error) {
    setConnection("error", "无法连接聊天页", error.message);
    elements.connectionCard.hidden = false;
  }
}

async function savePreferences() {
  await chrome.storage.local.set({
    exportPreferences: {
      allHistory: elements.allHistory.checked,
      start: elements.startDate.value,
      end: elements.endDate.value,
      messageTypes: selectedMessageTypes(),
      embedAvatars: elements.embedAvatars.checked,
      mediaKinds: selectedMediaKinds(),
      selfName: elements.selfName.value
    }
  });
}

async function restorePreferences() {
  const { exportPreferences } = await chrome.storage.local.get("exportPreferences");
  if (!exportPreferences) {
    return;
  }
  elements.allHistory.checked = exportPreferences.allHistory !== false;
  elements.startDate.value = exportPreferences.start || "";
  elements.endDate.value = exportPreferences.end || "";
  if (Array.isArray(exportPreferences.messageTypes)) {
    const savedTypes = new Set(exportPreferences.messageTypes.map(Number));
    for (const choice of elements.typeChoices) {
      const types = choice.dataset.types.split(",").map(Number);
      choice.checked = types.some((type) => savedTypes.has(type));
    }
  }
  elements.embedAvatars.checked = exportPreferences.embedAvatars !== false;
  const savedMediaKinds = Array.isArray(exportPreferences.mediaKinds)
    ? new Set(exportPreferences.mediaKinds)
    : exportPreferences.downloadMedia
      ? new Set(elements.mediaKindChoices.map((choice) => choice.dataset.mediaKind))
      : new Set();
  for (const choice of elements.mediaKindChoices) {
    choice.checked = savedMediaKinds.has(choice.dataset.mediaKind);
  }
  elements.selfName.value = exportPreferences.selfName || "我";
  setDateMode();
}

elements.openChat.addEventListener("click", () => {
  if (globalThis.chrome?.tabs?.create) {
    void chrome.tabs.create({ url: "https://www.xiaohongshu.com/chat" });
  }
});
elements.retry.addEventListener("click", () => void connect());
elements.refreshConversations.addEventListener("click", () => void loadConversations());
elements.conversationSearch.addEventListener("input", () => renderConversations());
elements.allHistory.addEventListener("change", setDateMode);
elements.exportForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const conversation = state.conversations.find(
    (item) => item.id === elements.conversation.value
  );
  if (!conversation) {
    renderJob({ status: "failed", stage: "failed", error: "请先选择一个会话" });
    return;
  }
  const messageTypes = selectedMessageTypes();
  if (messageTypes.length === 0) {
    renderJob({ status: "failed", stage: "failed", error: "请至少选择一种消息内容" });
    return;
  }
  try {
    const mediaKinds = selectedMediaKinds();
    await savePreferences();
    const response = await sendToTab("START_EXPORT", {
      settings: {
        conversationId: conversation.id,
        conversationName: conversation.name,
        kind: conversation.kind,
        selfName: elements.selfName.value,
        allHistory: elements.allHistory.checked,
        start: elements.startDate.value,
        end: elements.endDate.value,
        messageTypes,
        maxPages: elements.allHistory.checked ? 2000 : 500,
        embedAvatars: elements.embedAvatars.checked,
        downloadMedia: mediaKinds.length > 0,
        mediaKinds
      }
    });
    renderJob(response.job);
    void pollJob();
  } catch (error) {
    renderJob({ status: "failed", stage: "failed", error: error.message });
  }
});

function showLocalPreview() {
  setConnection("connected", "已连接：示例会话", "聊天内容只在本机浏览器中处理。");
  elements.connectionCard.hidden = true;
  elements.exportForm.hidden = false;
  state.conversations = [
    { id: "preview-private", name: "示例联系人", kind: "private" },
    { id: "preview-group", name: "示例群聊", kind: "group" }
  ];
  renderConversations("preview-private");
}

if (
  globalThis.chrome?.runtime?.id &&
  globalThis.chrome?.tabs?.query &&
  globalThis.chrome?.storage?.local
) {
  void restorePreferences().then(connect);
} else {
  showLocalPreview();
}
