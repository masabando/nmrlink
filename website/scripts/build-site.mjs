import { cp, mkdir, readdir, readFile, rm, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as pagefind from "pagefind";
import { writeLegacyRedirects } from "./legacy-redirects.mjs";

const website = fileURLToPath(new URL("../", import.meta.url));
const repository = path.resolve(website, "..");
const out = path.join(website, "out");
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "/nmrlink").replace(/\/$/, "");

// 検証済みの既存Web UIをそのまま同梱。秘密情報を含むリポジトリ全体はコピーしません。
for (const directory of ["examples/direct", "examples/standard", "examples/shared", "packages/nmrlink/src"]) {
  await mkdir(path.join(out, directory), { recursive: true });
  for (const file of await readdir(path.join(repository, directory))) {
    if (!/\.(html|js|css)$/.test(file)) continue;
    const source = path.join(repository, directory, file);
    const destination = path.join(out, directory, file);
    if (file.endsWith(".html")) {
      // 既存画面の「使い方」を新しいドキュメントのディレクトリURLへ向けます。
      const html = (await readFile(source, "utf8")).replace(/(href="\.\.\/\.\.\/guide\/[\w-]+)\.html"/g, '$1/"');
      await writeFile(destination, html);
    } else await copyFile(source, destination);
  }
}
// 従来版だけはnpm公開済みのライブラリを固定して配信します。
await cp(path.join(repository, "examples/standard/vendor"), path.join(out, "examples/standard/vendor"), { recursive: true });
await copyFile(path.join(repository, "LICENSE"), path.join(out, "LICENSE.txt"));
// 旧サイトと同じURLで、同梱するThree.jsのライセンス表示も保持します。
await mkdir(path.join(out, "assets"), { recursive: true });
await copyFile(path.join(website, "node_modules/three/LICENSE"), path.join(out, "assets/three-LICENSE.txt"));
await writeFile(path.join(out, ".nojekyll"), "");

await writeLegacyRedirects(out);

// 完成したHTMLを索引にします。本文は別管理せず、各page.tsxを編集するだけです。
const { index, errors } = await pagefind.createIndex({ includeCharacters: "_", writePlayground: false });
if (errors?.length || !index) throw new Error(`Pagefind initialization failed: ${errors?.join("; ")}`);
try {
  const result = await index.addDirectory({ path: out, glob: "**/index.html" });
  if (result.errors?.length) throw new Error(result.errors.join("; "));
  const indexDirectory = path.join(out, "pagefind");
  await rm(indexDirectory, { recursive: true, force: true });
  const written = await index.writeFiles({ outputPath: indexDirectory });
  if (written.errors?.length) throw new Error(written.errors.join("; "));

  // next devでも直近のビルドの索引を利用します。このフォルダは生成物としてGitから除外。
  const developmentIndex = path.join(website, "public/pagefind");
  await rm(developmentIndex, { recursive: true, force: true });
  await cp(indexDirectory, developmentIndex, { recursive: true });
  await writeFile(path.join(website, ".next/site-build.json"), JSON.stringify({ basePath }, null, 2) + "\n");
  const manifest = JSON.parse(await readFile(path.join(indexDirectory, "pagefind-entry.json"), "utf8"));
  const pageCount = Object.values(manifest.languages).reduce((sum, language) => sum + language.page_count, 0);
  console.log(`Pagefind indexed ${pageCount} pages. Static site: out/ (basePath: ${basePath || "/"}).`);
} finally {
  await index.deleteIndex();
  await pagefind.close();
}
