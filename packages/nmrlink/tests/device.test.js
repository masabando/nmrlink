import test from "node:test";
import assert from "node:assert/strict";
import { NMRDevice, WebSerialTransport, SAMPLE_COUNT } from "../src/index.js";

const parameters = {
  frequencyHz: 402000, pulse1Cycles: 60, phase1Degrees: 0,
  pulse2Cycles: 120, phase2Degrees: 90, pulseIntervalMs: 5,
  measurementIntervalMs: 200, scans: 1,
};

// Real WHATWG streams exercise port locking, fragmented reads and cleanup.
function simulatedPort({ badSample = false, rejectSetup = false, silent = false } = {}) {
  let controller;
  const writes = [];
  const emit = text => {
    const bytes = new TextEncoder().encode(text);
    for (let index = 0; index < bytes.length; index += 13) {
      controller.enqueue(bytes.slice(index, index + 13));
    }
  };
  const port = {
    writes, closes: 0, signals: null,
    async open(options) {
      this.options = options;
      this.readable = new ReadableStream({ start(value) { controller = value; } });
      this.writable = new WritableStream({
        write(bytes) {
          writes.push([...bytes]);
          if (silent) return;
          const command = new TextDecoder().decode(bytes);
          if (command === "P") emit(rejectSetup ? "REJECT\n" : "CMD_P_OK\r\n");
          else if (bytes.length === 18) emit("PARAMETERS_OK\n");
          else if (["s\r\n", "d\r\n"].includes(command)) emit("START\nDONE\n");
          else if (command === "r\r\n") {
            emit(Array.from({ length: SAMPLE_COUNT }, (_, index) =>
              badSample && index === 4 ? "broken\n" : `${index},${-index}\r\n`).join(""));
          }
        },
      });
    },
    async setSignals(value) { this.signals = value; },
    async close() {
      assert.equal(this.readable.locked, false);
      assert.equal(this.writable.locked, false);
      this.closes++;
    },
    unplug() { controller.error(new Error("USB unplugged")); },
  };
  return port;
}

function deviceFor(port, options = {}) {
  return new NMRDevice({
    transport: new WebSerialTransport({ serial: { requestPort: async () => port } }),
    ...options,
  });
}

test("Web Serial connects, performs repeated single/double measurements and releases locks", async () => {
  const port = simulatedPort();
  const device = deviceFor(port);
  await device.connect();
  assert.equal(port.options.baudRate, 115200);
  assert.deepEqual(port.signals, { dataTerminalReady: true, requestToSend: true });
  for (const mode of ["single", "double"]) {
    const result = await device.measure(parameters, { mode });
    assert.equal(result.raw.length, SAMPLE_COUNT);
    assert.deepEqual(result.raw[2047], [2047, -2047]);
    assert.deepEqual(result.parameters, parameters);
    assert.equal(result.mode, mode);
  }
  assert.deepEqual(port.writes.map(bytes => bytes.length), [1, 18, 3, 3, 1, 18, 3, 3]);
  await device.disconnect();
  assert.equal(port.closes, 1);
});

test("local validation and concurrent operations never send extra commands", async () => {
  const port = simulatedPort();
  const device = deviceFor(port);
  await device.connect();
  await assert.rejects(device.measure({ ...parameters, scans: 0 }));
  assert.equal(port.writes.length, 0);
  const measurement = device.measure(parameters);
  await assert.rejects(device.measure(parameters), /in progress/);
  await assert.rejects(device.disconnect(), /does not stop/);
  await measurement;
  await device.disconnect();
});

test("corrupt samples, rejected setup and timeout disconnect without automatic retry", async () => {
  for (const options of [{ badSample: true }, { rejectSetup: true }, { silent: true }]) {
    const port = simulatedPort(options);
    const device = deviceFor(port, { responseTimeoutMs: 20 });
    await device.connect();
    await assert.rejects(device.measure(parameters));
    assert.equal(device.state, "disconnected");
    assert.equal(port.closes, 1);
    await assert.rejects(device.measure(parameters), /not connected/);
  }
});

test("USB loss rejects the pending response and frees serial locks", async () => {
  const port = simulatedPort({ silent: true });
  const device = deviceFor(port);
  await device.connect();
  const measurement = device.measure(parameters);
  port.unplug();
  await assert.rejects(measurement, /USB unplugged/);
  assert.equal(device.state, "disconnected");
  assert.equal(port.closes, 1);
});

test("chooser cancellation and missing browser API do not leave the device busy", async () => {
  const device = new NMRDevice({ transport: new WebSerialTransport({ serial: {
    requestPort: async () => { throw new Error("Chooser cancelled"); },
  } }) });
  await assert.rejects(device.connect(), /cancelled/);
  assert.equal(device.busy, false);
  assert.equal(device.state, "disconnected");
  await assert.rejects(new WebSerialTransport({ serial: null }).connect(), /unavailable/);
});
