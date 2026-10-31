import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

// 初回の開発起動だけ、検索索引も用意します。以後の索引更新は npm run build で行います。
if (!existsSync(new URL("../public/pagefind/pagefind.js", import.meta.url))) {
  console.log("Preparing the initial Pagefind index…");
  execFileSync(process.execPath, [process.env.npm_execpath, "run", "build"], {
    cwd: new URL("../", import.meta.url), stdio: "inherit",
  });
}
