#!/usr/bin/env node

import { run } from "../src/cli.js";

run(process.argv.slice(2)).catch((error) => {
  console.error(`错误：${error.message}`);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exitCode = 1;
});
