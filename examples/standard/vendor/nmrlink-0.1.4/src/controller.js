import { NMRDevice } from "./device.js";
import { runFrequencySweep } from "./frequency-sweep.js";
import { runT2Sweep } from "./t2-sweep.js";
import { runT1Sweep } from "./t1-sweep.js";
import { runPulseSweep } from "./pulse-sweep.js";

/** UI-independent operation lifecycle. Commands report errors rather than reject. */
export class NMRController {
  constructor({ device = new NMRDevice() } = {}) {
    this.device = device;
    this.result = null;
    this.operation = null;
    this.disposed = false;
    this.listeners = { state: new Set(), result: new Set(), error: new Set() };
    // Transports currently have no shared event contract for an idle USB loss.
    this.timer = setInterval(() => this.emitState(), 500);
    this.timer.unref?.();
  }

  get state() {
    const connected = this.device.state === "connected";
    const busy = this.operation !== null;
    return {
      connection: this.device.state, operation: this.operation, busy,
      canConnect: !this.disposed && !busy && this.device.state === "disconnected",
      canDisconnect: !this.disposed && !busy && connected,
      canMeasure: !this.disposed && !busy && connected,
      hasResult: this.result !== null,
    };
  }

  subscribe(type, callback) {
    if (this.disposed) throw new Error("Controller is disposed.");
    this.listeners[type].add(callback);
    return () => this.listeners[type].delete(callback);
  }

  onStateChange(callback) {
    const unsubscribe = this.subscribe("state", callback);
    callback(this.state);
    return unsubscribe;
  }
  onResult(callback) { return this.subscribe("result", callback); }
  onError(callback) { return this.subscribe("error", callback); }

  emit(type, value) {
    for (const listener of this.listeners[type]) {
      try { listener(value); }
      catch (error) {
        // A UI/analysis error must not invalidate a successful hardware operation.
        if (type !== "error") this.emit("error", error);
        else console.error(error);
      }
    }
  }

  emitState() {
    const state = this.state;
    const signature = JSON.stringify(state);
    if (signature !== this.previousState) {
      this.previousState = signature;
      this.emit("state", state);
    }
  }

  async run(operation, action) {
    if (this.disposed || this.operation) {
      const error = new Error("Controller is disposed or another operation is running.");
      this.emit("error", error);
      return { ok: false, error };
    }
    this.operation = operation;
    this.emitState();
    try {
      // No asynchronous work precedes action: connect retains the user's gesture.
      const value = await action();
      if (operation === "measure") {
        this.result = value;
        this.emit("result", value);
      }
      return { ok: true, value };
    } catch (error) {
      this.emit("error", error);
      return { ok: false, error };
    } finally {
      this.operation = null;
      this.emitState();
    }
  }

  connect() { return this.run("connect", () => this.device.connect()); }
  disconnect() { return this.run("disconnect", () => this.device.disconnect()); }
  measure(parameters, options) { return this.run("measure", () => this.device.measure(parameters, options)); }

  sweep(parameters, options = {}) { return this.scan(runFrequencySweep, parameters, options); }
  pulseSweep(parameters, options = {}) { return this.scan(runPulseSweep, parameters, options); }

  t2Sweep(parameters, options = {}) { return this.scan(runT2Sweep, parameters, options); }

  t1Sweep(parameters, options = {}) { return this.scan(runT1Sweep, parameters, options); }

  scan(runner, parameters, options) {
    return this.run("sweep", () => runner(this.device, parameters, {
      ...options,
      onPoint: async (point, completed, total) => {
        this.result = point.record;
        if (options.onPoint) await options.onPoint(point, completed, total);
      },
    }));
  }

  /** Stop UI monitoring only; never stop or disconnect the hardware implicitly. */
  dispose() {
    if (this.operation) throw new Error("Wait for the current operation before disposing.");
    clearInterval(this.timer);
    this.disposed = true;
    for (const listeners of Object.values(this.listeners)) listeners.clear();
  }
}
