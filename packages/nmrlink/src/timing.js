import { createError } from "./errors.js";
import { validateParameters, SAMPLE_COUNT, SAMPLE_INTERVAL_MS } from "./protocol.js";

/** PoC runtime estimate. Serial transfer and command overhead are not included. */
export function measurementDurationMs(parameters, { mode = "single" } = {}) {
  const p = validateParameters(parameters);
  if (!["single", "double"].includes(mode)) throw createError(TypeError, "INVALID_MODE");
  return Math.ceil(p.scans * (p.measurementIntervalMs + SAMPLE_COUNT * SAMPLE_INTERVAL_MS +
    (mode === "double" ? p.pulseIntervalMs : 0)));
}
