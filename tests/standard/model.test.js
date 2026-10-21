import test from "node:test";
import assert from "node:assert/strict";
import { createDemoRecord, prepareAnalysis, fidCsv, fftCsv } from "../../examples/standard/model.js";

const settings = { startMs: "1", endMs: "5", tailPoints: "100", window: "hann", displayEndMs: "10", frequencyLimitKHz: "10" };
test("standard UI reanalysis preserves raw data and exports complete data", () => {
  const record = createDemoRecord();
  const before = JSON.stringify(record);
  const first = prepareAnalysis(record, settings);
  const next = prepareAnalysis(record, { ...settings, endMs: "3", frequencyLimitKHz: "5" });
  assert.equal(JSON.stringify(record), before);
  assert.equal(first.analysis.spectrum.count, 200);
  assert.equal(next.analysis.spectrum.count, 100);
  assert.equal(next.frequencyLimitHz, 5000);
  assert.equal(record.source, "demo");
  assert.equal(fidCsv(record, first.analysis).trim().split("\n").length, 2049);
  assert.equal(fftCsv(record, first.analysis).trim().split("\n").length, first.analysis.spectrum.size + 1);
  assert.match(fidCsv(record, first.analysis), /\ndemo,/);
});
test("standard UI rejects invalid ranges and can recover with the same record", () => {
  const record = createDemoRecord();
  assert.throws(() => prepareAnalysis(record, { ...settings, startMs: "5", endMs: "1" }));
  assert.throws(() => prepareAnalysis(record, { ...settings, displayEndMs: "99" }));
  assert.throws(() => prepareAnalysis(record, { ...settings, frequencyLimitKHz: "26" }));
  assert.equal(prepareAnalysis(record, settings).analysis.spectrum.count, 200);
});
