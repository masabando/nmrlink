import { validateSamples } from "./sample-validation.js";

/**
 * Subtract each channel's tail mean, preserving the input array.
 * Defaults match the PoC: last 100 samples and Python int-style truncation.
 * tailPoints is a sample count, not a duration in milliseconds.
 */
export function correctBaseline(raw, { tailPoints = 100, truncate = true } = {}) {
  validateSamples(raw);
  if (!Number.isSafeInteger(tailPoints) || tailPoints < 1 || tailPoints > raw.length) {
    throw new RangeError("tailPoints must be an integer from 1 to the sample count.");
  }
  if (typeof truncate !== "boolean") throw new TypeError("truncate must be boolean.");

  const base = [0, 0];
  for (let channel = 0; channel < 2; channel++) {
    let sum = 0;
    for (let index = raw.length - tailPoints; index < raw.length; index++) {
      sum += raw[index][channel];
    }
    base[channel] = sum / tailPoints;
    if (!Number.isFinite(base[channel])) throw new RangeError("Baseline calculation overflowed.");
  }

  const data = raw.map(pair => pair.map((value, channel) => {
    const corrected = value - base[channel];
    if (!Number.isFinite(corrected)) throw new RangeError("Baseline correction overflowed.");
    return truncate ? Math.trunc(corrected) : corrected;
  }));
  return { base, data, tailPoints, truncate };
}
