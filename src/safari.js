import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export class SafariBridge {
  constructor({
    tabUrlContains = "xiaohongshu.com/chat/",
    timeoutMilliseconds = 30_000,
    maxBufferBytes = 256 * 1024 * 1024
  } = {}) {
    this.tabUrlContains = tabUrlContains;
    this.timeoutMilliseconds = timeoutMilliseconds;
    this.maxBufferBytes = maxBufferBytes;
  }

  async runPageFunction(pageFunction, argument = null) {
    if (process.platform !== "darwin") {
      throw new Error("Safari 导出仅支持 macOS");
    }
    const pageJavaScript = `JSON.stringify((${pageFunction.toString()})(${JSON.stringify(argument)}))`;
    const jxa = `
      var safari = Application("Safari");
      var match = ${JSON.stringify(this.tabUrlContains)};
      var result = null;
      var found = false;
      var windows = safari.windows();
      outer:
      for (var windowIndex = 0; windowIndex < windows.length; windowIndex += 1) {
        var tabs = windows[windowIndex].tabs();
        for (var tabIndex = 0; tabIndex < tabs.length; tabIndex += 1) {
          var url = "";
          try { url = tabs[tabIndex].url() || ""; } catch (error) {}
          if (url.indexOf(match) !== -1) {
            result = safari.doJavaScript(${JSON.stringify(pageJavaScript)}, { in: tabs[tabIndex] });
            found = true;
            break outer;
          }
        }
      }
      if (!found) {
        throw new Error("没有找到 URL 包含 " + match + " 的 Safari 标签页");
      }
      result;
    `;

    try {
      const { stdout } = await execFileAsync("osascript", ["-l", "JavaScript", "-e", jxa], {
        encoding: "utf8",
        timeout: this.timeoutMilliseconds,
        maxBuffer: this.maxBufferBytes
      });
      const source = stdout.trim();
      if (!source) {
        return null;
      }
      return JSON.parse(source);
    } catch (error) {
      const details = [error.stderr, error.stdout, error.message].filter(Boolean).join("\n");
      if (/JavaScript from Apple Events|Apple Events.*JavaScript|不允许.*JavaScript/i.test(details)) {
        throw new Error(
          "Safari 拒绝了脚本：请在 Safari 的“开发”菜单中开启“允许来自 Apple 事件的 JavaScript”"
        );
      }
      if (/not authorized|不允许.*辅助|AppleEvent/i.test(details)) {
        throw new Error(
          "macOS 未授权终端控制 Safari；请在“系统设置 → 隐私与安全性 → 自动化”中允许当前终端访问 Safari"
        );
      }
      const concise = details.split("\n").filter(Boolean).at(-1) || "未知错误";
      throw new Error(`无法读取 Safari：${concise}`);
    }
  }
}

export function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
