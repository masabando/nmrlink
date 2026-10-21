import test from "node:test";
import assert from "node:assert/strict";
import { RemoteClient } from "../browser/remote-client.js";

test("device watch hides owner details, preserves pending acquire, and clears after handover", () => {
  let deliver;
  let stopped = false;
  let cleared = 0;
  const states = [];
  const client = new RemoteClient({
    auth: { currentUser: { uid: "student" } }, db: {}, deviceId: "test-device", storage: { removeItem() {} },
    firestore: { doc() {}, onSnapshot(ref, callback) { deliver = callback; return () => { stopped = true; }; } },
    onClear() { cleared++; },
  });
  const emit = data => deliver({ data: () => data, metadata: { fromCache: false } });
  const unsubscribe = client.watchDevice(state => states.push(state));
  try {
    client.sessionId = "pending-session";
    emit({ state: "idle", ownerUid: null, sessionId: null, updatedAt: Date.now() });
    assert.equal(client.sessionId, "pending-session");
    emit({ state: "occupied", ownerUid: "student", sessionId: "pending-session", updatedAt: Date.now() });
    assert.equal(states.at(-1).owned, true);
    assert.deepEqual(Object.keys(states.at(-1)).sort(), ["online", "owned", "state"]);
    emit({ state: "idle", ownerUid: null, sessionId: null, updatedAt: Date.now() - 100000 });
    assert.equal(states.at(-1).online, false);
    assert.equal(client.sessionId, null);
    assert.equal(cleared, 1);
  } finally { unsubscribe(); }
  assert.equal(stopped, true);
});
