import {
  analyzeMeasurement,
  measurementDurationMs,
} from "../../../packages/nmrlink/src/index.js";
import { formatFileTimestamp } from "../../../packages/nmrlink/src/browser.js";
import { fidCsv as originalFidCsv, fftCsv as originalFftCsv } from "../../../examples/standard/model.js";
export {
  createDemoRecord,
} from "../../../examples/standard/model.js";

export const initialParameters = {
  frequencyHz: "402000",
  pulse1Cycles: "21",
  phase1Degrees: "0",
  pulse2Cycles: "42",
  phase2Degrees: "90",
  pulseIntervalMs: "5",
  measurementIntervalMs: "200",
  scans: "128",
};
export const initialAnalysis = {
  startMs: "1",
  endMs: "5",
  window: "hann",
  tailPoints: "100",
  displayEndMs: "10",
  frequencyLimitKHz: "10",
  lowpassHz: "none",
};
export function numericParameters(fields) {
  if (
    Object.values(fields).some(
      (value) => typeof value === "string" && value.trim() === "",
    )
  ) {
    throw new RangeError("Measurement fields must not be empty.");
  }
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, Number(value)]),
  );
}
export function estimatedSeconds(fields, mode) {
  return Math.ceil(
    measurementDurationMs(numericParameters(fields), { mode }) / 1000,
  );
}

export function prepare(record, fields) {
  const displayEndMs = Number(fields.displayEndMs),
    frequencyLimitHz = Number(fields.frequencyLimitKHz) * 1000;
  if (
    !Number.isFinite(displayEndMs) ||
    displayEndMs <= 0 ||
    displayEndMs > record.points * record.sampleIntervalMs ||
    !Number.isFinite(frequencyLimitHz) ||
    frequencyLimitHz <= 0 ||
    frequencyLimitHz > 500 / record.sampleIntervalMs
  ) {
    const error = new RangeError("Invalid display limits.");
    error.code = "UI_DISPLAY_RANGE";
    throw error;
  }
  const lowpassHz = fields.lowpassHz ?? "none";
  if (!["none", "1000", "500", "200", "100"].includes(lowpassHz)) {
    const error = new RangeError("Choose a supported low-pass cutoff.");
    error.code = "INVALID_LOWPASS";
    throw error;
  }
  const analysis = analyzeMeasurement(record, {
    startMs: Number(fields.startMs),
    endMs: Number(fields.endMs),
    tailPoints: Number(fields.tailPoints),
    window: fields.window,
    lowpassHz: lowpassHz === "none" ? null : Number(lowpassHz),
  });
  const comparison = ["none", "1000", "500", "200", "100"].map((cutoff, index) => ({
    key: cutoff,
    color: ["#176caa", "#b34e25", "#278047", "#8654ad", "#a57608"][index],
    spectrum: cutoff === lowpassHz ? analysis.spectrum : analyzeMeasurement(record, {
      startMs: Number(fields.startMs), endMs: Number(fields.endMs),
      tailPoints: Number(fields.tailPoints), window: fields.window,
      lowpassHz: cutoff === "none" ? null : Number(cutoff),
    }).spectrum,
  }));
  return { record, analysis, comparison, displayEndMs, frequencyLimitHz, settings: { ...fields, lowpassHz } };
}

// CSV/SVGは測定時刻のJSTファイル名を使います。PNGには同じ名前だけ渡します。
export function download(
  body,
  record,
  extension,
  type = "text/csv;charset=utf-8",
) {
  const filename = `nmrlink-${record.source}-${formatFileTimestamp(record.acquiredAt)}.${extension}`;
  if (body === null) return filename;
  const url = URL.createObjectURL(new Blob([body], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}

// Filter metadata travels with analyzed CSV values; raw channel columns are unchanged.
function withLowpass(csv, analysis) {
  if (!analysis.lowpass) return csv;
  const rows = csv.trimEnd().split("\n");
  return rows.map((row, i) => `${i === 0 ? "lowpass_cutoff_hz,lowpass_start_ms" : `${analysis.lowpass.cutoffHz},${analysis.lowpass.startMs}`},${row}`).join("\n") + "\n";
}
export const fidCsv = (record, analysis) => withLowpass(originalFidCsv(record, analysis), analysis);
export const fftCsv = (record, analysis) => withLowpass(originalFftCsv(record, analysis), analysis);
