import { createError } from "./errors.js";
// Graph text is separate from rendering. Templates contain named values in {braces}.
const SIGNAL = { ja: "信号値 [a.u.]", en: "Signal [a.u.]" };
const AXES = {
  ja: {
    fid: { title: "FID：Data 1とData 2", xLabel: "時間 [ms]" },
    fft: { title: "複素FFTの振幅スペクトル", xLabel: "受信周波数からの差 [kHz]" },
    frequency: { title: "設定周波数とFFTピーク振幅", xLabel: "設定周波数 [kHz]" },
    pulse: { title: "パルス周期数と符号付き信号", xLabel: "第1パルス [周期数]" },
    pulseMagnitude: { title: "パルス周期数と信号の絶対値", xLabel: "第1パルス [周期数]" },
    t1: { title: "T1・反転回復曲線", xLabel: "待ち時間 τ [ms]" },
    t2: { title: "T2・エコー減衰曲線", xLabel: "2τ [ms]" },
  },
  en: {
    fid: { title: "FID: Data 1 and Data 2", xLabel: "Time [ms]" },
    fft: { title: "Complex FFT amplitude spectrum", xLabel: "Frequency offset [kHz]" },
    frequency: { title: "Set frequency and FFT peak amplitude", xLabel: "Set frequency [kHz]" },
    pulse: { title: "Pulse cycles and signed signal", xLabel: "First pulse [RF cycles]" },
    pulseMagnitude: { title: "Pulse cycles and signal magnitude", xLabel: "First pulse [RF cycles]" },
    t1: { title: "T1 inversion recovery", xLabel: "Delay τ [ms]" },
    t2: { title: "T2 echo decay", xLabel: "2τ [ms]" },
  },
};
const MESSAGES = {
  ja: {
    fidEmpty: "測定すると波形を表示します。",
    fftEmpty: "測定するとスペクトルを表示します。",
    peak: {
      empty: "最大ピーク：未測定", none: "最大ピーク：信号なし", outside: "（表示範囲外）",
      value: "最大ピーク：{hz} Hz（受信周波数からの差）{outside}。全周波数から探索・FFTビン値。",
    },
    status: "末尾{tailPoints}点の平均で補正。FID表示は0〜{displayEndMs} ms、縦軸は{startMs}〜{endMs} msで自動調整（範囲外はクリップ）。薄い青の帯はFFT範囲。FFTは{startMs}〜{endMs} ms（終端を含まない）、{window}窓。周波数表示は±{frequencyLimitKHz} kHz。",
  },
  en: {
    fidEmpty: "Measure to display the waveform.",
    fftEmpty: "Measure to display the spectrum.",
    peak: {
      empty: "Maximum peak: no measurement", none: "Maximum peak: no signal", outside: " (outside display range)",
      value: "Maximum peak: {hz} Hz offset from receiver{outside}. Searched across all frequencies; FFT bin value.",
    },
    status: "Baseline: mean of the last {tailPoints} samples. FID: 0–{displayEndMs} ms; vertical scale uses {startMs}–{endMs} ms (larger values are clipped). The shaded band marks the FFT interval: {startMs}–{endMs} ms (end excluded), {window} window. Frequency display: ±{frequencyLimitKHz} kHz.",
  },
};

function checkLocale(locale) {
  if (locale !== "ja" && locale !== "en") throw createError(TypeError, "INVALID_LOCALE");
}
function checkObject(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw createError(TypeError, "INVALID_LABEL_OBJECT", { name });
}
function mergeStrings(defaults, overrides, name) {
  checkObject(overrides, name);
  for (const [key, value] of Object.entries(overrides)) {
    if (!Object.hasOwn(defaults, key) || typeof value !== "string") throw createError(TypeError, "INVALID_GRAPH_LABEL", { name, key });
  }
  return { ...defaults, ...overrides };
}
function checkTemplate(template, allowed, name) {
  for (const match of template.matchAll(/\{(\w+)\}/g)) {
    if (!allowed.includes(match[1])) throw createError(TypeError, "UNKNOWN_LABEL_PLACEHOLDER", { name, placeholder: match[1] });
  }
}

export function resolvePlotLabels(kind, locale = "ja", labels = {}) {
  checkLocale(locale);
  return mergeStrings({ ...AXES[locale][kind], yLabel: SIGNAL[locale] }, labels, "labels");
}

export function resolveRecordLabels(locale = "ja", labels = {}) {
  checkLocale(locale);
  checkObject(labels, "labels");
  for (const key of Object.keys(labels)) {
    if (!["fid", "fft", "peak", "status"].includes(key)) throw createError(TypeError, "UNKNOWN_LABEL_KEY", { key });
  }
  const text = MESSAGES[locale];
  const fid = mergeStrings({ ...resolvePlotLabels("fid", locale), empty: text.fidEmpty }, labels.fid === undefined ? {} : labels.fid, "labels.fid");
  const fft = mergeStrings({ ...resolvePlotLabels("fft", locale), empty: text.fftEmpty }, labels.fft === undefined ? {} : labels.fft, "labels.fft");
  const peak = mergeStrings(text.peak, labels.peak === undefined ? {} : labels.peak, "labels.peak");
  const status = Object.hasOwn(labels, "status") ? labels.status : text.status;
  if (typeof status !== "string") throw createError(TypeError, "INVALID_STATUS_LABEL");
  checkTemplate(peak.value, ["hz", "outside"], "labels.peak.value");
  checkTemplate(status, ["tailPoints", "displayEndMs", "startMs", "endMs", "window", "frequencyLimitKHz"], "labels.status");
  return { fid, fft, peak, status };
}

export function formatGraphText(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key]));
}
