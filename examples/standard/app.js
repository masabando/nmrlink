import { uiError } from "../shared/diagnostics.js";
import { timeSummary } from "./timing.js";
import { setupNavigation } from "./navigation.js";
import { NMRController } from "./vendor/nmrlink-0.1.4/src/index.js";
import { NMRGraphs } from "./vendor/nmrlink-0.1.4/src/graphs.js";
import { saveMeasurement, saveGraphPng, readMeasurement, formatFileTimestamp } from "./vendor/nmrlink-0.1.4/src/browser.js";
import { prepareAnalysis, createDemoRecord, fidCsv, fftCsv } from "./model.js";

const element = id => document.getElementById(id);
const controller = new NMRController();
let record = null;
let analysis = null;
let graphs = null;
let loading = false;
let latestState;

function message(text, error = false) {
  element("message").textContent = text;
  element("message").classList.toggle("error", error);
}

function updateExports() {
  element("json").disabled = !record;
  for (const id of ["fid-csv", "fft-csv", "fid-svg", "fft-svg", "fid-png", "fft-png"]) element(id).disabled = !analysis;
}

function updateControls(state = latestState) {
  latestState = state;
  element("connect").disabled = loading || !state.canConnect || !("serial" in navigator);
  element("disconnect").disabled = loading || !state.canDisconnect;
  element("measure").disabled = loading || !state.canMeasure;
  element("settings").disabled = state.busy || loading;
  element("demo").disabled = state.busy || loading;
  element("open-json").disabled = state.busy || loading;
  element("connection").classList.toggle("connected", state.connection === "connected");
  element("connection").textContent = {
    disconnected: "未接続", connecting: "接続中", connected: "接続済み", measuring: "測定中",
  }[state.connection] ?? state.connection;
  if (state.operation === "measure") message("設定を送信して測定しています。完了まで待ってください。");
  else if (state.operation === "connect") message("接続するシリアルポートを選択してください。");
}
controller.onStateChange(updateControls);
controller.onError(error => message(uiError(error), true));
controller.onResult(value => {
  showRecord(value);
  message("測定が完了しました。必要なデータを保存してください。");
});

element("support").textContent = "serial" in navigator
  ? "接続後、装置・試料に合わせて条件を確認してください。"
  : "実機への接続にはWeb Serial対応ブラウザとHTTPSまたはlocalhostが必要です。模擬FIDはこのまま表示できます。";

element("connect").onclick = async () => {
  if ((await controller.connect()).ok) message("接続しました。測定条件を確認してください。");
};
element("disconnect").onclick = async () => {
  if ((await controller.disconnect()).ok) message("切断しました。取得済みの結果はこの画面に保持しています。");
};
element("measurement").onsubmit = event => {
  event.preventDefault();
  const fields = new FormData(event.currentTarget);
  const mode = fields.get("mode");
  fields.delete("mode");
  const parameters = Object.fromEntries([...fields].map(([name, value]) => [name, Number(value)]));
  controller.measure(parameters, { mode });
};
element("demo").onclick = () => {
  showRecord(createDemoRecord());
  message("模擬FIDを表示しています。実機の測定結果ではありません。装置へ命令は送っていません。");
};

function showRecord(value, fromFile = false) {
  record = value;
  element("source").textContent = (fromFile ? "ファイル · " : "") + (record.source === "demo" ? "模擬データ · DEMO" : "実機測定");
  element("source").classList.toggle("demo", record.source === "demo");
  element("record-info").textContent = `${new Date(record.acquiredAt).toLocaleString()} · ${record.mode === "double" ? "Double" : "Single"} · ${record.points}点 × 2チャンネル · ${record.sampleIntervalMs} ms間隔`;
  const p = record.parameters;
  element("record-parameters").textContent = p
    ? `測定時の条件：${p.frequencyHz} Hz · 第1パルス ${p.pulse1Cycles}周期 / ${p.phase1Degrees}° · 第2パルス ${p.pulse2Cycles}周期 / ${p.phase2Degrees}° · パルス間隔 ${p.pulseIntervalMs} ms · 繰り返し間隔 ${p.measurementIntervalMs} ms · 積算 ${p.scans}回`
    : "測定条件：なし（表示用の模擬データ）";
  renderAnalysis();
}

