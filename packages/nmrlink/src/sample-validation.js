/** Validate plain two-channel sample arrays without coercing corrupt values. */
export function validateSamples(samples) {
  if (!Array.isArray(samples) || samples.length === 0) {
    throw new TypeError("Samples must be a non-empty array of channel pairs.");
  }
  for (let index = 0; index < samples.length; index++) {
    const pair = samples[index];
    if (!Array.isArray(pair) || pair.length !== 2 ||
        !Number.isFinite(pair[0]) || !Number.isFinite(pair[1])) {
      throw new TypeError(`Sample ${index} must contain exactly two finite numbers.`);
    }
  }
}
