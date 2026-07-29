const CHATLAB_MESSAGE_TYPES = new Set([
  0, 1, 2, 3, 4, 5, 7, 8, 20, 21, 22, 23, 24, 25, 26, 27, 80, 81, 99
]);

export function validateChatLab(data) {
  const errors = [];
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return ["顶层必须是 JSON 对象"];
  }
  if (data.chatlab?.version !== "0.0.2") {
    errors.push('chatlab.version 必须是 "0.0.2"');
  }
  if (!Number.isInteger(data.chatlab?.exportedAt)) {
    errors.push("chatlab.exportedAt 必须是 Unix 秒级整数时间戳");
  }
  if (!data.meta || typeof data.meta !== "object") {
    errors.push("缺少 meta 对象");
  } else {
    if (typeof data.meta.name !== "string" || !data.meta.name.trim()) {
      errors.push("meta.name 不能为空");
    }
    if (typeof data.meta.platform !== "string" || !data.meta.platform.trim()) {
      errors.push("meta.platform 不能为空");
    }
    if (!["private", "group"].includes(data.meta.type)) {
      errors.push('meta.type 必须是 "private" 或 "group"');
    }
  }
  if (!Array.isArray(data.members)) {
    errors.push("members 必须是数组");
  }
  if (!Array.isArray(data.messages) || data.messages.length === 0) {
    errors.push("messages 必须是至少含一条消息的数组");
  }
  if (errors.length > 0) {
    return errors;
  }

  const memberIds = new Set();
  data.members.forEach((member, index) => {
    const location = `members[${index}]`;
    if (typeof member?.platformId !== "string" || !member.platformId) {
      errors.push(`${location}.platformId 不能为空`);
    } else if (memberIds.has(member.platformId)) {
      errors.push(`${location}.platformId 重复：${member.platformId}`);
    } else {
      memberIds.add(member.platformId);
    }
    if (typeof member?.accountName !== "string" || !member.accountName) {
      errors.push(`${location}.accountName 不能为空`);
    }
  });

  const messageIds = new Set();
  let previousTimestamp = -Infinity;
  data.messages.forEach((message, index) => {
    const location = `messages[${index}]`;
    if (typeof message?.sender !== "string" || !message.sender) {
      errors.push(`${location}.sender 不能为空`);
    } else if (message.sender !== "SYSTEM" && !memberIds.has(message.sender)) {
      errors.push(`${location}.sender 未出现在 members 中：${message.sender}`);
    }
    if (typeof message?.accountName !== "string" || !message.accountName) {
      errors.push(`${location}.accountName 不能为空`);
    }
    if (!Number.isInteger(message?.timestamp) || message.timestamp < 0) {
      errors.push(`${location}.timestamp 必须是 Unix 秒级整数时间戳`);
    } else if (message.timestamp < previousTimestamp) {
      errors.push(`${location} 没有按 timestamp 升序排列`);
    } else {
      previousTimestamp = message.timestamp;
    }
    if (!CHATLAB_MESSAGE_TYPES.has(message?.type)) {
      errors.push(`${location}.type 不是 ChatLab 支持的消息类型`);
    }
    if (!(typeof message?.content === "string" || message?.content === null)) {
      errors.push(`${location}.content 必须是字符串或 null`);
    }
    if (typeof message?.platformMessageId !== "string" || !message.platformMessageId) {
      errors.push(`${location}.platformMessageId 不能为空`);
    } else if (messageIds.has(message.platformMessageId)) {
      errors.push(`${location}.platformMessageId 重复`);
    } else {
      messageIds.add(message.platformMessageId);
    }
  });
  return errors;
}

export function assertValidChatLab(data) {
  const errors = validateChatLab(data);
  if (errors.length > 0) {
    throw new Error(`ChatLab JSON 校验失败：\n- ${errors.join("\n- ")}`);
  }
}
