import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const MIME_EXTENSIONS = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/gif", ".gif"],
  ["image/webp", ".webp"],
  ["image/avif", ".avif"],
  ["video/mp4", ".mp4"],
  ["video/webm", ".webm"],
  ["audio/mpeg", ".mp3"],
  ["audio/mp4", ".m4a"],
  ["audio/ogg", ".ogg"],
  ["audio/wav", ".wav"]
]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeMimeType(value) {
  return String(value || "")
    .split(";")[0]
    .trim()
    .toLocaleLowerCase();
}

function sniffMimeType(buffer, declaredType, sourceUrl) {
  const declared = normalizeMimeType(declaredType);
  if (MIME_EXTENSIONS.has(declared)) {
    return declared;
  }
  if (buffer.length >= 12) {
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      return "image/jpeg";
    }
    if (
      buffer[0] === 0x89 &&
      buffer.subarray(1, 4).toString("ascii") === "PNG"
    ) {
      return "image/png";
    }
    if (buffer.subarray(0, 3).toString("ascii") === "GIF") {
      return "image/gif";
    }
    if (
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    ) {
      return "image/webp";
    }
    if (buffer.subarray(4, 8).toString("ascii") === "ftyp") {
      return declared.startsWith("audio/") ? "audio/mp4" : "video/mp4";
    }
  }
  try {
    const extension = path.extname(new URL(sourceUrl).pathname).toLocaleLowerCase();
    for (const [mimeType, candidate] of MIME_EXTENSIONS) {
      if (candidate === extension) {
        return mimeType;
      }
    }
  } catch {
    // The caller validates the URL before this point.
  }
  return declared || "application/octet-stream";
}

async function readResponseWithLimit(response, maxBytes) {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) {
    throw new Error(`资源超过大小限制（${declaredLength} bytes）`);
  }
  const chunks = [];
  let total = 0;
  for await (const chunk of response.body) {
    total += chunk.length;
    if (total > maxBytes) {
      await response.body.cancel();
      throw new Error(`资源超过大小限制（>${maxBytes} bytes）`);
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function fetchAsset(sourceUrl, {
  maxBytes = 50 * 1024 * 1024,
  timeoutMilliseconds = 25_000,
  fetchImpl = fetch
} = {}) {
  let parsed;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    throw new Error("资源 URL 无效");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`不支持的资源协议：${parsed.protocol}`);
  }
  const response = await fetchImpl(parsed.href, {
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMilliseconds),
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/*,video/*,audio/*,*/*;q=0.8",
      Referer: "https://www.xiaohongshu.com/",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15"
    }
  });
  if (!response.ok) {
    throw new Error(`下载失败（HTTP ${response.status}）`);
  }
  const buffer = await readResponseWithLimit(response, maxBytes);
  if (buffer.length === 0) {
    throw new Error("资源内容为空");
  }
  const contentType = sniffMimeType(
    buffer,
    response.headers.get("content-type"),
    parsed.href
  );
  return {
    buffer,
    contentType,
    extension: MIME_EXTENSIONS.get(contentType) || ".bin",
    sha256: sha256(buffer)
  };
}

async function mapConcurrent(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, Math.max(1, items.length)) },
      () => runWorker()
    )
  );
  return results;
}

function uniqueAvatarUrls(rawMessages, conversationAvatar) {
  const urls = new Set();
  if (conversationAvatar) {
    urls.add(conversationAvatar);
  }
  for (const message of rawMessages) {
    if (message.avatar) {
      urls.add(message.avatar);
    }
  }
  return Array.from(urls);
}

