import { NMRController, analyzeMeasurement } from "../../packages/nmrlink/src/index.js";
import { NMRGraphs } from "../../packages/nmrlink/src/graphs.js";
import { saveMeasurement } from "../../packages/nmrlink/src/browser.js";

const element = id => document.getElementById(id);
const controller = new NMRController();
const graphs = new NMRGraphs({
  fid: element("fid-graph"),
  fft: element("fft-graph"),
  peak: element("fft-peak"),
  status: element("graph-status"),
});

// State management and duplicate-operation prevention belong to the controller.
controller.onStateChange(state => {
  element("connect").disabled = !state.canConnect;
  element("disconnect").disabled = !state.canDisconnect;
  element("measure").disabled = !state.canMeasure;
  element("settings").disabled = state.busy;
  element("download").disabled = !state.hasResult;
  if (state.busy) element("status").textContent = {
    connect: "接続中…", disconnect: "切断中…", measure: "設定送信・測定中…",
  }[state.operation];
});
controller.onError(error => { element("status").textContent = error.message; });
controller.onResult(record => {
  element("status").textContent = `測定完了：${record.points}点 × 2チャンネル\n先頭5点：\n${JSON.stringify(record.raw.slice(0, 5), null, 2)}`;
  try {
    graphs.show(record, analyzeMeasurement(record));
  } catch (error) {
    graphs.clear();
    element("graph-status").textContent = `解析エラー：${error.message} 生データは保存できます。`;
  }
});

// Connect is called directly from the click so the port chooser can open.
element("connect").onclick = async () => {
  if ((await controller.connect()).ok) element("status").textContent = "接続しました。測定条件を確認してください。";
};
element("disconnect").onclick = async () => {
  if ((await controller.disconnect()).ok) element("status").textContent = "切断しました。取得済みデータは画面を閉じるまで保持します。";
};
element("measurement").onsubmit = event => {
  event.preventDefault();
  // Read before the controller disables the form.
  const fields = new FormData(event.currentTarget);
  const mode = fields.get("mode");
  fields.delete("mode");
  const parameters = Object.fromEntries([...fields].map(([name, value]) => [name, Number(value)]));
  controller.measure(parameters, { mode });
};
element("download").onclick = () => saveMeasurement(controller.result);
