import { timeSummary } from "./timing.js";
import { setupNavigation } from "./navigation.js";
import { NMRController, parseT2Measurement, MAX_T2_JSON_BYTES, t2Delays, t2Parameters, evaluateT2, t2Window, analyzeMeasurement, runT2Sweep, analyzeT2 } from "../../packages/nmrlink/src/index.js";
import { NMRGraphs, createT2Plot } from "../../packages/nmrlink/src/graphs.js";
import { saveMeasurement, saveGraphPng, formatFileTimestamp } from "../../packages/nmrlink/src/browser.js";
import { createDemoRecord } from "./model.js";

const element = id => document.getElementById(id);
const controller = new NMRController();
const graphs = new NMRGraphs({ fid: element("fid-graph"), fft: element("fft-graph"), status: element("graph-status"), displayEndMs: 40.96 });
let points = [];
let selected = null;
let settings = null;
let abort = null;
let running = false;
let loading = false;
let state;
let source = "instrument";
let startedAt = null;
let calibration = null;
let referenceIndex = null;

function message(text, error = false) {
  element("message").textContent = text;
  element("message").classList.toggle("error", error);
}
function updateControls(next = state) {
  state = next;
  const busy = running || loading || state.busy;
  element("open-json").disabled = busy;
  element("connect").disabled = busy || !state.canConnect || !("serial" in navigator);
  element("disconnect").disabled = busy || !state.canDisconnect;
  element("start").disabled = busy || !state.canMeasure;
  element("settings").disabled = busy;
  element("demo").disabled = busy;
  element("stop").disabled = !running || abort?.signal.aborted;
  element("reference-settings").disabled = busy;
  element("fit-settings").disabled = busy;
  element("fit-update").disabled = busy || !points.length;
  for (const id of ["auto-reference", "set-reference", "apply-analysis"]) element(id).disabled = busy || !points.length;
  element("connection").textContent = { connected: "接続済み", connecting: "接続中", measuring: "測定中", disconnected: "未接続" }[state.connection];
  element("connection").classList.toggle("connected", state.connection === "connected");
}
controller.onStateChange(updateControls);
controller.onError(error => message(error.message, true));
element("support").textContent = "serial" in navigator ? "接続後、装置と試料に合う条件を確認してください。" : "実機接続にはWeb Serial対応ブラウザとHTTPSまたはlocalhostが必要です。デモはそのまま試せます。";
element("connect").onclick = () => controller.connect();
element("disconnect").onclick = () => controller.disconnect();

function formSettings() {
  const f = Object.fromEntries(new FormData(element("sweep-form")));
  const scan = { startMs: Number(f.startMs), endMs: Number(f.endMs), stepMs: Number(f.stepMs) };
  const delays = t2Delays(scan.startMs, scan.endMs, scan.stepMs);
  const conditions = { frequencyHz: Number(f.frequencyHz), p90Cycles: Number(f.p90Cycles), p180Cycles: Number(f.p180Cycles), measurementIntervalMs: Number(f.measurementIntervalMs), scans: Number(f.scans) };
  delays.forEach(tau => t2Parameters(conditions, tau));
  const parameters = t2Parameters(conditions, scan.startMs);
  const analysis = { startMs: Number(f.fftStartMs), endMs: Number(f.fftEndMs), window: f.window, tailPoints: 100, minHz: Number(f.minKHz) * 1000, maxHz: Number(f.maxKHz) * 1000 };
  for (const tau of delays) evaluateT2({ ...createDemoRecord(), parameters: { ...parameters, pulseIntervalMs: tau } }, analysis);
  return { ...scan, delays, parameters, analysis };
}
function fitRange() {
  const fromMs = Number(element("fit-from").value), toMs = Number(element("fit-to").value);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || fromMs >= toMs) throw new Error("近似範囲は開始 < 終了で指定してください。");
  return { fromMs, toMs };
}
function plan() {
  try {
    const p = formSettings();
    element("time-estimate").textContent = timeSummary(p.delays.map(value => ({ ...p.parameters, pulseIntervalMs: value })), "double");
    element("plan").textContent = `${p.delays.length}点 · 最終点 ${p.delays.at(-1)} ms · 各点 ${p.parameters.scans}回積算`;
  } catch (error) { element("plan").textContent = error.message; element("time-estimate").textContent = "見込み時間：測定条件を確認してください。"; }
}
element("sweep-form").oninput = plan;
element("sweep-form").onchange = plan;
plan();

