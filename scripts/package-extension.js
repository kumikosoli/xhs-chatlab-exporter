import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { zipSync } from "fflate";

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptsDirectory, "..");
const extensionDirectory = path.join(projectDirectory, "chrome-extension");
const releasesDirectory = path.join(projectDirectory, "releases");
const packageJson = JSON.parse(
  await readFile(path.join(projectDirectory, "package.json"), "utf8")
);

async function collectFiles(directory, prefix = "") {
  const output = {};
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".DS_Store") {
      continue;
    }
    const absolutePath = path.join(directory, entry.name);
    const relativePath = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) {
      Object.assign(output, await collectFiles(absolutePath, relativePath));
    } else if (entry.isFile()) {
      output[relativePath] = new Uint8Array(await readFile(absolutePath));
    }
  }
  return output;
}

const files = await collectFiles(extensionDirectory);
const archive = zipSync(files, { level: 9 });
const filename = `xhs-chatlab-exporter-chrome-edge-v${packageJson.version}.zip`;
await mkdir(releasesDirectory, { recursive: true });
await writeFile(path.join(releasesDirectory, filename), archive);
console.log(`扩展安装包已生成：${path.join(releasesDirectory, filename)}`);
