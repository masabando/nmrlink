import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import * as firestore from "firebase/firestore";
import { RemoteClient } from "../../packages/nmrlink-server/browser/remote-client.js";
import { FirebaseStore } from "../../packages/nmrlink-server/src/firebase-store.js";
import { RemoteAgent } from "../../packages/nmrlink-server/src/remote-agent.js";
import { createAccessPolicy } from "../../packages/nmrlink-server/src/access-policy.js";

// Always a demo project and both emulators: never touch a real cloud project.
const projectId = "demo-nmrlink";
let environment, app, db, auth;
const deviceId = "test-device";
const googleClaims = { email: "student@ktc.ac.jp", email_verified: true, firebase: { sign_in_provider: "google.com" } };
function browser(uid = "student", claims = googleClaims) { return environment.authenticatedContext(uid, claims).firestore(); }
function request(type = "acquire", sessionId = randomUUID()) {
  return { requestId: randomUUID(), type, sessionId, parametersJson: "", mode: "", createdAt: serverTimestamp(), status: "pending" };
}
async function waitFor(check) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const result = await check();
    if (result) return result;
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  throw new Error("Timed out waiting for emulator state.");
}

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST);
  assert.ok(process.env.FIREBASE_AUTH_EMULATOR_HOST);
  environment = await initializeTestEnvironment({ projectId, firestore: { rules: await readFile("firebase/firestore.rules", "utf8") } });
  app = initializeApp({ projectId });
  db = getFirestore(app);
  auth = getAuth(app);
});
after(async () => { await environment.cleanup(); await deleteApp(app); });
beforeEach(async () => {
  await environment.clearFirestore();
  await db.doc(`devices/${deviceId}`).set({ state: "idle" });
});

test("Rules authenticate requests, prevent impersonation and protect state/results", async () => {
  const client = browser();
  const ref = doc(client, "devices", deviceId, "requests", "student");
  await assertSucceeds(setDoc(ref, request()));
  await assertFails(setDoc(ref, request())); // Cannot replace pending/running work.
  await assertFails(setDoc(doc(client, "devices", deviceId, "requests", "other"), request()));
  await assertFails(setDoc(doc(client, "devices", deviceId), { state: "idle" }));
  await assertFails(setDoc(doc(client, "devices", deviceId, "results", "fake"), { json: "{}" }));
  await assertFails(deleteDoc(ref));
  await assertFails(getDoc(doc(client, "agents", deviceId)));
  const anonymous = environment.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(anonymous, "devices", deviceId)));
  await assertFails(setDoc(doc(browser("password", { ...googleClaims, firebase: { sign_in_provider: "password" } }), "devices", deviceId, "requests", "password"), request()));
  await assertFails(setDoc(doc(browser("unverified", { ...googleClaims, email_verified: false }), "devices", deviceId, "requests", "unverified"), request()));
});

test("Rules enforce schema and cleaning blocks new work; viewing remains a soft UI policy", async () => {
  const client = browser();
  const ref = doc(client, "devices", deviceId, "requests", "student");
  await assertFails(setDoc(ref, { ...request(), extra: true }));
  await assertFails(setDoc(ref, { ...request(), parametersJson: "x".repeat(2001) }));
  await assertFails(setDoc(ref, { ...request(), status: "done" }));
  await db.doc(`devices/${deviceId}`).set({ state: "cleaning" });
  await assertFails(setDoc(ref, request()));
  await db.doc(`devices/${deviceId}/results/result`).set({ json: "{}" });
  const outsider = browser("outsider", { ...googleClaims, email: "outside@example.com" });
  await assertSucceeds(getDoc(doc(outsider, "devices", deviceId, "results", "result")));
});

