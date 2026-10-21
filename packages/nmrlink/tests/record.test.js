import test from "node:test";
import assert from "node:assert/strict";
import { parseMeasurement } from "../src/index.js";
import { readMeasurement } from "../src/browser.js";

const record = () => ({
  source: "instrument", mode: "double", acquiredAt: "2026-10-21T06:46:56.000Z",
  parameters: {
    frequencyHz: 402000, pulse1Cycles: 21, phase1Degrees: 0, pulse2Cycles: 42,
    phase2Degrees: 90, pulseIntervalMs: 5, measurementIntervalMs: 200, scans: 128,
  },
  points: 2048, sampleIntervalMs: 0.02,
  raw: Array.from({ length: 2048 }, (_, i) => [i - 100, 100 - i]),
});
test("saved Single/Double records round-trip without changing raw samples or conditions", async () => {
  for (const mode of ["single", "double"]) {
    const original = { ...record(), mode };
    const json = JSON.stringify(original, null, 2);
    assert.deepEqual(parseMeasurement(json), original);
    assert.deepEqual(await readMeasurement(new Blob([json])), original);
    assert.equal(JSON.stringify(original, null, 2), json);
  }
});
test("demo stays demo and stale derived fields are discarded", () => {
  const demo = { ...record(), source: "demo", parameters: null, analysis: { corrupted: true } };
  const parsed = parseMeasurement('\uFEFF' + JSON.stringify(demo));
  assert.equal(parsed.source, "demo");
  assert.equal(parsed.parameters, null);
  assert.equal("analysis" in parsed, false);
});
test("invalid metadata, incomplete samples and nonnumeric samples are rejected", () => {
  for (const text of ["{", "null", "[]"]) assert.throws(() => parseMeasurement(text));
  for (const changes of [
    { source: "unknown" }, { mode: "triple" }, { acquiredAt: "yesterday" },
    { acquiredAt: "2026-02-30T00:00:00.000Z" },
    { points: 2 }, { sampleIntervalMs: "0.02" }, { parameters: null },
    { raw: [[1, 2]] }, { raw: Array(2048).fill(["1", 2]) }, { raw: Array(2048).fill([1, null]) },
  ]) assert.throws(() => parseMeasurement(JSON.stringify({ ...record(), ...changes })));
});
test("oversized files are refused before reading their contents", async () => {
  let read = false;
  await assert.rejects(readMeasurement({ size: 3 * 1024 * 1024, text() { read = true; return "{}"; } }));
  assert.equal(read, false);
});
