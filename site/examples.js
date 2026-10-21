// Source for both rendered examples and their copyable HTML documents.
const recordCode = `// 表示確認用の模擬FID。実機の測定結果ではありません。
const record = {
  source: "demo", acquiredAt: new Date().toISOString(),
  mode: "single", parameters: null, points: 2048, sampleIntervalMs: 0.02,
  raw: Array.from({ length: 2048 }, (_, index) => {
    const time = index * 0.00002;
    const amplitude = 1000 * Math.exp(-time / 0.003);
    const angle = 2 * Math.PI * 2500 * time;
    return [Math.round(amplitude * Math.cos(angle)), Math.round(amplitude * Math.sin(angle))];
  }),
};`;

const mockDeviceCode = `// プレビュー専用の模擬装置。USB接続や実測定は行いません。
const device = {
  state: "disconnected",
  async connect() { this.state = "connected"; },
  async disconnect() { this.state = "disconnected"; },
  async measure(parameters, { mode }) {
    this.state = "measuring";
    await new Promise(resolve => setTimeout(resolve, 800));
    this.state = "connected";
    return { ...record, parameters, mode };
  },
};`;

const controls = `<button id="connect">接続</button>
<button id="measure" disabled>測定</button>
<button id="disconnect" disabled>切断</button>
<p id="status" role="status">未接続</p>`;
const parameters = `const parameters = {
  frequencyHz: 402000,
  pulse1Cycles: 21, phase1Degrees: 0,
  pulse2Cycles: 42, phase2Degrees: 90,
  pulseIntervalMs: 5, measurementIntervalMs: 200, scans: 128,
};`;

export const exampleTitles = {
  echograph: "T2減衰曲線を描く",
  frequencygraph: "周波数応答を描く", pulsegraph: "パルス応答を描く", relaxationgraph: "T1回復曲線を描く",
  first: "最初の測定", connection: "接続と切断", measurement: "測定する", state: "状態とエラー",
  fid: "FIDを表示する", fft: "FFTを表示する", range: "解析範囲を変える", colors: "線の色を変える", save: "データを保存する",
};

