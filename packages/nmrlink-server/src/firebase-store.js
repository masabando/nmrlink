import { randomUUID } from "node:crypto";

/** Firestore persistence only. The agent owns device/session behavior. */
export class FirebaseStore {
  constructor(db, deviceId) {
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(deviceId)) throw new Error("Invalid device ID.");
    this.db = db;
    this.device = db.doc(`devices/${deviceId}`);
    this.lease = db.doc(`agents/${deviceId}`);
    this.workerId = randomUUID();
  }

  async readState() {
    return (await this.device.get()).data();
  }

  async acquireLease() {
    await this.db.runTransaction(async transaction => {
      const current = await transaction.get(this.lease);
      if (current.exists && current.data().expiresAt > Date.now()) throw new Error("Another agent is active.");
      transaction.set(this.lease, { workerId: this.workerId, expiresAt: Date.now() + 120000 });
    });
  }

  async renewLease() {
    await this.db.runTransaction(async transaction => {
      const current = await transaction.get(this.lease);
      if (current.data()?.workerId !== this.workerId || current.data().expiresAt <= Date.now()) {
        throw new Error("Agent lease expired or was replaced. Restart required.");
      }
      transaction.update(this.lease, { expiresAt: Date.now() + 120000 });
      transaction.update(this.device, { updatedAt: Date.now() });
    });
  }

  async releaseLease() {
    await this.db.runTransaction(async transaction => {
      const current = await transaction.get(this.lease);
      if (current.data()?.workerId === this.workerId) transaction.delete(this.lease);
    });
  }

  async setState(data) {
    await this.db.runTransaction(async transaction => {
      const lease = await transaction.get(this.lease);
      if (lease.data()?.workerId !== this.workerId || lease.data().expiresAt <= Date.now()) throw new Error("Agent lease lost.");
      transaction.set(this.device, { ...data, updatedAt: Date.now() });
    });
  }

  watchRequests(onRequest, onError) {
    return this.device.collection("requests").where("status", "==", "pending")
      .onSnapshot(snapshot => {
        for (const change of snapshot.docChanges()) {
          if (change.type !== "removed") onRequest(change.doc.id);
        }
      }, onError);
  }

  /** Claim durably before touching hardware. No 'running' request is replayed. */
  async claim(uid) {
    const ref = this.device.collection("requests").doc(uid);
    return this.db.runTransaction(async transaction => {
      const lease = await transaction.get(this.lease);
      const snapshot = await transaction.get(ref);
      if (lease.data()?.workerId !== this.workerId || lease.data().expiresAt <= Date.now()) throw new Error("Agent lease lost.");
      if (!snapshot.exists || snapshot.data().status !== "pending") return null;
      const request = snapshot.data();
      transaction.update(ref, { status: "running" });
      return { ...request, uid };
    });
  }

  async finish(request, status, message = "") {
    const ref = this.device.collection("requests").doc(request.uid);
    await this.db.runTransaction(async transaction => {
      const current = await transaction.get(ref);
      if (current.data()?.requestId === request.requestId) transaction.update(ref, { status, message });
    });
  }

  async saveResult(requestId, result) {
    const json = JSON.stringify(result);
    // Firestore disallows nested arrays. JSON also keeps the SDK representation small.
    if (Buffer.byteLength(json, "utf8") > 400000) throw new Error("Measurement result exceeds 400 KB.");
    await this.device.collection("results").doc(requestId).set({ json });
  }

  async removeCollection(name) {
    while (true) {
      const snapshot = await this.device.collection(name).limit(200).get();
      if (snapshot.empty) return;
      const batch = this.db.batch();
      snapshot.docs.forEach(document => batch.delete(document.ref));
      await batch.commit();
    }
  }

  async clearData() {
    // Device stays 'cleaning'; Rules reject new requests until this completes.
    await this.removeCollection("results");
    await this.removeCollection("requests");
  }
}
