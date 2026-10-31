import { createError, createWarning, warningFromError } from "./errors.js";
import { integerSteps, runSingleSweep } from "./sweep.js";
import { evaluateFrequency } from "./frequency-sweep.js";
import { analyzeMeasurement } from "./analysis.js";
import { complexAt } from "./signed-signal.js";
import { validateParameters, SAMPLE_COUNT, SAMPLE_INTERVAL_MS } from "./protocol.js";
import { fitT2 } from "./relaxation-fit.js";

export function t2Delays(startMs, endMs, stepMs) {
  return integerSteps(startMs, endMs, stepMs, 32767);
}

/** Spin echo: 90°(0°), tau, 180°(90°). Acquisition starts after the second pulse. */
export function t2Parameters({ frequencyHz, p90Cycles, p180Cycles, measurementIntervalMs, scans }, tauMs) {
  if (!Number.isInteger(p90Cycles) || !Number.isInteger(p180Cycles) || p90Cycles < 1 || p180Cycles <= p90Cycles) throw createError(RangeError, "INVALID_CALIBRATED_PULSES");
  const parameters = validateParameters({frequencyHz, pulse1Cycles:p90Cycles, phase1Degrees:0, pulse2Cycles:p180Cycles, phase2Degrees:90, pulseIntervalMs:tauMs, measurementIntervalMs, scans});
  validateT2Parameters(parameters);
  return parameters;
}
function validateT2Parameters(p) {
  if (p.pulseIntervalMs < 1 || p.phase1Degrees !== 0 || p.phase2Degrees !== 90 || p.pulse1Cycles < 1 || p.pulse2Cycles <= p.pulse1Cycles) throw createError(RangeError, "INVALID_T2_SEQUENCE");
  if (p.measurementIntervalMs <= p.pulseIntervalMs + SAMPLE_COUNT * SAMPLE_INTERVAL_MS) throw createError(RangeError, "REPETITION_TOO_SHORT");
}

/** Input bounds are offsets from the echo center; output bounds follow tau. */
export function t2Window(tauMs, analysis = {}) {
  const startOffset = analysis.startMs ?? -4, endOffset = analysis.endMs ?? 4;
  const startMs = tauMs + startOffset, endMs = tauMs + endOffset;
  if (![tauMs, startOffset, endOffset].every(Number.isFinite) || startOffset >= 0 || endOffset <= 0 ||
      startMs < 0 || endMs > SAMPLE_COUNT * SAMPLE_INTERVAL_MS + 1e-9 || endMs - startMs < 4 * SAMPLE_INTERVAL_MS - 1e-9) {
    throw createError(RangeError, "INVALID_ECHO_WINDOW", { tauMs });
  }
  if ((analysis.minHz ?? -3000) < -25000 || (analysis.maxHz ?? 3000) > 25000) throw createError(RangeError, "SEARCH_BAND_OUT_OF_RANGE");
  return {...analysis, startMs, endMs};
}
export function evaluateT2(record, analysis = {}) {
  const tau = record.parameters.pulseIntervalMs;
  const window = t2Window(tau, analysis);
  const point = evaluateFrequency(record, window);
  return {tau, amplitude:point.amplitude, peakHz:point.peakHz, window, record};
}
export async function runT2Sweep(device, parameters, {startMs, endMs, stepMs, analysis = {}, signal, onPoint} = {}) {
  const delays = t2Delays(startMs, endMs, stepMs);
  // Validate every moving window before the first hardware command.
  const raw = Array.from({length:SAMPLE_COUNT}, () => [0,0]);
  for (const tau of delays) evaluateT2({parameters:{...parameters,pulseIntervalMs:tau},sampleIntervalMs:SAMPLE_INTERVAL_MS,raw},analysis);
  const result = await runSingleSweep(device,parameters,{field:"pulseIntervalMs",values:delays,mode:"double",validateMeasurement:validateT2Parameters,analysis,evaluate:evaluateT2,signal,onPoint});
  return {...result,delays};
}
export function analyzeT2(records, {analysis = {}, referenceIndex = null, fromMs, toMs} = {}) {
  if (!Array.isArray(records) || !records.length) throw createError(Error, "NO_RECORDS");
  const first = records[0];
  const evaluated = records.map(record => {
    validateT2Parameters(validateParameters(record.parameters));
    if (record.mode !== "double" || record.source !== first.source || record.sampleIntervalMs !== first.sampleIntervalMs ||
        Object.keys(first.parameters).some(key => key !== "pulseIntervalMs" && first.parameters[key] !== record.parameters[key])) throw createError(Error, "INCONSISTENT_RECORDS");
    return evaluateT2(record,analysis);
  });
  let basis;
  if (referenceIndex !== null) {
    if (!Number.isInteger(referenceIndex) || !evaluated[referenceIndex]) throw createError(Error, "INVALID_REFERENCE_INDEX");
    basis = evaluated[referenceIndex];
  } else basis = evaluated.reduce((best,point) => point.amplitude > best.amplitude ? point : best);
  if (basis.amplitude < 1e-9) throw createError(Error, "NO_REFERENCE_SIGNAL");
  const reference = {hz:basis.peakHz,referenceIndex};
  const points = evaluated.map(point => {
    const prepared = analyzeMeasurement(point.record,point.window);
    const z = complexAt(prepared.data,prepared.spectrum,point.record.sampleIntervalMs,reference.hz);
    const magnitude = Math.hypot(z.real,z.imaginary);
    return {...point,signal:magnitude,magnitude};
  });
  const range = {fromMs:fromMs ?? 2*Math.min(...points.map(p=>p.tau)),toMs:toMs ?? 2*Math.max(...points.map(p=>p.tau))};
  let fit = null;
  const warningDetails = [];
  try {
    fit = fitT2(points,range);
    if (fit.r2 < .95) warningDetails.push(createWarning("T2_FIT_LOW_AGREEMENT"));
    if ((fit.to-fit.from)/fit.T < .8) warningDetails.push(createWarning("T2_SHORT_RANGE"));
  } catch(error) { warningDetails.push(warningFromError(error)); }
  return {points,reference,fit,warnings: warningDetails.map(warning => warning.message), warningDetails,...range};
}
