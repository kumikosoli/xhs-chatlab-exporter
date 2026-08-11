const state = {
  token: "",
  connected: false,
  conversations: [],
  selected: null,
  kindFilter: "all",
  search: "",
  job: null,
  pollTimer: null
};

const elements = {
  connectionPill: document.querySelector("#connection-pill"),
  connectionLabel: document.querySelector("#connection-label"),
  connectionHelp: document.querySelector("#connection-help"),
  openLogin: document.querySelector("#open-login"),
  refreshConnection: document.querySelector("#refresh-connection"),
  reloadConversations: document.querySelector("#reload-conversations"),
  conversationSearch: document.querySelector("#conversation-search"),
  conversationList: document.querySelector("#conversation-list"),
  conversationEmpty: document.querySelector("#conversation-empty"),
  segments: Array.from(document.querySelectorAll(".segment")),
  selectedConversation: document.querySelector("#selected-conversation"),
  selectedKind: document.querySelector("#selected-kind"),
  exportForm: document.querySelector("#export-form"),
  allHistory: document.querySelector("#all-history"),
  dateRange: document.querySelector("#date-range"),
  startDate: document.querySelector("#start-date"),
  endDate: document.querySelector("#end-date"),
  selfName: document.querySelector("#self-name"),
  contentChoices: Array.from(document.querySelectorAll("[data-types]")),
  embedAvatars: document.querySelector("#embed-avatars"),
  mediaKindChoices: Array.from(document.querySelectorAll("[data-media-kind]")),
  startExport: document.querySelector("#start-export"),
  jobPanel: document.querySelector("#job-panel"),
  progressCount: document.querySelector("#progress-count"),
  jobKicker: document.querySelector("#job-kicker"),
  jobTitle: document.querySelector("#job-title"),
  jobDetail: document.querySelector("#job-detail"),
  resultActions: document.querySelector("#result-actions"),
  downloadResult: document.querySelector("#download-result"),
  revealResult: document.querySelector("#reveal-result"),
  toast: document.querySelector("#toast")
};

async function api(path, options = {}) {
  const headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.method === "POST"
      ? { "X-XHS-Exporter-Token": state.token }
      : {}),
    ...options.headers
  };
  const response = await fetch(path, { ...options, headers });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `请求失败（${response.status}）`);
  }
  return data;
}

let toastTimer = null;
function toast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 2600);
}

function setConnectionStatus(status, label, help) {
  elements.connectionPill.className = `connection-pill is-${status}`;
  elements.connectionLabel.textContent = label;
  if (help) {
    elements.connectionHelp.textContent = help;
  }
}

function initials(name) {
  const source = String(name || "").trim();
  return Array.from(source).slice(0, 2).join("") || "—";
}

function kindLabel(kind) {
  return kind === "group" ? "群聊" : "私聊";
}

function filteredConversations() {
  const query = state.search.trim().toLocaleLowerCase();
  return state.conversations.filter((conversation) => {
    const kindMatches =
      state.kindFilter === "all" || conversation.kind === state.kindFilter;
    const searchMatches =
      !query || conversation.name.toLocaleLowerCase().includes(query);
    return kindMatches && searchMatches;
  });
}

function renderConversations() {
  const items = filteredConversations();
  elements.conversationList.replaceChildren();
  elements.conversationList.hidden = items.length === 0;
  elements.conversationEmpty.hidden = items.length > 0;
  if (items.length === 0) {
    elements.conversationEmpty.querySelector("p").textContent = state.connected
      ? "没有符合当前搜索条件的会话。"
      : "连接 Safari 后，会话会出现在这里。";
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const conversation of items) {
    const button = document.createElement("button");
    button.className = `conversation-item${
      state.selected?.id === conversation.id ? " is-selected" : ""
    }`;
    button.type = "button";
    button.role = "option";
    button.ariaSelected = String(state.selected?.id === conversation.id);
    button.dataset.id = conversation.id;

    const avatar = document.createElement("span");
    avatar.className = "conversation-avatar";
    avatar.textContent = initials(conversation.name);

    const copy = document.createElement("span");
    const title = document.createElement("strong");
    title.textContent = conversation.name;
    const meta = document.createElement("small");
    meta.textContent = `${kindLabel(conversation.kind)} · ${conversation.id}`;
    copy.append(title, meta);

    const arrow = document.createElement("span");
    arrow.className = "item-arrow";
    arrow.textContent = "›";
    arrow.ariaHidden = "true";
    button.append(avatar, copy, arrow);
    button.addEventListener("click", () => selectConversation(conversation));
    fragment.append(button);
  }
  elements.conversationList.append(fragment);
}

function selectConversation(conversation) {
  state.selected = conversation;
  renderConversations();
  elements.selectedConversation.replaceChildren();
  const avatar = document.createElement("span");
  avatar.className = "selected-avatar";
  avatar.textContent = initials(conversation.name);
  avatar.ariaHidden = "true";
  const copy = document.createElement("div");
  const label = document.createElement("small");
  label.textContent = "当前会话";
  const name = document.createElement("strong");
  name.textContent = conversation.name;
  copy.append(label, name);
  elements.selectedConversation.append(avatar, copy);
  elements.selectedKind.textContent = kindLabel(conversation.kind);
  updateSubmitState();
}

