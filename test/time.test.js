import assert from "node:assert/strict";
import test from "node:test";

import {
  decodeXhsMessageTimestamp,
  formatEpoch,
  parseTimeBoundary
} from "../src/time.js";

test("decodes the timestamp embedded in a Xiaohongshu message ID", () => {
  const id =
    "6065b24c0000000001008cb9.62a4ea3d0000000021022482.1ea579c880b02fc";
  assert.equal(decodeXhsMessageTimestamp(id), 1_784_126_600);
  assert.equal(formatEpoch(1_784_126_600, "Asia/Shanghai"), "2026/07/15 22:43:20");
});

test("decodes group message IDs with two segments", () => {
  assert.equal(
    decodeXhsMessageTimestamp("137999752897687566.1ea6a14e8334cca"),
    Number((BigInt("0x1ea6a14e8334cca") >> 24n) - 0x180000000n)
  );
});

test("parses date boundaries in Asia/Shanghai", () => {
  assert.equal(
    parseTimeBoundary("2026-07-15", {
      timeZone: "Asia/Shanghai",
      endOfRange: false
    }),
    Date.parse("2026-07-15T00:00:00+08:00") / 1000
  );
  assert.equal(
    parseTimeBoundary("2026-07-15", {
      timeZone: "Asia/Shanghai",
      endOfRange: true
    }),
    Date.parse("2026-07-15T23:59:59+08:00") / 1000
  );
});

test("preserves explicit offsets and Unix seconds", () => {
  assert.equal(
    parseTimeBoundary("2026-07-15T22:43:20+08:00"),
    1_784_126_600
  );
  assert.equal(parseTimeBoundary("1784126600"), 1_784_126_600);
});

test("rejects invalid dates and malformed IDs", () => {
  assert.throws(() => parseTimeBoundary("2026-02-30"), /无效的日期/);
  assert.throws(() => decodeXhsMessageTimestamp("not-a-message-id"), /无法从消息 ID/);
});
