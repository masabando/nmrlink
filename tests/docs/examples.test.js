import test from "node:test";
import assert from "node:assert/strict";
import { transform } from "esbuild";
import { readFile, access } from "node:fs/promises";
import { exampleDocument, exampleTitles } from "../../site/examples.js";

for (const kind of Object.keys(exampleTitles)) {
  test(`${kind}: both preview and copyable document contain valid module code`, async () => {
    for (const preview of [false, true]) {
      const html = exampleDocument(kind, { preview });
      const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
      await transform(script, { loader: "js", target: "es2022" });
      for (const match of script.matchAll(/from "\.\/packages\/nmrlink\/src\/([^"]+)"/g)) {
        await access(new URL(`../../packages/nmrlink/src/${match[1]}`, import.meta.url));
      }
      const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
      for (const match of script.matchAll(/querySelector\("#([^"]+)"\)/g)) assert.ok(ids.has(match[1]), `Missing DOM element: ${match[1]}`);
      if (["first", "connection", "measurement", "state"].includes(kind)) {
        assert.equal(script.includes("async connect()"), preview);
        assert.equal(script.includes("new NMRController({ device })"), preview);
      }
    }
  });
}

test("published preview and copied HTML are generated from the same example definitions", async () => {
  const decode = value => value.replaceAll("&quot;", '"').replaceAll("&gt;", ">").replaceAll("&lt;", "<").replaceAll("&amp;", "&");
  for (const kind of Object.keys(exampleTitles)) {
    const page = kind === "first" ? "guide/first.html" : `guide/${kind}.html`;
    const published = await readFile(new URL(`../../dist/pages/${page}`, import.meta.url), "utf8");
    const code = published.match(/<code class="language-html">([\s\S]*?)<\/code>/)[1];
    assert.equal(decode(code), exampleDocument(kind));
    const preview = await readFile(new URL(`../../dist/pages/examples/gallery/${kind}.html`, import.meta.url), "utf8");
    assert.equal(preview, exampleDocument(kind, { preview: true, moduleRoot: "../../packages/nmrlink/src" }));
  }
});

test("Pages publishes only consumer documentation, with no maintainer pages or links", async () => {
  const excluded = ["docs/PAGES.html", "docs/PROTOCOL.html", "docs/STATUS.html", "docs/UI.html", "SPEC.html", "overview.html", "packages/nmrlink/index.html", "packages/nmrlink-server/index.html"];
  for (const file of excluded) {
    await assert.rejects(access(new URL(`../../dist/pages/${file}`, import.meta.url)));
  }
  for (const file of ["index.html", "docs/API.html", "docs/ANALYSIS.html", "docs/FIREBASE.html"]) {
    const html = await readFile(new URL(`../../dist/pages/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(html, /開発・保守|サイトの公開・保守|STATUS\.html|PROTOCOL\.html|PAGES\.html|SPEC\.html|overview\.html/);
  }
});

test("consumer prose contains no update dates or development-history notes", async () => {
  const { readdir } = await import("node:fs/promises");
  for (const folder of ["guides", "reference"]) {
    const root = new URL(`../../site/${folder}/`, import.meta.url);
    for (const file of await readdir(root)) {
      if (!file.endsWith(".md")) continue;
      const markdown = await readFile(new URL(file, root), "utf8");
      // Dates in sample measurement records are data, not page metadata.
      const prose = markdown.replace(/```[\s\S]*?```/g, "");
      assert.doesNotMatch(prose, /(?:^|\n)\s*\d{4}-\d{2}-\d{2}|更新日|PoC|実装作業|確認記録|開発・ドキュメント生成/, file);
    }
  }
});
