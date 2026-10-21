import { Buffer } from "node:buffer";
import { setTimeout as delay } from "node:timers/promises";
import { SerialPort } from "serialport";
import { LineDecoder, SERIAL_OPTIONS } from "nmrlink";

/**
 * Node.js serial adapter for NMRDevice.
 * SerialPortClass is injectable for tests; normal callers only specify path.
 */
export class NodeSerialTransport {
  constructor({ path, SerialPortClass = SerialPort } = {}) {
    if (typeof path !== "string" || !path.trim()) {
      throw new TypeError("A serial port path is required.");
    }
    this.path = path;
    this.SerialPortClass = SerialPortClass;
    this.state = "disconnected";
    this.port = null;
    this.closeTask = null;
    this.error = null;
    this.lines = [];
    this.waiter = null;
    this.pendingCalls = new Set();
    this.writing = false;
  }

  static listPorts() {
    return SerialPort.list();
  }

  async connect() {
    if (this.state !== "disconnected" || this.closeTask) {
      throw new Error("Serial connection is already active or changing.");
    }
    this.state = "connecting";
    this.error = null;
    this.cleanupError = null;
    this.lines = [];
    this.decoder = new LineDecoder();
    try {
      // Disable autoOpen so error handlers are attached before native I/O starts.
      this.port = new this.SerialPortClass({
        path: this.path,
        baudRate: SERIAL_OPTIONS.baudRate,
        dataBits: SERIAL_OPTIONS.dataBits,
        stopBits: SERIAL_OPTIONS.stopBits,
        parity: SERIAL_OPTIONS.parity,
        rtscts: false,
        xon: false,
        xoff: false,
        autoOpen: false,
      });
      this.onData = bytes => this.receive(bytes);
      this.onError = error => this.fail(error);
      this.onClose = error => this.fail(error ?? new Error("Serial port closed. Reconnect the device."));
      this.port.on("data", this.onData);
      this.port.on("error", this.onError);
      this.port.on("close", this.onClose);
      await this.call("open");
      await this.call("set", { dtr: true, rts: true });
      // Same startup behavior as the Python controller and Web Serial adapter.
      await delay(1000);
      if (this.error) throw this.error;
      this.state = "connected";
    } catch (error) {
      this.fail(error);
      this.state = "disconnecting";
      try { await this.disconnect(); }
      catch (cleanupError) { throw new AggregateError([error, cleanupError], "Connection and cleanup failed."); }
      throw error;
    }
  }

  receive(bytes) {
    if (this.error) return;
    try {
      for (const line of this.decoder.push(bytes)) {
        if (this.waiter) {
          const waiter = this.waiter;
          this.waiter = null;
          clearTimeout(waiter.timer);
          waiter.resolve(line);
        } else {
          this.lines.push(line);
          if (this.lines.length > 4096) throw new Error("Serial response buffer overflow.");
        }
      }
    } catch (error) {
      this.fail(error);
    }
  }

  fail(error) {
    this.error ??= error;
    if (this.waiter) {
      clearTimeout(this.waiter.timer);
      this.waiter.reject(this.error);
      this.waiter = null;
    }
    for (const reject of this.pendingCalls) reject(this.error);
    // During connect, the connect catch owns cleanup. Never reopen automatically.
    if (this.state === "connected") {
      this.disconnect().catch(cleanupError => { this.cleanupError = cleanupError; });
    }
  }

  /** Bridge callback methods; a port error/close also rejects outstanding calls. */
  call(method, ...arguments_) {
    if (this.error) return Promise.reject(this.error);
    return new Promise((resolve, reject) => {
      const fail = error => {
        this.pendingCalls.delete(fail);
        reject(error);
      };
      this.pendingCalls.add(fail);
      try {
        this.port[method](...arguments_, error => {
          this.pendingCalls.delete(fail);
          if (error) reject(error);
          else resolve();
        });
      } catch (error) { fail(error); }
    });
  }

  async write(bytes) {
    this.assertConnected();
    if (!(bytes instanceof Uint8Array)) throw new TypeError("Serial output must be a Uint8Array.");
    if (this.writing) throw new Error("Another serial write is in progress.");
    this.writing = true;
    try {
      await this.call("write", Buffer.from(bytes));
      // write's callback only means buffered; drain waits for device transmission.
      await this.call("drain");
    } catch (error) {
      this.fail(error);
      throw error;
    } finally { this.writing = false; }
  }

  readLine(timeoutMs) {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      return Promise.reject(new RangeError("Invalid response timeout."));
    }
    try { this.assertConnected(); }
    catch (error) { return Promise.reject(error); }
    if (this.waiter) return Promise.reject(new Error("Only one response reader is allowed."));
    if (this.lines.length) return Promise.resolve(this.lines.shift());
    return new Promise((resolve, reject) => {
      // Re-arm long deadlines rather than overflowing Node's 32-bit timer delay.
      const deadline = performance.now() + timeoutMs;
      const checkDeadline = () => {
        const remaining = deadline - performance.now();
        if (remaining > 0) {
          this.waiter.timer = setTimeout(checkDeadline, Math.min(remaining, 2147483647));
        } else {
          this.fail(new Error("Controller response timed out. Reconnect the device."));
        }
      };
      this.waiter = { resolve, reject, timer: null };
      checkDeadline();
    });
  }

  clearInput() {
    this.assertConnected();
    if (this.waiter) throw new Error("Cannot clear input while awaiting a response.");
    // Do not call serialport.flush(): it can discard outgoing commands as well.
    this.lines = [];
    this.decoder.reset();
  }

  assertConnected() {
    if (this.error) throw this.error;
    if (this.state !== "connected") throw new Error("Device is not connected.");
  }

  disconnect() {
    if (this.state === "connecting") {
      return Promise.reject(new Error("Wait for connection setup before disconnecting."));
    }
    if (this.closeTask) return this.closeTask;
    if (this.state === "disconnected") return Promise.resolve();
    this.state = "disconnecting";
    this.fail(new Error("Serial connection closed."));
    this.closeTask = this.close().finally(() => { this.closeTask = null; });
    return this.closeTask;
  }

  async close() {
    const port = this.port;
    try {
      if (port?.isOpen) {
        await new Promise((resolve, reject) => port.close(error => error ? reject(error) : resolve()));
      }
    } finally {
      if (port?.isOpen) {
        // Do not claim a successful disconnect if the native handle remains open.
        this.state = "faulted";
      } else {
        port?.off("data", this.onData);
        port?.off("error", this.onError);
        port?.off("close", this.onClose);
        this.port = null;
        this.lines = [];
        this.state = "disconnected";
      }
    }
  }
}
