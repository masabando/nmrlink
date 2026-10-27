import { readFile, writeFile, mkdir, copyFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Marked } from "marked";
import { build } from "esbuild";
import { exampleDocument, exampleTitles } from "../site/examples.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "dist/pages");
const { version } = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
// Explicit allowlist: never copy the checkout, server configuration or credentials.
const pages = [
  ["site/guides/introduction.md", "index.html", "紹介"],
  ...[
    ["install", "導入する"], ["first", "最初の測定"], ["ai", "AIと一緒にWeb UIを作る"],
    ["connection", "接続と切断"], ["parameters", "測定条件"], ["measurement", "測定する"], ["state", "状態とエラー"],
    ["frequencygraph", "周波数応答を描く"], ["pulsegraph", "パルス応答を描く"], ["relaxationgraph", "T1回復曲線を描く"], ["echograph", "T2減衰曲線を描く"],
    ["fid", "FIDを表示する"], ["fft", "FFTを表示する"], ["range", "解析範囲を変える"], ["colors", "線の色を変える"], ["save", "データを保存する"],
    ["remote", "遠隔で使う"], ["remote-ui", "遠隔UIへの組み込み"],
  ].map(([name, title]) => [`site/guides/${name}.md`, `guide/${name}.html`, title]),
  ["site/reference/api.md", "docs/API.html", "APIリファレンス"],
  ["site/reference/analysis.md", "docs/ANALYSIS.html", "解析の仕様"],
  ["site/reference/firebase.md", "docs/FIREBASE.html", "管理者の設定"],
  ["site/guides/standard.md", "guide/standard.html", "標準Web UIで測定する"],
  ["site/guides/frequency.md", "guide/frequency.html", "周波数を調整する"],
  ["site/guides/pulse.md", "guide/pulse.html", "パルスを校正する"],
  ["site/guides/t1.md", "guide/t1.html", "T1を測定する"],
  ["site/guides/t2.md", "guide/t2.html", "T2を測定する"],
  ["site/guides/direct.md", "examples/direct/guide.html", "直接接続サンプルの使い方"],
  ["site/guides/remote-sample.md", "examples/remote/index.html", "遠隔サンプルの使い方"],
  ["site/guides/demo.md", "examples/demo/index.html", "ローカルデモ"],
  ["site/guides/node.md", "guide/node.html", "Node.jsから使う"],
];
const destinations = new Map(pages.map(([source, target]) => [source, target]));
destinations.set("site/llms.txt", "llms.txt");
const escape = value => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const relative = (from, to) => {
  const url = path.posix.relative(path.posix.dirname(from), to) || path.posix.basename(to);
  return url.endsWith("index.html") ? url.slice(0, -10) || "./" : url;
};
// Raw HTML in Markdown and copied samples also use directory URLs.
const directoryUrls = html => html.replace(/href="([^"#?]*index\.html)([?#][^"]*)?"/g, (match, url, suffix = "") => {
  if (/^[a-z][a-z\d+.-]*:/i.test(url)) return match;
  return `href="${url.slice(0, -10) || "./"}${suffix}"`;
});
await rm(output, { recursive: true, force: true }); // Only this script's generated folder.
await mkdir(output, { recursive: true });
for (const [source, target, title] of pages) {
  const markdown = await readFile(path.join(root, source), "utf8");
  const headings = [];
  const renderer = {
    heading(text, level) {
      const id = `section-${headings.length + 1}`;
      headings.push({ id, text, level });
      return `<h${level} id="${id}">${text}</h${level}>`;
    },
    link(href, title, text) {
      let link = href;
      if (href && !/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(href)) {
        const [pathname, fragment] = href.split("#");
        const sourcePath = path.posix.normalize(path.posix.join(path.posix.dirname(source), pathname));
        link = relative(target, destinations.get(sourcePath) ?? sourcePath) + (fragment ? `#${fragment}` : "");
      }
      return `<a href="${escape(link ?? "")}"${title ? ` title="${escape(title)}"` : ""}>${text}</a>`;
    },
  };
  const parser = new Marked({ renderer });
  let content = parser.parse(markdown).replaceAll("<table>", '<div class="table-wrap"><table>').replaceAll("</table>", "</table></div>");
  content = content.replace(/<!-- example:([a-z]+) -->/g, (_, kind) => {
    if (!(kind in exampleTitles)) throw new Error(`Unknown example: ${kind}`);
    const previewUrl = relative(target, `examples/gallery/${kind}.html`);
    const label = ["first", "connection", "measurement", "state"].includes(kind)
      ? "表示例は模擬装置。コピー用HTMLは実機用です。"
      : "表示例・コピー用HTMLともに模擬データを使います。";
    return `<section class="example" aria-label="表示例とコード"><div class="example-header"><span>プレビュー</span><a href="${previewUrl}" target="_blank" rel="noopener">別のタブで開く ↗</a></div><p class="example-note">${label}</p><iframe title="${escape(exampleTitles[kind])}の表示例" src="${previewUrl}" loading="lazy"></iframe><details class="example-code"><summary>コピーして使えるHTML</summary><p>nmrlink/直下に保存してWebサーバーで開きます。別の場所ではimport先を変更してください。</p><pre><code class="language-html">${escape(exampleDocument(kind))}</code></pre></details></section>`;
  });
  const groups = [
    ["Web UI", ["examples/standard/index.html", "examples/standard/frequency.html", "examples/standard/pulse.html", "examples/standard/t1.html", "examples/standard/t2.html", "examples/direct/index.html"]],
    ["Web UIの使い方", ["guide/standard.html", "guide/frequency.html", "guide/pulse.html", "guide/t1.html", "guide/t2.html"]],
    ["はじめる", ["index.html", "guide/install.html", "guide/first.html", "guide/ai.html", "examples/demo/index.html"]],
    ["装置を使う", ["guide/connection.html", "guide/parameters.html", "guide/measurement.html", "guide/state.html", "guide/node.html"]],
    ["データを扱う", ["guide/fid.html", "guide/fft.html", "guide/range.html", "guide/frequencygraph.html", "guide/pulsegraph.html", "guide/relaxationgraph.html", "guide/echograph.html", "guide/colors.html", "guide/save.html"]],
    ["遠隔で使う", ["guide/remote.html", "docs/FIREBASE.html", "guide/remote-ui.html"]],
    ["リファレンス", ["docs/API.html", "docs/ANALYSIS.html", "examples/direct/guide.html", "examples/remote/index.html"]],
  ];
  const navigation = groups.map(([label, targets]) => {
    const links = targets.map(href => {
      const entry = pages.find(([, destination]) => destination === href) ?? [null, href, href.endsWith("t2.html") ? "T2測定" : href.endsWith("t1.html") ? "T1測定" : href.endsWith("pulse.html") ? "パルス校正" : href.endsWith("frequency.html") ? "周波数調整" : href.includes("standard") ? "標準Web UIを開く" : "自作UI用の最小サンプル"];
      return `<a href="${relative(target, href)}"${href === target ? ' aria-current="page"' : ""}>${escape(entry[2])}</a>`;
    }).join("\n");
    return `<section class="nav-group"><h2>${label}${label === "遠隔で使う" ? ' <span class="status-badge">未検証</span>' : ""}</h2>${links}</section>`;
  }).join("\n") + `
<section class="nav-group"><h2>関連リンク</h2>
<a href="${relative(target, "llms.txt")}">AI向けドキュメント（llms.txt）</a>
<a href="https://alice.helixcode.net/~bando/">Masamitsu Bando</a>
<a href="https://alice.helixcode.net/~bando/Lab/">Bando Lab</a>
</section>`;
  const toc = headings.filter(heading => heading.level === 2).map(heading => `<a href="#${heading.id}">${heading.text}</a>`).join("\n");
  const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)} | NMRLink</title>
