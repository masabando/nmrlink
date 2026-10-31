import test from "node:test";
import assert from "node:assert/strict";
import {
  NMRController,
  NMRDevice,
  WebSerialTransport,
  runFrequencySweep,
  parseFrequencySweep,
} from "../../packages/nmrlink/src/index.js";
import {
  initialFrequencyFields,
  prepareFrequency,
  frequencySeconds,
  frequencyPointSeconds,
  frequencyDemoDevice,
  frequencyArchive,
  frequencyCsv,
  bestFrequency,
  fieldsFromFrequency,
} from "../components/measurement/frequency-model.js";
import { frequencyMessages } from "../components/measurement/frequency-messages.js";

import {
  initialPulseFields,
  preparePulse,
} from "../components/measurement/pulse-model.js";

import {
  initialT1Fields,
  prepareT1,
} from "../components/measurement/t1-model.js";

import {
  initialT2Fields,
  prepareT2,
} from "../components/measurement/t2-model.js";

const plan = prepareFrequency(initialFrequencyFields);
test("frequency defaults, grid and estimate match the existing UI", () => {
  assert.deepEqual(plan.frequencies, [400000, 401000, 402000, 403000, 404000]);
  assert.equal(plan.parameters.scans, 64);
  assert.equal(frequencySeconds(plan), 78);
  assert.equal(frequencyPointSeconds(plan), 16);
  assert.throws(() =>
    prepareFrequency({ ...initialFrequencyFields, stepHz: "0" }),
  );
  assert.throws(() =>
    prepareFrequency({ ...initialFrequencyFields, startMs: "6" }),
  );
  assert.throws(() =>
    prepareFrequency({ ...initialFrequencyFields, minKHz: "4", maxKHz: "3" }),
  );
  assert.throws(() =>
    prepareFrequency({ ...initialFrequencyFields, stepHz: "1" }),
  );
});
test("one connected controller handles standard, frequency, pulse, T1, T2, standard without reconnecting", async () => {
  const calls = { connects: 0, disconnects: 0, measurements: 0 };
  let stream,
    currentFrequency = 402000;
  const emit = (text) => stream.enqueue(new TextEncoder().encode(text));
  // 実際のWebSerialTransport・プロトコルを通す模擬ポート。実機には触れません。
  const port = {
    async open() {
      this.readable = new ReadableStream({
        start(controller) {
          stream = controller;
        },
      });
      this.writable = new WritableStream({
        write(bytes) {
          const command = new TextDecoder().decode(bytes);
          if (command === "P") emit("CMD_P_OK\n");
          else if (bytes.length === 18) {
            currentFrequency = new DataView(
              bytes.buffer,
              bytes.byteOffset,
              bytes.byteLength,
            ).getInt32(0, true);
            emit("PARAMETERS_OK\n");
          } else if (["s\r\n", "d\r\n"].includes(command)) {
            calls.measurements++;
            emit("START\nDONE\n");
          } else if (command === "r\r\n") {
            emit(
              Array.from({ length: 2048 }, (_, index) => {
                const t = index * 0.00002,
                  angle = 2 * Math.PI * (402000 - currentFrequency) * t;
                return `${Math.round(70 + 1000 * Math.exp(-t / 0.003) * Math.cos(angle))},${Math.round(-20 + 1000 * Math.exp(-t / 0.003) * Math.sin(angle))}\n`;
              }).join(""),
            );
          }
        },
      });
    },
    async setSignals() {},
    async close() {
      calls.disconnects++;
    },
  };
  const device = new NMRDevice({
    transport: new WebSerialTransport({
      serial: {
        async requestPort() {
          calls.connects++;
          return port;
        },
      },
    }),
  });
  const controller = new NMRController({ device });
  try {
    assert.equal((await controller.connect()).ok, true);
    assert.equal(
      (await controller.measure(plan.parameters, { mode: "single" })).ok,
      true,
    );
    const result = await controller.sweep(plan.parameters, plan);
    assert.equal(result.ok, true);
    assert.equal(result.value.points.length, 5);
    const pulsePlan = preparePulse(initialPulseFields);
    const pulses = await controller.pulseSweep(pulsePlan.parameters, pulsePlan);
    assert.equal(pulses.ok, true);
    assert.equal(pulses.value.points.length, 16);
    const t1Plan = prepareT1(initialT1Fields);
    const t1 = await controller.t1Sweep(t1Plan.parameters, t1Plan);
    assert.equal(t1.ok, true);
    assert.equal(t1.value.points.length, 20);
    assert.equal(t1.value.points[0].record.mode, "double");
    const t2Plan = prepareT2(initialT2Fields);
    const t2 = await controller.t2Sweep(t2Plan.parameters, t2Plan);
    assert.equal(t2.ok, true);
    assert.equal(t2.value.points.length, 16);
    assert.equal(t2.value.points[0].record.mode, "double");
    assert.equal(controller.state.canMeasure, true);
    assert.equal(
      (await controller.measure(plan.parameters, { mode: "single" })).ok,
      true,
    );
    assert.deepEqual(calls, { connects: 1, disconnects: 0, measurements: 59 });
  } finally {
    await controller.disconnect();
    controller.dispose();
  }
});
test("stopped scans round-trip through existing JSON format with recomputed amplitudes", async () => {
  const stop = new AbortController();
  const scan = await runFrequencySweep(
    frequencyDemoDevice(plan, 0),
    plan.parameters,
    {
      ...plan,
      signal: stop.signal,
      onPoint(point, completed) {
        if (completed === 2) stop.abort();
      },
    },
  );
  assert.equal(scan.points.length, 2);
  assert.equal(scan.stopped, true);
  const saved = {
    source: "demo",
    acquiredAt: new Date().toISOString(),
    settings: plan,
    points: scan.points,
  };
  const text = frequencyArchive(saved),
    modified = JSON.parse(text);
  modified.points[0].amplitude = 999999;
  const loaded = parseFrequencySweep(JSON.stringify(modified));
  assert.equal(loaded.points.length, 2);
  assert.notEqual(loaded.points[0].amplitude, 999999);
  assert.deepEqual(
    fieldsFromFrequency(loaded.settings),
    initialFrequencyFields,
  );
  assert.equal(frequencyCsv(loaded).trim().split("\n").length, 3);
  assert(bestFrequency(loaded.points));
  assert.throws(() => parseFrequencySweep('{"kind":"invalid"}'));
  assert.equal(
    JSON.stringify(JSON.parse(text).points),
    JSON.stringify(scan.points),
  );
});
test("frequency translations have matching keys", () => {
  assert.deepEqual(
    Object.keys(frequencyMessages.ja).sort(),
    Object.keys(frequencyMessages.en).sort(),
  );
});
