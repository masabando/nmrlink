import { createError, normalizeError } from "./errors.js";
import { encodeCommand, encodeParameters, validateParameters, parseSampleLine,
  SAMPLE_COUNT, SAMPLE_INTERVAL_MS } from "./protocol.js";
import { measurementDurationMs } from "./timing.js";
import { WebSerialTransport } from "./web-serial-transport.js";

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

/**
 * Device protocol shared by browser and Node.js transports.
 * A transport implements connect, disconnect, write, readLine and clearInput.
 * Measurement returns raw samples; baseline correction belongs to analysis.
 */
export class NMRDevice {
  constructor({ transport = new WebSerialTransport(), responseTimeoutMs = 5000,
    dataTimeoutMs = 30000, measurementMarginMs = 20000 } = {}) {
    for (const value of [responseTimeoutMs, dataTimeoutMs, measurementMarginMs]) {
      if (!Number.isFinite(value) || value <= 0) throw createError(RangeError, "INVALID_TIMEOUT");
    }
    this.transport = transport;
    this.responseTimeoutMs = responseTimeoutMs;
    this.dataTimeoutMs = dataTimeoutMs;
    this.measurementMarginMs = measurementMarginMs;
    this.state = "disconnected";
    this.busy = false;
  }

  get state() {
    if (this.currentState === "connected" &&
        ["disconnected", "disconnecting"].includes(this.transport.state)) {
      return "disconnected";
    }
    return this.currentState;
  }

  set state(value) { this.currentState = value; }

  async connect() {
    if (this.busy || this.state !== "disconnected") throw createError(Error, "DEVICE_ACTIVE");
    this.busy = true;
    this.state = "connecting";
    try {
      await this.transport.connect();
      this.state = "connected";
    } catch (error) {
      this.state = "disconnected";
      throw normalizeError(error, "SERIAL_CONNECTION_FAILED");
    } finally {
      this.busy = false;
    }
  }

  /** Disconnecting is not a firmware stop command. */
  async disconnect() {
    if (this.busy) throw createError(Error, "DISCONNECT_WHILE_BUSY");
    this.busy = true;
    try { await this.transport.disconnect(); }
    catch (error) { throw normalizeError(error, "SERIAL_DISCONNECT_FAILED"); }
    finally { this.state = "disconnected"; this.busy = false; }
  }

  /**
   * Apply settings, acquire once (with scans averaging), and return 2048 raw pairs.
   * @param {import('./protocol.js').MeasurementParameters} input
   * @param {{mode?: 'single'|'double'}} options
   */
  async measure(input, { mode = "single" } = {}) {
    // Invalid local input must not send commands or invalidate a good connection.
    const parameters = validateParameters(input);
    if (!["single", "double"].includes(mode)) throw createError(RangeError, "INVALID_MODE");
    if (this.busy) throw createError(Error, "DEVICE_BUSY");
    if (this.state !== "connected") throw createError(Error, "DEVICE_NOT_CONNECTED");
    this.busy = true;
    this.state = "measuring";
    try {
      await this.applyParameters(parameters);
      this.transport.clearInput();
      await this.transport.write(encodeCommand(mode));
      await this.response(this.responseTimeoutMs);

      const estimateMs = measurementDurationMs(parameters, { mode });
      await this.response(estimateMs + this.measurementMarginMs);
      await delay(50);
      await this.transport.write(encodeCommand("read"));

      const raw = [];
      const deadline = performance.now() + this.dataTimeoutMs;
      for (let index = 0; index < SAMPLE_COUNT; index++) {
        const remainingMs = deadline - performance.now();
        if (remainingMs <= 0) throw createError(Error, "SAMPLE_TRANSFER_TIMEOUT", { index, sampleCount: SAMPLE_COUNT });
        const line = await this.transport.readLine(Math.min(remainingMs, this.responseTimeoutMs));
        raw.push(parseSampleLine(line));
      }
      this.state = "connected";
      return {
        source: "instrument",
        acquiredAt: new Date().toISOString(),
        mode,
        parameters,
        sampleIntervalMs: SAMPLE_INTERVAL_MS,
        points: SAMPLE_COUNT,
        raw,
      };
    } catch (error) {
      // After a protocol error, stale responses could otherwise be mistaken for
      // the next operation. Require reconnection rather than retrying commands.
      this.state = "disconnected";
      try { await this.transport.disconnect(); }
      catch (cleanupError) { throw createError(AggregateError, "MEASUREMENT_CLEANUP_FAILED", {}, { errors: [error, cleanupError] }); }
      throw normalizeError(error);
    } finally {
      this.busy = false;
    }
  }

  async applyParameters(parameters) {
    this.transport.clearInput();
    await this.transport.write(encodeCommand("parameters"));
    await delay(50);
    const acknowledgement = await this.response(this.responseTimeoutMs);
    if (!acknowledgement.includes("CMD_P_OK")) throw createError(Error, "PARAMETER_SETUP_REJECTED");
    await this.transport.write(encodeParameters(parameters));
    await delay(50);
    await this.response(this.responseTimeoutMs);
  }

  async response(timeoutMs) {
    const line = (await this.transport.readLine(timeoutMs)).trim();
    if (!line || /error|fail|reject/i.test(line)) {
      throw createError(Error, "INVALID_ACKNOWLEDGEMENT", { line });
    }
    return line;
  }
}
