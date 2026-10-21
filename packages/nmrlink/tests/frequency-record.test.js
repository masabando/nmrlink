import test from "node:test";
import assert from "node:assert/strict";
import { parseFrequencySweep } from "../src/frequency-record.js";
import { evaluateFrequency } from "../src/frequency-sweep.js";

function fixture() {
  const parameters = { frequencyHz: 400000, pulse1Cycles: 21, pulse2Cycles: 42, phase1Degrees: 0, phase2Degrees: 90, pulseIntervalMs: 5, measurementIntervalMs: 200, scans: 64 };
  const analysis = { startMs: 1, endMs: 5, tailPoints: 100, minHz: -3000, maxHz: 3000, window: "rect" };
  const points = [400000, 401000].map(frequencyHz => ({ frequencyHz, amplitude: -999, peakHz: -999, record: { source: "instrument", acquiredAt: "2026-10-21T07:39:38.245Z", mode: "single", parameters: { ...parameters, frequencyHz }, sampleIntervalMs: 0.02, points: 2048,
    raw: Array.from({length: 2048}, (_, i) => [1000 + 50 * Math.cos(i / 5), 2000 + 50 * Math.sin(i / 5)]) } }));
  return { kind: "frequency-sweep", source: "instrument", acquiredAt: "2026-10-21T07:39:38.245Z", settings: {startHz: 400000, endHz: 404000, stepHz: 1000, parameters, analysis}, points };
}
test("frequency archive restores partial scans and recomputes derived values", () => {
  const saved = fixture(), text = JSON.stringify(saved), restored = parseFrequencySweep(text);
  assert.equal(JSON.stringify(saved), text);
  assert.deepEqual(restored.points[0], evaluateFrequency(saved.points[0].record, saved.settings.analysis));
  assert.deepEqual(restored.settings.frequencies, [400000,401000,402000,403000,404000]);
  assert.deepEqual(restored.points[1].record.raw, saved.points[1].record.raw);
});
test("frequency archives reject wrong files, corrupt samples and inconsistent conditions", () => {
  for (const mutate of [d => d.kind = "pulse-calibration", d => d.points[0].record.raw[0][0] = "1", d => d.points[1].record.parameters.scans++, d => d.points[1].frequencyHz++, d => d.settings.analysis.endMs = -1, d => d.source = "demo"]) {
    const saved = fixture(); mutate(saved); assert.throws(() => parseFrequencySweep(JSON.stringify(saved)));
  }
  assert.throws(() => parseFrequencySweep("{"));
});
