# nmrlink

[近藤 康（近畿大学）](https://researchmap.jp/kondo_yasushi)が開発を進めてきた学生実験用のNMR装置を制御するJavaScriptライブラリです。Web Serial APIによる接続、測定データの解析、グラフ表示を自分のWeb UIに組み込めます。

[ドキュメント](https://masabando.github.io/nmrlink/) · [API](https://masabando.github.io/nmrlink/docs/API.html) · [標準Web UI](https://masabando.github.io/nmrlink/examples/standard/) · [GitHub](https://github.com/masabando/nmrlink)

## 対象装置と入手について

実際の測定には、対応する学生実験用NMR装置が必要です。一般のNMR装置を共通に制御するライブラリではありません。実機なしでも、模擬データによる表示や操作のデモを試せます。

装置は教材販売会社を通じての販売が計画されています。

## 導入

```sh
npm install nmrlink
```

ビルドなしの静的HTMLから使う方法は[導入ガイド](https://masabando.github.io/nmrlink/guide/install.html)を参照してください。

## 対応環境と配布内容

- 実機の直接接続にはWeb Serial対応デスクトップブラウザとHTTPSまたは同じPCのlocalhostが必要です。接続する装置はNMRLinkの通信仕様に対応している必要があります。
- ES modules形式のJavaScriptを提供します。CommonJS形式とTypeScript型定義は含みません。
- ライブラリ自体の実行時依存パッケージはありません。Node.jsから解析やSVG生成を使う場合にDOMは不要です。
- パッケージには読みやすい `src/`、このREADME、MITライセンスを含みます。ソースは圧縮・難読化していません。

ブラウザアプリのViteなどのバンドラー環境ではパッケージ名でimportします。素のHTMLではimport mapか、ソースへの相対URLが必要です。[ビルドなしで使う方法](https://masabando.github.io/nmrlink/guide/install.html)も参照してください。

## 自分のWeb UIから測定する

次の例はバンドラー環境のブラウザ用コードです。HTMLに接続・測定・切断・保存ボタン、状態欄、2つのグラフ表示先を用意します。

```html
<button id="connect">接続</button>
<button id="measure" disabled>測定</button>
<button id="disconnect" disabled>切断</button>
<button id="save" disabled>生データJSONを保存</button>
<p id="status" role="status">未接続</p>
<div id="fid"></div>
<div id="fft"></div>
```

```js
import { NMRController, analyzeMeasurement } from "nmrlink";
import { NMRGraphs } from "nmrlink/graphs";
import { saveMeasurement } from "nmrlink/browser";

const get = id => document.getElementById(id);
const controller = new NMRController();
const graphs = new NMRGraphs({ fid: get("fid"), fft: get("fft") });

// 装置・試料に合わせて確認する値です。校正済みの値へ変更してください。
const parameters = {
  frequencyHz: 402000,
  pulse1Cycles: 21, phase1Degrees: 0,
  pulse2Cycles: 42, phase2Degrees: 90,
  pulseIntervalMs: 5, measurementIntervalMs: 200, scans: 128,
};

controller.onStateChange(state => {
  get("connect").disabled = !state.canConnect;
  get("measure").disabled = !state.canMeasure;
  get("disconnect").disabled = !state.canDisconnect;
});
controller.onError(error => { get("status").textContent = error.message; });
controller.onResult(record => {
  get("save").disabled = false;
  try {
    graphs.show(record, analyzeMeasurement(record));
    get("status").textContent = "測定が完了しました。";
  } catch (error) {
    graphs.clear();
    get("status").textContent = `解析できませんでした：${error.message}`;
  }
});

// ポート選択はクリックから直接呼び出します。
get("connect").onclick = () => controller.connect();
get("measure").onclick = () => controller.measure(parameters, { mode: "single" });
get("disconnect").onclick = () => controller.disconnect();
get("save").onclick = () => {
  if (controller.result) saveMeasurement(controller.result);
};
```

接続・測定のエラーは `onError` に通知され、操作は `{ ok, value, error }` を返します。低水準の `NMRDevice` はエラー時にrejectします。測定の自動再送や進行中の測定の即時停止は行いません。画面を破棄するときは、処理完了後に切断し、`graphs.dispose()` と `controller.dispose()` で監視を終了します。

## 実機なしで解析する

Node.jsまたはブラウザで実行できます。2チャンネルを複素信号として解析します。

```js
import { analyzeMeasurement } from "nmrlink";
import { createRecordPlots } from "nmrlink/graphs";

const record = {
  source: "demo", acquiredAt: new Date().toISOString(),
  mode: "single", parameters: null, points: 2048, sampleIntervalMs: 0.02,
  raw: Array.from({ length: 2048 }, (_, index) => {
    const t = index * 0.00002;
    const amplitude = 1000 * Math.exp(-t / 0.003);
    return [
      amplitude * Math.cos(2 * Math.PI * 1200 * t),
      amplitude * Math.sin(2 * Math.PI * 1200 * t),
    ];
  }),
};
const analysis = analyzeMeasurement(record, { startMs: 1, endMs: 5 });
console.log(analysis.peak.hz); // 受信周波数からの差 [Hz]。FFTビン値。
const svg = createRecordPlots(record); // { fid, fft, ... }
console.log(svg.fid); // SVG文字列。Node.jsでも生成できます。
```

## import先

| 入口 | 主な機能 |
| --- | --- |
| `nmrlink` | NMRDevice、NMRController、条件検証、補正・FFT、走査、T1/T2解析、保存JSONの解析 |
| `nmrlink/graphs` | NMRGraphs、createRecordPlots、周波数・パルス・T1/T2のSVG生成 |
| `nmrlink/browser` | JSON・PNGの保存、測定JSONの読み込み、JSTファイル名の日時書式 |

[グラフの表示例とコピー用コード](https://masabando.github.io/nmrlink/guide/frequencygraph.html)や[APIリファレンス](https://masabando.github.io/nmrlink/docs/API.html)から用途別に確認できます。

## ライセンス

MIT。作者：Masamitsu Bando。配布物内のLICENSEを参照してください。

GitHubの `original/` にある提供元のPythonプログラムもMITライセンスで公開しています。このnpmパッケージには含みません。