function drawCurve() {
  if (!points.length) { element("curve").textContent = "走査すると結果を表示します。"; return; }
  element("curve").classList.remove("empty");
  const values = calibration?.points ?? points.map(point => ({ tau: point.tau, signal: point.amplitude }));
  element("curve").innerHTML = createT2Plot(values, { width: Math.max(160, Math.floor(element("curve").clientWidth)), fit: calibration?.fit });
}
new ResizeObserver(drawCurve).observe(element("curve"));
function maximum() { return points.reduce((best, point) => !best || point.amplitude > best.amplitude ? point : best, null); }
function reanalyze() {
  try {
    calibration = analyzeT2(points.map(point => point.record), { analysis: settings.analysis, referenceIndex, ...fitRange() });
    const ref = calibration.reference;
    element("reference").textContent = `${referenceIndex === null ? "自動基準" : "選択点の基準"} · ${ref.hz.toFixed(1)} Hz`;
  } catch (error) {
    calibration = null;
    element("reference").textContent = `基準を求められません：${error.message}`;
  }
}
function refresh() {
  drawCurve();
  const fit = calibration?.fit;
  element("best").textContent = fit ? `T2：${fit.T.toFixed(2)} ms · R² ${fit.r2.toFixed(4)}` : "T2：未確定";
  element("fit").textContent = fit ? `A ${fit.A.toPrecision(5)} · 背景0 · RMSE ${fit.rmse.toPrecision(4)} · ${fit.n}点 · 2τ ${fit.from}〜${fit.to} ms` : (calibration?.warnings.join(" ") || "取得した信号を確認してください。");
  if (fit && calibration.warnings.length) element("fit").textContent += ` · ${calibration.warnings.join(" ")}`;
  for (const id of ["json", "csv", "png"]) element(id).disabled = !points.length;
  element("points").replaceChildren();
  for (const [index, point] of points.entries()) {
    const row = document.createElement("tr");
    row.classList.toggle("selected", point === selected);
    const lengthCell = document.createElement("td");
    const button = document.createElement("button");
    button.textContent = String(point.tau);
    button.onclick = () => selectPoint(point);
    lengthCell.append(button);
    row.append(lengthCell);
    for (const value of [calibration?.points[index]?.signal, calibration?.points[index]?.peakHz ?? point.peakHz].map(value => value === undefined ? "—" : value.toPrecision(5))) {
      const cell = document.createElement("td"); cell.textContent = value; row.append(cell);
    }
    element("points").append(row);
  }
}
function selectPoint(point) {
  selected = point;
  graphs.show(point.record, analyzeMeasurement(point.record, t2Window(point.tau, settings.analysis)));
  element("selected").textContent = `${point.tau} ms のエコー・FFT`;
  element("record-json").disabled = false;
  refresh();
}

async function start(demo) {
  if (running || loading || state.busy) return;
  let prepared;
  try { prepared = formSettings(); fitRange(); }
  catch (error) { message(error.message, true); return; }
  if (!demo && !state.canMeasure) { message("先に装置へ接続してください。", true); return; }
  settings = prepared;
  points = [];
  calibration = null;
  referenceIndex = null;
  element("reference").textContent = "取得点から共通位相基準を解析します。";
  selected = null;
  graphs.clear();
  element("record-json").disabled = true;
  element("selected").textContent = "選択点のエコー・FFT";
  source = demo ? "demo" : "instrument";
  startedAt = new Date().toISOString();
  element("source").textContent = demo ? "模擬走査 · DEMO" : "実機走査";
  element("source").classList.toggle("demo", demo);
  abort = new AbortController();
  running = true;
  message(`${demo ? "模擬走査" : "走査"}を開始しました。第1点の測定完了を待っています。`);
  updateControls();
  refresh();
  const onPoint = (point, completed, total) => {
    points.push(point);
    selected = point;
    reanalyze();
    selectPoint(point);
    message(`${demo ? "模擬走査" : "走査"}：${completed} / ${total}点完了 · ${point.tau} ms`);
  };
  try {
    let result;
    const options = { startMs: settings.startMs, endMs: settings.endMs, stepMs: settings.stepMs, analysis: settings.analysis, signal: abort.signal, onPoint };
    if (demo) result = await runT2Sweep(demoDevice(settings), settings.parameters, options);
    else {
      const response = await controller.t2Sweep(settings.parameters, options);
      if (!response.ok) throw response.error;
      result = response.value;
    }
    if (points.length) selectPoint(maximum());
    message(`${demo ? "模擬走査" : "走査"}${result.stopped ? "を停止しました" : "が完了しました"}：${points.length}点。必要なデータを保存してください。`);
  } catch (error) { message(`走査を中断しました：${error.message}。取得済みの${points.length}点は保持しています。自動再送は行いません。`, true); }
  finally { running = false; updateControls(); refresh(); }
}
element("sweep-form").onsubmit = event => { event.preventDefault(); start(false); };
element("demo").onclick = () => start(true);
element("stop").onclick = () => { abort?.abort(); updateControls(); message("停止を要求しました。現在の測定完了を待っています。"); };
element("fit-form").onsubmit = event => { event.preventDefault(); if (!running && !loading && points.length) { reanalyze(); refresh(); } };
element("apply-analysis").onclick = () => {
  if (running || loading || !points.length) return;
  try {
    const fields = element("sweep-form").elements;
    const analysis = {startMs:Number(fields.fftStartMs.value),endMs:Number(fields.fftEndMs.value),window:fields.window.value,tailPoints:100,minHz:Number(fields.minKHz.value)*1000,maxHz:Number(fields.maxKHz.value)*1000};
    const next = analyzeT2(points.map(point=>point.record),{analysis,referenceIndex,...fitRange()});
    settings = {...settings,analysis};
    calibration = next;
    reanalyze();
    selectPoint(selected ?? maximum());
    message("取得済みの全点を再解析しました。再測定は行っていません。");
  } catch(error) { message(error.message,true); }
};
element("auto-reference").onclick = () => { referenceIndex = null; reanalyze(); refresh(); };
element("set-reference").onclick = () => {
  if (selected && !running) { referenceIndex = points.indexOf(selected); reanalyze(); refresh(); }
};

