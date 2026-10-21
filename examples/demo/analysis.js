import { correctBaseline, computeSpectrum } from "../../packages/nmrlink/src/index.js";

/** Compose public analysis APIs without changing the measurement or its parameters. */
export function analyzeRecord(record, {
  baselineEnabled = true, tailPoints = 100, startMs = 1, endMs = 5, window = "hann",
} = {}) {
  const corrected = baselineEnabled ? correctBaseline(record.raw, { tailPoints }) : null;
  const data = corrected?.data ?? record.raw;
  const spectrum = computeSpectrum(data, {
    sampleIntervalMs: record.sampleIntervalMs, startMs, endMs, window,
  });
  return {
    settings: { baselineEnabled, tailPoints, startMs, endMs, window },
    base: corrected?.base ?? null,
    data,
    spectrum,
  };
}
