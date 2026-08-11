import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { strFromU8, unzipSync } from "fflate";

import { buildExportArtifact } from "../extension-src/archive.js";

const MESSAGE_ID =
  "6065b24c0000000001008cb9.62a4ea3d0000000021022482.1ea579d4138a467";

function exportPayload(overrides = {}) {
  return {
    rawMessages: [
      {
        sequence: 0,
        messageId: MESSAGE_ID,
        contentType: "2",
        direction: "left",
        senderName: "测试联系人",
        avatar: "https://static.example/avatar.png",
        text: "",
        hint: "",
        fallbackText: "[图片]",
        quote: null,
        card: null,
        media: [
          {
            kind: "image",
            src: "https://static.example/message.png",
            alt: "测试图片"
          }
        ],
        links: []
      }
    ],
    conversationId: "62a4ea3d0000000021022482",
    conversationKind: "private",
    conversationName: "测试联系人",
    conversationAvatar: "https://static.example/avatar.png",
    selfName: "我",
    startTimestamp: null,
    endTimestamp: null,
    includeMessageTypes: [1],
    embedAvatars: true,
    downloadMedia: true,
    ...overrides
  };
}

test("extension manifest is loadable and limited to expected permissions", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../chrome-extension/manifest.json", import.meta.url), "utf8")
  );
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version, "0.4.0");
  assert.deepEqual(manifest.permissions.sort(), [
    "activeTab",
    "downloads",
    "offscreen",
    "storage"
  ]);
  assert.equal(manifest.content_scripts[0].matches[0], "https://www.xiaohongshu.com/chat*");
});

test("browser archive embeds avatars and packages media with a manifest", async () => {
  const originalFetch = globalThis.fetch;
  const png = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0, 0, 0, 0, 0, 0, 0, 0
  ]);
  globalThis.fetch = async () =>
    new Response(png, {
      status: 200,
      headers: {
        "content-type": "image/png",
        "content-length": String(png.length)
      }
    });
  const stages = [];
  try {
    const artifact = await buildExportArtifact(exportPayload(), (progress) => {
      stages.push(progress.stage);
    });
    assert.equal(artifact.result.packageType, "zip");
    assert.equal(artifact.result.messageCount, 1);
    assert.equal(artifact.result.embeddedAvatarCount, 1);
    assert.deepEqual(artifact.result.media, {
      total: 1,
      downloaded: 1,
      failed: 0,
      totalBytes: png.length
    });

    const files = unzipSync(new Uint8Array(await artifact.blob.arrayBuffer()));
    const names = Object.keys(files);
    const chatlabName = names.find((name) => name.endsWith("/chatlab.json"));
    const manifestName = names.find((name) => name.endsWith("/media/manifest.json"));
    const imageName = names.find((name) => name.includes("/media/images/"));
    assert.ok(chatlabName);
    assert.ok(manifestName);
    assert.ok(imageName);

    const chatlab = JSON.parse(strFromU8(files[chatlabName]));
    const manifest = JSON.parse(strFromU8(files[manifestName]));
    assert.match(chatlab.members[0].avatar, /^data:image\/png;base64,/);
    assert.match(chatlab.messages[0].content, /\[本地文件\] media\/images\//);
    assert.equal(manifest.assets.length, 1);
    assert.equal(manifest.failures.length, 0);
    assert.ok(stages.includes("embedding-avatars"));
    assert.ok(stages.includes("downloading-media"));
    assert.ok(stages.includes("packaging"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
