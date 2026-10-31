import test from "node:test";
import assert from "node:assert/strict";
import {
  runT1Sweep,
  parseT1Measurement,
} from "../../packages/nmrlink/src/index.js";
import {
  initialT1Fields,
  initialT1Fit,
  emptyT1Result,
  prepareT1,
  prepareT1FitRange,
  t1Seconds,
  t1PointSeconds,
  t1DemoDevice,
  reanalyzeT1,
  t1Archive,
  t1Csv,
  fieldsFromT1,
} from "../components/measurement/t1-model.js";
import { t1Messages } from "../components/measurement/t1-messages.js";
const settings = prepareT1(initialT1Fields);
async function demoResult(options = {}) {
  const scan = await runT1Sweep(t1DemoDevice(0), settings.parameters, {
    ...settings,
    ...options,
  });
  return reanalyzeT1({
    ...emptyT1Result,
    settings,
    points: scan.points,
    source: "demo",
    acquiredAt: new Date().toISOString(),
  });
}
test("T1 uses the legacy Double sequence and validates all delays before starting", () => {
  assert.equal(settings.delays.length, 20);
  assert.equal(settings.parameters.scans, 64);
  assert.equal(settings.parameters.measurementIntervalMs, 200);
  assert.equal(settings.parameters.pulse1Cycles, 42);
  assert.equal(settings.parameters.pulse2Cycles, 21);
  assert.equal(settings.parameters.phase1Degrees, 0);
  assert.equal(settings.parameters.phase2Degrees, 0);
  assert.equal(t1Seconds(settings), 376);
  assert.deepEqual(t1PointSeconds(settings), { min: 16, max: 22 });
  assert.throws(() =>
    prepareT1({ ...initialT1Fields, measurementIntervalMs: "140" }),
  );
  assert.throws(() => prepareT1({ ...initialT1Fields, p180Cycles: "21" }));
  assert.throws(() => prepareT1({ ...initialT1Fields, fftStartMs: "6" }));
  assert.deepEqual(prepareT1FitRange(initialT1Fit), { fromMs: 5, toMs: 100 });
  assert.throws(() => prepareT1FitRange({ fromMs: "25", toMs: "5" }));
});
test("T1 fits remain available for incomplete recovery and phase/range JSON round-trips", async () => {
  const result = await demoResult(),
    original = JSON.stringify(result.points);
  assert(Math.abs(result.recovery.fit.T - 20) < 0.1);
  assert(result.points.every((point) => point.record.mode === "double"));
  const changed = reanalyzeT1(result, 19, 20, { fromMs: 5, toMs: 25 });
  assert(Math.abs(changed.recovery.fit.T - 20) < 0.2);
  assert(
    changed.recovery.warningDetails.some(
      (warning) => warning.code === "T1_INCOMPLETE_RECOVERY",
    ),
  );
  const modified = JSON.parse(t1Archive(changed));
  modified.points[0].amplitude = 999999;
  modified.result.fit.T = 999999;
  const loaded = parseT1Measurement(JSON.stringify(modified));
  assert.equal(loaded.referenceIndex, 19);
  assert.equal(loaded.phaseDegrees, 20);
  assert.equal(loaded.fromMs, 5);
  assert.equal(loaded.toMs, 25);
  assert(Math.abs(loaded.result.fit.T - 20) < 0.2);
  assert.notEqual(loaded.points[0].amplitude, 999999);
  assert.deepEqual(fieldsFromT1(loaded.settings), initialT1Fields);
  assert.equal(t1Csv(changed).trim().split("\n").length, 21);
  assert.equal(JSON.stringify(result.points), original);
});
test("partial scans and zero-signal archives retain raw records for inspection", async () => {
  const stop = new AbortController();
  const partial = await demoResult({
    signal: stop.signal,
    onPoint(point, count) {
      if (count === 2) stop.abort();
    },
  });
  assert.equal(parseT1Measurement(t1Archive(partial)).points.length, 2);
  const zero = reanalyzeT1({
    ...partial,
    points: partial.points.map((point) => ({
      ...point,
      record: { ...point.record, raw: point.record.raw.map(() => [0, 0]) },
    })),
  });
  assert.equal(zero.recovery, null);
  assert.equal(zero.analysisError.code, "NO_REFERENCE_SIGNAL");
  assert.equal(parseT1Measurement(t1Archive(zero)).result, null);
  assert.throws(() => parseT1Measurement('{"kind":"wrong"}'));
});
test("T1 translation keys match", () => {
  assert.deepEqual(
    Object.keys(t1Messages.ja).sort(),
    Object.keys(t1Messages.en).sort(),
  );
});
