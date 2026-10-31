import { previewErrorMessage } from "./preview-errors.js";
import { NMRController, analyzeMeasurement } from "../../packages/nmrlink/src/index.js";
import { NMRGraphs } from "../../packages/nmrlink/src/graphs.js";
import { createDemoMeasurement } from "./demo-measurement.js";

// プレビュー専用。通信部分だけを模擬装置に置き換え、制御・解析・描画はライブラリを使います。
export function mountFirstMeasurementPreview(elements, text, locale = "ja") {
  const device = {
    state: "disconnected",
    async connect() { this.state = "connected"; },
    async disconnect() { this.state = "disconnected"; },
    async measure(parameters, { mode }) {
      this.state = "measuring";
      await new Promise(resolve => setTimeout(resolve, 600));
      this.state = "connected";
      return createDemoMeasurement(parameters, mode);
    },
  };
  const parameters = {
    frequencyHz: 402000, pulse1Cycles: 21, phase1Degrees: 0,
    pulse2Cycles: 42, phase2Degrees: 90,
    pulseIntervalMs: 5, measurementIntervalMs: 200, scans: 128,
  };
  const controller = new NMRController({ device });
  const graphs = new NMRGraphs({ fid: elements.fid, fft: elements.fft, locale });
  let pending = Promise.resolve();
  elements.status.textContent = text.idle;

  const unsubscribe = [
    controller.onStateChange(state => {
      elements.connect.disabled = !state.canConnect;
      elements.measure.disabled = !state.canMeasure;
      elements.disconnect.disabled = !state.canDisconnect;
      if (state.busy) elements.status.textContent = text.busy;
    }),
    controller.onError(error => { elements.status.textContent = previewErrorMessage(error, locale); }),
    controller.onResult(record => {
      graphs.show(record, analyzeMeasurement(record));
      elements.status.textContent = text.done;
    }),
  ];
  elements.connect.onclick = () => {
    pending = controller.connect().then(result => {
      if (result.ok) elements.status.textContent = text.connected;
    });
  };
  elements.measure.onclick = () => {
    pending = controller.measure(parameters, { mode: "single" });
  };
  elements.disconnect.onclick = () => {
    pending = controller.disconnect().then(result => {
      if (result.ok) elements.status.textContent = text.idle;
    });
  };

  return () => {
    for (const stop of unsubscribe) stop();
    elements.connect.onclick = elements.measure.onclick = elements.disconnect.onclick = null;
    graphs.dispose();
    // 模擬測定の途中で移動した場合も、完了後に監視タイマーを解放します。
    pending.finally(() => controller.dispose());
  };
}
