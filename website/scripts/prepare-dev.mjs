import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

// 初回の開発起動だけ、検索索引も用意します。以後の索引更新は npm run build で行います。
if (!existsSync(new URL("../public/pagefind/pagefind.js", import.meta.url))) {
  console.log("Preparing the initial Pagefind index…");
  execFileSync(process.execPath, [process.env.npm_execpath, "run", "build"], {
    cwd: new URL("../", import.meta.url), stdio: "inherit",
  });
}

// Storybookも同じ開発サーバーの /storybook/ でプレビューできます。
// 起動時点の静的表示です。Story編集の即時反映には npm run storybook を使います。
console.log("Preparing the graph Storybook…");
execFileSync(process.execPath, [process.env.npm_execpath, "run", "build-storybook"], {
  cwd: new URL("../", import.meta.url), stdio: "inherit",
});
const { cpSync, rmSync } = await import("node:fs");
const previewDirectory = new URL("../public/storybook/", import.meta.url);
rmSync(previewDirectory, { recursive: true, force: true });
cpSync(new URL("../storybook-static/", import.meta.url), previewDirectory, { recursive: true });
