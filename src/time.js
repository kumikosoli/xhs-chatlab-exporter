const XHS_MESSAGE_EPOCH = 0x180000000n;
const XHS_TIMESTAMP_SHIFT = 24n;

export function decodeXhsMessageTimestamp(messageId) {
  const segment = String(messageId ?? "").split(".").at(-1);
  if (!segment || !/^[0-9a-f]+$/i.test(segment)) {
    throw new Error(`无法从消息 ID 解码时间：${messageId}`);
  }

  const encoded = BigInt(`0x${segment}`);
  const timestamp = (encoded >> XHS_TIMESTAMP_SHIFT) - XHS_MESSAGE_EPOCH;
  if (timestamp < 0n || timestamp > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`消息 ID 中的时间超出有效范围：${messageId}`);
  }
  return Number(timestamp);
}

function validateTimeZone(timeZone) {
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format(0);
  } catch {
    throw new Error(`无效的 IANA 时区：${timeZone}`);
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
    formatter
      .formatToParts(new Date(epochMilliseconds))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
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
  return representedAsUtc - Math.trunc(epochMilliseconds / 1000) * 1000;
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
      throw new Error("给定时间在该时区中不存在或存在夏令时歧义，请改用带时区偏移的 ISO 时间");
    }
  }
  return Math.floor(epoch / 1000);
}

export function parseTimeBoundary(value, {
  timeZone = "Asia/Shanghai",
  endOfRange = false
} = {}) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  validateTimeZone(timeZone);
  const source = String(value).trim();

  if (/^\d{10}$/.test(source)) {
    return Number(source);
  }
  if (/^\d{13}$/.test(source)) {
    return Math.floor(Number(source) / 1000);
  }

  const hasExplicitZone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(source);
  if (hasExplicitZone) {
    const parsed = Date.parse(source);
    if (!Number.isFinite(parsed)) {
      throw new Error(`无法解析时间：${value}`);
    }
    return Math.floor(parsed / 1000);
  }

  const match = source.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (!match) {
    throw new Error(
      `无法解析时间“${value}”；请使用 YYYY-MM-DD、YYYY-MM-DDTHH:mm:ss、带偏移的 ISO 时间或 Unix 时间戳`
    );
  }

  const hasClock = match[4] !== undefined;
  const hasSeconds = match[6] !== undefined;
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
  if (
    normalized.getUTCFullYear() !== parts.year ||
    normalized.getUTCMonth() + 1 !== parts.month ||
    normalized.getUTCDate() !== parts.day ||
    normalized.getUTCHours() !== parts.hour ||
    normalized.getUTCMinutes() !== parts.minute ||
    normalized.getUTCSeconds() !== parts.second
  ) {
    throw new Error(`无效的日期或时间：${value}`);
  }

  return localPartsToEpoch(parts, timeZone);
}

export function formatEpoch(timestamp, timeZone = "Asia/Shanghai") {
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
  }).format(new Date(timestamp * 1000));
}