export async function embedAvatarData(rawMessages, {
  conversationAvatar = "",
  concurrency = 6,
  maxBytes = 5 * 1024 * 1024,
  fetchImpl = fetch,
  onProgress = null
} = {}) {
  const urls = uniqueAvatarUrls(rawMessages, conversationAvatar);
  let completed = 0;
  const results = await mapConcurrent(urls, concurrency, async (sourceUrl) => {
    try {
      const asset = await fetchAsset(sourceUrl, { maxBytes, fetchImpl });
      if (!asset.contentType.startsWith("image/")) {
        throw new Error(`头像不是图片（${asset.contentType}）`);
      }
      return {
        sourceUrl,
        dataUrl: `data:${asset.contentType};base64,${asset.buffer.toString("base64")}`,
        contentType: asset.contentType,
        size: asset.buffer.length,
        sha256: asset.sha256,
        error: null
      };
    } catch (error) {
      return {
        sourceUrl,
        dataUrl: null,
        error: error.message
      };
    } finally {
      completed += 1;
      onProgress?.({ completed, total: urls.length });
    }
  });
  const dataByUrl = new Map(
    results
      .filter((result) => result.dataUrl)
      .map((result) => [result.sourceUrl, result.dataUrl])
  );
  return {
    dataByUrl,
    total: urls.length,
    embedded: dataByUrl.size,
    failed: results.length - dataByUrl.size,
    failures: results
      .filter((result) => result.error)
      .map(({ sourceUrl, error }) => ({ sourceUrl, error }))
  };
}

function folderForKind(kind) {
  switch (kind) {
    case "emoji":
      return "stickers";
    case "card-cover":
      return "card-covers";
    case "video":
      return "videos";
    case "audio":
      return "audio";
    default:
      return "images";
  }
}

function collectMedia(rawMessages) {
  const assets = new Map();
  for (const message of rawMessages) {
    for (const media of message.media || []) {
      if (!media.src) {
        continue;
      }
      const existing = assets.get(media.src);
      if (existing) {
        existing.messageIds.add(message.messageId);
        continue;
      }
      assets.set(media.src, {
        sourceUrl: media.src,
        kind: media.kind || "image",
        alt: media.alt || "",
        messageIds: new Set([message.messageId])
      });
    }
  }
  return Array.from(assets.values());
}

export async function downloadMediaAssets(rawMessages, mediaDirectory, {
  archivePathPrefix = "media",
  concurrency = 6,
  maxBytes = 200 * 1024 * 1024,
  fetchImpl = fetch,
  onProgress = null
} = {}) {
  const assets = collectMedia(rawMessages);
  await mkdir(mediaDirectory, { recursive: true });
  let completed = 0;
  const results = await mapConcurrent(assets, concurrency, async (item) => {
    try {
      const asset = await fetchAsset(item.sourceUrl, { maxBytes, fetchImpl });
      const folder = folderForKind(item.kind);
      const filename = `${sha256(item.sourceUrl).slice(0, 24)}${asset.extension}`;
      const absoluteDirectory = path.join(mediaDirectory, folder);
      const absolutePath = path.join(absoluteDirectory, filename);
      await mkdir(absoluteDirectory, { recursive: true });
      await writeFile(absolutePath, asset.buffer, { mode: 0o600 });
      return {
        originalUrl: item.sourceUrl,
        localPath: path.posix.join(archivePathPrefix, folder, filename),
        kind: item.kind,
        alt: item.alt,
        contentType: asset.contentType,
        size: asset.buffer.length,
        sha256: asset.sha256,
        messageIds: Array.from(item.messageIds),
        error: null
      };
    } catch (error) {
      return {
        originalUrl: item.sourceUrl,
        localPath: null,
        kind: item.kind,
        alt: item.alt,
        messageIds: Array.from(item.messageIds),
        error: error.message
      };
    } finally {
      completed += 1;
      onProgress?.({ completed, total: assets.length });
    }
  });

  const succeeded = results.filter((result) => result.localPath);
  const failures = results.filter((result) => result.error);
  const manifest = {
    version: 1,
    generatedAt: Math.floor(Date.now() / 1000),
    summary: {
      total: results.length,
      downloaded: succeeded.length,
      failed: failures.length,
      totalBytes: succeeded.reduce((sum, item) => sum + item.size, 0)
    },
    assets: succeeded,
    failures
  };
  const manifestPath = path.join(mediaDirectory, "manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600
  });
  return {
    localPathByUrl: new Map(
      succeeded.map((result) => [result.originalUrl, result.localPath])
    ),
    manifest,
    manifestPath,
    ...manifest.summary
  };
}

export function attachMediaArchivePaths(rawMessages, localPathByUrl) {
  return rawMessages.map((message) => ({
    ...message,
    media: (message.media || []).map((item) => ({
      ...item,
      archivePath: localPathByUrl.get(item.src) || null
    }))
  }));
}