test("agent: Google account policy, exclusive session, measurement and deletion on handover", async () => {
  for (const uid of ["student", "second", "outsider"]) {
    await auth.deleteUser(uid).catch(() => {});
    await auth.createUser({ uid, email: uid === "outsider" ? "out@example.com" : `${uid}@ktc.ac.jp`, emailVerified: true,
    });
    await auth.updateUser(uid, { providerToLink: { providerId: "google.com", uid, email: `${uid}@ktc.ac.jp` } });
  }
  let measurements = 0;
  const device = {
    state: "disconnected", async connect() { this.state = "connected"; },
    async disconnect() { this.state = "disconnected"; },
    async measure(parameters, options) { measurements++; return { parameters, ...options, points: 2048, raw: [[1, -1], [2, -2]] }; },
  };
  const store = new FirebaseStore(db, deviceId);
  const agent = new RemoteAgent({ store, auth, device, isAllowed: createAccessPolicy({ allowedDomains: ["ktc.ac.jp"] }), onError: error => { throw error; } });
  await agent.start();
  try {
    const id = randomUUID();
    const submit = async (uid, payload) => {
      const ref = db.doc(`devices/${deviceId}/requests/${uid}`);
      await ref.set({ ...payload, createdAt: new Date() });
      return waitFor(async () => {
        const data = (await ref.get()).data();
        return data && ["done", "rejected", "failed"].includes(data.status) ? data : null;
      });
    };
    assert.equal((await submit("outsider", request())).status, "rejected");
    const saved = new Map();
    saved.set(`nmrlink:${deviceId}:student`, id);
    const client = new RemoteClient({ auth: { currentUser: { uid: "student" } }, db: browser(), deviceId, firestore,
      storage: { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) } });
    await client.acquire();
    clearInterval(client.heartbeatTimer);
    assert.equal((await submit("second", request())).status, "rejected");
    const measure = { ...request("measure", id), mode: "single", parametersJson: JSON.stringify({
      frequencyHz: 402000, pulse1Cycles: 60, phase1Degrees: 0, pulse2Cycles: 120,
      phase2Degrees: 90, pulseIntervalMs: 5, measurementIntervalMs: 200, scans: 1,
    }) };
    await new Promise(resolve => setTimeout(resolve, 1150));
    const result = await client.measure(JSON.parse(measure.parametersJson));
    assert.deepEqual(result.raw, [[1, -1], [2, -2]]);
    assert.equal(measurements, 1);
    // Re-delivery of an already claimed/completed request cannot execute again.
    await agent.process("student");
    assert.equal(measurements, 1);
    assert.equal((await store.device.collection("results").get()).size, 1);
    await new Promise(resolve => setTimeout(resolve, 1150));
    await client.release();
    await waitFor(async () => (await store.device.get()).data().state === "idle");
    assert.equal((await store.device.collection("results").get()).empty, true);
    assert.equal((await store.device.collection("requests").get()).empty, true);
    assert.equal(agent.session, null);
  } finally { await agent.stop(); }
});

test("lease excludes another agent; startup clears old running work without replay", async () => {
  const first = new FirebaseStore(db, deviceId);
  const second = new FirebaseStore(db, deviceId);
  await first.acquireLease();
  await assert.rejects(second.acquireLease(), /Another agent/);
  await first.releaseLease();
  await db.doc(`devices/${deviceId}/requests/old`).set({ status: "running" });
  await db.doc(`devices/${deviceId}/results/old`).set({ json: "old" });
  const device = { state: "disconnected", async connect() { this.state = "connected"; }, async disconnect() { this.state = "disconnected"; }, async measure() { throw new Error("Must not replay"); } };
  const agent = new RemoteAgent({ store: second, auth, device, isAllowed: () => true });
  await agent.start();
  try {
    assert.equal((await second.device.collection("requests").get()).empty, true);
    assert.equal((await second.device.collection("results").get()).empty, true);
    agent.session = { uid: "student", id: randomUUID(), lastSeen: 0 };
    await agent.expire();
    assert.equal(agent.session, null);
    assert.equal((await second.device.get()).data().state, "idle");
  } finally { await agent.stop(); }
});

test("uncertain measurement after a crash is not silently reused", async () => {
  await db.doc(`devices/${deviceId}`).set({ state: "measuring" });
  let connections = 0;
  const device = { async connect() { connections++; }, async disconnect() {} };
  const agent = new RemoteAgent({ store: new FirebaseStore(db, deviceId), auth, device, isAllowed: () => true });
  await assert.rejects(agent.start(), /Confirm the hardware is idle/);
  assert.equal(connections, 0);
  assert.equal((await db.doc(`devices/${deviceId}`).get()).data().state, "measuring");
});

test("failed deletion blocks handover; restart can recover without replay", async () => {
  const store = new FirebaseStore(db, deviceId);
  const device = { state: "disconnected", async connect() { this.state = "connected"; }, async disconnect() { this.state = "disconnected"; } };
  const agent = new RemoteAgent({ store, auth, device, isAllowed: () => true });
  await agent.start();
  const clear = store.clearData.bind(store);
  try {
    agent.session = { uid: "student", id: randomUUID(), lastSeen: 0 };
    store.clearData = async () => { throw new Error("Quota exhausted"); };
    await assert.rejects(agent.expire(), /Quota/);
    assert.equal(agent.session.uid, "student");
    assert.equal((await store.device.get()).data().state, "cleaning");
    await assertFails(setDoc(doc(browser(), "devices", deviceId, "requests", "student"), request()));
    store.clearData = clear;
    await agent.expire();
    assert.equal(agent.session, null);
  } finally { store.clearData = clear; await agent.stop(); }
});
