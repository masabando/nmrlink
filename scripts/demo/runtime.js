import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { generateKeyPairSync } from "node:crypto";
import { initializeApp, cert, deleteApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { FirebaseStore, RemoteAgent, createAccessPolicy } from "nmrlink-server";
import { createDemoDevice } from "./mock-controller.js";
import { DEMO_PROJECT_ID, DEMO_DEVICE_ID, DEMO_AUTH_PORT, DEMO_FIRESTORE_PORT, DEMO_WEB_PORT } from "./config.js";

// Fail closed rather than accidentally allowing Admin SDK to use real Firebase.
if (process.env.FIRESTORE_EMULATOR_HOST !== `127.0.0.1:${DEMO_FIRESTORE_PORT}` ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST !== `127.0.0.1:${DEMO_AUTH_PORT}` ||
    process.env.GCLOUD_PROJECT !== DEMO_PROJECT_ID) {
  throw new Error("Demo must be launched by npm run demo with its fixed local emulators.");
}
const root = fileURLToPath(new URL("../../", import.meta.url));
const publicDirectory = join(root, ".cache", "demo-public");
let app, agent, server;
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  try {
    await new Promise(resolve => server ? server.close(resolve) : resolve());
    if (agent) await agent.stop();
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { if (app) await deleteApp(app); }
}
try {
  await mkdir(publicDirectory, { recursive: true });
  await build({
    entryPoints: [join(root, "examples", "demo", "app.js")], outfile: join(publicDirectory, "app.js"),
    bundle: true, format: "esm", platform: "browser", minify: false, sourcemap: true,
  });
  // Admin Firestore requires a certificate-shaped credential even for emulation.
  // Generate a throwaway key in memory; it is not a real service account.
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
  app = initializeApp({ projectId: DEMO_PROJECT_ID, credential: cert({
    projectId: DEMO_PROJECT_ID, clientEmail: `local-demo@${DEMO_PROJECT_ID}.iam.gserviceaccount.com`, privateKey,
  }) });
  agent = new RemoteAgent({
    store: new FirebaseStore(getFirestore(app), DEMO_DEVICE_ID), auth: getAuth(app), device: createDemoDevice(),
    isAllowed: createAccessPolicy({ allowedDomains: ["ktc.ac.jp"] }),
    reconnectGraceMs: 180000, confirmDeviceIdle: true,
    onError: error => console.error(`Demo agent stopped: ${error.message}`),
  });
  await agent.start();
  const files = {
    "/": [join(root, "examples", "demo", "index.html"), "text/html; charset=utf-8"],
    "/app.js": [join(publicDirectory, "app.js"), "text/javascript; charset=utf-8"],
    "/app.js.map": [join(publicDirectory, "app.js.map"), "application/json"],
  };
  server = createServer(async (request, response) => {
    // Only serve an explicit public file list; never the repository or .env files.
    const file = files[new URL(request.url, "http://localhost").pathname];
    if (request.method !== "GET" || !file) { response.writeHead(404).end(); return; }
    try {
      response.writeHead(200, { "Content-Type": file[1], "Cache-Control": "no-store" });
      response.end(await readFile(file[0]));
    } catch { response.writeHead(500).end("Demo file could not be loaded."); }
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(DEMO_WEB_PORT, "127.0.0.1", resolve); });
  console.log(`\nNMRLink DEMO ready: http://127.0.0.1:${DEMO_WEB_PORT}\nFirebase設定・Googleアカウント・実機は不要です。Ctrl+Cで終了します。\n`);
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
  await stop();
}