function renderAnalysis() {
  if (!record) return;
  try {
    const settings = Object.fromEntries(new FormData(element("analysis-form")));
    const prepared = prepareAnalysis(record, settings);
    // Clear old observers before replacing the view; raw data stays in record.
    graphs?.dispose();
    for (const id of ["fid-graph", "fft-graph"]) element(id).classList.remove("empty");
    graphs = new NMRGraphs({
      fid: element("fid-graph"), fft: element("fft-graph"), peak: element("fft-peak"), status: element("graph-status"),
      displayEndMs: prepared.displayEndMs, frequencyLimitHz: prepared.frequencyLimitHz,
    });
    graphs.show(record, prepared.analysis);
    analysis = prepared.analysis;
    const spectrum = analysis.spectrum;
    element("analysis-status").textContent = `${spectrum.count}点 · FFT ${spectrum.size}点 · 分解能の目安 ${spectrum.resolutionHz.toFixed(1)} Hz · ビン間隔 ${spectrum.spacingHz.toFixed(1)} Hz`;
  } catch (error) {
    analysis = null;
    graphs?.clear();
    element("analysis-status").textContent = `解析できませんでした：${uiError(error)} 生データJSONは保存できます。`;
  }
  updateExports();
}

element("analysis-form").onsubmit = event => {
  event.preventDefault();
  if (!record) { element("analysis-status").textContent = "先に測定するか、模擬FIDを表示してください。"; return; }
  renderAnalysis();
};

function saveFile(body, extension, type) {
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `nmrlink-${record.source}-${formatFileTimestamp(record.acquiredAt)}.${extension}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

element("json").onclick = () => { if (record) saveMeasurement(record); };
element("fid-csv").onclick = () => { if (analysis) saveFile(fidCsv(record, analysis), "fid.csv", "text/csv;charset=utf-8"); };
element("fft-csv").onclick = () => { if (analysis) saveFile(fftCsv(record, analysis), "fft.csv", "text/csv;charset=utf-8"); };
for (const [button, graph, extension] of [["fid-svg", "fid-graph", "fid.svg"], ["fft-svg", "fft-graph", "fft.svg"]]) {
  element(button).onclick = () => {
    const svg = element(graph).querySelector("svg");
    if (analysis && svg) saveFile(new XMLSerializer().serializeToString(svg), extension, "image/svg+xml;charset=utf-8");
  };
}

for (const kind of ["fid", "fft"]) {
  element(`${kind}-png`).onclick = async () => {
    const svg = element(`${kind}-graph`).querySelector("svg");
    if (!analysis || !svg) return;
    const button = element(`${kind}-png`);
    button.disabled = true;
    try {
      await saveGraphPng(svg, {
        filename: `nmrlink-${record.source}-${formatFileTimestamp(record.acquiredAt)}.${kind}.png`,
      });
    } catch (error) {
      message(`PNGを保存できませんでした：${uiError(error)}`, true);
    } finally {
      button.disabled = !analysis;
    }
  };
}

// Loading a record changes the result view only, never the measurement form or device.
element("open-json").onclick = () => element("json-file").click();
element("json-file").onchange = async event => {
  const file = event.target.files[0];
  if (!file) return;
  if (latestState.busy || loading) { event.target.value = ""; return; }
  loading = true;
  updateControls();
  try {
    const loaded = await readMeasurement(file);
    showRecord(loaded, true);
    message(`JSONを読み込みました：${file.name}。装置への命令は送っていません。`);
  } catch (error) {
    message(`読み込めませんでした：${uiError(error)} 現在の結果は保持しています。`, true);
  } finally {
    loading = false;
    event.target.value = ""; // Allow choosing the same file again after editing it.
    updateControls();
  }
};

setupNavigation({
  canNavigate: () => !loading && !controller.state.busy && controller.state.connection === "disconnected",
  onBlocked: () => message("画面を移る前に、操作を終えて装置を切断してください。", true),
});

function updateTimeEstimate() {
  try {
    const fields = element("measurement").elements;
    const mode = fields.namedItem("mode").value;
    const names = ["frequencyHz", "pulse1Cycles", "pulse2Cycles", "phase1Degrees", "phase2Degrees", "pulseIntervalMs", "measurementIntervalMs", "scans"];
    const parameters = Object.fromEntries(names.map(name => [name, Number(fields.namedItem(name).value)]));
    element("time-estimate").textContent = timeSummary([parameters], mode);
  } catch { element("time-estimate").textContent = "見込み時間：測定条件を確認してください。"; }
}
element("measurement").addEventListener("input", updateTimeEstimate);
element("measurement").addEventListener("change", updateTimeEstimate);
updateTimeEstimate();
