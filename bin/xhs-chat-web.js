#!/usr/bin/env node

import { startAppServer } from "../src/server.js";

function parseArguments(argv) {
  const options = {
    host: "127.0.0.1",
    port: 4177,
    openBrowser: true
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--no-open") {
      options.openBrowser = false;
      continue;
    }
    if (token === "--port") {
      const value = Number(argv[index + 1]);
      if (!Number.isInteger(value) || value < 0 || value > 65_535) {
        throw new Error("--port 必须是 0 到 65535 之间的整数");
      }
      options.port = value;
      index += 1;
      continue;
    }
    if (token === "--host") {
      options.host = argv[index + 1] || "";
      if (!options.host) {
        throw new Error("--host 缺少参数");
      }
      index += 1;
      continue;
    }
    if (token === "-h" || token === "--help") {
      console.log(`xhs-chat-web

用法：
  xhs-chat-web [--port 4177] [--host 127.0.0.1] [--no-open]
`);
      process.exit(0);
    }
    throw new Error(`未知参数：${token}`);
  }
  return options;
}

try {
  const options = parseArguments(process.argv.slice(2));
  const app = await startAppServer(options);
  console.log(`小红书聊天导出控制台已启动：${app.url}`);
  console.log("按 Ctrl+C 停止。");
  const close = () => {
    app.server.close(() => process.exit(0));
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
} catch (error) {
  console.error(`错误：${error.message}`);
  process.exitCode = 1;
}
