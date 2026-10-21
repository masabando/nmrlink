# nmrlink

教育用NMR装置の共通制御、Web Serial接続、波形解析を提供するJavaScript ES modulesパッケージです。UIフレームワーク、Firebase、Node.js用シリアル通信には依存しません。リポジトリ内のソース、またはnpm workspaceから利用します。

## 自作UIを作る

画面を作る場合は、NMRControllerで接続・測定の状態を扱い、analyzeMeasurementで解析し、NMRGraphsへ渡す構成が入口です。

```js
import { NMRController, analyzeMeasurement } from "./packages/nmrlink/src/index.js";
import { NMRGraphs } from "./packages/nmrlink/src/graphs.js";
import { saveMeasurement } from "./packages/nmrlink/src/browser.js";

const controller = new NMRController();
const graphs = new NMRGraphs({
  fid: document.querySelector("#fid-graph"),
  fft: document.querySelector("#fft-graph"),
  colors: { data1: "#176caa", data2: "#b34e25", fft: "#7c3aed" },
});

controller.onStateChange(state => {
  connectButton.disabled = !state.canConnect;
  measureButton.disabled = !state.canMeasure;
});
controller.onError(error => { statusElement.textContent = error.message; });
controller.onResult(record => {
  try {
    graphs.show(record, analyzeMeasurement(record));
  } catch (error) {
    graphs.clear();
    statusElement.textContent = `解析できませんでした：${error.message}`;
  }
});

connectButton.onclick = () => controller.connect();
measureButton.onclick = () => controller.measure(readParameters(), { mode: "single" });
saveButton.onclick = () => {
  if (controller.result) saveMeasurement(controller.result);
};
```

これは既存の画面へ組み込む抜粋です。ボタン・表示先の取得、readParameters、切断、保存ボタンの無効化などを含む全体は [直接接続サンプル](../../examples/direct/README.md) にあります。相対importはHTMLの配信位置に合わせます。HTTPSまたは同じPCのlocalhostで配信し、接続はクリックから呼びます。

[自作UIの手順](../../docs/UI.md) では、この構成を順に説明しています。

## import先と役割

| 入口（workspace・バンドラー） | API | 役割 |
| --- | --- | --- |
| nmrlink | NMRDevice | 設定送信・Single/Double測定・生データ取得 |
| nmrlink | NMRController | UI向けの操作排他・状態・結果・エラー通知 |
| nmrlink | analyzeMeasurement | ベースライン補正・FFT・最大ピーク探索 |
| nmrlink | correctBaseline / computeSpectrum | 個別に使う数値解析 |
| nmrlink/graphs | NMRGraphs | SVGグラフ・FFT範囲の帯・リサイズ対応 |
| nmrlink/graphs | createRecordPlots | DOMを使わないSVG生成 |
| nmrlink/browser | saveMeasurement | 読みやすいJSONのダウンロード |

素のブラウザではパッケージ名を解決できないため、src/index.js・src/graphs.js・src/browser.jsへの相対URLを使います。グラフと保存は別入口です。Node.jsで測定・解析だけを利用するときにDOMは不要です。

## 装置制御を直接扱う

NMRDeviceはconnect、measure、disconnectを持ち、stateを読み取れます。measureはsource、acquiredAt、mode、parameters、sampleIntervalMs、points、rawを返します。rawは補正前の2048組の2チャンネル値です。自動解析・自動保存は行いません。

NMRDeviceの非同期エラーはrejectします。NMRControllerはこれをonError通知と `{ ok: false, error }` に変換します。両者を混同しないでください。どちらも測定を自動再送しません。入力不正は通信前に拒否し、通信異常では切断・再接続を必要とします。測定中の明示的な切断と即時停止には対応しません。

Node.jsでは [NodeSerialTransport](../nmrlink-server/README.md) を渡して、同じ測定手順を使います。[APIリファレンス](../../docs/API.md) に測定条件・結果・接続契約を記載しています。

## ファイルの役割

| ファイル | 役割 |
| --- | --- |
| src/protocol.js | 条件の検証・コマンド生成・受信値の解釈 |
| src/line-decoder.js | 分割された受信バイト列の行組み立て |
| src/web-serial-transport.js | ブラウザでの接続・送受信・切断 |
| src/device.js | 共通の測定手順 |
| src/controller.js | 操作状態と通知の管理 |
| src/baseline.js・fft.js | 個別の解析 |
| src/analysis.js | 解析をまとめる入口 |
| src/graphs.js | 描画とリサイズ |
| src/browser.js | ブラウザ用の保存処理 |
| src/sample-validation.js | 解析入力の内部検証 |
| src/index.js | DOMに依存しない公開API |

## 確認状況

模擬通信・PoCとの数値照合・UI操作テストがあります。2026-10-21には利用者のChrome画面で実機Single測定の2048点取得とFID・FFT表示が報告されました。ただし、その後のUI共通化は模擬装置で確認しており、実機再測定は未確認です。厳密な応答文字列、運転範囲、異常復旧、Node.js実ポートと実Firebaseの確認も残っています。

[確認状況](../../docs/STATUS.md)、[通信仕様](../../docs/PROTOCOL.md)、[解析仕様](../../docs/ANALYSIS.md) に根拠と制約を記載しています。TypeScript型定義は未提供です。
