import { timeSummary } from "./timing.js";
import { setupNavigation } from "./navigation.js";
import { NMRController, parseFrequencySweep, MAX_FREQUENCY_JSON_BYTES, frequencySteps, evaluateFrequency, analyzeMeasurement, runFrequencySweep, validateParameters } from "../../packages/nmrlink/src/index.js";
import { NMRGraphs, createFrequencyPlot } from "../../packages/nmrlink/src/graphs.js";
import { saveMeasurement, saveGraphPng, formatFileTimestamp } from "../../packages/nmrlink/src/browser.js";
import { createDemoRecord } from "./model.js";

const element = id => document.getElementById(id);
const controller = new NMRController();
const graphs = new NMRGraphs({ fid: element("fid-graph"), fft: element("fft-graph"), status: element("graph-status") });
let points = [];
let selected = null;
let settings = null;
let abort = null;
let running = false;
let loading = false;
let state;
let source = "instrument";
let startedAt = null;

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
  const scan = { startHz: Number(f.startHz), endHz: Number(f.endHz), stepHz: Number(f.stepHz) };
  const frequencies = frequencySteps(scan.startHz, scan.endHz, scan.stepHz);
  const parameters = validateParameters({
    frequencyHz: scan.startHz, pulse1Cycles: Number(f.pulse1Cycles), phase1Degrees: Number(f.phase1Degrees),
    pulse2Cycles: 42, phase2Degrees: 90, pulseIntervalMs: 5,
    measurementIntervalMs: Number(f.measurementIntervalMs), scans: Number(f.scans),
  });
  const analysis = { startMs: Number(f.startMs), endMs: Number(f.endMs), window: f.window, tailPoints: 100, minHz: Number(f.minKHz) * 1000, maxHz: Number(f.maxKHz) * 1000 };
  // Fail before clearing old results or starting a measurement.
  evaluateFrequency({ ...createDemoRecord(), parameters }, analysis);
  return { ...scan, frequencies, parameters, analysis };
}
function plan() {
  try {
    const p = formSettings();
    element("time-estimate").textContent = timeSummary(p.frequencies.map(value => ({ ...p.parameters, frequencyHz: value })), "single");
    element("plan").textContent = `${p.frequencies.length}点 · 最終点 ${p.frequencies.at(-1)} Hz · 各点 ${p.parameters.scans}回積算`;
  } catch (error) { element("plan").textContent = error.message; element("time-estimate").textContent = "見込み時間：測定条件を確認してください。"; }
}
element("sweep-form").oninput = plan;
element("sweep-form").onchange = plan;
plan();

function drawCurve() {
  if (!points.length) { element("curve").textContent = "走査すると結果を表示します。"; return; }
  element("curve").classList.remove("empty");
  element("curve").innerHTML = createFrequencyPlot(points, { width: Math.max(160, Math.floor(element("curve").clientWidth)) });
}
new ResizeObserver(drawCurve).observe(element("curve"));
function maximum() { return points.reduce((best, point) => !best || point.amplitude > best.amplitude ? point : best, null); }
function refresh() {
  drawCurve();
  const best = maximum();
  element("best").textContent = best ? `最大振幅の候補：${best.frequencyHz} Hz · ${best.amplitude.toPrecision(5)} a.u.${best.amplitude === 0 ? "（振幅ゼロのため判定できません）" : ""}${best.frequencyHz === settings.frequencies[0] || best.frequencyHz === settings.frequencies.at(-1) ? "（範囲の端です。範囲を広げて確認してください）" : ""}` : "最大振幅の候補：未測定";
  element("adopt").disabled = !best || best.amplitude <= 0;
  for (const id of ["json", "csv", "png"]) element(id).disabled = !points.length;
  element("points").replaceChildren();
  for (const point of points) {
    const row = document.createElement("tr");
    row.classList.toggle("selected", point === selected);
    const frequency = document.createElement("td");
    const button = document.createElement("button");
    button.textContent = String(point.frequencyHz);
    button.onclick = () => selectPoint(point);
    frequency.append(button);
    row.append(frequency);
    for (const value of [point.amplitude.toPrecision(5), point.peakHz.toFixed(1)]) {
      const cell = document.createElement("td"); cell.textContent = value; row.append(cell);
    }
    element("points").append(row);
  }
}
function selectPoint(point) {
  selected = point;
  graphs.show(point.record, analyzeMeasurement(point.record, settings.analysis));
  element("selected").textContent = `${point.frequencyHz} Hz のFID・FFT`;
  element("record-json").disabled = false;
  refresh();
}

