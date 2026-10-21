import test from "node:test";
import assert from "node:assert/strict";
import { parsePulseCalibration } from "../src/pulse-record.js";
import { evaluatePulse } from "../src/pulse-sweep.js";

function fixture() {
  const parameters = { frequencyHz: 402000, pulse1Cycles: 5, pulse2Cycles: 42, phase1Degrees: 0, phase2Degrees: 90, pulseIntervalMs: 5, measurementIntervalMs: 200, scans: 64 };
  const analysis = { startMs: 1, endMs: 5, tailPoints: 100, minHz: -3000, maxHz: 3000, window: "hann" };
  const points = [5, 10].map(length => ({ length, record: { source: "instrument", acquiredAt: "2026-10-21T07:39:38.245Z", mode: "single", parameters: { ...parameters, pulse1Cycles: length }, sampleIntervalMs: 0.02, points: 2048,
    raw: Array.from({length: 2048}, (_, i) => [1000 + length * Math.cos(i / 5), 2000 + length * Math.sin(i / 5)]) } }));
  return { kind: "pulse-calibration", source: "instrument", acquiredAt: "2026-10-21T07:39:38.245Z", settings: {startCycles: 5, endCycles: 80, stepCycles: 5, parameters, analysis}, points, calibration: { reference: { referenceIndex: 1, phaseDegrees: 12 }, fit: {p90: 999}, signedPoints: [] } };
}
test("pulse archive restores partial scans and recomputes derived values", () => {
  const saved = fixture(), text = JSON.stringify(saved), result = parsePulseCalibration(text);
  assert.equal(JSON.stringify(saved), text);
  assert.deepEqual(result.points[0], evaluatePulse(saved.points[0].record, saved.settings.analysis));
  assert.equal(result.referenceIndex, 1);
  assert.equal(result.phaseDegrees, 12);
  assert.deepEqual(result.points[1].record.raw, saved.points[1].record.raw);
  assert.notEqual(result.calibration.fit?.p90, 999);
});
test("pulse archives reject inconsistent or corrupt records before returning", () => {
  for (const mutate of [d => d.kind = "other", d => d.points[0].record.raw[0][0] = "1", d => d.points[1].record.parameters.frequencyHz++, d => d.points[1].length = 15, d => d.calibration.reference.referenceIndex = 7, d => d.settings.analysis.endMs = -1]) {
    const saved = fixture(); mutate(saved); assert.throws(() => parsePulseCalibration(JSON.stringify(saved)));
  }
  assert.throws(() => parsePulseCalibration("{"));
});
