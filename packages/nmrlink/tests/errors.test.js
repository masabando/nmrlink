import test from "node:test";
import assert from "node:assert/strict";
import {
  ERROR_CODES, validateParameters, computeSpectrum, parseMeasurement,
  analyzePulseCalibration, NMRDevice, NMRController, WebSerialTransport,
} from "../src/index.js";
import { readMeasurement } from "../src/browser.js";
import { createFrequencyPlot } from "../src/graphs.js";
import { diagnosticMessage } from "../../../examples/shared/diagnostics.js";

const parameters = { frequencyHz: 402000, pulse1Cycles: 21, phase1Degrees: 0,
  pulse2Cycles: 42, phase2Degrees: 90, pulseIntervalMs: 5, measurementIntervalMs: 200, scans: 64 };
const english = message => !/[\u3040-\u30ff\u3400-\u9fff]/u.test(message);

test("validation retains exception classes and supplies stable codes and structured details", () => {
  assert.throws(() => validateParameters({ ...parameters, scans: 0 }), error => {
    assert(error instanceof RangeError);
    assert.equal(error.code, ERROR_CODES.INVALID_PARAMETER_RANGE);
    assert.deepEqual(error.details, { name: "scans", minimum: 1, maximum: 32767 });
    assert(english(error.message));
    return true;
  });
  assert.throws(() => computeSpectrum([[1, 2]], { sampleIntervalMs: .02, startMs: 1, endMs: 0 }),
    error => error instanceof RangeError && error.code === "INVALID_FFT_RANGE");
  assert.throws(() => createFrequencyPlot([], {}),
    error => error instanceof TypeError && error.code === "INVALID_FREQUENCY_PLOT");
});

test("file errors keep native causes without exposing browser-language messages", async () => {
  assert.throws(() => parseMeasurement("{"), error => {
    assert(error instanceof TypeError);
    assert.equal(error.code, "INVALID_JSON");
    assert(error.cause instanceof SyntaxError);
    assert(english(error.message));
    return true;
  });
  const cause = new Error("読み込めませんでした");
  await assert.rejects(readMeasurement({ size: 1, async text() { throw cause; } }),
    error => error.code === "OPERATION_FAILED" && error.cause === cause && english(error.message));
});

test("controller returns the same normalized error that it reports to subscribers", async () => {
  const cause = new Error("装置に接続できません");
  const controller = new NMRController({ device: new NMRDevice({ transport: { async connect() { throw cause; } } }) });
  const errors = [];
  controller.onError(error => errors.push(error));
  try {
    const outcome = await controller.connect();
    assert.equal(outcome.ok, false);
    assert.equal(outcome.error, errors[0]);
    assert.equal(outcome.error.code, "SERIAL_CONNECTION_FAILED");
    assert.equal(outcome.error.cause, cause);
    assert(english(outcome.error.message));
    assert.equal(controller.state.canConnect, true);
  } finally { controller.dispose(); }
});

test("warnings retain the string-array contract and add matching coded details", () => {
  const records = [10, 20, 30].map(length => ({
    source: "demo", mode: "single", parameters: { ...parameters, pulse1Cycles: length }, sampleIntervalMs: .02,
    raw: Array.from({ length: 2048 }, (_, n) => {
      const t = n * .02;
      const amplitude = 1000 * Math.sin(Math.PI * length / 42) * Math.exp(-t / 8);
      return [amplitude * Math.cos(2 * Math.PI * t), amplitude * Math.sin(2 * Math.PI * t)];
    }),
  }));
  const result = analyzePulseCalibration(records);
  assert(result.warningDetails.length > 0);
  assert.deepEqual(result.warnings, result.warningDetails.map(warning => warning.message));
  for (const warning of result.warningDetails) {
    assert.equal(ERROR_CODES[warning.code], warning.code);
    assert(english(warning.message));
    assert.equal(typeof diagnosticMessage(warning, "ja"), "string");
  }
});

test("UI translations depend on codes rather than message wording", () => {
  const error = { code: "INVALID_JSON", message: "A newly worded English explanation." };
  assert.equal(diagnosticMessage(error, "ja"), "JSONの形式が正しくありません。");
  assert.equal(diagnosticMessage(error, "en"), error.message);
  assert.equal(diagnosticMessage({ code: "FUTURE_CODE", message: "Unknown" }, "ja"), null);
  assert(Object.isFrozen(ERROR_CODES));
});

test("native cancellation and permission failures have stable codes and retain their causes", async () => {
  for (const [name, code] of [["NotFoundError", "PORT_SELECTION_CANCELLED"], ["NotAllowedError", "SERIAL_PERMISSION_DENIED"]]) {
    const cause = Object.assign(new Error("ブラウザ由来の説明"), { name });
    const transport = new WebSerialTransport({ serial: { async requestPort() { throw cause; } } });
    await assert.rejects(transport.connect(), error => error.code === code && error.cause === cause && english(error.message));
    assert.equal(transport.state, "disconnected");
  }
});