function selectedMessageTypes() {
  return Array.from(
    new Set(
      elements.contentChoices
        .filter((input) => input.checked)
        .flatMap((input) => input.dataset.types.split(",").map(Number))
    )
  );
}

function selectedMediaKinds() {
  return elements.mediaKindChoices
    .filter((input) => input.checked)
    .map((input) => input.dataset.mediaKind);
}

function setDateMode() {
  const disabled = elements.allHistory.checked;
  elements.dateRange.classList.toggle("is-disabled", disabled);
  elements.startDate.disabled = disabled;
  elements.endDate.disabled = disabled;
  elements.startDate.required = !disabled;
  elements.endDate.required = !disabled;
}

function updateSubmitState() {
  const running = ["queued", "running"].includes(state.job?.status);
  elements.startExport.disabled =
    !state.connected ||
    !state.selected ||
    selectedMessageTypes().length === 0 ||
    running;
}

async function refreshConnection({ showToast = false } = {}) {
  setConnectionStatus("checking", "正在检查 Safari…");
  elements.refreshConnection.disabled = true;
  try {
    const result = await api("/api/status");
    state.connected = result.connected;
    if (result.connected) {
      setConnectionStatus(
        "connected",
        `已连接 · ${result.state.name || "小红书"}`,
        "Safari 已登录，可以载入会话并开始导出。"
      );
      await loadConversations();
      if (showToast) {
        toast("Safari 已连接");
      }
    } else {
      setConnectionStatus(
        "disconnected",
        "尚未连接",
        "请在 Safari 打开小红书聊天页并登录，然后点击“刷新连接”。"
      );
      state.conversations = [];
      renderConversations();
      if (showToast) {
        toast("还没有检测到已登录的聊天页");
      }
    }
  } catch (error) {
    state.connected = false;
    setConnectionStatus("disconnected", "连接失败", error.message);
    toast(error.message);
  } finally {
    elements.refreshConnection.disabled = false;
    updateSubmitState();
  }
}

async function loadConversations() {
  if (!state.connected) {
    return;
  }
  elements.reloadConversations.classList.add("is-loading");
  elements.reloadConversations.disabled = true;
  elements.conversationEmpty.hidden = false;
  elements.conversationEmpty.querySelector("p").textContent = "正在载入会话…";
  try {
    const result = await api("/api/conversations");
    state.conversations = result.conversations;
    if (
      state.selected &&
      !state.conversations.some((item) => item.id === state.selected.id)
    ) {
      state.selected = null;
    }
    renderConversations();
  } catch (error) {
    toast(error.message);
    elements.conversationEmpty.querySelector("p").textContent =
      "会话载入失败，请确认 Safari 权限。";
  } finally {
    elements.reloadConversations.classList.remove("is-loading");
    elements.reloadConversations.disabled = false;
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatTimestamp(timestamp) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).format(new Date(timestamp * 1000));
}

function stageCopy(job) {
  if (job.status === "failed") {
    return {
      kicker: "导出未完成",
      title: "遇到问题",
      detail: job.error || "请检查 Safari 页面后重试。"
    };
  }
  if (job.status === "completed") {
    const result = job.result;
    const resourceSummary = [
      result.embeddedAvatarCount
        ? `头像 ${result.embeddedAvatarCount} 个`
        : "",
      result.media
        ? `媒体 ${result.media.downloaded}/${result.media.total}`
        : ""
    ].filter(Boolean);
    return {
      kicker:
        result.packageType === "zip"
          ? "本地资源归档已就绪"
          : "ChatLab JSON 已就绪",
      title: `${result.messageCount.toLocaleString()} 条消息已安全落盘`,
      detail: `${result.memberCount} 位成员 · ${formatTimestamp(
        result.firstTimestamp
      )} 至 ${formatTimestamp(result.lastTimestamp)} · ${formatBytes(
        result.fileSize
      )}${resourceSummary.length ? ` · ${resourceSummary.join(" · ")}` : ""}`
    };
  }
  if (job.stage === "embedding-avatars") {
    const progress = job.avatarProgress || { completed: 0, total: 0 };
    return {
      kicker: "正在保存头像",
      title: `已处理 ${progress.completed}/${progress.total} 个头像`,
      detail: "头像会转换成 Data URL，直接嵌入 ChatLab 成员信息。"
    };
  }
  if (job.stage === "downloading-media") {
    const progress = job.assetProgress || { completed: 0, total: 0 };
    return {
      kicker: "正在下载聊天媒体",
      title: `已处理 ${progress.completed}/${progress.total} 个资源`,
      detail: "图片、表情和卡片封面正在保存到本地归档。"
    };
  }
  if (job.stage === "packaging") {
    return {
      kicker: "正在封装 ZIP",
      title: "正在整理 JSON、媒体与 manifest",
      detail: "马上完成，请不要关闭页面。"
    };
  }
  if (job.stage === "loading-history") {
    return {
      kicker: "正在向前加载历史",
      title: `已发现 ${job.loadedMessages.toLocaleString()} 条页面消息`,
      detail: job.earliestLoaded
        ? `当前最早已到 ${job.earliestLoaded}，网页仍在继续加载。`
        : "网页正在返回更早记录。"
    };
  }
  if (job.stage === "validating") {
    return {
      kicker: "正在整理",
      title: "正在生成并校验 ChatLab JSON",
      detail: "马上完成，请不要关闭页面。"
    };
  }
  return {
    kicker: "正在准备",
    title: "正在打开目标会话…",
    detail: "请保持 Safari 和这个页面开启。"
  };
}

