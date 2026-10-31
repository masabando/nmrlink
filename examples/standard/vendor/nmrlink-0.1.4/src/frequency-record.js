import { parseMeasurement } from "./record.js";
import { frequencySteps, evaluateFrequency } from "./frequency-sweep.js";
import { validateParameters } from "./protocol.js";

export const MAX_FREQUENCY_JSON_BYTES = 32 * 1024 * 1024;

/** Restore raw records and recompute all derived values before replacing a UI's results. */
export function parseFrequencySweep(text) {
  if (typeof text !== "string" || new TextEncoder().encode(text).length > MAX_FREQUENCY_JSON_BYTES) {
    throw new TypeError("周波数走査JSONは32 MiB以下の文字列を指定してください。");
  }
  let value;
  try { value = JSON.parse(text.replace(/^\uFEFF/, "")); }
  catch { throw new TypeError("JSONの形式が正しくありません。"); }
  if (value?.kind !== "frequency-sweep" || !Array.isArray(value.points) || !value.points.length || value.points.length > 201) {
    throw new TypeError("周波数調整の全データJSONを指定してください（1〜201点）。");
  }
  const saved = value.settings;
  if (!saved) throw new TypeError("走査条件がありません。");
  const frequencies = frequencySteps(saved.startHz, saved.endHz, saved.stepHz);
  const parameters = validateParameters(saved.parameters);
  const a = saved.analysis;
  if (!a || ![a.startMs, a.endMs, a.tailPoints, a.minHz, a.maxHz].every(Number.isFinite) || !["hann", "rect"].includes(a.window)) {
    throw new TypeError("解析条件が正しくありません。");
  }
  const analysis = { startMs: a.startMs, endMs: a.endMs, tailPoints: a.tailPoints, window: a.window, minHz: a.minHz, maxHz: a.maxHz };
  const points = value.points.map((point, index) => {
    const record = parseMeasurement(JSON.stringify(point?.record));
    if (!record.parameters || record.source !== value.source || record.mode !== "single" ||
        point.frequencyHz !== frequencies[index] || record.parameters.frequencyHz !== frequencies[index] ||
        Object.keys(parameters).some(key => key !== "frequencyHz" && parameters[key] !== record.parameters[key])) {
      throw new TypeError("測定点と走査条件が一致しません。");
    }
    return evaluateFrequency(record, analysis);
  });
  if (typeof value.acquiredAt !== "string" || !Number.isFinite(Date.parse(value.acquiredAt))) throw new TypeError("走査日時が正しくありません。");
  return { source: value.source, acquiredAt: value.acquiredAt,
    settings: { startHz: saved.startHz, endHz: saved.endHz, stepHz: saved.stepHz, frequencies, parameters, analysis },
    points };
}
