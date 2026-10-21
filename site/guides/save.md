# データを保存する

補正前の生データと測定条件を、読みやすいJSONでダウンロードします。

<!-- example:save -->

## 実測定の結果を保存する

```js
saveButton.onclick = () => {
  if (controller.result) saveMeasurement(controller.result);
};
```

上の表示例のボタンは模擬データを保存します。実測定ではcontroller.resultを渡してください。ファイル名は `nmrlink-2026-10-21_15-46-56-000_JST.json` のように、取得時刻を日本時間で示します。JSON内のacquiredAtはUTCのISO形式を保持します。標準Web UIのCSV・SVG・PNGにも同じ日本時間の表記を使います。

グラフの表示範囲を短くしても、全2048点を保存します。自動保存は行わず、利用者のクリックでダウンロードします。ページを再読み込みすると画面内の結果は失われるため、必要なデータは先に保存してください。

## グラフをPNGで保存する

標準Web UIではFID・FFTそれぞれの「PNG保存」を使えます。表示中のグラフを白背景・SVG座標の2倍の解像度で保存します。SVG保存も引き続き利用できます。

自作UIでは、NMRGraphsで描いたSVG要素を渡します。

```js
import { saveGraphPng } from "./packages/nmrlink/src/browser.js";

savePngButton.onclick = async () => {
  try {
    const svg = fidElement.querySelector("svg");
    if (svg) await saveGraphPng(svg, { filename: "fid.png" });
  } catch (error) {
    status.textContent = error.message;
  }
};
```

表示範囲・線色・FFT解析区間の帯も画像に反映します。測定データ自体は変更しません。

## 保存済みJSONを開く

標準Web UIの「JSONを開く」から再解析できます。自作UIでは `readMeasurement(file)` にファイル入力のFileを渡します。不正なデータはrejectするため、成功してから現在の結果を置き換えてください。

```js
import { readMeasurement } from "./packages/nmrlink/src/browser.js";

fileInput.onchange = async () => {
  const file = fileInput.files[0];
  if (!file) return;
  try {
    const record = await readMeasurement(file);
    graphs.show(record);
  } catch (error) {
    status.textContent = error.message;
  }
};
```

測定値と条件を検証し、保存されていた解析結果は使わずに再計算します。`source: "demo"` のデータは読み込んでも模擬データのままです。
