/* xhs-chatlab-exporter v0.4.0 — generated; edit extension-src/ */
(() => {
  // extension-src/background.js
  var CHANNEL = "xhs-chatlab-exporter";
  var OFFSCREEN_PATH = "offscreen.html";
  var creatingOffscreen = null;
  var downloadUrls = /* @__PURE__ */ new Map();
  async function ensureOffscreenDocument() {
    const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_PATH);
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [offscreenUrl]
    });
    if (contexts.length > 0) {
      return;
    }
    if (!creatingOffscreen) {
      creatingOffscreen = chrome.offscreen.createDocument({
        url: OFFSCREEN_PATH,
        reasons: ["BLOBS"],
        justification: "\u5728\u672C\u5730\u751F\u6210\u804A\u5929 JSON/ZIP \u7684 Blob \u4E0B\u8F7D\u6587\u4EF6"
      }).finally(() => {
        creatingOffscreen = null;
      });
    }
    await creatingOffscreen;
  }
  async function forwardToTab(tabId, message) {
    try {
      await chrome.tabs.sendMessage(tabId, {
        channel: CHANNEL,
        ...message
      });
    } catch {
    }
  }
  async function startDownload(message) {
    const downloadId = await chrome.downloads.download({
      url: message.objectUrl,
      filename: message.result.filename,
      conflictAction: "uniquify",
      saveAs: true
    });
    downloadUrls.set(downloadId, message.objectUrl);
    await forwardToTab(message.tabId, {
      type: "EXPORT_COMPLETE",
      jobId: message.jobId,
      result: {
        ...message.result,
        downloadId
      }
    });
  }
  chrome.downloads.onChanged.addListener((delta) => {
    if (!downloadUrls.has(delta.id)) {
      return;
    }
    if (delta.state?.current === "complete" || delta.error?.current) {
      const objectUrl = downloadUrls.get(delta.id);
      downloadUrls.delete(delta.id);
      void chrome.runtime.sendMessage({
        channel: CHANNEL,
        type: "REVOKE_OBJECT_URL",
        objectUrl
      });
    }
  });
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.channel !== CHANNEL) {
      return false;
    }
    if (message.type === "BUILD_EXPORT") {
      const tabId = sender.tab?.id;
      if (!Number.isInteger(tabId)) {
        sendResponse({ accepted: false, error: "\u65E0\u6CD5\u8BC6\u522B\u5C0F\u7EA2\u4E66\u6807\u7B7E\u9875" });
        return false;
      }
      ensureOffscreenDocument().then(
        () => chrome.runtime.sendMessage({
          channel: CHANNEL,
          type: "OFFSCREEN_BUILD_EXPORT",
          tabId,
          jobId: message.jobId,
          payload: message.payload
        })
      ).then((result) => sendResponse(result || { accepted: true })).catch((error) => sendResponse({ accepted: false, error: error.message }));
      return true;
    }
    if (message.type === "OFFSCREEN_PROGRESS") {
      void forwardToTab(message.tabId, {
        type: "EXPORT_PROGRESS",
        jobId: message.jobId,
        stage: message.stage,
        detail: message.detail,
        progress: message.progress || null
      });
      sendResponse({ received: true });
      return false;
    }
    if (message.type === "OFFSCREEN_COMPLETE") {
      startDownload(message).catch(async (error) => {
        await forwardToTab(message.tabId, {
          type: "EXPORT_FAILED",
          jobId: message.jobId,
          error: `\u6D4F\u89C8\u5668\u4E0B\u8F7D\u5931\u8D25\uFF1A${error.message}`
        });
        void chrome.runtime.sendMessage({
          channel: CHANNEL,
          type: "REVOKE_OBJECT_URL",
          objectUrl: message.objectUrl
        });
      });
      sendResponse({ received: true });
      return false;
    }
    if (message.type === "OFFSCREEN_FAILED") {
      void forwardToTab(message.tabId, {
        type: "EXPORT_FAILED",
        jobId: message.jobId,
        error: message.error
      });
      sendResponse({ received: true });
      return false;
    }
    return false;
  });
})();
