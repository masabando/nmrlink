import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  legacyRedirects,
  legacyHomeSections,
} from "../lib/legacy-redirects.mjs";

const website = fileURLToPath(new URL("../", import.meta.url));
const root = path.join(website, "out");
const { basePath } = JSON.parse(
  await readFile(path.join(website, ".next/site-build.json"), "utf8"),
);
const origin = "https://static.example";
const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(file);
    else files.push(file);
  }
}
await walk(root);
const failures = [],
  cache = new Map();
const source = async (file) => {
  if (!cache.has(file)) cache.set(file, await readFile(file, "utf8"));
  return cache.get(file);
};
let references = 0;
const documentsByLanguage = { ja: 0, en: 0 };
async function checkReference(reference, from) {
  if (/^(?:data:|mailto:|tel:|javascript:)/i.test(reference)) return;
  const relative = path.relative(root, from).split(path.sep).join("/");
  const url = new URL(
    reference.replaceAll("&amp;", "&"),
    `${origin}${basePath}/${relative.replace(/index\.html$/, "")}`,
  );
  if (url.origin !== origin) return;
  if (!url.pathname.startsWith(`${basePath}/`))
    throw new Error(`URL leaves basePath: ${reference}`);
  let target = path.resolve(
    root,
    `.${decodeURIComponent(url.pathname.slice(basePath.length))}`,
  );
  if (target !== root && !target.startsWith(root + path.sep))
    throw new Error(`URL leaves output: ${reference}`);
  if ((await stat(target)).isDirectory())
    target = path.join(target, "index.html");
  if (!(await stat(target)).isFile())
    throw new Error(`Not a file: ${reference}`);
  if (url.hash && target.endsWith(".html")) {
    const id = decodeURIComponent(url.hash.slice(1));
    if (!(await source(target)).includes(`id="${id}"`))
      throw new Error(`Missing anchor: ${reference}`);
  }
  references++;
}
async function inspect(reference, from) {
  try {
    await checkReference(reference, from);
  } catch (error) {
    failures.push(
      `${path.relative(root, from)} → ${reference}: ${error.message}`,
    );
  }
}
for (const file of files) {
  const relative = path.relative(root, file).split(path.sep).join("/");
  if (
    /(?:^|\/)(?:\.env[^/]*|secrets|node_modules|access-policy[^/]*|config\.js|nmrlink-server)(?:\/|$)/.test(
      relative,
    )
  )
    failures.push(`Unexpected private/server file: ${relative}`);
  if (file.endsWith(".html")) {
    const html = await source(file);
    if (html.includes("data-pagefind-body")) {
      const locale = html.match(/<html[^>]*lang="([^"]+)"/)?.[1];
      if (locale in documentsByLanguage) documentsByLanguage[locale]++;
    }
    for (const [, ref] of html.matchAll(/(?:href|src)="([^"]+)"/g))
      await inspect(ref, file);
    // 公開サンプルのインラインES moduleの相対importも確認します。
    for (const [, script] of html.matchAll(
      /<script[^>]*type="module"[^>]*>([\s\S]*?)<\/script>/g,
    )) {
      for (const [, ref] of script.matchAll(
        /(?:from\s*|import\s*)["'](\.[^"']+)["']/g,
      ))
        await inspect(ref, file);
    }
  } else if (file.endsWith(".js") && /^(examples|packages)\//.test(relative)) {
    for (const [, ref] of (await source(file)).matchAll(
      /(?:from\s*|import\s*)["'](\.[^"']+)["']/g,
    ))
      await inspect(ref, file);
  }
}
// リダイレクトのJS中の全ての見出し転送先も検査します。
for (const entry of legacyRedirects) {
  for (const target of [entry.to, ...(entry.sections ?? [])])
    await inspect(`${basePath}${target}`, path.join(root, entry.from));
  if (
    !(await source(path.join(root, entry.from))).includes(
      'data-pagefind-ignore="all"',
    )
  )
    failures.push(`Redirect is searchable: ${entry.from}`);
}
for (const [id, target] of Object.entries(legacyHomeSections)) {
  await inspect(`${basePath}/#${id}`, path.join(root, "index.html"));
  await inspect(`${basePath}/#${target}`, path.join(root, "index.html"));
}
const manifest = JSON.parse(
  await readFile(path.join(root, "pagefind/pagefind-entry.json"), "utf8"),
);
for (const locale of ["ja", "en"]) {
  const count = manifest.languages[locale]?.page_count;
  if (!count || count !== documentsByLanguage[locale])
    failures.push(
      `Unexpected ${locale} search page count: ${count} (expected ${documentsByLanguage[locale]} current documents)`,
    );
}
if (failures.length) throw new Error(failures.join("\n"));
console.log(
  `Checked ${files.length} public files, ${references} local references and ${legacyRedirects.length} legacy redirects. Search: ${JSON.stringify(documentsByLanguage)}. No private configuration.`,
);
