import { createError } from "./errors.js";
import { parseMeasurement } from "./record.js";
import { pulseSteps, evaluatePulse, analyzePulseCalibration } from "./pulse-sweep.js";
import { validateParameters } from "./protocol.js";

export const MAX_PULSE_JSON_BYTES = 32 * 1024 * 1024;

/** Restore raw records and recompute all derived values before replacing a UI's results. */
export function parsePulseCalibration(text) {
  if (typeof text !== "string" || new TextEncoder().encode(text).length > MAX_PULSE_JSON_BYTES) {
    throw createError(TypeError, "ARCHIVE_TOO_LARGE");
  }
  let value;
  try { value = JSON.parse(text.replace(/^\uFEFF/, "")); }
  catch (cause) { throw createError(TypeError, "INVALID_JSON", {}, { cause }); }
  if (value?.kind !== "pulse-calibration" || !Array.isArray(value.points) || !value.points.length || value.points.length > 201) {
    throw createError(TypeError, "INVALID_PULSE_ARCHIVE");
  }
  const saved = value.settings;
  if (!saved) throw createError(TypeError, "MISSING_SWEEP_SETTINGS");
  const lengths = pulseSteps(saved.startCycles, saved.endCycles, saved.stepCycles);
  const parameters = validateParameters(saved.parameters);
  const a = saved.analysis;
  if (!a || ![a.startMs, a.endMs, a.tailPoints, a.minHz, a.maxHz].every(Number.isFinite) || !["hann", "rect"].includes(a.window)) {
    throw createError(TypeError, "INVALID_ANALYSIS_OPTIONS");
  }
  const analysis = { startMs: a.startMs, endMs: a.endMs, tailPoints: a.tailPoints, window: a.window, minHz: a.minHz, maxHz: a.maxHz };
  const points = value.points.map((point, index) => {
    const record = parseMeasurement(JSON.stringify(point?.record));
    if (!record.parameters || record.source !== value.source || record.mode !== "single" ||
        point.length !== lengths[index] || record.parameters.pulse1Cycles !== lengths[index] ||
        Object.keys(parameters).some(key => key !== "pulse1Cycles" && parameters[key] !== record.parameters[key])) {
      throw createError(TypeError, "SWEEP_RECORD_MISMATCH");
    }
    return evaluatePulse(record, analysis);
  });
  const referenceIndex = value.calibration?.reference?.referenceIndex ?? null;
  const phaseDegrees = value.calibration?.reference?.phaseDegrees ?? 0;
  if (referenceIndex !== null && (!Number.isInteger(referenceIndex) || referenceIndex < 0 || referenceIndex >= points.length)) throw createError(TypeError, "INVALID_REFERENCE_INDEX");
  if (!Number.isFinite(phaseDegrees)) throw createError(TypeError, "INVALID_PHASE");
  let calibration = null;
  try { calibration = analyzePulseCalibration(points.map(point => point.record), { analysis, referenceIndex, phaseDegrees }); }
  catch (error) {
    // A valid zero-signal scan is still useful for inspecting raw waveforms.
    if (error.code !== "NO_REFERENCE_SIGNAL") throw error;
  }
  if (typeof value.acquiredAt !== "string" || !Number.isFinite(Date.parse(value.acquiredAt))) throw createError(TypeError, "INVALID_SWEEP_TIME");
  return { source: value.source, acquiredAt: value.acquiredAt,
    settings: { startCycles: saved.startCycles, endCycles: saved.endCycles, stepCycles: saved.stepCycles, lengths, parameters, analysis },
    points, calibration, referenceIndex, phaseDegrees };
}
