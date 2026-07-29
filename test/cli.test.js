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
    "--force"
  ]);
  assert.equal(options.conversation, "测试群");
  assert.equal(options.kind, "group");
  assert.equal(options.maxPages, 42);
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
});
