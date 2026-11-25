import test from "node:test";
import assert from "node:assert/strict";
import {
  initialParameters,
  initialAnalysis,
  createDemoRecord,
  prepare,
  estimatedSeconds,
  fidCsv,
  fftCsv,
} from "../components/measurement/model.js";
import { messages } from "../components/measurement/messages.js";
import { parseMeasurement } from "../../packages/nmrlink/src/index.js";

test("standard measurement defaults, analysis and export round-trip", () => {
  assert.equal(initialParameters.pulse1Cycles, "21");
  assert.equal(initialParameters.pulse2Cycles, "42");
  assert.equal(estimatedSeconds(initialParameters, "single"), 31);
  assert.equal(
    estimatedSeconds({ ...initialParameters, scans: "64" }, "double"),
    16,
  );
  const record = createDemoRecord(),
    original = JSON.stringify(record);
  const prepared = prepare(parseMeasurement(original), initialAnalysis);
  assert.equal(prepared.analysis.spectrum.count, 200);
  assert(Math.abs(prepared.analysis.peak.hz - 2500) < 100);
  assert.equal(prepared.displayEndMs, 10);
  assert.equal(prepared.frequencyLimitHz, 10000);
  assert.equal(
    fidCsv(record, prepared.analysis).trim().split("\n").length,
    2049,
  );
  assert(fftCsv(record, prepared.analysis).includes("frequency_hz"));
  assert.equal(JSON.stringify(record), original);
});

test("invalid settings reject without changing acquired data", () => {
  assert.throws(() =>
    estimatedSeconds({ ...initialParameters, pulse1Cycles: "" }, "single"),
  );
  const record = createDemoRecord(),
    original = JSON.stringify(record);
  for (const invalid of [
    { startMs: "5", endMs: "1" },
    { displayEndMs: "50" },
    { frequencyLimitKHz: "26" },
    { tailPoints: "0" },
  ]) {
    assert.throws(() => prepare(record, { ...initialAnalysis, ...invalid }));
    assert.equal(JSON.stringify(record), original);
  }
});

test("both UI languages have the same message keys", () => {
  assert.deepEqual(
    Object.keys(messages.en).sort(),
    Object.keys(messages.ja).sort(),
  );
});

test('standard LPF presets preserve raw data, restore None and annotate CSV', () => {
  const record = createDemoRecord();
  const original = JSON.stringify(record);
  const before = prepare(record, initialAnalysis);
  for (const lowpassHz of ['1000', '500', '200', '100']) {
    const p = prepare(record, { ...initialAnalysis, lowpassHz });
    assert.equal(p.analysis.lowpass.cutoffHz, Number(lowpassHz));
    assert.equal(p.analysis.lowpass.startMs, 1);
    assert.match(fidCsv(record, p.analysis), /^lowpass_cutoff_hz,lowpass_start_ms,/);
    assert.match(fftCsv(record, p.analysis), /^lowpass_cutoff_hz,lowpass_start_ms,/);
    const saved = JSON.stringify({ ...record, analysisSettings: p.settings });
    const loaded = parseMeasurement(saved);
    assert.deepEqual(prepare(loaded, JSON.parse(saved).analysisSettings).analysis.data, p.analysis.data);
  }
  assert.deepEqual(prepare(record, { ...initialAnalysis, lowpassHz: 'none' }).analysis, before.analysis);
  assert.equal(JSON.stringify(record), original);
  assert.throws(() => prepare(record, { ...initialAnalysis, lowpassHz: '250' }));
});


test("LPF comparison shares raw input and keeps axes fixed when hiding traces", async () => {
  const { createRecordPlots } = await import("../../packages/nmrlink/src/graphs.js");
  const record = createDemoRecord();
  const original = JSON.stringify(record);
  const prepared = prepare(record, initialAnalysis);
  assert.deepEqual(prepared.comparison.map(line => line.key), ["none", "1000", "500", "200", "100"]);
  assert.equal(JSON.stringify(record), original);
  for (const line of prepared.comparison) {
    assert.deepEqual(line.spectrum, prepare(record, { ...initialAnalysis, lowpassHz: line.key }).analysis.spectrum);
  }
  const series = prepared.comparison.map(line => ({ ...line, label: line.key }));
  const options = { analysis: prepared.analysis, idPrefix: "comparison", fftSeries: series };
  const all = createRecordPlots(record, options).fft;
  const hidden = createRecordPlots(record, { ...options, fftSeries: series.map((line, i) => ({ ...line, hidden: i === 0 })) }).fft;
  assert.equal((all.match(/<polyline/g) || []).length, 5);
  assert.equal((hidden.match(/<polyline/g) || []).length, 4);
  const ticks = svg => [...svg.matchAll(/<text[^>]*text-anchor="end">([^<]+)<\/text>/g)].map(match => match[1]);
  assert.deepEqual(ticks(all), ticks(hidden));
  const none = createRecordPlots(record, { ...options, fftSeries: series.map(line => ({ ...line, hidden: true })) }).fft;
  assert(!none.includes("<polyline"));
  assert.deepEqual(ticks(all), ticks(none));
});