// A synthetic response envelope, not a simulation of calibrated hardware physics.
function demoDevice(plan) {
  const t2Ms = 22;
  return { async measure(parameters) {
    await new Promise(resolve => setTimeout(resolve, 150));
    const record = createDemoRecord();
    const amplitude = 1200 * Math.exp(-2 * parameters.pulseIntervalMs / t2Ms);
    const offsetHz = 1200;
    record.parameters = { ...parameters };
    record.mode = "double";
    record.raw = record.raw.map((_, index) => {
      const t = index * 0.00002;
      const envelope = amplitude * Math.exp(-(((t * 1000 - parameters.pulseIntervalMs) / 2) ** 2));
      return [Math.round(70 + envelope * Math.cos(2 * Math.PI * offsetHz * t)), Math.round(-20 + envelope * Math.sin(2 * Math.PI * offsetHz * t))];
    });
    return record;
  } };
}
function saveFile(text, extension, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a"); link.href = url;
  link.download = `nmrlink-${source}-t2-${formatFileTimestamp(startedAt)}.${extension}`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
element("json").onclick = () => saveFile(JSON.stringify({ kind: "t2-measurement", source, acquiredAt: startedAt, settings, points, result: calibration && {
  reference: calibration.reference, fit: calibration.fit, warnings: calibration.warnings, fromMs: calibration.fromMs, toMs: calibration.toMs,
} }, null, 2), "json", "application/json");
element("csv").onclick = () => saveFile("source,tau_ms,two_tau_ms,echo_amplitude,reference_hz,window_start_ms,window_end_ms\n" + points.map((point, index) => {
  const value = calibration?.points[index], ref = calibration?.reference;
  return [source, point.tau, 2*point.tau, value?.signal ?? "", ref?.hz ?? "", value?.window.startMs ?? "", value?.window.endMs ?? ""].join(",");
}).join("\n") + "\n", "csv", "text/csv;charset=utf-8");
element("record-json").onclick = () => { if (selected) saveMeasurement(selected.record); };
element("png").onclick = async () => {
  const svg = element("curve").querySelector("svg");
  if (!svg) return;
  try { await saveGraphPng(svg, { filename: `nmrlink-${source}-t2-${formatFileTimestamp(startedAt)}.png` }); }
  catch (error) { message(`PNGを保存できませんでした：${error.message}`, true); }
};

setupNavigation({
  canNavigate: () => !loading && !running && !state.busy && state.connection === "disconnected",
  onBlocked: () => message("画面を移る前に、走査を終了して装置を切断してください。", true),
});

// Validate and analyze in local variables; a bad file leaves existing results intact.
element("open-json").onclick = () => element("json-file").click();
element("json-file").onchange = async event => {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file || running || loading || state.busy) return;
  loading = true;
  updateControls();
  try {
    if (file.size > MAX_T2_JSON_BYTES) throw new Error("32 MiB以下のファイルを指定してください。");
    const restored = parseT2Measurement(await file.text());
    settings = restored.settings;
    points = restored.points;
    calibration = restored.result;
    referenceIndex = restored.referenceIndex;
    source = restored.source;
    startedAt = restored.acquiredAt;
    const fields = element("sweep-form").elements;
    const values = { ...settings, ...settings.parameters, window: settings.analysis.window,
      fftStartMs: settings.analysis.startMs, fftEndMs: settings.analysis.endMs,
      p90Cycles: settings.parameters.pulse1Cycles, p180Cycles: settings.parameters.pulse2Cycles,
      minKHz: settings.analysis.minHz / 1000, maxKHz: settings.analysis.maxHz / 1000 };
    for (const [key, value] of Object.entries(values)) {
      if (fields.namedItem(key)) fields.namedItem(key).value = value;
    }
    element("fit-from").value = restored.fromMs;
    element("fit-to").value = restored.toMs;
    element("source").textContent = source === "demo" ? "保存データ · DEMO" : "保存データ · 実機走査";
    element("source").classList.toggle("demo", source === "demo");
    reanalyze();
    selectPoint(maximum());
    message(`保存データを読み込みました：${points.length}点。装置への命令は送っていません。`);
  } catch (error) { message(`読み込めませんでした：${error.message}。現在の記録は保持しています。`, true); }
  finally { loading = false; updateControls(); plan(); }
};
