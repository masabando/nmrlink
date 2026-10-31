import type { Locale } from "@/lib/languages";

// コピー用の実機接続HTML。導入ページの example.html + nmrlink/ の配置で使います。
export function firstMeasurementHTML(locale: Locale) {
  const text = locale === "ja" ? {
    title: "最初のNMR測定", connect: "接続", measure: "測定", disconnect: "切断",
    idle: "未接続", connected: "接続しました", disconnected: "切断しました", busy: "処理中…",
    done: "測定完了", failed: "解析エラー：", conditions: "装置と試料に合わせて、測定条件を確認してください。",
    fid: "FID・時間波形", fft: "FFT・振幅スペクトル",
  } : {
    title: "Your first NMR measurement", connect: "Connect", measure: "Measure", disconnect: "Disconnect",
    idle: "Disconnected", connected: "Connected", disconnected: "Disconnected", busy: "Working…",
    done: "Measurement complete", failed: "Analysis error: ", conditions: "Check the measurement settings for your device and sample.",
    fid: "FID / time-domain signal", fft: "FFT / amplitude spectrum",
  };

  return `<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${text.title}</title>
  <style>
    body { max-width: 800px; margin: 24px auto; padding: 0 16px; font: 14px/1.6 sans-serif; }
    button { padding: 8px 16px; font: inherit; }
    #fid, #fft { min-width: 0; }
  </style>
</head>
<body>
  <h1>${text.title}</h1>
  <p>${text.conditions}</p>
  <button id="connect">${text.connect}</button>
  <button id="measure" disabled>${text.measure}</button>
  <button id="disconnect" disabled>${text.disconnect}</button>
  <p id="status" role="status">${text.idle}</p>
  <h2>${text.fid}</h2>
  <div id="fid"></div>
  <h2>${text.fft}</h2>
  <div id="fft"></div>

  <script type="module">
    import { NMRController, analyzeMeasurement } from "./nmrlink/index.js";
    import { NMRGraphs } from "./nmrlink/graphs.js";

    const connect = document.getElementById("connect");
    const measure = document.getElementById("measure");
    const disconnect = document.getElementById("disconnect");
    const status = document.getElementById("status");

    const controller = new NMRController();
    const graphs = new NMRGraphs({
      fid: document.getElementById("fid"),
      fft: document.getElementById("fft"),
      locale: "${locale}",
    });

    const parameters = {
      frequencyHz: 402000,
      pulse1Cycles: 21, phase1Degrees: 0,
      pulse2Cycles: 42, phase2Degrees: 90,
      pulseIntervalMs: 5,
      measurementIntervalMs: 200,
      scans: 128,
    };

    controller.onStateChange(state => {
      connect.disabled = !state.canConnect;
      measure.disabled = !state.canMeasure;
      disconnect.disabled = !state.canDisconnect;
      if (state.busy) status.textContent = "${text.busy}";
    });
    controller.onError(error => { status.textContent = error.message; });
    controller.onResult(record => {
      try {
        graphs.show(record, analyzeMeasurement(record));
        status.textContent = "${text.done}";
      } catch (error) {
        graphs.clear();
        status.textContent = "${text.failed}" + error.message;
      }
    });

    connect.onclick = async () => {
      if ((await controller.connect()).ok) status.textContent = "${text.connected}";
    };
    measure.onclick = () => controller.measure(parameters, { mode: "single" });
    disconnect.onclick = async () => {
      if ((await controller.disconnect()).ok) status.textContent = "${text.disconnected}";
    };
  </script>
</body>
</html>`;
}
