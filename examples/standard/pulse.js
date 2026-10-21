import { timeSummary } from "./timing.js";
import { setupNavigation } from "./navigation.js";
import { NMRController, parsePulseCalibration, MAX_PULSE_JSON_BYTES, pulseSteps, evaluatePulse, analyzeMeasurement, runPulseSweep, analyzePulseCalibration, validateParameters } from "../../packages/nmrlink/src/index.js";
import { NMRGraphs, createPulsePlot } from "../../packages/nmrlink/src/graphs.js";
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
let calibration = null;
let referenceIndex = null;
let phaseDegrees = 0;

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
  for (const id of ["auto-reference", "set-reference", "apply-phase"]) element(id).disabled = busy || !points.length;
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
  const scan = { startCycles: Number(f.startCycles), endCycles: Number(f.endCycles), stepCycles: Number(f.stepCycles) };
  const lengths = pulseSteps(scan.startCycles, scan.endCycles, scan.stepCycles);
  const parameters = validateParameters({
    frequencyHz: Number(f.frequencyHz), pulse1Cycles: scan.startCycles, phase1Degrees: Number(f.phase1Degrees),
    pulse2Cycles: 42, phase2Degrees: 90, pulseIntervalMs: 5,
    measurementIntervalMs: Number(f.measurementIntervalMs), scans: Number(f.scans),
  });
  const analysis = { startMs: Number(f.startMs), endMs: Number(f.endMs), window: f.window, tailPoints: 100, minHz: Number(f.minKHz) * 1000, maxHz: Number(f.maxKHz) * 1000 };
  // Fail before clearing old results or starting a measurement.
  evaluatePulse({ ...createDemoRecord(), parameters }, analysis);
  return { ...scan, lengths, parameters, analysis };
}
function plan() {
  try {
    const p = formSettings();
    element("time-estimate").textContent = timeSummary(p.lengths.map(value => ({ ...p.parameters, pulse1Cycles: value })), "single");
    element("plan").textContent = `${p.lengths.length}点 · 最終点 ${p.lengths.at(-1)}周期 · 各点 ${p.parameters.scans}回積算`;
  } catch (error) { element("plan").textContent = error.message; element("time-estimate").textContent = "見込み時間：測定条件を確認してください。"; }
}
element("sweep-form").oninput = plan;
element("sweep-form").onchange = plan;
plan();

function drawCurve() {
  if (!points.length) { element("curve").textContent = "走査すると結果を表示します。"; return; }
  element("curve").classList.remove("empty");
  const mode = element("signal-view").value;
  const values = calibration?.points ?? points.map(point => ({ length: point.length, amplitude: 0, magnitude: point.amplitude }));
  element("curve").innerHTML = createPulsePlot(values, { width: Math.max(160, Math.floor(element("curve").clientWidth)), fit: mode === "magnitude" ? calibration?.magnitudeFit : calibration?.fit, mode });
  element("curve-legend").textContent = mode === "magnitude" ? "● 信号の絶対値　— |sin|近似" : "● 符号付き信号　— サイン近似（有効な場合）";
}
element("signal-view").onchange = refresh;
new ResizeObserver(drawCurve).observe(element("curve"));
function maximum() { return points.reduce((best, point) => !best || point.amplitude > best.amplitude ? point : best, null); }
function reanalyze() {
  element("chosen90").value = "";
  element("chosen180").value = "";
  try {
    calibration = analyzePulseCalibration(points.map(point => point.record), { analysis: settings.analysis, referenceIndex, phaseDegrees });
    const ref = calibration.reference;
    element("reference").textContent = `${referenceIndex === null ? "自動基準" : "選択点の基準"} · ${ref.hz.toFixed(1)} Hz · 共通方向の一致度 ${ref.coherence.toFixed(3)} · 追加補正 ${phaseDegrees}°`;
  } catch (error) {
    calibration = null;
    element("reference").textContent = `基準を求められません：${error.message}`;
  }
}
function refresh() {
  drawCurve();
  const measured = calibration?.measured, fit = element("signal-view").value === "magnitude" ? calibration?.magnitudeFit : calibration?.fit;
  element("best").textContent = measured ? `実測の候補：90° ${measured.p90}周期 · 180° ${measured.p180.toFixed(2)}周期（ゼロ交差の補間）` : "実測候補は未確定です。短いパルスから180°の先まで測定してください。";
  element("fit").textContent = fit ? `サイン近似：90° ${fit.p90.toFixed(2)}周期 · 180° ${fit.p180.toFixed(2)}周期 · R² ${fit.r2.toFixed(4)}` : (calibration?.warnings.join(" ") || "近似候補は未確定です。");
  if (fit && calibration.warnings.length) element("fit").textContent += ` · ${calibration.warnings.join(" ")}`;
  element("adopt").disabled = running || !fit;
  for (const id of ["json", "csv", "png"]) element(id).disabled = !points.length;
  element("points").replaceChildren();
  for (const [index, point] of points.entries()) {
    const row = document.createElement("tr");
    row.classList.toggle("selected", point === selected);
    const lengthCell = document.createElement("td");
    const button = document.createElement("button");
    button.textContent = String(point.length);
    button.onclick = () => selectPoint(point);
    lengthCell.append(button);
    row.append(lengthCell);
    for (const value of [calibration?.points[index]?.amplitude, calibration?.points[index]?.magnitude, calibration?.points[index]?.quadrature].map(value => value === undefined ? "—" : value.toPrecision(5))) {
      const cell = document.createElement("td"); cell.textContent = value; row.append(cell);
    }
    element("points").append(row);
  }
}
function selectPoint(point) {
  selected = point;
  graphs.show(point.record, analyzeMeasurement(point.record, settings.analysis));
  element("selected").textContent = `${point.length}周期 のFID・FFT`;
  element("record-json").disabled = false;
  refresh();
}

