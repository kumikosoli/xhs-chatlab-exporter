import { buildExportArtifact } from "./archive.js";

const CHANNEL = "xhs-chatlab-exporter";
const activeJobs = new Set();
const objectUrls = new Set();

async function report(message) {
  try {
    await chrome.runtime.sendMessage({ channel: CHANNEL, ...message });
  } catch {
    // The service worker will wake for the next progress or completion event.
  }
}

async function runBuild(message) {
  if (activeJobs.has(message.jobId)) {
    return;
  }
  activeJobs.add(message.jobId);
  try {
    const artifact = await buildExportArtifact(message.payload, (progress) => {
      void report({
        type: "OFFSCREEN_PROGRESS",
        tabId: message.tabId,
        jobId: message.jobId,
        ...progress
      });
    });
    const objectUrl = URL.createObjectURL(artifact.blob);
    objectUrls.add(objectUrl);
    await report({
      type: "OFFSCREEN_COMPLETE",
      tabId: message.tabId,
      jobId: message.jobId,
      objectUrl,
      result: artifact.result
    });
  } catch (error) {
    await report({
      type: "OFFSCREEN_FAILED",
      tabId: message.tabId,
      jobId: message.jobId,
      error: error.message
    });
  } finally {
    activeJobs.delete(message.jobId);
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.channel !== CHANNEL) {
    return false;
  }
  if (message.type === "OFFSCREEN_BUILD_EXPORT") {
    void runBuild(message);
    sendResponse({ accepted: true });
    return false;
  }
  if (message.type === "REVOKE_OBJECT_URL" && objectUrls.has(message.objectUrl)) {
    URL.revokeObjectURL(message.objectUrl);
    objectUrls.delete(message.objectUrl);
    sendResponse({ revoked: true });
    return false;
  }
  return false;
});
