import test from "node:test";
import assert from "node:assert/strict";
import { SerialPortMock } from "serialport";
import { NMRDevice, SAMPLE_COUNT } from "nmrlink";
import { NodeSerialTransport } from "../src/index.js";

const parameters = {
  frequencyHz: 402000, pulse1Cycles: 60, phase1Degrees: 0,
  pulse2Cycles: 120, phase2Degrees: 90, pulseIntervalMs: 5,
  measurementIntervalMs: 200, scans: 1,
};
let nextPort = 0;

// Official mock binding exercises serialport's real streams and callbacks.
function setup({ silent = false, badSample = false, setError = false } = {}) {
  const path = `/dev/NMR-MOCK-${nextPort++}`;
  SerialPortMock.binding.createPort(path, { record: true, maxReadSize: 7 });
  let port;
  class ControllerPort extends SerialPortMock {
    constructor(options) {
      super(options);
      port = this;
      this.commands = [];
    }
    set(signals, callback) {
      this.signals = signals;
      if (setError) callback(new Error("Control line failure"));
      else super.set(signals, callback);
    }
    write(bytes, callback) {
      this.commands.push(Buffer.from(bytes));
      return super.write(bytes, error => {
        if (!error && !silent) {
          const command = bytes.toString();
          let response;
          if (command === "P") response = "CMD_P_OK\r\n";
          else if (bytes.length === 18) response = "PARAMETERS_OK\n";
          else if (["s\r\n", "d\r\n"].includes(command)) response = "START\nDONE\n";
          else if (command === "r\r\n") {
            response = Array.from({ length: SAMPLE_COUNT }, (_, index) =>
              badSample && index === 3 ? "broken\n" : `${index},${-index}\r\n`).join("");
          }
          if (response) this.port.emitData(response);
        }
        callback(error);
      });
    }
  }
  const transport = new NodeSerialTransport({ path, SerialPortClass: ControllerPort });
  return { transport, get port() { return port; } };
}

function assertReleased(port) {
  assert.equal(port.isOpen, false);
  for (const event of ["data", "error", "close"]) assert.equal(port.listenerCount(event), 0);
}

test("Node adapter runs repeated Single/Double measurements through shared NMRDevice", async () => {
  const mock = setup();
  const device = new NMRDevice({ transport: mock.transport });
  await device.connect();
  assert.deepEqual(mock.port.signals, { dtr: true, rts: true });
  assert.equal(mock.port.baudRate, 115200);
  for (const mode of ["single", "double"]) {
    const result = await device.measure(parameters, { mode });
    assert.equal(result.raw.length, SAMPLE_COUNT);
    assert.deepEqual(result.raw[2047], [2047, -2047]);
    assert.deepEqual(result.parameters, parameters);
  }
  assert.deepEqual(mock.port.commands.map(bytes => bytes.length), [1, 18, 3, 3, 1, 18, 3, 3]);
  const firstPort = mock.port;
  await device.disconnect();
  assertReleased(firstPort);
  await device.connect();
  await device.disconnect();
  assertReleased(mock.port);
});

test("read timeout rejects and closes the native port", async () => {
  const mock = setup({ silent: true });
  await mock.transport.connect();
  await assert.rejects(mock.transport.readLine(10), /timed out/);
  await mock.transport.disconnect();
  assertReleased(mock.port);
});

test("USB loss wakes a waiting read and allows reconnecting", async () => {
  const mock = setup({ silent: true });
  const device = new NMRDevice({ transport: mock.transport });
  await device.connect();
  const pending = mock.transport.readLine(5000);
  const rejection = assert.rejects(pending, /USB unplugged/);
  const error = Object.assign(new Error("USB unplugged"), { disconnected: true });
  // Native serialport reports disconnect via close(error), not a data response.
  mock.port.emit("close", error);
  await rejection;
  await mock.transport.disconnect();
  assert.equal(device.state, "disconnected");
  assertReleased(mock.port);
  await device.connect();
  await device.disconnect();
});

test("malformed measurement data fails instead of producing a partial result", async () => {
  const mock = setup({ badSample: true });
  const device = new NMRDevice({ transport: mock.transport });
  await device.connect();
  await assert.rejects(device.measure(parameters), /comma-separated/);
  assert.equal(device.state, "disconnected");
  assertReleased(mock.port);
});

test("open and signal failures leave no active connection", async () => {
  const missing = new NodeSerialTransport({ path: "/dev/NO-NMR", SerialPortClass: SerialPortMock });
  await assert.rejects(missing.connect());
  assert.equal(missing.state, "disconnected");
  const mock = setup({ setError: true });
  await assert.rejects(mock.transport.connect(), /Control line failure/);
  assertReleased(mock.port);
});

test("concurrent reads are refused and disconnect cancels the pending read", async () => {
  assert.throws(() => new NodeSerialTransport(), /path/);
  const mock = setup({ silent: true });
  await mock.transport.connect();
  const pending = mock.transport.readLine(5000);
  const rejection = assert.rejects(pending, /closed/);
  await assert.rejects(mock.transport.readLine(50), /one response reader/);
  assert.throws(() => mock.transport.clearInput(), /awaiting/);
  await mock.transport.disconnect();
  await rejection;
  assertReleased(mock.port);
});


test("an error event rejects a write even if its callback never completes", async () => {
  const mock = setup({ silent: true });
  await mock.transport.connect();
  mock.port.drain = () => {
    queueMicrotask(() => mock.port.emit("error", new Error("Write failure")));
  };
  await assert.rejects(mock.transport.write(new Uint8Array([80])), /Write failure/);
  await mock.transport.disconnect();
  assertReleased(mock.port);
});

test("invalid receive bytes close the port and reject pending input", async () => {
  const mock = setup({ silent: true });
  await mock.transport.connect();
  const pending = mock.transport.readLine(5000);
  const rejection = assert.rejects(pending, /Non-ASCII/);
  mock.port.port.emitData(Buffer.from([255]));
  await rejection;
  await mock.transport.disconnect();
  assertReleased(mock.port);
});


test("an unclosed native handle blocks reconnect until cleanup succeeds", async () => {
  const mock = setup();
  await mock.transport.connect();
  const originalClose = mock.port.close.bind(mock.port);
  mock.port.close = callback => callback(new Error("Close failed"));
  await assert.rejects(mock.transport.disconnect(), /Close failed/);
  assert.equal(mock.transport.state, "faulted");
  await assert.rejects(mock.transport.connect(), /already active/);
  mock.port.close = originalClose;
  await mock.transport.disconnect();
  assertReleased(mock.port);
});
