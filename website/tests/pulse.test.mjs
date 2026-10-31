import test from "node:test";
import assert from "node:assert/strict";
import {
  runPulseSweep,
  parsePulseCalibration,
} from "../../packages/nmrlink/src/index.js";
import {
  initialPulseFields,
  emptyPulseResult,
  preparePulse,
  pulseSeconds,
  pulsePointSeconds,
  pulseDemoDevice,
  recalibratePulse,
  pulseArchive,
  pulseCsv,
  fieldsFromPulse,
} from "../components/measurement/pulse-model.js";
import { pulseMessages } from "../components/measurement/pulse-messages.js";

const settings = preparePulse(initialPulseFields);
async function demoResult(options = {}) {
  const scan = await runPulseSweep(pulseDemoDevice(0), settings.parameters, {
    ...settings,
    ...options,
  });
  return recalibratePulse({
    ...emptyPulseResult,
    settings,
    points: scan.points,
    source: "demo",
    acquiredAt: new Date().toISOString(),
  });
}

test("pulse grid, time estimate and preflight validation retain legacy defaults", () => {
  assert.equal(settings.lengths.length, 16);
  assert.equal(settings.parameters.scans, 64);
  assert.equal(pulseSeconds(settings), 247);
  assert.equal(pulsePointSeconds(settings), 16);
  assert.throws(() => preparePulse({ ...initialPulseFields, endCycles: "4" }));
  assert.throws(() => preparePulse({ ...initialPulseFields, startMs: "6" }));
  assert.throws(() => preparePulse({ ...initialPulseFields, minKHz: "4" }));
});

test("magnitude and signed fits, manual phase, and archive reanalysis preserve raw records", async () => {
  const result = await demoResult(),
    original = JSON.stringify(result.points);
  assert(Math.abs(result.calibration.fit.p90 - 21) < 0.1);
  assert(Math.abs(result.calibration.magnitudeFit.p180 - 42) < 0.1);
  assert(result.calibration.points.some((point) => point.amplitude < 0));
  const changed = recalibratePulse(result, 3, 20);
  const serialized = pulseArchive(changed),
    tampered = JSON.parse(serialized);
  tampered.points[0].amplitude = 999999;
  tampered.calibration.fit.p90 = 999999;
  const loaded = parsePulseCalibration(JSON.stringify(tampered));
  assert.equal(loaded.referenceIndex, 3);
  assert.equal(loaded.phaseDegrees, 20);
  assert.notEqual(loaded.points[0].amplitude, 999999);
  assert(
    Math.abs(loaded.calibration.fit.p90 - changed.calibration.fit.p90) < 1e-6,
  );
  assert.deepEqual(fieldsFromPulse(loaded.settings), initialPulseFields);
  assert.equal(pulseCsv(changed).trim().split("\n").length, 17);
  assert.equal(JSON.stringify(result.points), original);
  assert.equal(
    recalibratePulse(result, null, NaN).calibrationError.code,
    "INVALID_PHASE",
  );
});

test("stopped and zero-signal archives still restore for waveform inspection", async () => {
  const stop = new AbortController();
  const partial = await demoResult({
    signal: stop.signal,
    onPoint(point, completed) {
      if (completed === 2) stop.abort();
    },
  });
  assert.equal(parsePulseCalibration(pulseArchive(partial)).points.length, 2);
  const zeros = {
    ...partial,
    points: partial.points.map((point) => ({
      ...point,
      record: { ...point.record, raw: point.record.raw.map(() => [0, 0]) },
    })),
  };
  const zeroResult = recalibratePulse(zeros);
  assert.equal(zeroResult.calibration, null);
  assert.equal(
    parsePulseCalibration(pulseArchive(zeroResult)).calibration,
    null,
  );
  assert.throws(() => parsePulseCalibration('{"kind":"wrong"}'));
});

test("pulse UI languages contain matching keys", () => {
  assert.deepEqual(
    Object.keys(pulseMessages.ja).sort(),
    Object.keys(pulseMessages.en).sort(),
  );
});
