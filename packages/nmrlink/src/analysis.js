import { correctBaseline } from "./baseline.js";
import { computeSpectrum } from "./fft.js";

/** Common analysis pipeline. The acquired record is never modified. */
export function analyzeMeasurement(record, {
  startMs = 1, endMs = 5, tailPoints = 100, truncate = true, window = "hann",
} = {}) {
  const baseline = correctBaseline(record.raw, { tailPoints, truncate });
  const spectrum = computeSpectrum(baseline.data, {
    sampleIntervalMs: record.sampleIntervalMs, startMs, endMs, window,
  });
  const peak = spectrum.bins.reduce((maximum, bin) => bin.amplitude > maximum.amplitude ? bin : maximum);
  return { data: baseline.data, baseline, spectrum, peak };
}
