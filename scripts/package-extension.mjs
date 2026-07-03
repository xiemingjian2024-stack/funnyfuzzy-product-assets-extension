import { cp, mkdir, readFile, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = new URL("../", import.meta.url);
const extensionDir = new URL("FFweb2NAS/", root);
const releaseDir = new URL("release/", root);

const manifest = JSON.parse(await readFile(new URL("manifest.json", extensionDir), "utf8"));
const versionedFolderName = `FFweb2NAS-${manifest.version}`;
const packageDir = new URL(`${versionedFolderName}/`, releaseDir);
const zipName = `${versionedFolderName}.zip`;

await execFileAsync("node", ["scripts/build-extension.mjs"], { cwd: root });
await mkdir(releaseDir, { recursive: true });
await rm(new URL("staging/", releaseDir), { recursive: true, force: true });
await rm(packageDir, { recursive: true, force: true });
await mkdir(packageDir, { recursive: true });

for (const item of ["manifest.json", "dist", "src/apiClient.js", "src/config.js", "src/options.html", "src/options.js", "src/styles.css", "icons"]) {
  await cp(new URL(item, extensionDir), new URL(item, packageDir), { recursive: true });
}

await rm(new URL(zipName, releaseDir), { force: true });
await execFileAsync("zip", ["-r", zipName, versionedFolderName], {
  cwd: releaseDir
});

console.log(`Created release/${versionedFolderName}/`);
console.log(`Created release/${zipName}`);
