import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptsDirectory, "..");
const sourceDirectory = path.join(projectDirectory, "extension-src");
const outputDirectory = path.join(projectDirectory, "chrome-extension");
const packageJson = JSON.parse(
  await readFile(path.join(projectDirectory, "package.json"), "utf8")
);
const manifest = JSON.parse(
  await readFile(path.join(sourceDirectory, "manifest.json"), "utf8")
);

if (manifest.version !== packageJson.version) {
  throw new Error(
    `扩展版本 ${manifest.version} 与 package.json ${packageJson.version} 不一致`
  );
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

await build({
  entryPoints: {
    background: path.join(sourceDirectory, "background.js"),
    content: path.join(sourceDirectory, "content.js"),
    offscreen: path.join(sourceDirectory, "offscreen.js")
  },
  outdir: outputDirectory,
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "chrome116",
  legalComments: "none",
  minify: false,
  sourcemap: false,
  banner: {
    js: `/* xhs-chatlab-exporter v${packageJson.version} — generated; edit extension-src/ */`
  }
});

for (const filename of [
  "manifest.json",
  "offscreen.html",
  "popup.html",
  "popup.css",
  "popup.js",
  "README.md",
  "THIRD_PARTY_NOTICES.txt"
]) {
  await cp(path.join(sourceDirectory, filename), path.join(outputDirectory, filename));
}
await cp(
  path.join(projectDirectory, "LICENSE"),
  path.join(outputDirectory, "LICENSE")
);
await writeFile(
  path.join(outputDirectory, "BUILD.txt"),
  `xhs-chatlab-exporter Chrome/Edge extension v${packageJson.version}\n`,
  "utf8"
);

console.log(`扩展已生成：${outputDirectory}`);
