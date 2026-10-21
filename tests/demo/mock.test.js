import test from "node:test";
import assert from "node:assert/strict";
import { demoSamples, createDemoDevice } from "../../scripts/demo/mock-controller.js";
const parameters = {
  frequencyHz: 402000, pulse1Cycles: 60, phase1Degrees: 0,
  pulse2Cycles: 120, phase2Degrees: 90, pulseIntervalMs: 5,
  measurementIntervalMs: 200, scans: 1,
};
test("demo produces deterministic finite channel pairs and responds to conditions", () => {
  const raw = demoSamples(parameters, "single");
  assert.equal(raw.length, 2048);
  assert.ok(raw.every(pair => pair.length === 2 && pair.every(Number.isSafeInteger)));
  assert.deepEqual(demoSamples(parameters, "single"), raw);
  assert.notDeepEqual(demoSamples({ ...parameters, frequencyHz: 402100 }, "single"), raw);
  assert.notDeepEqual(demoSamples(parameters, "double"), raw);
});
test("demo uses the real protocol stack and labels results as simulated", async () => {
  const device = createDemoDevice();
  await device.connect();
  try {
    for (const mode of ["single", "double"]) {
      const result = await device.measure(parameters, { mode });
      assert.equal(result.source, "demo");
      assert.equal(result.mode, mode);
      assert.deepEqual(result.raw, demoSamples(parameters, mode));
    }
  } finally { await device.disconnect(); }
});
