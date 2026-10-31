import { createError } from "./errors.js";
import { SAMPLE_COUNT, SAMPLE_INTERVAL_MS, validateParameters } from "./protocol.js";
import { validateSamples } from "./sample-validation.js";

export const MAX_MEASUREMENT_JSON_BYTES = 2 * 1024 * 1024;

/** Parse a saved NMRLink record; discard derived fields and never coerce sample values. */
export function parseMeasurement(text) {
  if (typeof text !== "string") throw createError(TypeError, "INVALID_RECORD_TEXT");
  if (new TextEncoder().encode(text).length > MAX_MEASUREMENT_JSON_BYTES) {
    throw createError(RangeError, "RECORD_TOO_LARGE");
  }
  let value;
  try { value = JSON.parse(text.replace(/^\uFEFF/, "")); }
  catch (cause) { throw createError(TypeError, "INVALID_JSON", {}, { cause }); }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw createError(TypeError, "INVALID_RECORD");
  }
  if (!["instrument", "demo"].includes(value.source) || !["single", "double"].includes(value.mode)) {
    throw createError(TypeError, "INVALID_RECORD_KIND");
  }
  const validTime = typeof value.acquiredAt === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value.acquiredAt) && Number.isFinite(Date.parse(value.acquiredAt));
  // Date.parse normalizes dates such as February 30; reject that normalization.
  if (!validTime || new Date(value.acquiredAt.slice(0, 10) + "T00:00:00Z").toISOString().slice(0, 10) !== value.acquiredAt.slice(0, 10)) {
    throw createError(TypeError, "INVALID_ACQUISITION_TIME");
  }
  if (value.points !== SAMPLE_COUNT || value.raw?.length !== SAMPLE_COUNT || value.sampleIntervalMs !== SAMPLE_INTERVAL_MS) {
    throw createError(RangeError, "INVALID_RECORD_SAMPLING");
  }
  try { validateSamples(value.raw); }
  catch (cause) { throw createError(TypeError, "INVALID_RECORD_CHANNELS", {}, { cause }); }
  let parameters = null;
  if (value.source !== "demo" || value.parameters !== null) {
    try { parameters = validateParameters(value.parameters); }
    catch (cause) { throw createError(TypeError, "INVALID_RECORD_PARAMETERS", {}, { cause }); }
  }
  return {
    source: value.source, acquiredAt: value.acquiredAt, mode: value.mode, parameters,
    sampleIntervalMs: value.sampleIntervalMs, points: value.points, raw: value.raw,
  };
}
