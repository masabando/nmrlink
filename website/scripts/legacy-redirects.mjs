import path from "node:path";
import { mkdir, writeFile, access } from "node:fs/promises";
import { legacyRedirects } from "../lib/legacy-redirects.mjs";

const escape = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

// 相対URLなので /nmrlink/ と、それ以外の配信場所で共通に使えます。
export function relativeTarget(from, target) {
  const [pathname, hash] = target.slice(1).split("#");
  let relative =
    path.posix.relative(path.posix.dirname(from), pathname || ".") || ".";
  if (pathname.endsWith("/") || !pathname) relative += "/";
  return relative + (hash ? `#${hash}` : "");
}
export function redirectHTML(entry) {
  const fallback = relativeTarget(entry.from, entry.to);
  const sections = Object.fromEntries(
    (entry.sections ?? [entry.to]).map((target, index) => [
      `#section-${index + 1}`,
      relativeTarget(entry.from, target),
    ]),
  );
  return `<!doctype html>
<html lang="ja" data-pagefind-ignore="all">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>ページが移動しました | NMRLink</title>
<link rel="canonical" href="${escape(fallback)}">
<noscript><meta http-equiv="refresh" content="0;url=${escape(fallback)}"></noscript>
<script>
const sections = ${JSON.stringify(sections).replaceAll("<", "\\u003c")};
const destination = new URL(sections[location.hash] || ${JSON.stringify(fallback)}, location.href);
destination.search = location.search;
if (location.hash && !sections[location.hash]) destination.hash = location.hash;
location.replace(destination.href);
</script>
</head>
<body><p>ページが移動しました。<a href="${escape(fallback)}">新しいページを開く</a></p></body>
</html>
`;
}
export async function writeLegacyRedirects(out) {
  for (const entry of legacyRedirects) {
    const destination = path.join(out, entry.from);
    // 現行ページや実機サンプルを誤って上書きしないようにします。
    let exists = false;
    try {
      await access(destination);
      exists = true;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (exists)
      throw new Error(
        `Redirect would overwrite an existing page: ${entry.from}`,
      );
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, redirectHTML(entry));
  }
  console.log(`Generated ${legacyRedirects.length} legacy URL redirects.`);
}
