/**
 * UI-independent browser client. Pass Firebase's modular firestore SDK explicitly.
 * No Node.js imports, credentials or policy files belong in this module.
 */
export class RemoteClient {
  constructor({ auth, db, deviceId, firestore, storage = globalThis.sessionStorage, onClear = () => {} }) {
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(deviceId)) throw new Error("Invalid device ID.");
    Object.assign(this, { auth, db, deviceId, sdk: firestore, storage, onClear });
    this.inFlight = false;
    this.sessionId = null;
  }

  key() { return `nmrlink:${this.deviceId}:${this.auth.currentUser.uid}`; }

  watchDevice(onState, onError) {
    let latest;
    let fromCache = true;
    const emit = () => {
      const state = latest;
      const owned = !!this.sessionId && state?.ownerUid === this.auth.currentUser?.uid && state.sessionId === this.sessionId;
      if (this.ownedOnce && !owned) this.clearLocal();
      if (owned) this.ownedOnce = true;
      onState({
        state: state?.state ?? "offline",
        owned,
        online: !fromCache && Date.now() - (state?.updatedAt ?? 0) < 90000,
      });
    };
    const unsubscribe = this.sdk.onSnapshot(this.sdk.doc(this.db, "devices", this.deviceId), snapshot => {
      latest = snapshot.data();
      fromCache = snapshot.metadata.fromCache;
      emit();
    }, onError);
    // Update offline indication even when a stopped agent emits no more snapshots.
    const timer = setInterval(emit, 10000);
    return () => { clearInterval(timer); unsubscribe(); };
  }

  async acquire() {
    if (!this.auth.currentUser) throw new Error("Googleログインが必要です。");
    this.sessionId = this.storage?.getItem(this.key()) ?? crypto.randomUUID();
    this.storage?.setItem(this.key(), this.sessionId);
    try {
      await this.send("acquire");
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = setInterval(() => {
        if (!this.inFlight && this.sessionId) this.send("heartbeat").catch(() => {});
      }, 60000);
    } catch (error) { this.clearLocal(); throw error; }
  }

  async measure(parameters, { mode = "single", timeoutMs = 600000 } = {}) {
    if (!this.sessionId) throw new Error("先に利用開始してください。");
    const requestId = await this.send("measure", { parametersJson: JSON.stringify(parameters), mode, timeoutMs });
    const result = await this.sdk.getDocFromServer(this.sdk.doc(this.db, "devices", this.deviceId, "results", requestId));
    if (!result.exists()) throw new Error("結果は削除済みです。");
    return JSON.parse(result.data().json);
  }

  async release() {
    if (!this.sessionId) return;
    const expectedSession = this.sessionId;
    try { await this.send("release"); }
    catch (error) {
      // A session can expire while a confirmation UI is open.
      if (error.code !== "permission-denied") throw error;
      const current = await this.sdk.getDocFromServer(this.sdk.doc(this.db, "devices", this.deviceId));
      if (current.data()?.ownerUid === this.auth.currentUser?.uid && current.data()?.sessionId === expectedSession) throw error;
    }
    this.clearLocal();
  }

  clearLocal() {
    if (this.auth.currentUser) this.storage?.removeItem(this.key());
    this.sessionId = null;
    this.ownedOnce = false;
    clearInterval(this.heartbeatTimer);
    this.onClear();
  }

  async send(type, { parametersJson = "", mode = "", timeoutMs = 30000 } = {}) {
    if (this.inFlight) throw new Error("処理中です。完了を待ってください。");
    if (!this.auth.currentUser) throw new Error("ログインが必要です。");
    this.inFlight = true;
    try {
      const requestId = crypto.randomUUID();
      const sessionId = this.sessionId;
      const ref = this.sdk.doc(this.db, "devices", this.deviceId, "requests", this.auth.currentUser.uid);
      // A transaction fails offline rather than silently queuing a hardware request.
      await this.sdk.runTransaction(this.db, async transaction => {
        const old = await transaction.get(ref);
        if (old.exists() && ["pending", "running"].includes(old.data().status)) {
          throw new Error("前の要求を処理中です。再送せず待ってください。");
        }
        const createdAt = old.data()?.createdAt?.toMillis() ?? 0;
        if (Date.now() - createdAt < 1100) throw new Error("少し待ってから操作してください。");
        transaction.set(ref, {
          requestId, type, sessionId,
          parametersJson, mode, createdAt: this.sdk.serverTimestamp(), status: "pending",
        });
      });
      await new Promise((resolve, reject) => {
        let unsubscribe;
        const finish = error => {
          clearTimeout(timer);
          unsubscribe?.();
          if (error) reject(error); else resolve();
        };
        const timer = setTimeout(() => finish(new Error("応答待ちが終了しました。測定を自動再送しないでください。")), timeoutMs);
        unsubscribe = this.sdk.onSnapshot(ref, snapshot => {
          if (snapshot.metadata.fromCache) return;
          if (!snapshot.exists()) {
            if (type === "release") finish();
            else finish(new Error("要求は利用終了または再起動で削除されました。"));
            return;
          }
          const data = snapshot.data();
          if (data.requestId !== requestId) return;
          if (data.status === "done") finish();
          if (["failed", "rejected"].includes(data.status)) finish(new Error(data.message));
        }, finish);
      });
      return requestId;
    } finally { this.inFlight = false; }
  }
}
