import { createError } from "./errors.js";
import { parseMeasurement } from "./record.js";
import { frequencySteps, evaluateFrequency } from "./frequency-sweep.js";
import { validateParameters } from "./protocol.js";

export const MAX_FREQUENCY_JSON_BYTES = 32 * 1024 * 1024;

/** Restore raw records and recompute all derived values before replacing a UI's results. */
export function parseFrequencySweep(text) {
  if (typeof text !== "string" || new TextEncoder().encode(text).length > MAX_FREQUENCY_JSON_BYTES) {
    throw createError(TypeError, "ARCHIVE_TOO_LARGE");
  }
  let value;
  try { value = JSON.parse(text.replace(/^\uFEFF/, "")); }
  catch (cause) { throw createError(TypeError, "INVALID_JSON", {}, { cause }); }
  if (value?.kind !== "frequency-sweep" || !Array.isArray(value.points) || !value.points.length || value.points.length > 201) {
    throw createError(TypeError, "INVALID_FREQUENCY_ARCHIVE");
  }
  const saved = value.settings;
  if (!saved) throw createError(TypeError, "MISSING_SWEEP_SETTINGS");
  const frequencies = frequencySteps(saved.startHz, saved.endHz, saved.stepHz);
  const parameters = validateParameters(saved.parameters);
  const a = saved.analysis;
  if (!a || ![a.startMs, a.endMs, a.tailPoints, a.minHz, a.maxHz].every(Number.isFinite) || !["hann", "rect"].includes(a.window)) {
    throw createError(TypeError, "INVALID_ANALYSIS_OPTIONS");
  }
  const analysis = { startMs: a.startMs, endMs: a.endMs, tailPoints: a.tailPoints, window: a.window, minHz: a.minHz, maxHz: a.maxHz };
  const points = value.points.map((point, index) => {
    const record = parseMeasurement(JSON.stringify(point?.record));
    if (!record.parameters || record.source !== value.source || record.mode !== "single" ||
        point.frequencyHz !== frequencies[index] || record.parameters.frequencyHz !== frequencies[index] ||
        Object.keys(parameters).some(key => key !== "frequencyHz" && parameters[key] !== record.parameters[key])) {
      throw createError(TypeError, "SWEEP_RECORD_MISMATCH");
    }
    return evaluateFrequency(record, analysis);
  });
  if (typeof value.acquiredAt !== "string" || !Number.isFinite(Date.parse(value.acquiredAt))) throw createError(TypeError, "INVALID_SWEEP_TIME");
  return { source: value.source, acquiredAt: value.acquiredAt,
    settings: { startHz: saved.startHz, endHz: saved.endHz, stepHz: saved.stepHz, frequencies, parameters, analysis },
    points };
}