async function start(demo) {
  if (running || loading || state.busy) return;
  let prepared;
  try { prepared = formSettings(); }
  catch (error) { message(error.message, true); return; }
  if (!demo && !state.canMeasure) { message("先に装置へ接続してください。", true); return; }
  settings = prepared;
  points = [];
  selected = null;
  graphs.clear();
  element("record-json").disabled = true;
  element("chosen").value = "";
  element("selected").textContent = "選択点のFID・FFT";
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
    selectPoint(point);
    message(`${demo ? "模擬走査" : "走査"}：${completed} / ${total}点完了 · ${point.frequencyHz} Hz`);
  };
  try {
    let result;
    const options = { ...settings, signal: abort.signal, onPoint };
    if (demo) result = await runFrequencySweep(demoDevice(settings), settings.parameters, options);
    else {
      const response = await controller.sweep(settings.parameters, options);
      if (!response.ok) throw response.error;
      result = response.value;
    }
    if (points.length) selectPoint(maximum());
    message(`${demo ? "模擬走査" : "走査"}${result.stopped ? "を停止しました" : "が完了しました"}：${points.length}点。必要なデータを保存してください。`);
  } catch (error) { message(`走査を中断しました：${error.message}。取得済みの${points.length}点は保持しています。自動再送は行いません。`, true); }
  finally { running = false; updateControls(); }
}
element("sweep-form").onsubmit = event => { event.preventDefault(); start(false); };
element("demo").onclick = () => start(true);
element("stop").onclick = () => { abort?.abort(); updateControls(); message("停止を要求しました。現在の測定完了を待っています。"); };
element("adopt").onclick = () => { const best = maximum(); if (best) element("chosen").value = best.frequencyHz; };

// A synthetic response envelope, not a simulation of calibrated hardware physics.
function demoDevice(plan) {
  const center = (plan.startHz + plan.endHz) / 2 + plan.stepHz * 0.23;
  return { async measure(parameters) {
    await new Promise(resolve => setTimeout(resolve, 150));
    const record = createDemoRecord();
    const amplitude = 1200 * Math.exp(-(((parameters.frequencyHz - center) / Math.max(plan.stepHz * 4, 1)) ** 2));
    const offsetHz = center - parameters.frequencyHz;
    record.parameters = { ...parameters };
    record.raw = record.raw.map((_, index) => {
      const t = index * 0.00002;
      const envelope = amplitude * Math.exp(-t / 0.003);
      return [Math.round(70 + envelope * Math.cos(2 * Math.PI * offsetHz * t)), Math.round(-20 + envelope * Math.sin(2 * Math.PI * offsetHz * t))];
    });
    return record;
  } };
}
function saveFile(text, extension, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a"); link.href = url;
  link.download = `nmrlink-${source}-sweep-${formatFileTimestamp(startedAt)}.${extension}`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
element("json").onclick = () => saveFile(JSON.stringify({ kind: "frequency-sweep", source, acquiredAt: startedAt, settings, points }, null, 2), "json", "application/json");
element("csv").onclick = () => saveFile("source,frequency_hz,peak_amplitude,peak_hz\n" + points.map(point => [source, point.frequencyHz, point.amplitude, point.peakHz].join(",")).join("\n") + "\n", "csv", "text/csv;charset=utf-8");
element("record-json").onclick = () => { if (selected) saveMeasurement(selected.record); };
element("png").onclick = async () => {
  const svg = element("curve").querySelector("svg");
  if (!svg) return;
  try { await saveGraphPng(svg, { filename: `nmrlink-${source}-sweep-${formatFileTimestamp(startedAt)}.png` }); }
  catch (error) { message(`PNGを保存できませんでした：${error.message}`, true); }
};

setupNavigation({
  canNavigate: () => !loading && !running && !state.busy && state.connection === "disconnected",
  onBlocked: () => message("画面を移る前に、走査を終了して装置を切断してください。", true),
});

// Commit only after validation and all point analyses have succeeded.
element("open-json").onclick = () => element("json-file").click();
element("json-file").onchange = async event => {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file || running || loading || state.busy) return;
  loading = true;
  updateControls();
  try {
    if (file.size > MAX_FREQUENCY_JSON_BYTES) throw new Error("32 MiB以下のファイルを指定してください。");
    const restored = parseFrequencySweep(await file.text());
    settings = restored.settings;
    points = restored.points;
    source = restored.source;
    startedAt = restored.acquiredAt;
    const fields = element("sweep-form").elements;
    const values = { ...settings, ...settings.parameters, ...settings.analysis,
      minKHz: settings.analysis.minHz / 1000, maxKHz: settings.analysis.maxHz / 1000 };
    for (const [key, value] of Object.entries(values)) {
      if (fields.namedItem(key)) fields.namedItem(key).value = value;
    }
    element("chosen").value = "";
    element("source").textContent = source === "demo" ? "保存データ · DEMO" : "保存データ · 実機走査";
    element("source").classList.toggle("demo", source === "demo");
    selectPoint(maximum());
    message(`保存データを読み込みました：${points.length}点。装置への命令は送っていません。`);
  } catch (error) { message(`読み込めませんでした：${error.message}。現在の記録は保持しています。`, true); }
  finally { loading = false; updateControls(); plan(); }
};
