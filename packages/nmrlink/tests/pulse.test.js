import test from "node:test";
import assert from "node:assert/strict";
import { pulseSteps, runPulseSweep, analyzePulseCalibration, fitPulseCalibration, NMRController } from "../src/index.js";
import { createPulsePlot } from "../src/graphs.js";
import { signedRabiFit } from "../../../tests/fixtures/poc/pulse-fit.js";

const parameters = { frequencyHz: 402000, pulse1Cycles: 21, phase1Degrees: 0, pulse2Cycles: 42, phase2Degrees: 90, pulseIntervalMs: 5, measurementIntervalMs: 200, scans: 16 };
function record(length) {
  const amplitude = 1200 * Math.sin(Math.PI * length / 42);
  return { source: "demo", mode: "single", acquiredAt: "2026-10-21T07:00:00.000Z", points: 2048, sampleIntervalMs: 0.02, parameters: { ...parameters, pulse1Cycles: length },
    raw: Array.from({ length: 2048 }, (_, index) => {
      const t = index * 0.00002, a = amplitude * Math.exp(-t / 0.003), phase = 2 * Math.PI * 1200 * t + 0.7;
      return [Math.round(70 + a * Math.cos(phase)), Math.round(-20 + a * Math.sin(phase))];
    }),
  };
}
test("signed pulse analysis preserves signs, raw records and a known calibration", () => {
  const records = pulseSteps(5, 80, 5).map(record); const before = JSON.stringify(records);
  const calibration = analyzePulseCalibration(records);
  assert.equal(JSON.stringify(records), before);
  assert.ok(calibration.points.find(point => point.length === 20).amplitude > 0);
  assert.ok(calibration.points.find(point => point.length === 60).amplitude < 0);
  assert.ok(calibration.fit);
  assert.ok(Math.abs(calibration.fit.p90 - 21) < 0.1);
  assert.ok(Math.abs(calibration.fit.p180 - 42) < 0.2);
  assert.ok(calibration.reference.coherence > 0.99);
  assert.deepEqual(fitPulseCalibration(calibration.points), signedRabiFit(calibration.points));
  assert.match(createPulsePlot(calibration.points, { fit: calibration.fit }), /height="280"/);
});
test("manual phase reference is common; short scans still get a sine estimate", () => {
  const records = pulseSteps(5, 80, 5).map(record);
  const a = analyzePulseCalibration(records, { referenceIndex: 3 });
  const b = analyzePulseCalibration(records, { referenceIndex: 3, phaseDegrees: 180 });
  for (let i = 0; i < a.points.length; i++) assert.ok(Math.abs(a.points[i].amplitude + b.points[i].amplitude) < 1e-7);
  assert.ok(analyzePulseCalibration(records.slice(0, 3)).fit);
  assert.ok(analyzePulseCalibration(records.slice(0, 3)).magnitudeFit);
  assert.throws(() => analyzePulseCalibration([record(5), { ...record(10), parameters: { ...parameters, frequencyHz: 403000 } }]));
  assert.throws(() => analyzePulseCalibration([record(5)], { referenceIndex: 100 }));
});
test("pulse sweep shares cancellation, exclusivity and validation with frequency sweep", async () => {
  for (const args of [[0, 10, 1], [1, 32768, 10], [1, 300, 1]]) assert.throws(() => pulseSteps(...args));
  let calls = 0;
  const device = { state: "connected", async measure(p, options) { calls++; assert.equal(options.mode, "single"); assert.equal(p.frequencyHz, parameters.frequencyHz); return record(p.pulse1Cycles); } };
  await assert.rejects(runPulseSweep(device, parameters, { startCycles: 5, endCycles: 80, stepCycles: 5, analysis: { startMs: 5, endMs: 1 } }));
  assert.equal(calls, 0);
  const controller = new NMRController({ device }); const stop = new AbortController();
  const result = await controller.pulseSweep(parameters, { startCycles: 5, endCycles: 80, stepCycles: 5, signal: stop.signal, async onPoint(point, completed) {
    assert.equal((await controller.sweep(parameters, { startHz: 1, endHz: 2, stepHz: 1 })).ok, false);
    if (completed === 2) stop.abort();
  } });
  assert.equal(result.ok, true); assert.equal(result.value.stopped, true); assert.equal(calls, 2);
  assert.equal(controller.result.parameters.pulse1Cycles, 10); controller.dispose();
});
