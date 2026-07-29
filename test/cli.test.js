import assert from "node:assert/strict";
import test from "node:test";

import { parseArgs } from "../src/cli.js";

test("parses the main export options", () => {
  const options = parseArgs([
    "--conversation",
    "测试群",
    "--start",
    "2026-07-01",
    "--end",
    "2026-07-29",
    "--kind",
    "group",
    "--self-name",
    "Yau Lee",
    "--max-pages",
    "42",
    "--message-types",
    "0,1,5,25",
    "--embed-avatars",
    "--download-media",
    "--media-directory",
    "./media-output",
    "--force"
  ]);
  assert.equal(options.conversation, "测试群");
  assert.equal(options.kind, "group");
  assert.equal(options.maxPages, 42);
  assert.deepEqual(options.messageTypes, [0, 1, 5, 25]);
  assert.equal(options.embedAvatars, true);
  assert.equal(options.downloadMedia, true);
  assert.equal(options.mediaDirectory, "./media-output");
  assert.equal(options.force, true);
});

test("requires either a target or --list", () => {
  assert.throws(() => parseArgs([]), /--conversation/);
  assert.equal(parseArgs(["--list"]).list, true);
});

test("rejects invalid kinds and missing option values", () => {
  assert.throws(
    () => parseArgs(["--conversation", "A", "--kind", "channel"]),
    /--kind/
  );
  assert.throws(() => parseArgs(["--conversation"]), /缺少参数/);
  assert.throws(
    () =>
      parseArgs([
        "--conversation",
        "A",
        "--media-directory",
        "./media"
      ]),
    /--download-media/
  );
  assert.throws(
    () =>
      parseArgs([
        "--conversation",
        "A",
        "--message-types",
        "0,12345"
      ]),
    /无效/
  );
});
