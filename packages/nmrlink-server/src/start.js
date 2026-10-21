import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { loadEnvFile } from "node:process";
import { initializeApp, cert, deleteApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { NMRDevice } from "nmrlink";
import { NodeSerialTransport } from "./node-serial-transport.js";
import { createAccessPolicy } from "./access-policy.js";
import { FirebaseStore } from "./firebase-store.js";
import { RemoteAgent } from "./remote-agent.js";

// Configuration paths are relative to the env file, not npm workspace's cwd.
const envPath = resolve(process.env.NMRLINK_ENV_FILE ?? ".env.local");
if (existsSync(envPath)) loadEnvFile(envPath);
const required = name => {
  if (!process.env[name]) throw new Error(`Missing environment variable: ${name}`);
  return process.env[name];
};
const localPath = name => resolve(dirname(envPath), required(name));
let app;
let agent;
try {
  const credentials = JSON.parse(await readFile(localPath("NMRLINK_CREDENTIALS"), "utf8"));
  const projectId = required("NMRLINK_PROJECT_ID");
  if (credentials.project_id !== projectId) throw new Error("Credential project does not match NMRLINK_PROJECT_ID.");
  const policy = createAccessPolicy(JSON.parse(await readFile(localPath("NMRLINK_ACCESS_POLICY"), "utf8")));
  app = initializeApp({ credential: cert(credentials), projectId });
  const store = new FirebaseStore(getFirestore(app), required("NMRLINK_DEVICE_ID"));
  const device = new NMRDevice({ transport: new NodeSerialTransport({ path: required("NMRLINK_SERIAL_PORT") }) });
  agent = new RemoteAgent({
    store, auth: getAuth(app), device, isAllowed: policy,
    confirmDeviceIdle: process.env.NMRLINK_CONFIRM_DEVICE_IDLE === "true",
    reconnectGraceMs: Number(process.env.NMRLINK_RECONNECT_GRACE_MS ?? 180000),
    onError: error => console.error("受付を停止しました。設定・接続を確認して再起動してください:", error.message),
  });
  await agent.start();
  console.log(`NMRLink ready: ${process.env.NMRLINK_DEVICE_ID}`);
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    try { await agent.stop(); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
    finally { await deleteApp(app); }
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
} catch (error) {
  console.error(error.message);
  if (app) await deleteApp(app);
  process.exitCode = 1;
}
