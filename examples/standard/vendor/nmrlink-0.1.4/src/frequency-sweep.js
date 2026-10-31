import { integerSteps, runSingleSweep } from "./sweep.js";
import { analyzeMeasurement } from "./analysis.js";

/** Plan an ascending scan without inventing an endpoint beyond the requested grid. */
export function frequencySteps(startHz, endHz, stepHz) {
  return integerSteps(startHz, endHz, stepHz, 2147483647);
}

/** Compare every record with the same time interval, window and peak search band. */
export function evaluateFrequency(record, {
  startMs = 1, endMs = 5, tailPoints = 100, window = "hann", minHz = -3000, maxHz = 3000,
} = {}) {
  if (![minHz, maxHz].every(Number.isFinite) || minHz >= maxHz) throw new RangeError("探索帯域は下限より上限を大きく指定してください。");
  const analysis = analyzeMeasurement(record, { startMs, endMs, tailPoints, window });
  const bins = analysis.spectrum.bins.filter(bin => bin.hz >= minHz && bin.hz <= maxHz);
  if (!bins.length) throw new RangeError("探索帯域にFFTビンがありません。");
  const peak = bins.reduce((best, bin) => bin.amplitude > best.amplitude ? bin : best);
  return { frequencyHz: record.parameters.frequencyHz, amplitude: peak.amplitude, peakHz: peak.hz, record };
}

/** Sequential Single scans; abort takes effect only between complete measurements. */
export async function runFrequencySweep(device, parameters, {
  startHz, endHz, stepHz, analysis = {}, signal, onPoint = () => {},
} = {}) {
  const frequencies = frequencySteps(startHz, endHz, stepHz);
  const result = await runSingleSweep(device, parameters, {
    field: "frequencyHz", values: frequencies, analysis, evaluate: evaluateFrequency, signal, onPoint,
  });
  return { ...result, frequencies };
}