async function start(demo) {
  if (running || loading || state.busy) return;
  let prepared;
  try { prepared = formSettings(); }
  catch (error) { message(error.message, true); return; }
  if (!demo && !state.canMeasure) { message("先に装置へ接続してください。", true); return; }
  const correction = Number(element("phase-degrees").value);
  if (!Number.isFinite(correction)) { message("位相補正の値が不正です。", true); return; }
  settings = prepared;
  points = [];
  calibration = null;
  referenceIndex = null;
  phaseDegrees = correction;
  element("reference").textContent = "取得点から共通位相基準を解析します。";
  selected = null;
  graphs.clear();
  element("record-json").disabled = true;
  element("chosen90").value = "";
  element("chosen180").value = "";
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
    reanalyze();
    selectPoint(point);
    message(`${demo ? "模擬走査" : "走査"}：${completed} / ${total}点完了 · ${point.length}周期`);
  };
  try {
    let result;
    const options = { ...settings, signal: abort.signal, onPoint };
    if (demo) result = await runPulseSweep(demoDevice(settings), settings.parameters, options);
    else {
      const response = await controller.pulseSweep(settings.parameters, options);
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
element("adopt").onclick = () => {
  const fit = element("signal-view").value === "magnitude" ? calibration?.magnitudeFit : calibration?.fit;
  if (!fit) return;
  element("chosen90").value = Math.round(fit.p90);
  element("chosen180").value = Math.round(fit.p180);
};
element("phase-form").onsubmit = event => {
  event.preventDefault();
  phaseDegrees = Number(element("phase-degrees").value);
  if (points.length && !running) { reanalyze(); refresh(); }
};
element("auto-reference").onclick = () => { referenceIndex = null; reanalyze(); refresh(); };
element("set-reference").onclick = () => {
  if (selected && !running) { referenceIndex = points.indexOf(selected); reanalyze(); refresh(); }
};

// A synthetic response envelope, not a simulation of calibrated hardware physics.
function demoDevice(plan) {
  const p90 = 21;
  return { async measure(parameters) {
    await new Promise(resolve => setTimeout(resolve, 150));
    const record = createDemoRecord();
    const amplitude = 1200 * Math.sin(Math.PI * parameters.pulse1Cycles / (2 * p90));
    const offsetHz = 1200;
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
  link.download = `nmrlink-${source}-pulse-${formatFileTimestamp(startedAt)}.${extension}`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
element("json").onclick = () => saveFile(JSON.stringify({ kind: "pulse-calibration", source, acquiredAt: startedAt, settings, points, calibration: calibration && {
  reference: calibration.reference, fit: calibration.fit, magnitudeFit: calibration.magnitudeFit, warnings: calibration.warnings,
  measured: calibration.measured && { p90: calibration.measured.p90, p180: calibration.measured.p180, zeroBracket: calibration.measured.zeroBracket },
  signedPoints: calibration.points.map(({ record, ...point }) => point),
} }, null, 2), "json", "application/json");
element("csv").onclick = () => saveFile("source,pulse_cycles,signal,magnitude,quadrature,reference_hz,phase_rad\n" + points.map((point, index) => {
  const value = calibration?.points[index], ref = calibration?.reference;
  return [source, point.length, value?.amplitude ?? "", value?.magnitude ?? "", value?.quadrature ?? "", ref?.hz ?? "", ref?.phaseRad ?? ""].join(",");
}).join("\n") + "\n", "csv", "text/csv;charset=utf-8");
element("record-json").onclick = () => { if (selected) saveMeasurement(selected.record); };
element("png").onclick = async () => {
  const svg = element("curve").querySelector("svg");
  if (!svg) return;
  try { await saveGraphPng(svg, { filename: `nmrlink-${source}-pulse-${formatFileTimestamp(startedAt)}.png` }); }
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
    if (file.size > MAX_PULSE_JSON_BYTES) throw new Error("32 MiB以下のファイルを指定してください。");
    const restored = parsePulseCalibration(await file.text());
    settings = restored.settings;
    points = restored.points;
    calibration = restored.calibration;
    referenceIndex = restored.referenceIndex;
    phaseDegrees = restored.phaseDegrees;
    source = restored.source;
    startedAt = restored.acquiredAt;
    const fields = element("sweep-form").elements;
    const values = { ...settings, ...settings.parameters, ...settings.analysis,
      minKHz: settings.analysis.minHz / 1000, maxKHz: settings.analysis.maxHz / 1000 };
    for (const [key, value] of Object.entries(values)) {
      if (fields.namedItem(key)) fields.namedItem(key).value = value;
    }
    element("phase-degrees").value = phaseDegrees;
    element("signal-view").value = "magnitude";
    element("source").textContent = source === "demo" ? "保存データ · DEMO" : "保存データ · 実機走査";
    element("source").classList.toggle("demo", source === "demo");
    reanalyze();
    selectPoint(maximum());
    message(`保存データを読み込みました：${points.length}点。装置への命令は送っていません。`);
  } catch (error) { message(`読み込めませんでした：${error.message}。現在の記録は保持しています。`, true); }
  finally { loading = false; updateControls(); plan(); }
};
