import { integerSteps, runSingleSweep } from "./sweep.js";
import { evaluateFrequency } from "./frequency-sweep.js";
import { validateParameters, SAMPLE_COUNT, SAMPLE_INTERVAL_MS } from "./protocol.js";
import { analyzeSignedRecords } from "./signed-signal.js";
import { fitT1 } from "./relaxation-fit.js";

export function t1Delays(startMs, endMs, stepMs) {
  return integerSteps(startMs, endMs, stepMs, 32767);
}

/** PoC inversion recovery: 180°(0°), tau, 90°(0°), then acquire FID. */
export function t1Parameters({ frequencyHz, p90Cycles, p180Cycles, measurementIntervalMs, scans }, tauMs) {
  if (!Number.isInteger(p90Cycles) || !Number.isInteger(p180Cycles) || p90Cycles < 1 || p180Cycles <= p90Cycles) {
    throw new RangeError("0 < 90°長 < 180°長の整数周期で指定してください。");
  }
  const parameters = validateParameters({ frequencyHz, pulse1Cycles: p180Cycles, phase1Degrees: 0,
    pulse2Cycles: p90Cycles, phase2Degrees: 0, pulseIntervalMs: tauMs, measurementIntervalMs, scans });
  validateT1Parameters(parameters);
  return parameters;
}

function validateT1Parameters(parameters) {
  if (!Number.isInteger(parameters.pulseIntervalMs) || parameters.pulseIntervalMs < 1) throw new RangeError("τは1〜32767 msの整数で指定してください。");
  if (parameters.phase1Degrees !== 0 || parameters.phase2Degrees !== 0 || parameters.pulse2Cycles < 1 || parameters.pulse1Cycles <= parameters.pulse2Cycles) {
    throw new RangeError("T1は180°(0°) → τ → 90°(0°)で測定してください。");
  }
  if (parameters.measurementIntervalMs <= parameters.pulseIntervalMs + SAMPLE_COUNT * SAMPLE_INTERVAL_MS) {
    throw new RangeError("繰り返し間隔はτ＋取得時間（40.96 ms）より長くしてください。");
  }
}

export function evaluateT1(record, analysis = {}) {
  const start = analysis.startMs ?? 1, end = analysis.endMs ?? 5;
  if (![start, end].every(Number.isFinite) || end - start < 4 * SAMPLE_INTERVAL_MS - 1e-9 ||
      (analysis.minHz ?? -3000) < -25000 || (analysis.maxHz ?? 3000) > 25000) {
    throw new RangeError("FFT窓は4点以上、ピーク探索帯域は−25〜25 kHz内で指定してください。");
  }
  const point = evaluateFrequency(record, analysis);
  return { tau: record.parameters.pulseIntervalMs, amplitude: point.amplitude, peakHz: point.peakHz, record };
}

export async function runT1Sweep(device, parameters, { startMs, endMs, stepMs, analysis = {}, signal, onPoint } = {}) {
  const delays = t1Delays(startMs, endMs, stepMs);
  const result = await runSingleSweep(device, parameters, { field: "pulseIntervalMs", values: delays, mode: "double",
    validateMeasurement: validateT1Parameters, analysis, evaluate: evaluateT1, signal, onPoint });
  return { ...result, delays };
}

export function analyzeT1(records, { analysis = {}, referenceIndex = null, phaseDegrees = 0, fromMs, toMs } = {}) {
  if (!Array.isArray(records) || !records.length) throw new Error("先にT1測定を行ってください。");
  records.forEach(record => { validateT1Parameters(validateParameters(record.parameters)); evaluateT1(record, analysis); });
  const result = analyzeSignedRecords(records, { analysis, referenceIndex, phaseDegrees, field: "pulseIntervalMs", mode: "double" });
  const points = result.points.map(({ length, amplitude, ...point }) => ({ ...point, tau: length, signal: amplitude }));
  const range = { fromMs: fromMs ?? Math.min(...points.map(point => point.tau)), toMs: toMs ?? Math.max(...points.map(point => point.tau)) };
  const warnings = [];
  let fit = null;
  if (result.reference.coherence < 0.85) warnings.push("測定点間の位相が共通方向に揃っていません。T1の近似は行いません。");
  else {
    try {
      fit = fitT1(points, range);
      if (fit.to < 3 * fit.T) warnings.push("最大τが推定T1の3倍未満です。回復後の信号が十分に測定されていないため、推定値は測定範囲に敏感になる可能性があります。");
    }
    catch (error) { warnings.push(error.message); }
  }
  return { points, reference: result.reference, fit, warnings, ...range };
}
