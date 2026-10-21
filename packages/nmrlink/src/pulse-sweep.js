import { integerSteps, runSingleSweep } from "./sweep.js";
import { evaluateFrequency } from "./frequency-sweep.js";
import { analyzeSignedRecords } from "./signed-signal.js";
import { signedPulseCandidates, fitPulseCalibration } from "./pulse-fit.js";

export function pulseSteps(startCycles, endCycles, stepCycles) {
  return integerSteps(startCycles, endCycles, stepCycles, 32767);
}
export function evaluatePulse(record, analysis = {}) {
  const point = evaluateFrequency(record, analysis);
  return { length: record.parameters.pulse1Cycles, amplitude: point.amplitude, peakHz: point.peakHz, record };
}
export async function runPulseSweep(device, parameters, {
  startCycles, endCycles, stepCycles, analysis = {}, signal, onPoint,
} = {}) {
  const lengths = pulseSteps(startCycles, endCycles, stepCycles);
  const result = await runSingleSweep(device, parameters, {
    field: "pulse1Cycles", values: lengths, analysis, evaluate: evaluatePulse, signal, onPoint,
  });
  return { ...result, lengths };
}

/** Keep signs with one phase reference for all points; never phase-align each point. */
export function analyzePulseCalibration(records, options = {}) {
  const result = analyzeSignedRecords(records, { ...options, field: "pulse1Cycles", mode: "single" });
  const { points, reference } = result;
  const coherence = reference.coherence;
  let measured = null, fit = null;
  const warnings = [];
  if (coherence < 0.85) warnings.push("測定点間の位相が共通方向に揃っていません。");
  try { measured = signedPulseCandidates(points); } catch (error) { warnings.push(error.message); }
  try { fit = fitPulseCalibration(points); } catch (error) { warnings.push(error.message); }
  let magnitudeFit = null;
  try { magnitudeFit = fitPulseCalibration(points.map(point => ({length:point.length,amplitude:point.magnitude})), {magnitude:true}); }
  catch (error) { warnings.push(error.message); }
  if (fit && (fit.p180 > Math.max(...points.map(point => point.length)) || fit.p90 < Math.min(...points.map(point => point.length)))) warnings.push("近似のパルス長が測定範囲外です。外挿した推定値です。");
  if (fit && fit.r2 < 0.85) warnings.push("サイン近似との一致度が低いため、推定値は参考値です。");
  if (magnitudeFit && magnitudeFit.r2 < 0.85) warnings.push("絶対値のサイン近似との一致度が低いため、推定値は参考値です。");
  return { ...result, measured, fit, magnitudeFit, warnings };
}
