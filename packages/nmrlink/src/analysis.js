import { correctBaseline } from "./baseline.js";
import { lowpassFilter } from "./lowpass.js";
import { computeSpectrum } from "./fft.js";

/** Common analysis pipeline. The acquired record is never modified. */
export function analyzeMeasurement(record, {
  startMs = 1, endMs = 5, tailPoints = 100, truncate = true, window = "hann", lowpassHz = null,
} = {}) {
  const baseline = correctBaseline(record.raw, { tailPoints, truncate });
  // Validate the FFT interval before using its start as the transient exclusion.
  const unfilteredSpectrum = computeSpectrum(baseline.data, {
    sampleIntervalMs: record.sampleIntervalMs, startMs, endMs, window,
  });
  const startIndex = Math.round(unfilteredSpectrum.actualStartMs / record.sampleIntervalMs);
  const lowpass = lowpassHz === null ? null : {
    ...lowpassFilter(baseline.data.slice(startIndex), {
      sampleIntervalMs: record.sampleIntervalMs, cutoffHz: lowpassHz,
    }),
    startMs: unfilteredSpectrum.actualStartMs,
  };
  // The pre-start waveform remains unfiltered, and is outside the FFT interval.
  const data = lowpass ? [...baseline.data.slice(0, startIndex), ...lowpass.data] : baseline.data;
  const spectrum = lowpass ? computeSpectrum(data, {
    sampleIntervalMs: record.sampleIntervalMs, startMs, endMs, window,
  }) : unfilteredSpectrum;
  const peak = spectrum.bins.reduce((maximum, bin) => bin.amplitude > maximum.amplitude ? bin : maximum);
  return { data, baseline, spectrum, peak, ...(lowpass ? { lowpass } : {}) };
}
