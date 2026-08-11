import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { sha256Hex } from "../src/sha256.js";

for (const value of ["", "abc", "小红书 ChatLab", "🙂".repeat(80)]) {
  test(`computes browser-compatible SHA-256 for ${JSON.stringify(value).slice(0, 24)}`, () => {
    const expected = createHash("sha256").update(value).digest("hex");
    assert.equal(sha256Hex(value), expected);
  });
}

test("computes SHA-256 for binary browser assets", () => {
  const value = new Uint8Array([0, 1, 2, 127, 128, 254, 255]);
  const expected = createHash("sha256").update(value).digest("hex");
  assert.equal(sha256Hex(value), expected);
});
