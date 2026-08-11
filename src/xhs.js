import { assertValidChatLab } from "./chatlab.js";
import { sha256Hex } from "./sha256.js";
import { decodeXhsMessageTimestamp } from "./time.js";

function digest(value) {
  return sha256Hex(String(value)).slice(0, 20);
}

function avatarIdentity(avatar) {
  if (!avatar) {
    return "";
  }
  try {
    const parsed = new URL(avatar);
    return parsed.pathname.replace(/\/+$/, "").split("/").at(-1) || parsed.pathname;
  } catch {
    return avatar;
  }
}

function compactLines(values) {
  return values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join("\n");
}

function mediaItems(raw, kind) {
  return (raw.media || [])
    .filter((item) => !kind || item.kind === kind)
    .filter((item) => item.src || item.archivePath);
}

function mediaLines(raw, kind, label) {
  return mediaItems(raw, kind).flatMap((item) => [
    item.src ? `[${label}] ${item.src}` : "",
    item.archivePath ? `[本地文件] ${item.archivePath}` : ""
  ]);
}

function contentFor(raw, type) {
  const baseText = raw.text || raw.hint || "";
  if (type === 25) {
    const reference = raw.quote
      ? `[回复 ${raw.quote.sender || "某人"}：${raw.quote.content || ""}]`
      : "";
    return compactLines([baseText || raw.fallbackText, reference]) || null;
  }
  if (type === 1) {
    return compactLines([
      raw.text,
      mediaLines(raw, "image", "图片")
    ]) || "[图片]";
  }
  if (type === 2) {
    return compactLines([
      raw.text,
      mediaLines(raw, "audio", "语音")
    ]) || "[语音]";
  }
  if (type === 3) {
    return compactLines([
      raw.text,
      mediaLines(raw, "video", "视频")
    ]) || "[视频]";
  }
  if (type === 5) {
    return compactLines([
      raw.text,
      mediaItems(raw, "emoji").flatMap((item) => [
        item.src
          ? `[表情${item.alt ? `：${item.alt}` : ""}] ${item.src}`
          : "",
        item.archivePath ? `[本地文件] ${item.archivePath}` : ""
      ])
    ]) || "[表情]";
  }
  if (type === 24 || type === 7) {
    const card = raw.card
      ? `[小红书笔记] ${raw.card.title}${raw.card.author ? ` — ${raw.card.author}` : ""}`
      : "";
    return compactLines([
      baseText,
      card,
      mediaLines(raw, "card-cover", "封面"),
      (raw.links || []).map((url) => `[链接] ${url}`)
    ]) || "[分享]";
  }
  if (type === 80 || type === 81) {
    return raw.hint || raw.fallbackText || (type === 81 ? "[撤回消息]" : "[系统消息]");
  }
  return (
    compactLines([
      baseText || raw.fallbackText,
      (raw.media || []).flatMap((item) => [
        item.src ? `[${item.kind}] ${item.src}` : "",
        item.archivePath ? `[本地文件] ${item.archivePath}` : ""
      ]),
      (raw.links || []).map((url) => `[链接] ${url}`)
    ]) || `[小红书消息：原类型 ${raw.contentType || "未知"}]`
  );
}

function chatLabType(raw) {
  const systemText = raw.hint || raw.fallbackText || "";
  if (raw.direction === "system" || ["4", "10"].includes(String(raw.contentType))) {
    return /撤回/.test(systemText) ? 81 : 80;
  }
  if (raw.quote) {
    return 25;
  }
  if ((raw.media || []).some((item) => item.kind === "video")) {
    return 3;
  }
  if ((raw.media || []).some((item) => item.kind === "audio")) {
    return 2;
  }
  switch (String(raw.contentType)) {
    case "1":
      return 0;
    case "2":
      return 1;
    case "3":
      return 24;
    case "13":
    case "16":
      return 5;
    default:
      return 99;
  }
}