/** All imports are relative so project Pages and copied local examples both work. */
export function exampleDocument(kind, { preview = false, moduleRoot = "./packages/nmrlink/src" } = {}) {
  const operationExample = ["first", "connection", "measurement", "state"].includes(kind);
  const imports = [];
  if (operationExample) imports.push(`import { NMRController${kind === "first" ? ", analyzeMeasurement" : ""} } from "${moduleRoot}/index.js";`);
  else if (kind !== "save") imports.push(`import { analyzeMeasurement } from "${moduleRoot}/index.js";`);
  if (kind === "first" || (!operationExample && kind !== "save")) imports.push(`import { NMRGraphs } from "${moduleRoot}/graphs.js";`);
  if (kind === "save") imports.push(`import { saveMeasurement } from "${moduleRoot}/browser.js";`);
  let body;
  let script;
  const graphExample = ["frequencygraph", "pulsegraph", "relaxationgraph", "echograph"].includes(kind);
  if (graphExample) {
    imports.length = 0;
    const functionName = {frequencygraph:"createFrequencyPlot", pulsegraph:"createPulsePlot", relaxationgraph:"createT1Plot", echograph:"createT2Plot"}[kind];
    imports.push(`import { ${functionName} } from "${moduleRoot}/graphs.js";`);
    body = '<div id="curve"></div>\n<p id="estimate"></p>';
    if (kind === "frequencygraph") {
      script = `// 表示用の模擬評価点。実測ではevaluateFrequency()や走査結果のpointsを使います。
const points = Array.from({ length: 9 }, (_, index) => {
  const frequencyHz = 398000 + index * 1000;
  return { frequencyHz, amplitude: 1000 * Math.exp(-(((frequencyHz - 402000) / 1800) ** 2)) };
});`;
    } else if (kind === "pulsegraph") {
      imports.push(`import { fitPulseCalibration } from "${moduleRoot}/index.js";`);
      script = `// 表示用の模擬評価点。実測ではanalyzePulseCalibration().pointsを使います。
const points = Array.from({ length: 16 }, (_, index) => {
  const length = (index + 1) * 5;
  const amplitude = 1000 * Math.sin(Math.PI * length / (2 * 21));
  return { length, amplitude, magnitude: Math.abs(amplitude) };
});
const fit = fitPulseCalibration(points);
document.querySelector("#estimate").textContent =
  "90°候補：" + fit.p90.toFixed(2) + "周期 / 180°候補：" + fit.p180.toFixed(2) + "周期";`;
    } else if (kind === "relaxationgraph") {
      imports.push(`import { fitT1 } from "${moduleRoot}/index.js";`);
      script = `// 表示用の模擬評価点。実測ではanalyzeT1().pointsを使います。
const points = Array.from({ length: 20 }, (_, index) => {
  const tau = (index + 1) * 5;
  return { tau, signal: 1000 * (1 - 2 * Math.exp(-tau / 20)) };
});
const fit = fitT1(points, { fromMs: 5, toMs: 100 });
document.querySelector("#estimate").textContent = "T1：" + fit.T.toFixed(2) + " ms";`;
    } else {
      imports.push(`import { fitT2 } from "${moduleRoot}/index.js";`);
      script = `// 表示用の模擬評価点。実測ではanalyzeT2().pointsを使います。
const points = Array.from({ length: 16 }, (_, index) => {
  const tau = 5 + index * 2;
  return { tau, signal: 1000 * Math.exp(-2 * tau / 22) };
});
const fit = fitT2(points, { fromMs: 10, toMs: 70 });
document.querySelector("#estimate").textContent = "T2：" + fit.T.toFixed(2) + " ms";`;
    }
    script += `
const container = document.querySelector("#curve");
function draw() {
  const width = Math.max(160, Math.floor(container.clientWidth));
  container.innerHTML = ${functionName}(points, { width${["frequencygraph", "echograph"].includes(kind) ? (kind === "echograph" ? ", fit" : "") : ', fit, mode: "signed"'} });
}
new ResizeObserver(draw).observe(container);
draw();`;
  } else if (operationExample) {
    body = controls + (kind === "first" ? '\n<div id="fid"></div>\n<div id="fft"></div>' : "");
    script = `${preview ? recordCode + "\n" + mockDeviceCode + "\n" : ""}${parameters}
const controller = new NMRController(${preview ? "{ device }" : ""});
const connect = document.querySelector("#connect");
const measure = document.querySelector("#measure");
const disconnect = document.querySelector("#disconnect");
const status = document.querySelector("#status");
controller.onStateChange(state => {
  connect.disabled = !state.canConnect;
  measure.disabled = !state.canMeasure;
  disconnect.disabled = !state.canDisconnect;
  if (state.busy) status.textContent = "処理中…";
});
controller.onError(error => { status.textContent = error.message; });
controller.onResult(record => {
  status.textContent = "測定完了：" + record.points + "点 × 2チャンネル";
  ${kind === "first" ? 'try { graphs.show(record, analyzeMeasurement(record)); }\n  catch (error) { graphs.clear(); status.textContent = `解析エラー：${error.message}`; }' : ""}
});
${kind === "first" ? 'const graphs = new NMRGraphs({ fid: document.querySelector("#fid"), fft: document.querySelector("#fft") });' : ""}
connect.onclick = async () => {
  if ((await controller.connect()).ok) status.textContent = "接続しました";
};
measure.onclick = () => controller.measure(parameters, { mode: "single" });
disconnect.onclick = async () => {
  if ((await controller.disconnect()).ok) status.textContent = "切断しました";
};`;
    if (kind === "connection") body = body.replace('<button id="measure" disabled>測定</button>', '<button id="measure" hidden disabled>測定</button>');
    if (kind === "state") {
      body += '\n<button id="invalid">不正な条件のエラーを試す</button>';
      script += `\ndocument.querySelector("#invalid").onclick = () => {
  try {
    // 接続せずに検証可能。装置へ送信しません。
    validateParameters({ ...parameters, scans: 0 });
  } catch (error) { status.textContent = error.message; }
};`;
    }
  } else {
    body = '<div id="fid"></div>\n<div id="fft"></div>\n<p id="peak"></p>';
    const colors = kind === "colors" ? ',\n  colors: { data1: "#7c3aed", data2: "#db2777", fft: "#059669" }' : "";
    script = `${recordCode}
const graphs = new NMRGraphs({
  fid: document.querySelector("#fid"), fft: document.querySelector("#fft"),
  peak: document.querySelector("#peak")${colors},
});
const analysis = analyzeMeasurement(record, { startMs: 1, endMs: 5 });
graphs.show(record, analysis);`;
    if (kind === "fid") body = body.replace('<div id="fft"></div>', '<div id="fft" hidden></div>').replace('<p id="peak"></p>', '<p id="peak" hidden></p>');
    if (kind === "fft") body = body.replace('<div id="fid"></div>', '<div id="fid" hidden></div>');
    if (kind === "range") {
      body = '<button id="short">1〜3 ms</button>\n<button id="long">1〜5 ms</button>\n<p id="range" role="status">FFT解析範囲：1〜5 ms</p>\n' + body;
      script += `
function updateRange(endMs) {
  const analysis = analyzeMeasurement(record, { startMs: 1, endMs });
  graphs.show(record, analysis);
  document.querySelector("#range").textContent = "FFT解析範囲：1〜" + endMs + " ms";
}
document.querySelector("#short").onclick = () => updateRange(3);
document.querySelector("#long").onclick = () => updateRange(5);`;
    }
    if (kind === "save") {
      body = '<p>補正前の2048点とメタデータをJSONで保存します。</p>\n<button id="save">模擬FIDのJSONを保存</button>';
      script = recordCode + '\ndocument.querySelector("#save").onclick = () => saveMeasurement(record);';
    }
  }
  const note = operationExample
    ? preview ? "操作例は模擬装置です。USB接続・実測定は行いません。" : "実機用の例です。対応ブラウザで接続し、測定条件を確認してください。"
    : "模擬データの表示例です。実機なしで動作します。";
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${exampleTitles[kind]} | NMRLink</title>
  <style>
    body { font: 14px/1.7 system-ui, sans-serif; margin: 16px; color: #263334; }
    button { font: inherit; padding: 6px 14px; margin: 0 6px 8px 0; border: 1px solid #cbd5d1; border-radius: 6px; background: #fff; cursor: pointer; }
    button:disabled { opacity: .45; cursor: default; }
    button:focus-visible { outline: 3px solid #147c68; }
    #fid, #fft { min-width: 0; }
    [hidden] { display: none !important; }
    #peak, .note { font-size: 12px; color: #52635c; }
  </style>
</head>
<body>
<p class="note">${note}</p>
${body}
<script type="module">
${imports.join("\n")}
${kind === "state" ? `import { validateParameters } from "${moduleRoot}/index.js";\n` : ""}${script}
${preview ? `new ResizeObserver(() => {
  parent.postMessage({ type: "nmrlink-example-height", height: document.body.getBoundingClientRect().height + 32 }, location.origin);
}).observe(document.body);` : ""}
</script>
</body>
</html>
`;
}
