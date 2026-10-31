import { createError } from "./errors.js";
/** Validate plain two-channel sample arrays without coercing corrupt values. */
export function validateSamples(samples) {
  if (!Array.isArray(samples) || samples.length === 0) {
    throw createError(TypeError, "INVALID_SAMPLES");
  }
  for (let index = 0; index < samples.length; index++) {
    const pair = samples[index];
    if (!Array.isArray(pair) || pair.length !== 2 ||
        !Number.isFinite(pair[0]) || !Number.isFinite(pair[1])) {
      throw createError(TypeError, "INVALID_SAMPLE", { index });
    }
  }
}
