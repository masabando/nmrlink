import test from "node:test";
import assert from "node:assert/strict";
import {
  runT2Sweep,
  parseT2Measurement,
} from "../../packages/nmrlink/src/index.js";
import {
  initialT2Fields,
  initialT2Fit,
  emptyT2Result,
  prepareT2,
  prepareT2FitRange,
  t2Seconds,
  t2DemoDevice,
  reanalyzeT2,
  t2Archive,
  t2Csv,
  fieldsFromT2,
  prepareT2Point,
} from "../components/measurement/t2-model.js";
import { t2Messages } from "../components/measurement/t2-messages.js";
const settings = prepareT2(initialT2Fields);
async function demoResult(options = {}) {
  const scan = await runT2Sweep(t2DemoDevice(0), settings.parameters, {
    ...settings,
    ...options,
  });
  return reanalyzeT2({
    ...emptyT2Result,
    settings,
    points: scan.points,
    source: "demo",
    acquiredAt: new Date().toISOString(),
  });
}
test("T2 preserves spin echo sequence and validates every moving window before measuring", () => {
  assert.equal(settings.delays.length, 16);
  assert.equal(settings.parameters.scans, 64);
  assert.equal(settings.parameters.measurementIntervalMs, 200);
  assert.equal(settings.parameters.pulse1Cycles, 21);
  assert.equal(settings.parameters.pulse2Cycles, 42);
  assert.equal(settings.parameters.phase1Degrees, 0);
  assert.equal(settings.parameters.phase2Degrees, 90);
  assert(t2Seconds(settings) > 0);
  assert.throws(() => prepareT2({ ...initialT2Fields, endMs: "39" }), {
    code: "INVALID_ECHO_WINDOW",
  });
  assert.throws(() => prepareT2({ ...initialT2Fields, startMs: "3" }), {
    code: "INVALID_ECHO_WINDOW",
  });
  assert.throws(() =>
    prepareT2({ ...initialT2Fields, measurementIntervalMs: "70" }),
  );
  assert.deepEqual(prepareT2FitRange(initialT2Fit), { fromMs: 10, toMs: 70 });
  assert.throws(() => prepareT2FitRange({ fromMs: "70", toMs: "10" }));
});
test("T2 fit, moving FFT window, reference and archive round-trip use raw data", async () => {
  const result = await demoResult(),
    original = JSON.stringify(result.points);
  assert(Math.abs(result.decay.fit.T - 22) < 0.2);
  const point = result.points[5],
    prepared = prepareT2Point(point, settings);
  assert.equal(prepared.displayEndMs, 40.96);
  assert.equal(point.window.startMs, point.tau - 4);
  assert.equal(point.window.endMs, point.tau + 4);
  const changed = reanalyzeT2(result, 5, { fromMs: 10, toMs: 30 });
  assert(changed.decay.fit);
  const saved = JSON.parse(t2Archive(changed));
  saved.result.fit.T = 999999;
  saved.points[0].amplitude = 999999;
  const loaded = parseT2Measurement(JSON.stringify(saved));
  assert.equal(loaded.referenceIndex, 5);
  assert.equal(loaded.toMs, 30);
  assert(Math.abs(loaded.result.fit.T - 22) < 0.2);
  assert.notEqual(loaded.points[0].amplitude, 999999);
  assert.deepEqual(fieldsFromT2(loaded.settings), initialT2Fields);
  assert.equal(t2Csv(changed).trim().split("\n").length, 17);
  assert.equal(JSON.stringify(result.points), original);
});
test("T2 stopped and zero-signal scans remain readable", async () => {
  const abort = new AbortController();
  const result = await demoResult({
    signal: abort.signal,
    onPoint(p, n) {
      if (n === 2) abort.abort();
    },
  });
  assert.equal(parseT2Measurement(t2Archive(result)).points.length, 2);
  const zero = reanalyzeT2({
    ...result,
    points: result.points.map((p) => ({
      ...p,
      record: { ...p.record, raw: p.record.raw.map(() => [0, 0]) },
    })),
  });
  assert.equal(zero.decay, null);
  assert.equal(zero.analysisError.code, "NO_REFERENCE_SIGNAL");
  assert.equal(parseT2Measurement(t2Archive(zero)).result, null);
  assert.throws(() => parseT2Measurement('{"kind":"wrong"}'));
});
test("T2 translation keys match", () =>
  assert.deepEqual(
    Object.keys(t2Messages.ja).sort(),
    Object.keys(t2Messages.en).sort(),
  ));
