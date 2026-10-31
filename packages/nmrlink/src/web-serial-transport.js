import { createError, normalizeError } from "./errors.js";
import { LineDecoder } from "./line-decoder.js";
import { SERIAL_OPTIONS } from "./protocol.js";

/** Browser-only byte transport. No device commands or UI dependencies. */
export class WebSerialTransport {
  constructor({ serial = globalThis.navigator?.serial } = {}) {
    this.serial = serial;
    this.state = "disconnected";
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.lines = [];
    this.waiter = null;
    this.error = null;
    this.readTask = null;
    this.closeTask = null;
  }

  /** Call directly from a user gesture so the browser can display its chooser. */
  async connect() {
    if (this.state !== "disconnected" || this.closeTask) {
      throw createError(Error, "SERIAL_ACTIVE");
    }
    if (!this.serial) throw createError(Error, "WEB_SERIAL_UNAVAILABLE");
    this.state = "connecting";
    this.lines = [];
    this.error = null;
    this.decoder = new LineDecoder();
    try {
      this.port = await this.serial.requestPort();
      await this.port.open({ ...SERIAL_OPTIONS });
      this.reader = this.port.readable.getReader();
      this.writer = this.port.writable.getWriter();
      this.readTask = this.readLoop();
      await this.port.setSignals({ dataTerminalReady: true, requestToSend: true });
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (this.error) throw this.error;
      if (this.state !== "connecting") throw createError(Error, "SERIAL_CONNECTION_INTERRUPTED");
      this.state = "connected";
    } catch (error) {
      await this.disconnect();
      throw normalizeError(error, "SERIAL_CONNECTION_FAILED");
    }
  }

  async readLoop() {
    try {
      while (true) {
        const { value, done } = await this.reader.read();
        if (done) {
          this.decoder.finish();
          throw createError(Error, "SERIAL_INPUT_ENDED");
        }
        for (const line of this.decoder.push(value)) {
          if (this.waiter) {
            const waiter = this.waiter;
            this.waiter = null;
            clearTimeout(waiter.timer);
            waiter.resolve(line);
          } else {
            this.lines.push(line);
            if (this.lines.length > 4096) throw createError(Error, "SERIAL_BUFFER_OVERFLOW");
          }
        }
      }
    } catch (error) {
      this.fail(error);
    } finally {
      this.reader.releaseLock();
      // Avoid awaiting disconnect here: it waits for this read loop to finish.
      if (this.state !== "disconnecting") {
        this.disconnect().catch(error => { this.error = error; });
      }
    }
  }

  fail(error) {
    this.error ??= normalizeError(error, "SERIAL_READ_FAILED");
    if (this.waiter) {
      clearTimeout(this.waiter.timer);
      this.waiter.reject(this.error);
      this.waiter = null;
    }
  }

  async write(bytes) {
    if (this.state !== "connected" || this.error) throw this.error ?? createError(Error, "DEVICE_NOT_CONNECTED");
    try { await this.writer.write(bytes); }
    catch (error) { throw normalizeError(error, "SERIAL_WRITE_FAILED"); }
  }

  readLine(timeoutMs) {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return Promise.reject(createError(RangeError, "INVALID_RESPONSE_TIMEOUT"));
    if (this.error) return Promise.reject(this.error);
    if (this.state !== "connected") return Promise.reject(createError(Error, "DEVICE_NOT_CONNECTED"));
    if (this.waiter) return Promise.reject(createError(Error, "SERIAL_READER_BUSY"));
    if (this.lines.length) return Promise.resolve(this.lines.shift());
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiter = null;
        const error = createError(Error, "RESPONSE_TIMEOUT");
        this.fail(error);
        reject(error);
      }, timeoutMs);
      this.waiter = { resolve, reject, timer };
    });
  }

  /** Discard buffered input only before a new command sequence. */
  clearInput() {
    if (this.waiter) throw createError(Error, "SERIAL_CLEAR_WHILE_READING");
    if (this.error) throw this.error;
    this.lines = [];
    this.decoder.reset();
  }

  disconnect() {
    if (this.closeTask) return this.closeTask;
    if (this.state === "disconnected") return Promise.resolve();
    this.state = "disconnecting";
    this.fail(createError(Error, "SERIAL_CLOSED"));
    this.closeTask = this.close().catch(error => { throw normalizeError(error, "SERIAL_DISCONNECT_FAILED"); }).finally(() => { this.closeTask = null; });
    return this.closeTask;
  }

  async close() {
    const errors = [];
    try {
      try {
        if (this.port?.readable?.locked) await this.reader?.cancel();
      } catch (error) { errors.push(error); }
      await this.readTask;
      try { this.writer?.releaseLock(); } catch (error) { errors.push(error); }
      try { await this.port?.close(); } catch (error) { errors.push(error); }
    } finally {
      this.port = null;
      this.reader = null;
      this.writer = null;
      this.readTask = null;
      this.lines = [];
      this.state = "disconnected";
    }
    if (errors.length) throw createError(AggregateError, "SERIAL_CLEANUP_FAILED", {}, { errors: errors });
  }
}