<link rel="stylesheet" href="${relative(target, "assets/style.css")}">
</head>
<body>
<a class="skip" href="#content">本文へ移動</a>
<header class="site-header"><a class="brand" href="${relative(target, "index.html")}">NMRLink<span class="version">${escape(version)}</span></a><span class="header-caption">ドキュメント</span><a class="github-link" href="https://github.com/masabando/nmrlink">GitHub</a><button class="menu-button" aria-controls="site-nav" aria-expanded="false" type="button">メニュー</button></header>
<div class="layout"><aside class="sidebar" id="site-nav"><label class="search-label">ページを探す<input type="search" id="nav-search" placeholder="例：FFT、接続、色"></label><nav aria-label="ドキュメント">${navigation}</nav><p id="search-empty" hidden>該当するページはありません。</p></aside><main id="content"><p class="eyebrow">NMRLink / ${escape(title)}</p>${content}<footer>NMRLink · <a href="${relative(target, "docs/API.html")}">APIリファレンス</a></footer></main><aside class="toc" aria-label="このページの内容"><p>このページ</p>${toc}</aside></div><script type="module" src="${relative(target, "assets/site.js")}"></script>
${target === "index.html" ? '<script type="module" src="assets/apparatus.js"></script>' : ""}
</body>
</html>
`;
  await mkdir(path.dirname(path.join(output, target)), { recursive: true });
  await writeFile(path.join(output, target), directoryUrls(html));
}
const publicFiles = [
  "examples/direct/index.html", "examples/direct/app.js",
  "examples/standard/t2.html", "examples/standard/t2.js", "examples/standard/timing.js", "examples/standard/t1.html", "examples/standard/t1.js", "examples/standard/index.html", "examples/standard/frequency.html", "examples/standard/frequency.js", "examples/standard/navigation.js", "examples/standard/pulse.html", "examples/standard/pulse.js", "examples/standard/style.css", "examples/standard/app.js", "examples/standard/model.js",
  ...["t2-sweep.js", "t2-record.js", "timing.js", "t1-sweep.js", "t1-record.js", "relaxation-fit.js", "signed-signal.js", "index.js", "sweep.js", "pulse-sweep.js", "pulse-record.js", "frequency-record.js", "pulse-fit.js", "frequency-sweep.js", "record.js", "protocol.js", "device.js", "line-decoder.js", "web-serial-transport.js", "baseline.js", "fft.js", "sample-validation.js", "analysis.js", "controller.js", "graphs.js", "browser.js"].map(name => `packages/nmrlink/src/${name}`),
];
for (const file of publicFiles) {
  await mkdir(path.dirname(path.join(output, file)), { recursive: true });
  if (file === "examples/direct/index.html") {
    const sample = await readFile(path.join(root, file), "utf8");
    await writeFile(path.join(output, file), directoryUrls(sample.replace("<body>", '<body>\n  <p><a href="../../index.html">NMRLink ドキュメント</a> / <a href="./guide.html">使い方</a></p>')));
  } else if (file.endsWith(".html")) {
    await writeFile(path.join(output, file), directoryUrls(await readFile(path.join(root, file), "utf8")));
  } else {
    await copyFile(path.join(root, file), path.join(output, file));
  }
}
await mkdir(path.join(output, "assets"), { recursive: true });
await copyFile(path.join(root, "site/style.css"), path.join(output, "assets/style.css"));
await copyFile(path.join(root, "site/site.js"), path.join(output, "assets/site.js"));
for (const kind of Object.keys(exampleTitles)) {
  const destination = path.join(output, "examples/gallery", kind + ".html");
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, exampleDocument(kind, { preview: true, moduleRoot: "../../packages/nmrlink/src" }));
}
// Bundle locally so the model viewer needs no CDN or external import map.
await build({
  entryPoints: [path.join(root, "site/apparatus.js")],
  outfile: path.join(output, "assets/apparatus.js"),
  bundle: true, format: "esm", minify: false, target: "es2022",
});
await mkdir(path.join(output, "model"), { recursive: true });
await copyFile(path.join(root, "model/nmr_apparatus.glb"), path.join(output, "model/nmr_apparatus.glb"));
await copyFile(path.join(root, "node_modules/three/LICENSE"), path.join(output, "assets/three-LICENSE.txt"));
await copyFile(path.join(root, "LICENSE"), path.join(output, "LICENSE.txt"));
await copyFile(path.join(root, "site/llms.txt"), path.join(output, "llms.txt"));
await writeFile(path.join(output, ".nojekyll"), "");
console.log(`Built ${pages.length} documentation pages and the direct sample in dist/pages/.`);
