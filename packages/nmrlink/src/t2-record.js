import { createError } from "./errors.js";
import { parseMeasurement } from "./record.js";
import { validateParameters } from "./protocol.js";
import { t2Delays, evaluateT2, analyzeT2 } from "./t2-sweep.js";

export const MAX_T2_JSON_BYTES = 32 * 1024 * 1024;

/** Restore a complete or stopped T2 scan; recompute derived data from raw samples. */
export function parseT2Measurement(text) {
  if (typeof text !== "string" || new TextEncoder().encode(text).length > MAX_T2_JSON_BYTES) throw createError(TypeError, "ARCHIVE_TOO_LARGE");
  let saved;
  try { saved = JSON.parse(text.replace(/^\uFEFF/, "")); }
  catch (cause) { throw createError(TypeError, "INVALID_JSON", {}, { cause }); }
  if (saved?.kind !== "t2-measurement" || !Array.isArray(saved.points) || !saved.points.length || saved.points.length > 201) {
    throw createError(TypeError, "INVALID_T2_ARCHIVE");
  }
  const s = saved.settings;
  if (!s) throw createError(TypeError, "MISSING_SWEEP_SETTINGS");
  const delays = t2Delays(s.startMs, s.endMs, s.stepMs);
  const parameters = validateParameters(s.parameters);
  const a = s.analysis;
  if (!a || ![a.startMs, a.endMs, a.tailPoints, a.minHz, a.maxHz].every(Number.isFinite) || !["hann", "rect"].includes(a.window)) throw createError(TypeError, "INVALID_ANALYSIS_OPTIONS");
  const analysis = { startMs: a.startMs, endMs: a.endMs, tailPoints: a.tailPoints, minHz: a.minHz, maxHz: a.maxHz, window: a.window };
  const points = saved.points.map((point, index) => {
    const record = parseMeasurement(JSON.stringify(point?.record));
    if (!record.parameters || record.mode !== "double" || record.source !== saved.source || point.tau !== delays[index] || record.parameters.pulseIntervalMs !== delays[index] ||
      Object.keys(parameters).some(key => key !== "pulseIntervalMs" && parameters[key] !== record.parameters[key])) throw createError(TypeError, "SWEEP_RECORD_MISMATCH");
    return evaluateT2(record, analysis);
  });
  const referenceIndex = saved.result?.reference?.referenceIndex ?? null;
  const fromMs = saved.result?.fromMs ?? 2 * s.startMs, toMs = saved.result?.toMs ?? 2 * s.endMs;
  if (![fromMs, toMs].every(Number.isFinite) || fromMs >= toMs) throw createError(TypeError, "INVALID_FIT_RANGE");
  if (referenceIndex !== null && (!Number.isInteger(referenceIndex) || referenceIndex < 0 || referenceIndex >= points.length)) throw createError(TypeError, "INVALID_REFERENCE_INDEX");
  let result = null;
  try { result = analyzeT2(points.map(point => point.record), { analysis, referenceIndex, fromMs, toMs }); }
  catch (error) {
    // A valid zero-signal scan is still useful for inspecting raw waveforms.
    if (error.code !== "NO_REFERENCE_SIGNAL") throw error;
  }
  if (typeof saved.acquiredAt !== "string" || !Number.isFinite(Date.parse(saved.acquiredAt))) throw createError(TypeError, "INVALID_SWEEP_TIME");
  return { source: saved.source, acquiredAt: saved.acquiredAt, settings: { startMs: s.startMs, endMs: s.endMs, stepMs: s.stepMs, delays, parameters, analysis }, points, result, referenceIndex, fromMs, toMs };
}
