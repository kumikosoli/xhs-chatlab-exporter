import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  attachMediaArchivePaths,
  downloadMediaAssets,
  embedAvatarData,
  fetchAsset
} from "../src/media.js";

const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

async function withAssetServer(run) {
  const server = createServer((request, response) => {
    if (request.url === "/image.png") {
      response.writeHead(200, {
        "Content-Type": "image/png",
        "Content-Length": ONE_PIXEL_PNG.length
      });
      response.end(ONE_PIXEL_PNG);
      return;
    }
    response.writeHead(404, { "Content-Type": "text/plain" });
    response.end("missing");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    await run(baseUrl);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function rawMessage(media, avatar = "") {
  return {
    messageId: "conversation.1ea579c880b02fc",
    avatar,
    media
  };
}

test("downloads an asset and detects its image type", async () => {
  await withAssetServer(async (baseUrl) => {
    const asset = await fetchAsset(`${baseUrl}/image.png`);
    assert.equal(asset.contentType, "image/png");
    assert.equal(asset.extension, ".png");
    assert.deepEqual(asset.buffer, ONE_PIXEL_PNG);
  });
});

test("embeds available avatars while reporting failures", async () => {
  await withAssetServer(async (baseUrl) => {
    const good = `${baseUrl}/image.png`;
    const missing = `${baseUrl}/missing.png`;
    const result = await embedAvatarData(
      [rawMessage([], good), rawMessage([], missing)]
    );
    assert.equal(result.total, 2);
    assert.equal(result.embedded, 1);
    assert.equal(result.failed, 1);
    assert.match(result.dataByUrl.get(good), /^data:image\/png;base64,/);
  });
});

test("writes media files, manifest and archive-relative paths", async () => {
  await withAssetServer(async (baseUrl) => {
    const directory = await mkdtemp(path.join(tmpdir(), "xhs-media-test-"));
    try {
      const good = `${baseUrl}/image.png`;
      const missing = `${baseUrl}/missing.png`;
      const messages = [
        rawMessage([
          { kind: "image", src: good, alt: "good" },
          { kind: "emoji", src: missing, alt: "missing" }
        ])
      ];
      const result = await downloadMediaAssets(messages, directory, {
        archivePathPrefix: "media"
      });
      assert.equal(result.total, 2);
      assert.equal(result.downloaded, 1);
      assert.equal(result.failed, 1);
      const localPath = result.localPathByUrl.get(good);
      assert.match(localPath, /^media\/images\/.+\.png$/);
      const absolutePath = path.join(
        directory,
        localPath.replace(/^media\//, "")
      );
      assert.deepEqual(await readFile(absolutePath), ONE_PIXEL_PNG);

      const manifest = JSON.parse(
        await readFile(path.join(directory, "manifest.json"), "utf8")
      );
      assert.equal(manifest.summary.downloaded, 1);
      assert.equal(manifest.failures.length, 1);

      const decorated = attachMediaArchivePaths(
        messages,
        result.localPathByUrl
      );
      assert.equal(decorated[0].media[0].archivePath, localPath);
      assert.equal(decorated[0].media[1].archivePath, null);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
