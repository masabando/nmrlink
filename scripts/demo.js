import { spawn } from "node:child_process";
import { dirname, join, delimiter } from "node:path";
import { fileURLToPath } from "node:url";
import { demoJavaEnvironment } from "./demo/java.js";
import { DEMO_PROJECT_ID } from "./demo/config.js";

const root = fileURLToPath(new URL("../", import.meta.url));
try {
  const environment = await demoJavaEnvironment(root);
  // The child runner is only allowed to target demo-* emulator endpoints.
  delete environment.GOOGLE_APPLICATION_CREDENTIALS;
  environment.GCLOUD_PROJECT = DEMO_PROJECT_ID;
  environment.GOOGLE_CLOUD_PROJECT = DEMO_PROJECT_ID;
  environment.PATH = `${dirname(process.execPath)}${delimiter}${environment.PATH}`;
  environment.NO_UPDATE_NOTIFIER = "1";
  const cli = join(root, "node_modules", "firebase-tools", "lib", "bin", "firebase.js");
  const child = spawn(process.execPath, [cli, "emulators:exec", "--project", DEMO_PROJECT_ID,
    "--config", "firebase.demo.json", "--only", "auth,firestore", "node scripts/demo/runtime.js"], {
    cwd: root, env: environment, stdio: "inherit",
  });
  // Firebase CLI forwards termination to its child and shuts down its emulators.
  let stopping = false;
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => {
    if (!stopping) { stopping = true; child.kill(signal); }
  });
  child.on("error", error => { console.error(error.message); process.exitCode = 1; });
  child.on("exit", code => { process.exitCode = stopping ? 0 : (code ?? 1); });
} catch (error) {
  console.error(`デモを起動できません: ${error.message}`);
  console.error("Node.js 24 LTSとnpm installを確認してください。初回はダウンロード用のネット接続が必要です。");
  process.exitCode = 1;
}
