import test from "node:test";
import assert from "node:assert/strict";
import { analyzeRecord } from "../../examples/demo/analysis.js";
import { demoSamples } from "../../scripts/demo/mock-controller.js";
import { correctBaseline as pocBaseline } from "../fixtures/poc/protocol.js";
import { spectrum as pocSpectrum } from "../fixtures/poc/fft.js";
const parameters = {
  frequencyHz: 402000, pulse1Cycles: 60, phase1Degrees: 0, pulse2Cycles: 120,
  phase2Degrees: 90, pulseIntervalMs: 5, measurementIntervalMs: 200, scans: 1,
};

test("demo analysis of Single/Double records matches the complete PoC pipeline", () => {
  for (const mode of ["single", "double"]) {
    const record = { source: "demo", mode, parameters: { ...parameters }, raw: demoSamples(parameters, mode), sampleIntervalMs: 0.02 };
    const saved = structuredClone(record);
    const actual = analyzeRecord(record);
    const expected = pocBaseline(record.raw);
    assert.deepEqual(actual.base, expected.base);
    assert.deepEqual(actual.data, expected.data);
    assert.deepEqual(actual.spectrum.bins.map(({ hz, amplitude }) => ({ hz, amplitude })), pocSpectrum(expected.data, 0.02, 1, 5, "hann").bins);
    assert.deepEqual(record, saved);
  }
});

test("reanalysis changes conditions without changing measurement settings or raw data", () => {
  const record = { raw: demoSamples(parameters, "single"), sampleIntervalMs: 0.02, parameters: { ...parameters } };
  const saved = structuredClone(record);
  const initial = analyzeRecord(record);
  const changed = analyzeRecord(record, { baselineEnabled: false, startMs: 0, endMs: 40.96, window: "rect" });
  assert.equal(changed.base, null);
  assert.equal(changed.data, record.raw);
  assert.notDeepEqual(initial.spectrum.bins, changed.spectrum.bins);
  assert.deepEqual(record, saved);
  assert.doesNotThrow(() => JSON.stringify({ ...record, analysis: changed }));
});

test("invalid analysis preserves a successfully acquired measurement", () => {
  const record = { raw: demoSamples(parameters, "double"), sampleIntervalMs: 0.02, parameters: { ...parameters } };
  const saved = structuredClone(record);
  assert.throws(() => analyzeRecord(record, { startMs: 5, endMs: 1 }));
  assert.deepEqual(record, saved);
  assert.equal(analyzeRecord(record).spectrum.count, 200);
});
