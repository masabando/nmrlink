import { createWarning, warningFromError } from "./errors.js";
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
  const warningDetails = [];
  if (coherence < 0.85) warningDetails.push(createWarning("PHASE_INCOHERENT"));
  try { measured = signedPulseCandidates(points); } catch (error) { warningDetails.push(warningFromError(error)); }
  try { fit = fitPulseCalibration(points); } catch (error) { warningDetails.push(warningFromError(error)); }
  let magnitudeFit = null;
  try { magnitudeFit = fitPulseCalibration(points.map(point => ({length:point.length,amplitude:point.magnitude})), {magnitude:true}); }
  catch (error) { warningDetails.push(warningFromError(error)); }
  if (fit && (fit.p180 > Math.max(...points.map(point => point.length)) || fit.p90 < Math.min(...points.map(point => point.length)))) warningDetails.push(createWarning("PULSE_FIT_EXTRAPOLATED"));
  if (fit && fit.r2 < 0.85) warningDetails.push(createWarning("PULSE_FIT_LOW_AGREEMENT"));
  if (magnitudeFit && magnitudeFit.r2 < 0.85) warningDetails.push(createWarning("MAGNITUDE_FIT_LOW_AGREEMENT"));
  return { ...result, measured, fit, magnitudeFit, warnings: warningDetails.map(warning => warning.message), warningDetails };
}
