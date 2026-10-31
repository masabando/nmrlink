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
