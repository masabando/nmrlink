import { SAMPLE_COUNT, SAMPLE_INTERVAL_MS, validateParameters } from "./protocol.js";
import { validateSamples } from "./sample-validation.js";

export const MAX_MEASUREMENT_JSON_BYTES = 2 * 1024 * 1024;

/** Parse a saved NMRLink record; discard derived fields and never coerce sample values. */
export function parseMeasurement(text) {
  if (typeof text !== "string") throw new TypeError("測定JSONは文字列で指定してください。");
  if (new TextEncoder().encode(text).length > MAX_MEASUREMENT_JSON_BYTES) {
    throw new RangeError("測定JSONは2 MiB以下のファイルを指定してください。");
  }
  let value;
  try { value = JSON.parse(text.replace(/^\uFEFF/, "")); }
  catch { throw new TypeError("JSONの形式が正しくありません。"); }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("NMRLinkの測定結果JSONを指定してください。");
  }
  if (!["instrument", "demo"].includes(value.source) || !["single", "double"].includes(value.mode)) {
    throw new TypeError("測定データのsourceまたはmodeが正しくありません。");
  }
  const validTime = typeof value.acquiredAt === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value.acquiredAt) && Number.isFinite(Date.parse(value.acquiredAt));
  // Date.parse normalizes dates such as February 30; reject that normalization.
  if (!validTime || new Date(value.acquiredAt.slice(0, 10) + "T00:00:00Z").toISOString().slice(0, 10) !== value.acquiredAt.slice(0, 10)) {
    throw new TypeError("測定データの取得日時が正しくありません。");
  }
  if (value.points !== SAMPLE_COUNT || value.raw?.length !== SAMPLE_COUNT || value.sampleIntervalMs !== SAMPLE_INTERVAL_MS) {
    throw new RangeError("2048点・0.02 ms間隔のNMRLink測定データを指定してください。");
  }
  try { validateSamples(value.raw); }
  catch { throw new TypeError("生データには各点2チャンネルの有限数値が必要です。"); }
  let parameters = null;
  if (value.source !== "demo" || value.parameters !== null) {
    try { parameters = validateParameters(value.parameters); }
    catch { throw new TypeError("保存された測定条件が正しくありません。"); }
  }
  return {
    source: value.source, acquiredAt: value.acquiredAt, mode: value.mode, parameters,
    sampleIntervalMs: value.sampleIntervalMs, points: value.points, raw: value.raw,
  };
}
