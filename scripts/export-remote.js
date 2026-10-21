import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const target = `${root}dist/remote/`;
await mkdir(target, { recursive: true });
await copyFile(`${root}LICENSE`, `${target}LICENSE.txt`);
for (const file of ["index.html"]) {
  await copyFile(`${root}examples/remote/${file}`, `${target}${file}`);
}
await copyFile(process.argv[2] ?? `${root}examples/remote/config.js`, `${target}config.js`);
const app = await readFile(`${root}examples/remote/app.js`, "utf8");
await writeFile(`${target}app.js`, app.replace("../../packages/nmrlink-server/browser/remote-client.js", "./remote-client.js"));
await copyFile(`${root}packages/nmrlink-server/browser/remote-client.js`, `${target}remote-client.js`);
console.log("Upload only dist/remote/ to the web server. No private server configuration is copied.");
