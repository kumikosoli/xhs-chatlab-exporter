import assert from "node:assert/strict";
import test from "node:test";

import { validateChatLab } from "../src/chatlab.js";
import { decodeXhsMessageTimestamp } from "../src/time.js";
import { toChatLab } from "../src/xhs.js";

const PRIVATE_PREFIX =
  "6065b24c0000000001008cb9.62a4ea3d0000000021022482";

function raw(overrides = {}) {
  return {
    sequence: 0,
    messageId: `${PRIVATE_PREFIX}.1ea579c880b02fc`,
    contentType: "1",
    direction: "right",
    senderName: "",
    avatar: "https://example.invalid/avatar/me-token?size=120",
    text: "准备全部探索",
    hint: "",
    fallbackText: "准备全部探索",
    quote: null,
    card: null,
    media: [],
    links: [],
    ...overrides
  };
}

test("converts private text, image, reply, share and recall messages", () => {
  const input = [
    raw(),
    raw({
      sequence: 1,
      messageId: `${PRIVATE_PREFIX}.1ea579c883107a9`,
      contentType: "3",
      card: { title: "广州拉面", author: "作者" },
      media: [
        {
          kind: "card-cover",
          src: "https://example.invalid/cover.jpg",
          alt: ""
        }
      ],
      text: ""
    }),
    raw({
      sequence: 2,
      messageId: `${PRIVATE_PREFIX}.1ea579d2c2ae656`,
      direction: "left",
      senderName: "CandleST",
      avatar: "https://example.invalid/avatar/candle-token",
      text: "绝了"
    }),
    raw({
      sequence: 3,
      messageId: `${PRIVATE_PREFIX}.1ea579d39310c94`,
      text: "同意",
      quote: { sender: "CandleST", content: "绝了" }
    }),
    raw({
      sequence: 4,
      messageId: `${PRIVATE_PREFIX}.1ea579d4138a467`,
      contentType: "2",
      text: "",
      media: [
        {
          kind: "image",
          src: "https://example.invalid/message.jpg",
          alt: "图片消息"
        }
      ]
    }),
    raw({
      sequence: 5,
      messageId: `${PRIVATE_PREFIX}.1ea579d890b3dfb`,
      contentType: "4",
      direction: "system",
      hint: "CandleST 撤回了一条消息",
      fallbackText: "CandleST 撤回了一条消息"
    })
  ];

  const result = toChatLab(input, {
    conversationId: "62a4ea3d0000000021022482",
    conversationKind: "private",
    conversationName: "CandleST",
    selfName: "Yau Lee",
    exportedAt: 1_800_000_000
  });

  assert.deepEqual(
    result.messages.map((message) => message.type),
    [0, 24, 0, 25, 1, 81]
  );
  assert.equal(result.meta.platform, "xiaohongshu");
  assert.equal(result.meta.type, "private");
  assert.equal(result.chatlab.version, "0.0.2");
  assert.match(result.messages[1].content, /广州拉面/);
  assert.match(result.messages[3].content, /回复 CandleST/);
  assert.match(result.messages[4].content, /message\.jpg/);
  assert.equal(result.messages[5].sender, "SYSTEM");
  assert.equal(result.members.length, 2);
  assert.deepEqual(validateChatLab(result), []);
});

test("creates stable pseudo member IDs for group chat members", () => {
  const firstId = "137999752897687566.1ea6a14e8334cca";
  const secondId = "137999752897687566.1ea6a16d1440a91";
  const result = toChatLab(
    [
      raw({
        messageId: firstId,
        direction: "left",
        senderName: "红茶玛奇朵",
        avatar: "https://example.invalid/avatar/stable-token?size=120",
        text: "第一条"
      }),
      raw({
        sequence: 1,
        messageId: secondId,
        direction: "left",
        senderName: "红茶玛奇朵",
        avatar: "https://example.invalid/avatar/stable-token?size=360",
        text: "第二条"
      })
    ],
    {
      conversationId: "137999752897687566",
      conversationKind: "group",
      conversationName: "测试群",
      exportedAt: 1_800_000_000
    }
  );

  assert.equal(result.meta.groupId, "137999752897687566");
  assert.equal(result.members.length, 1);
  assert.equal(result.messages[0].sender, result.messages[1].sender);
  assert.equal(result.messages[0].groupNickname, "红茶玛奇朵");
});

test("applies an inclusive time range and rejects empty output", () => {
  const one = raw();
  const two = raw({
    sequence: 1,
    messageId: `${PRIVATE_PREFIX}.1ea579d2c2ae656`,
    text: "第二条"
  });
  const selectedTimestamp = decodeXhsMessageTimestamp(two.messageId);
  const result = toChatLab([one, two], {
    conversationId: "62a4ea3d0000000021022482",
    conversationKind: "private",
    conversationName: "CandleST",
    startTimestamp: selectedTimestamp,
    endTimestamp: selectedTimestamp,
    exportedAt: 1_800_000_000
  });
  assert.equal(result.messages.length, 1);
  assert.equal(result.messages[0].content, "第二条");

  assert.throws(
    () =>
      toChatLab([one], {
        conversationId: "62a4ea3d0000000021022482",
        conversationKind: "private",
        conversationName: "CandleST",
        startTimestamp: selectedTimestamp + 1000,
        exportedAt: 1_800_000_000
      }),
    /没有消息/
  );
});

test("filters exported content by ChatLab message type", () => {
  const result = toChatLab(
    [
      raw(),
      raw({
        sequence: 1,
        messageId: `${PRIVATE_PREFIX}.1ea579d2c2ae656`,
        contentType: "2",
        media: [
          {
            kind: "image",
            src: "https://example.invalid/message.jpg",
            alt: "图片"
          }
        ],
        text: ""
      })
    ],
    {
      conversationId: "62a4ea3d0000000021022482",
      conversationKind: "private",
      conversationName: "CandleST",
      includeMessageTypes: [1],
      exportedAt: 1_800_000_000
    }
  );

  assert.equal(result.messages.length, 1);
  assert.equal(result.messages[0].type, 1);
  assert.match(result.messages[0].content, /message\.jpg/);
});

test("validator catches member references and duplicate message IDs", () => {
  const invalid = {
    chatlab: { version: "0.0.2", exportedAt: 1_800_000_000 },
    meta: { name: "坏数据", platform: "xiaohongshu", type: "private" },
    members: [],
    messages: [
      {
        platformMessageId: "same",
        sender: "missing",
        accountName: "Unknown",
        timestamp: 1_800_000_000,
        type: 0,
        content: "a"
      },
      {
        platformMessageId: "same",
        sender: "missing",
        accountName: "Unknown",
        timestamp: 1_799_999_999,
        type: 0,
        content: "b"
      }
    ]
  };
  const errors = validateChatLab(invalid);
  assert.ok(errors.some((error) => error.includes("未出现在 members")));
  assert.ok(errors.some((error) => error.includes("没有按 timestamp 升序")));
  assert.ok(errors.some((error) => error.includes("platformMessageId 重复")));
});
