const CHANNEL = "xhs-chatlab-exporter";
const OFFSCREEN_PATH = "offscreen.html";

let creatingOffscreen = null;
const downloadUrls = new Map();

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
    creatingOffscreen = chrome.offscreen
      .createDocument({
        url: OFFSCREEN_PATH,
        reasons: ["BLOBS"],
        justification: "在本地生成聊天 JSON/ZIP 的 Blob 下载文件"
      })
      .finally(() => {
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
    // The page may have been closed after the export was started.
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
      sendResponse({ accepted: false, error: "无法识别小红书标签页" });
      return false;
    }
    ensureOffscreenDocument()
      .then(() =>
        chrome.runtime.sendMessage({
          channel: CHANNEL,
          type: "OFFSCREEN_BUILD_EXPORT",
          tabId,
          jobId: message.jobId,
          payload: message.payload
        })
      )
      .then((result) => sendResponse(result || { accepted: true }))
      .catch((error) => sendResponse({ accepted: false, error: error.message }));
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
        error: `浏览器下载失败：${error.message}`
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
