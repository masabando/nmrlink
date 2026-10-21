import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("../dist/pages/", import.meta.url)));
const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(file);
    else files.push(file);
  }
}
await walk(root);
const failures = [];
for (const file of files) {
  const extension = path.extname(file);
  if (![".html", ".js", ".css"].includes(extension)) continue;
  const source = await readFile(file, "utf8");
  const references = extension === ".html"
    ? [...source.matchAll(/(?:href|src)="([^"]+)"/g)].map(match => match[1])
    : extension === ".js"
      ? [...source.matchAll(/(?:from\s*|import\s*)["'](\.[^"']+)["']/g)].map(match => match[1])
      : [];
  if (extension === ".html") {
    for (const script of source.matchAll(/<script[^>]*type="module"[^>]*>([\s\S]*?)<\/script>/g)) {
      references.push(...[...script[1].matchAll(/from\s*["'](\.[^"']+)["']/g)].map(match => match[1]));
    }
  }
  for (const reference of references) {
    if (/^(?:[a-z][a-z\d+.-]*:|#)/i.test(reference)) continue;
    if (reference.startsWith("/")) { failures.push(`Root-relative URL: ${reference}`); continue; }
    let target = path.resolve(path.dirname(file), decodeURIComponent(reference.split(/[?#]/)[0]));
    if (target !== root && !target.startsWith(root + path.sep)) { failures.push(`Outside site: ${reference}`); continue; }
    try {
      if (extension === ".html" && (await stat(target)).isDirectory()) target = path.join(target, "index.html");
      if (!(await stat(target)).isFile()) failures.push(`Not a file: ${target}`);
    }
    catch { failures.push(`${path.relative(root, file)} → ${reference}`); }
  }
}
for (const file of files) {
  const relative = path.relative(root, file);
  if (/(?:^|\/)(?:\.env[^/]*|secrets|node_modules|access-policy[^/]*|config\.js|nmrlink-server)(?:\/|$)/.test(relative) && !relative.endsWith(".html")) {
    failures.push(`Unexpected private/server file: ${relative}`);
  }
}
if (failures.length) throw new Error(failures.join("\n"));
console.log(`Checked ${files.length} public files: local links and module imports resolve, no root-relative URLs or private configuration.`);
