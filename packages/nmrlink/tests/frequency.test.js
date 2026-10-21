import test from "node:test";
import assert from "node:assert/strict";
import { NMRController, frequencySteps, evaluateFrequency } from "../src/index.js";
import { createFrequencyPlot } from "../src/graphs.js";

const parameters = { frequencyHz: 402000, pulse1Cycles: 21, phase1Degrees: 0, pulse2Cycles: 42, phase2Degrees: 90, pulseIntervalMs: 5, measurementIntervalMs: 200, scans: 16 };
const plan = { startHz: 400000, endHz: 400400, stepHz: 200 };
function record(p) {
  return { source: "demo", mode: "single", parameters: p, points: 2048, sampleIntervalMs: 0.02, acquiredAt: "2026-10-21T07:00:00.000Z",
    raw: Array.from({ length: 2048 }, (_, i) => [Math.cos(i * 0.1) * Math.exp(-i / 150) * 1000, Math.sin(i * 0.1) * Math.exp(-i / 150) * 1000]),
  };
}
test("frequency planning respects integer bounds, grid and maximum size", () => {
  assert.deepEqual(frequencySteps(400000, 400450, 200), [400000, 400200, 400400]);
  assert.deepEqual(frequencySteps(402000, 402000, 1), [402000]);
  for (const args of [[0, 1, 1], [2, 1, 1], [1, 400, 1], [1, 2, 0], [1, 2.5, 1]]) assert.throws(() => frequencySteps(...args));
});
test("evaluation selects only the requested band and plotting preserves source records", () => {
  const input = record(parameters); const saved = JSON.stringify(input);
  const point = evaluateFrequency(input, { minHz: 400, maxHz: 1000 });
  assert.ok(point.peakHz >= 400 && point.peakHz <= 1000);
  assert.equal(JSON.stringify(input), saved);
  const svg = createFrequencyPlot([point]);
  assert.match(svg, /height="280"/);
  assert.match(svg, /<circle/);
  assert.match(svg, /設定周波数 \[kHz\]/);
});
test("controller locks the entire sweep and stop waits for the current point", async () => {
  let calls = 0; const stop = new AbortController();
  const device = { state: "connected", async measure(p) { calls++; return record(p); } };
  const controller = new NMRController({ device });
  const completed = [];
  const result = await controller.sweep(parameters, { ...plan, signal: stop.signal, async onPoint(point) {
    completed.push(point);
    assert.equal(controller.state.busy, true);
    assert.equal((await controller.measure(parameters)).ok, false);
    assert.equal((await controller.disconnect()).ok, false);
    if (completed.length === 2) stop.abort();
  } });
  assert.equal(result.ok, true); assert.equal(result.value.stopped, true);
  assert.equal(calls, 2); assert.equal(controller.result, completed.at(-1).record);
  assert.equal(controller.state.busy, false); controller.dispose();
});
test("invalid plans send no commands; failures keep completed points without replay", async () => {
  let calls = 0; const completed = [];
  const controller = new NMRController({ device: { state: "connected", async measure(p) { if (++calls === 2) throw new Error("USB lost"); return record(p); } } });
  assert.equal((await controller.sweep(parameters, { ...plan, analysis: { startMs: 5, endMs: 1 } })).ok, false);
  assert.equal(calls, 0);
  const result = await controller.sweep(parameters, { ...plan, onPoint: point => completed.push(point) });
  assert.equal(result.ok, false); assert.equal(calls, 2); assert.equal(completed.length, 1);
  assert.equal(controller.result, completed[0].record); controller.dispose();
});
