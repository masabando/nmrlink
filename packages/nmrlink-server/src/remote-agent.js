import { randomUUID } from "node:crypto";
import { validateParameters } from "nmrlink";

/** One serialized command runner. No HTTP server, Functions or Storage. */
export class RemoteAgent {
  constructor({ store, auth, device, isAllowed, reconnectGraceMs = 180000, confirmDeviceIdle = false, onError = console.error }) {
    if (!Number.isSafeInteger(reconnectGraceMs) || reconnectGraceMs < 60000) throw new Error("Grace must be at least 60000 ms.");
    Object.assign(this, { store, auth, device, isAllowed, reconnectGraceMs, confirmDeviceIdle, onError });
    this.session = null;
    this.state = "offline";
    this.queue = Promise.resolve();
    this.stopping = false;
    this.fatal = null;
  }

  enqueue(task) {
    this.queue = this.queue.then(async () => {
      if (!this.stopping && !this.fatal) await task();
    }).catch(error => this.halt(error));
    return this.queue;
  }

  async halt(error) {
    if (!this.fatal) {
      this.fatal = error;
      this.unsubscribe?.();
      clearInterval(this.leaseTimer);
      clearInterval(this.maintenanceTimer);
      this.onError(error);
    }
    // Do not publish idle or replay hardware work after an uncertain cloud write.
  }

  async publish(state) {
    this.state = state;
    await this.store.setState({
      state,
      ownerUid: this.session?.uid ?? null,
      sessionId: this.session?.id ?? null,
    });
  }

  async start() {
    await this.store.acquireLease();
    try {
      const previous = await this.store.readState();
      if (previous?.state === "measuring" && !this.confirmDeviceIdle) {
        throw new Error("Previous measurement may still be active. Confirm the hardware is idle before recovery (NMRLINK_CONFIRM_DEVICE_IDLE=true).");
      }
      // Crash recovery: discard old work/results before accepting any new user.
      await this.publish("cleaning");
      await this.store.clearData();
      await this.device.connect();
      await this.publish("idle");
      this.unsubscribe = this.store.watchRequests(uid => this.enqueue(() => this.process(uid)), error => this.halt(error));
      this.leaseTimer = setInterval(() => {
        this.store.renewLease().catch(error => this.halt(error));
      }, 30000);
      this.maintenanceTimer = setInterval(() => this.enqueue(() => this.expire()), 15000);
    } catch (error) {
      await this.device.disconnect().catch(() => {});
      await this.store.releaseLease().catch(() => {});
      throw error;
    }
  }

  async clearSession() {
    await this.publish("cleaning");
    await this.store.clearData();
    this.session = null;
    if (this.device.state !== "connected") await this.device.connect();
    await this.publish("idle");
  }

  async expire() {
    if (this.session && Date.now() - this.session.lastSeen > this.reconnectGraceMs) await this.clearSession();
  }

  async process(uid) {
    const request = await this.store.claim(uid);
    if (!request) return;
    let user;
    try { user = await this.auth.getUser(uid); }
    catch { await this.store.finish(request, "rejected", "アカウントを確認できません。"); return; }
    if (!this.isAllowed(user)) {
      await this.store.finish(request, "rejected", "利用できません。");
      return;
    }

    if (request.type === "acquire") {
      if (this.session && (this.session.uid !== uid || this.session.id !== request.sessionId)) {
        await this.store.finish(request, "rejected", "使用中です。");
        return;
      }
      this.session = { uid, id: request.sessionId || randomUUID(), lastSeen: Date.now() };
      await this.publish("occupied");
      await this.store.finish(request, "done");
      return;
    }
    if (!this.session || this.session.uid !== uid || this.session.id !== request.sessionId) {
      await this.store.finish(request, "rejected", "操作権がありません。");
      return;
    }
    this.session.lastSeen = Date.now();
    if (request.type === "heartbeat") {
      await this.store.finish(request, "done");
    } else if (request.type === "release") {
      // Deleting this request is the release acknowledgement.
      await this.clearSession();
    } else if (request.type === "measure") {
      let parameters;
      try {
        parameters = validateParameters(JSON.parse(request.parametersJson));
        if (!["single", "double"].includes(request.mode)) throw new Error("Invalid mode.");
      } catch {
        await this.store.finish(request, "rejected", "測定条件が不正です。");
        return;
      }
      await this.publish("measuring");
      let result;
      try { result = await this.device.measure(parameters, { mode: request.mode }); }
      catch {
        await this.store.finish(request, "failed", "測定に失敗しました。利用終了後に再接続します。");
        await this.publish("error");
        return;
      }
      if (this.fatal) return; // Lease loss means this worker may no longer publish.
      await this.store.saveResult(request.requestId, result);
      await this.store.finish(request, "done");
      this.session.lastSeen = Date.now(); // Full grace after measurement completes.
      await this.publish("occupied");
      result = null;
    } else {
      await this.store.finish(request, "rejected", "未対応の要求です。");
    }
  }

  async stop() {
    this.stopping = true;
    this.unsubscribe?.();
    clearInterval(this.leaseTimer);
    clearInterval(this.maintenanceTimer);
    await this.queue; // An active measurement finishes; never pretend to stop hardware.
    if (!this.fatal) {
      await this.publish("cleaning");
      await this.store.clearData();
      this.session = null;
      await this.publish("offline");
    }
    await this.device.disconnect();
    await this.store.releaseLease();
  }
}
