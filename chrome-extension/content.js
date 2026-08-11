/* xhs-chatlab-exporter v0.4.0 — generated; edit extension-src/ */
(() => {
  // src/page-scripts.js
  function listConversationsPage() {
    const items = Array.from(document.querySelectorAll(".xhs-im-conv-item")).map((element) => ({
      id: element.dataset.convId || "",
      kind: element.dataset.convKind || "",
      name: element.querySelector(".xhs-im-conv-item__name")?.textContent?.trim() || element.querySelector(".xhs-im-conv-item__avatar")?.alt || "",
      avatar: element.querySelector(".xhs-im-conv-item__avatar")?.src || "",
      active: element.classList.contains("xhs-im-conv-item--active")
    }));
    const scroller = document.querySelector(".xhs-im-conv-list__scroll");
    return {
      items,
      scroll: scroller ? {
        top: scroller.scrollTop,
        height: scroller.scrollHeight,
        clientHeight: scroller.clientHeight
      } : null
    };
  }
  function scrollConversationListPage({ position = "next" } = {}) {
    const scroller = document.querySelector(".xhs-im-conv-list__scroll");
    if (!scroller) {
      return { changed: false, top: 0, height: 0, clientHeight: 0 };
    }
    const before = scroller.scrollTop;
    if (position === "top") {
      scroller.scrollTop = 0;
    } else {
      scroller.scrollTop = Math.min(
        scroller.scrollHeight,
        scroller.scrollTop + Math.max(200, scroller.clientHeight * 0.85)
      );
    }
    scroller.dispatchEvent(new Event("scroll", { bubbles: true }));
    return {
      changed: scroller.scrollTop !== before,
      top: scroller.scrollTop,
      height: scroller.scrollHeight,
      clientHeight: scroller.clientHeight
    };
  }
  function selectConversationPage({ id }) {
    const element = Array.from(document.querySelectorAll(".xhs-im-conv-item")).find(
      (item) => item.dataset.convId === String(id)
    );
    if (!element) {
      return { selected: false };
    }
    element.click();
    return { selected: true };
  }
  function conversationStatePage() {
    const active = document.querySelector(".xhs-im-conv-item--active");
    const firstMessage = document.querySelector(".chat-item[data-message-id]");
    const pathId = decodeURIComponent(location.pathname.split("/").filter(Boolean).at(-1) || "");
    const id = active?.dataset.convId || pathId;
    let kind = active?.dataset.convKind || "";
    if (!kind && firstMessage?.dataset.messageId) {
      kind = firstMessage.dataset.messageId.split(".").length === 2 ? "group" : "c2c";
    }
    return {
      href: location.href,
      id,
      kind,
      name: document.querySelector(".xhs-im-chat-window__header-name")?.textContent?.trim() || active?.querySelector(".xhs-im-conv-item__name")?.textContent?.trim() || id,
      avatar: active?.querySelector(".xhs-im-conv-item__avatar")?.src || "",
      messageListReady: Boolean(document.querySelector(".xhs-im-msg-list")),
      messageCount: document.querySelectorAll(".chat-item[data-message-id]").length
    };
  }
  function historyStatePage() {
    const messages = Array.from(document.querySelectorAll(".chat-item[data-message-id]"));
    const list = document.querySelector(".xhs-im-msg-list");
    return {
      count: messages.length,
      firstMessageId: messages[0]?.dataset.messageId || null,
      lastMessageId: messages.at(-1)?.dataset.messageId || null,
      scrollTop: list?.scrollTop ?? null,
      scrollHeight: list?.scrollHeight ?? null,
      clientHeight: list?.clientHeight ?? null
    };
  }
  function scrollHistoryToTopPage() {
    const list = document.querySelector(".xhs-im-msg-list");
    if (!list) {
      return { scrolled: false };
    }
    list.scrollTop = Math.min(1, list.scrollHeight);
    list.dispatchEvent(new Event("scroll", { bubbles: true }));
    list.scrollTop = 0;
    list.dispatchEvent(new Event("scroll", { bubbles: true }));
    return { scrolled: true, scrollTop: list.scrollTop };
  }
  function extractMessagesPage() {
    function clean(value) {
      return String(value || "").replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    }
    function textWithInlineAssets(element) {
      if (!element) {
        return "";
      }
      const copy = element.cloneNode(true);
      for (const image of copy.querySelectorAll("img")) {
        image.replaceWith(document.createTextNode(image.alt || "[\u56FE\u7247]"));
      }
      for (const br of copy.querySelectorAll("br")) {
        br.replaceWith(document.createTextNode("\n"));
      }
      return clean(copy.textContent);
    }
    return Array.from(document.querySelectorAll(".chat-item[data-message-id]")).map(
      (element, sequence) => {
        const right = Boolean(element.querySelector(".chat-item__content--right"));
        const left = Boolean(element.querySelector(".chat-item__content--left"));
        const avatarElement = element.querySelector(".chat-item__avatar-img");
        const textElement = element.querySelector(".xhs-im-bubble__text");
        const hintElement = element.querySelector(".xhs-im-hint__text");
        const referenceElement = element.querySelector(".chat-item__ref");
        const referenceSender = element.querySelector(".chat-item__ref-sender");
        const referenceContent = element.querySelector(".chat-item__ref-content");
        const cardTitle = element.querySelector(".xhs-im-bubble-card-note-title");
        const cardAuthor = element.querySelector(".xhs-im-bubble-card-note-author-name");
        const media = Array.from(
          element.querySelectorAll(
            ".xhs-im-bubble__image, .xhs-im-bubble__emoji, .xhs-im-bubble-card-note-cover, video, audio"
          )
        ).map((asset) => ({
          kind: asset.tagName === "VIDEO" ? "video" : asset.tagName === "AUDIO" ? "audio" : asset.classList.contains("xhs-im-bubble__emoji") ? "emoji" : asset.classList.contains("xhs-im-bubble-card-note-cover") ? "card-cover" : "image",
          src: asset.currentSrc || asset.src || "",
          alt: asset.alt || ""
        }));
        const links = Array.from(element.querySelectorAll(".chat-item__bubble a[href]")).map((link) => link.href).filter(Boolean);
        return {
          sequence,
          messageId: element.dataset.messageId || "",
          contentType: element.dataset.contentType || "",
          direction: right ? "right" : left ? "left" : "system",
          senderName: element.querySelector(".chat-item__nickname")?.textContent?.trim() || (avatarElement?.alt === "\u6211\u7684\u5934\u50CF" ? "" : avatarElement?.alt || ""),
          avatar: avatarElement?.src || "",
          text: textWithInlineAssets(textElement),
          hint: textWithInlineAssets(hintElement),
          fallbackText: clean(element.innerText),
          quote: referenceElement ? {
            sender: clean(referenceSender?.textContent).replace(/[:：]\s*$/, ""),
            content: textWithInlineAssets(referenceContent) || textWithInlineAssets(referenceElement)
          } : null,
          card: cardTitle ? {
            title: clean(cardTitle.textContent),
            author: clean(cardAuthor?.textContent)
          } : null,
          media,
          links
        };
      }
    );
  }

  // src/time.js
  var XHS_MESSAGE_EPOCH = 0x180000000n;
  var XHS_TIMESTAMP_SHIFT = 24n;
  function decodeXhsMessageTimestamp(messageId) {
    const segment = String(messageId ?? "").split(".").at(-1);
    if (!segment || !/^[0-9a-f]+$/i.test(segment)) {
      throw new Error(`\u65E0\u6CD5\u4ECE\u6D88\u606F ID \u89E3\u7801\u65F6\u95F4\uFF1A${messageId}`);
    }
    const encoded = BigInt(`0x${segment}`);
    const timestamp = (encoded >> XHS_TIMESTAMP_SHIFT) - XHS_MESSAGE_EPOCH;
    if (timestamp < 0n || timestamp > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error(`\u6D88\u606F ID \u4E2D\u7684\u65F6\u95F4\u8D85\u51FA\u6709\u6548\u8303\u56F4\uFF1A${messageId}`);
    }
    return Number(timestamp);
  }
  function validateTimeZone(timeZone) {
    try {
      new Intl.DateTimeFormat("en", { timeZone }).format(0);
    } catch {
      throw new Error(`\u65E0\u6548\u7684 IANA \u65F6\u533A\uFF1A${timeZone}`);
    }
  }
  function zonedParts(epochMilliseconds, timeZone) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    });
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(epochMilliseconds)).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)])
    );
    return parts;
  }
  function offsetAt(epochMilliseconds, timeZone) {
    const parts = zonedParts(epochMilliseconds, timeZone);
    const representedAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );
    return representedAsUtc - Math.trunc(epochMilliseconds / 1e3) * 1e3;
  }
  function localPartsToEpoch(parts, timeZone) {
    const wallClockAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );
    let epoch = wallClockAsUtc;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      epoch = wallClockAsUtc - offsetAt(epoch, timeZone);
    }
    const roundTrip = zonedParts(epoch, timeZone);
    for (const key of ["year", "month", "day", "hour", "minute", "second"]) {
      if (roundTrip[key] !== parts[key]) {
        throw new Error("\u7ED9\u5B9A\u65F6\u95F4\u5728\u8BE5\u65F6\u533A\u4E2D\u4E0D\u5B58\u5728\u6216\u5B58\u5728\u590F\u4EE4\u65F6\u6B67\u4E49\uFF0C\u8BF7\u6539\u7528\u5E26\u65F6\u533A\u504F\u79FB\u7684 ISO \u65F6\u95F4");
      }
    }
    return Math.floor(epoch / 1e3);
  }
  function parseTimeBoundary(value, {
    timeZone = "Asia/Shanghai",
    endOfRange = false
  } = {}) {
    if (value === void 0 || value === null || value === "") {
      return null;
    }
    validateTimeZone(timeZone);
    const source = String(value).trim();
    if (/^\d{10}$/.test(source)) {
      return Number(source);
    }
    if (/^\d{13}$/.test(source)) {
      return Math.floor(Number(source) / 1e3);
    }
    const hasExplicitZone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(source);
    if (hasExplicitZone) {
      const parsed = Date.parse(source);
      if (!Number.isFinite(parsed)) {
        throw new Error(`\u65E0\u6CD5\u89E3\u6790\u65F6\u95F4\uFF1A${value}`);
      }
      return Math.floor(parsed / 1e3);
    }
    const match = source.match(
      /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/
    );
    if (!match) {
      throw new Error(
        `\u65E0\u6CD5\u89E3\u6790\u65F6\u95F4\u201C${value}\u201D\uFF1B\u8BF7\u4F7F\u7528 YYYY-MM-DD\u3001YYYY-MM-DDTHH:mm:ss\u3001\u5E26\u504F\u79FB\u7684 ISO \u65F6\u95F4\u6216 Unix \u65F6\u95F4\u6233`
      );
    }
    const hasClock = match[4] !== void 0;
    const hasSeconds = match[6] !== void 0;
    const parts = {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
      hour: hasClock ? Number(match[4]) : endOfRange ? 23 : 0,
      minute: hasClock ? Number(match[5]) : endOfRange ? 59 : 0,
      second: hasSeconds ? Number(match[6]) : endOfRange ? 59 : 0
    };
    const normalized = new Date(
      Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
    );
    if (normalized.getUTCFullYear() !== parts.year || normalized.getUTCMonth() + 1 !== parts.month || normalized.getUTCDate() !== parts.day || normalized.getUTCHours() !== parts.hour || normalized.getUTCMinutes() !== parts.minute || normalized.getUTCSeconds() !== parts.second) {
      throw new Error(`\u65E0\u6548\u7684\u65E5\u671F\u6216\u65F6\u95F4\uFF1A${value}`);
    }
    return localPartsToEpoch(parts, timeZone);
  }
  function formatEpoch(timestamp, timeZone = "Asia/Shanghai") {
    validateTimeZone(timeZone);
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    }).format(new Date(timestamp * 1e3));
  }

  // extension-src/content.js
  var CHANNEL = "xhs-chatlab-exporter";
  var TIME_ZONE = "Asia/Shanghai";
  var ALLOWED_TYPES = /* @__PURE__ */ new Set([
    0,
    1,
    2,
    3,
    4,
    5,
    7,
    8,
    20,
    21,
    22,
    23,
    24,
    25,
    26,
    27,
    80,
    81,
    99
  ]);
  var currentJob = null;
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
    const selfName = String(value?.selfName || "\u6211").trim();
    const messageTypes = Array.isArray(value?.messageTypes) ? Array.from(new Set(value.messageTypes.map(Number))) : [];
    if (!/^(?:\d+|[0-9a-f]{24})$/i.test(conversationId)) {
      throw new Error("\u4F1A\u8BDD ID \u65E0\u6548");
    }
    if (!conversationName || conversationName.length > 120) {
      throw new Error("\u4F1A\u8BDD\u540D\u79F0\u65E0\u6548");
    }
    if (!kind) {
      throw new Error("\u4F1A\u8BDD\u7C7B\u578B\u65E0\u6548");
    }
    if (!selfName || selfName.length > 100) {
      throw new Error("\u81EA\u5DF1\u7684\u663E\u793A\u540D\u79F0\u65E0\u6548");
    }
    if (messageTypes.length === 0 || messageTypes.some((type) => !Number.isInteger(type) || !ALLOWED_TYPES.has(type))) {
      throw new Error("\u8BF7\u81F3\u5C11\u9009\u62E9\u4E00\u79CD\u6709\u6548\u6D88\u606F\u7C7B\u578B");
    }
    const startTimestamp = value.allHistory ? null : parseTimeBoundary(value.start, { timeZone: TIME_ZONE });
    const endTimestamp = value.allHistory ? null : parseTimeBoundary(value.end, { timeZone: TIME_ZONE, endOfRange: true });
    if (startTimestamp !== null && endTimestamp !== null && startTimestamp > endTimestamp) {
      throw new Error("\u5F00\u59CB\u65E5\u671F\u4E0D\u80FD\u665A\u4E8E\u7ED3\u675F\u65E5\u671F");
    }
    const maxPages = Number(value.maxPages || (value.allHistory ? 2e3 : 500));
    if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 1e4) {
      throw new Error("\u6700\u5927\u52A0\u8F7D\u9875\u6570\u5FC5\u987B\u5728 1 \u5230 10000 \u4E4B\u95F4");
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
    const collected = /* @__PURE__ */ new Map();
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
    return Array.from(collected.values()).sort(
      (left, right) => left.name.localeCompare(right.name, "zh-CN")
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
    throw new Error("\u4FA7\u680F\u4E2D\u627E\u4E0D\u5230\u6240\u9009\u4F1A\u8BDD\uFF0C\u8BF7\u5237\u65B0\u4F1A\u8BDD\u5217\u8868\u540E\u91CD\u8BD5");
  }
  async function waitForConversation(id) {
    const deadline = Date.now() + 2e4;
    let latest = null;
    while (Date.now() < deadline) {
      latest = conversationStatePage();
      if (latest.id === String(id) && latest.messageListReady) {
        return latest;
      }
      await sleep(250);
    }
    throw new Error(`\u7B49\u5F85\u4F1A\u8BDD\u9875\u9762\u8D85\u65F6\uFF08\u5F53\u524D ${latest?.id || "\u672A\u77E5"}\uFF09`);
  }
  async function waitForHistoryProgress(before) {
    const deadline = Date.now() + 5e3;
    await sleep(800);
    let latest = historyStatePage();
    while (Date.now() < deadline) {
      if (latest.firstMessageId !== before.firstMessageId || latest.count !== before.count) {
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
        `\u5DF2\u8BFB\u53D6 ${state.count} \u6761\uFF0C\u6700\u65E9 ${formatEpoch(earliest, TIME_ZONE)}`,
        { completed: loadedPages, total: null }
      );
      if (startTimestamp !== null && earliest <= startTimestamp) {
        break;
      }
      if (loadedPages >= maxPages) {
        throw new Error(`\u5DF2\u8FBE\u5230\u6700\u5927\u52A0\u8F7D\u9875\u6570 ${maxPages}\uFF0C\u4E3A\u907F\u514D\u4E0D\u5B8C\u6574\u5BFC\u51FA\u5DF2\u505C\u6B62`);
      }
      const before = state;
      scrollHistoryToTopPage();
      state = await waitForHistoryProgress(before);
      loadedPages += 1;
      const progressed = state.firstMessageId !== before.firstMessageId || state.count !== before.count;
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
      setJobProgress("opening-conversation", "\u6B63\u5728\u6253\u5F00\u6240\u9009\u4F1A\u8BDD\u2026");
      await selectConversation(settings.conversationId);
      const state = await waitForConversation(settings.conversationId);
      const pageKind = normalizedKind(state.kind);
      if (pageKind && pageKind !== settings.kind) {
        throw new Error(`\u4F1A\u8BDD\u7C7B\u578B\u4E0D\u5339\u914D\uFF1A\u9875\u9762\u4E3A ${pageKind}\uFF0C\u6240\u9009\u4E3A ${settings.kind}`);
      }
      await loadHistory(settings);
      setJobProgress("extracting", "\u6B63\u5728\u8BFB\u53D6\u9875\u9762\u4E2D\u7684\u804A\u5929\u6D88\u606F\u2026");
      const rawMessages = extractMessagesPage();
      if (rawMessages.length === 0) {
        throw new Error("\u9875\u9762\u4E2D\u6CA1\u6709\u53EF\u5BFC\u51FA\u7684\u6D88\u606F");
      }
      setJobProgress("preparing-assets", "\u6B63\u5728\u51C6\u5907\u672C\u5730\u5F52\u6863\u2026");
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
        throw new Error(response?.error || "\u6269\u5C55\u540E\u53F0\u672A\u63A5\u53D7\u5F52\u6863\u4EFB\u52A1");
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
          throw new Error("\u5DF2\u6709\u5BFC\u51FA\u4EFB\u52A1\u6B63\u5728\u8FD0\u884C");
        }
        const settings = validateSettings(message.settings);
        currentJob = {
          id: crypto.randomUUID(),
          status: "running",
          stage: "queued",
          detail: "\u4EFB\u52A1\u5DF2\u521B\u5EFA",
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
          currentJob.detail = "\u6587\u4EF6\u5DF2\u4EA4\u7ED9\u6D4F\u89C8\u5668\u4E0B\u8F7D";
          currentJob.progress = null;
          currentJob.result = message.result;
          currentJob.updatedAt = Date.now();
        }
        return { received: true };
      case "EXPORT_FAILED":
        if (currentJob?.id === message.jobId) {
          currentJob.status = "failed";
          currentJob.stage = "failed";
          currentJob.error = message.error || "\u5BFC\u51FA\u5931\u8D25";
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
    handleMessage(message).then((result) => sendResponse({ ok: true, ...result })).catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  });
})();