function makeSenderResolver({
  conversationId,
  conversationKind,
  conversationName,
  selfName
}) {
  let selfId = null;
  return function resolve(raw) {
    if (raw.direction === "system") {
      return {
        platformId: "SYSTEM",
        accountName: "系统",
        groupNickname: null,
        avatarUrl: ""
      };
    }

    if (raw.direction === "right") {
      if (!selfId) {
        const key = avatarIdentity(raw.avatar) || selfName;
        selfId = `xhs-user-${digest(`self:${key}`)}`;
      }
      return {
        platformId: selfId,
        accountName: selfName,
        groupNickname: conversationKind === "group" ? selfName : null,
        avatarUrl: raw.avatar || ""
      };
    }

    if (conversationKind === "private") {
      return {
        platformId: `xhs-user-${conversationId}`,
        accountName: raw.senderName || conversationName,
        groupNickname: null,
        avatarUrl: raw.avatar || ""
      };
    }

    const name = raw.senderName || "未知成员";
    const key = avatarIdentity(raw.avatar) || name;
    return {
      platformId: `xhs-user-${digest(`group-member:${key}`)}`,
      accountName: name,
      groupNickname: name,
      avatarUrl: raw.avatar || ""
    };
  };
}

export function toChatLab(rawMessages, {
  conversationId,
  conversationKind,
  conversationName,
  selfName = "我",
  startTimestamp = null,
  endTimestamp = null,
  includeMessageTypes = null,
  avatarDataByUrl = null,
  conversationAvatar = "",
  exportedAt = Math.floor(Date.now() / 1000)
}) {
  if (!["private", "group"].includes(conversationKind)) {
    throw new Error(`无法识别会话类型：${conversationKind || "空"}`);
  }
  const resolveSender = makeSenderResolver({
    conversationId,
    conversationKind,
    conversationName,
    selfName
  });
  const includedTypes =
    includeMessageTypes === null ? null : new Set(includeMessageTypes);
  const seenMessageIds = new Set();
  const members = new Map();

  const messages = rawMessages
    .map((raw) => ({
      raw,
      timestamp: decodeXhsMessageTimestamp(raw.messageId)
    }))
    .filter(({ timestamp }) => startTimestamp === null || timestamp >= startTimestamp)
    .filter(({ timestamp }) => endTimestamp === null || timestamp <= endTimestamp)
    .sort((left, right) => left.timestamp - right.timestamp || left.raw.sequence - right.raw.sequence)
    .flatMap(({ raw, timestamp }) => {
      if (seenMessageIds.has(raw.messageId)) {
        return [];
      }
      seenMessageIds.add(raw.messageId);
      const sender = resolveSender(raw);
      const type = chatLabType(raw);
      if (includedTypes !== null && !includedTypes.has(type)) {
        return [];
      }
      if (sender.platformId !== "SYSTEM") {
        const member = {
          platformId: sender.platformId,
          accountName: sender.accountName
        };
        if (sender.groupNickname) {
          member.groupNickname = sender.groupNickname;
        }
        const embeddedAvatar = avatarDataByUrl?.get(sender.avatarUrl);
        if (embeddedAvatar) {
          member.avatar = embeddedAvatar;
        }
        const existing = members.get(sender.platformId);
        members.set(sender.platformId, {
          ...existing,
          ...member,
          ...(member.avatar || !existing?.avatar ? {} : { avatar: existing.avatar })
        });
      }
      const message = {
        platformMessageId: raw.messageId,
        sender: sender.platformId,
        accountName: sender.accountName,
        timestamp,
        type,
        content: contentFor(raw, type)
      };
      if (sender.groupNickname) {
        message.groupNickname = sender.groupNickname;
      }
      return [message];
    });

  if (messages.length === 0) {
    throw new Error("所选时间范围内没有消息；未生成空的 ChatLab 文件");
  }

  const meta = {
    name: conversationName || conversationId,
    platform: "xiaohongshu",
    type: conversationKind
  };
  if (conversationKind === "group") {
    meta.groupId = String(conversationId);
    const embeddedGroupAvatar = avatarDataByUrl?.get(conversationAvatar);
    if (embeddedGroupAvatar) {
      meta.groupAvatar = embeddedGroupAvatar;
    }
  }

  const result = {
    chatlab: {
      version: "0.0.2",
      exportedAt,
      generator: "xhs-chatlab-exporter/0.4.0"
    },
    meta,
    members: Array.from(members.values()),
    messages
  };
  assertValidChatLab(result);
  return result;
}