function renderJob(job) {
  state.job = job;
  elements.jobPanel.hidden = false;
  elements.jobPanel.classList.toggle("is-complete", job.status === "completed");
  elements.jobPanel.classList.toggle("is-failed", job.status === "failed");
  elements.progressCount.textContent =
    job.status === "completed"
      ? "✓"
      : job.status === "failed"
        ? "!"
        : job.stage === "downloading-media"
          ? String(job.assetProgress?.completed || "···")
          : job.stage === "embedding-avatars"
            ? String(job.avatarProgress?.completed || "···")
            : job.loadedMessages > 9999
          ? "9k+"
          : String(job.loadedMessages || "···");
  const copy = stageCopy(job);
  elements.jobKicker.textContent = copy.kicker;
  elements.jobTitle.textContent = copy.title;
  elements.jobDetail.textContent = copy.detail;
  elements.resultActions.hidden = job.status !== "completed";
  if (job.status === "completed") {
    elements.downloadResult.href = job.result.downloadUrl;
    elements.downloadResult.textContent =
      job.result.packageType === "zip" ? "下载 ZIP" : "下载 JSON";
  }
  updateSubmitState();
}

async function pollJob(id) {
  clearTimeout(state.pollTimer);
  try {
    const result = await api(`/api/jobs/${id}`);
    renderJob(result.job);
    if (["queued", "running"].includes(result.job.status)) {
      state.pollTimer = setTimeout(() => pollJob(id), 900);
    } else if (result.job.status === "completed") {
      toast("导出完成");
      elements.jobPanel.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      toast(result.job.error || "导出失败");
    }
  } catch (error) {
    toast(error.message);
    state.pollTimer = setTimeout(() => pollJob(id), 1600);
  }
}

async function startExport(event) {
  event.preventDefault();
  if (!state.selected) {
    toast("请先选择会话");
    return;
  }
  const messageTypes = selectedMessageTypes();
  if (messageTypes.length === 0) {
    toast("请至少选择一种消息内容");
    return;
  }
  const mediaKinds = selectedMediaKinds();
  const payload = {
    conversationId: state.selected.id,
    conversationName: state.selected.name,
    kind: state.selected.kind,
    selfName: elements.selfName.value.trim() || "我",
    allHistory: elements.allHistory.checked,
    start: elements.startDate.value,
    end: elements.endDate.value,
    messageTypes,
    maxPages: elements.allHistory.checked ? 2000 : 500,
    embedAvatars: elements.embedAvatars.checked,
    downloadMedia: mediaKinds.length > 0,
    mediaKinds
  };
  try {
    elements.startExport.disabled = true;
    const result = await api("/api/export", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    renderJob(result.job);
    elements.jobPanel.scrollIntoView({ behavior: "smooth", block: "center" });
    pollJob(result.job.id);
  } catch (error) {
    toast(error.message);
    updateSubmitState();
  }
}

elements.openLogin.addEventListener("click", async () => {
  try {
    await api("/api/open-login", { method: "POST", body: "{}" });
    toast("已在 Safari 打开小红书，请完成登录");
  } catch (error) {
    toast(error.message);
  }
});

elements.refreshConnection.addEventListener("click", () =>
  refreshConnection({ showToast: true })
);
elements.reloadConversations.addEventListener("click", loadConversations);
elements.conversationSearch.addEventListener("input", (event) => {
  state.search = event.target.value;
  renderConversations();
});
for (const segment of elements.segments) {
  segment.addEventListener("click", () => {
    state.kindFilter = segment.dataset.kind;
    elements.segments.forEach((item) =>
      item.classList.toggle("is-active", item === segment)
    );
    renderConversations();
  });
}
elements.allHistory.addEventListener("change", setDateMode);
elements.contentChoices.forEach((choice) =>
  choice.addEventListener("change", updateSubmitState)
);
elements.exportForm.addEventListener("submit", startExport);
elements.revealResult.addEventListener("click", async () => {
  if (!state.job) {
    return;
  }
  try {
    await api(`/api/jobs/${state.job.id}/reveal`, {
      method: "POST",
      body: "{}"
    });
  } catch (error) {
    toast(error.message);
  }
});

async function initialize() {
  try {
    setDateMode();
    const config = await api("/api/config");
    state.token = config.token;
    await refreshConnection();
  } catch (error) {
    setConnectionStatus("disconnected", "本地服务异常", error.message);
  }
}

initialize();
