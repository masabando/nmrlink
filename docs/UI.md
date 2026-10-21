# 自作Web UIの作り方

2026-10-21。最初は [直接接続サンプル](../examples/direct/README.md) のindex.htmlとapp.jsから読むと、画面とライブラリの境界を追えます。HTMLは画面構造、app.jsはフォームとイベント、ライブラリは操作・解析・描画・保存を担当します。

## 1. 必要な入口を選ぶ

```js
import { NMRController, analyzeMeasurement } from "./packages/nmrlink/src/index.js";
import { NMRGraphs } from "./packages/nmrlink/src/graphs.js";
import { saveMeasurement } from "./packages/nmrlink/src/browser.js";
```

相対パスはHTMLの場所に合わせます。npmを使うバンドラーでは、それぞれnmrlink、nmrlink/graphs、nmrlink/browserです。現在は未公開なので、ここでの手順はチェックアウト内の利用です。

NMRControllerは直接接続を扱います。Node.js用transportを指定したNMRDeviceも渡せますが、RemoteClientの置き換えではありません。遠隔UIの利用開始・終了と操作権は [RemoteClient](./API.md) で管理します。遠隔から得たrecordも同じanalyzeMeasurementとNMRGraphsで解析・描画できます。

## 2. 操作状態を画面へ反映する

```js
const controller = new NMRController();
const stopWatching = controller.onStateChange(state => {
  connectButton.disabled = !state.canConnect;
  disconnectButton.disabled = !state.canDisconnect;
  measureButton.disabled = !state.canMeasure;
  settings.disabled = state.busy;
  saveButton.disabled = !state.hasResult;
});
controller.onError(error => { status.textContent = error.message; });

connectButton.onclick = () => controller.connect();
disconnectButton.onclick = () => controller.disconnect();
```

この例のDOM要素は画面側で取得します。状態通知は登録時にも届くので、初期ボタン制御を別に書く必要はありません。接続はクリックから直接呼びます。コントローラーは操作をキューに積まず、処理中の追加要求を拒否します。

connect / disconnect / measureはPromiseを返し、成功時は `{ ok: true, value }`、失敗時は `{ ok: false, error }` です。例外をonErrorへ通知するため、ボタンごとに同じtry/catchを書く必要はありません。成功メッセージを出したい場合はokを確認します。NMRDeviceを直接使う場合は、従来どおりtry/catchでrejectを扱います。

## 3. フォームから測定条件を読む

```js
form.onsubmit = event => {
  event.preventDefault();
  const fields = new FormData(form);
  const mode = fields.get("mode");
  fields.delete("mode");
  const parameters = Object.fromEntries(
    [...fields].map(([name, value]) => [name, Number(value)])
  );
  controller.measure(parameters, { mode });
};
```

先にフォームを読み、それからmeasureを呼びます。操作状態の通知で無効化された入力欄はFormDataから除かれるためです。入力のnameは [測定条件のフィールド名](./API.md) と揃えます。装置固有の条件検証はライブラリでも実行します。

## 4. 結果を解析して表示する

```js
const graphs = new NMRGraphs({
  fid: fidElement,
  fft: fftElement,
  peak: peakText,
  status: analysisText,
  displayEndMs: 10,
  frequencyLimitHz: 10000,
  colors: {
    data1: "#176caa",
    data2: "#b34e25",
    fft: "#7c3aed",
  },
});

controller.onResult(record => {
  try {
    const analysis = analyzeMeasurement(record, { startMs: 1, endMs: 5 });
    graphs.show(record, analysis);
  } catch (error) {
    graphs.clear();
    analysisText.textContent = `解析エラー：${error.message} 生データは保存できます。`;
  }
});
```

既定では末尾100点の平均を差し引いて整数へ切り捨て、1〜5 msをHann窓でFFTします。FIDは0〜10 ms、FFT横軸は−10〜10 kHz、高さは280 pxです。FIDの縦軸は解析区間から調整し、その区間を薄い青の帯で示します。最大ピークはFFTの全周波数から探索します。

解析や描画の失敗は通信成功と分けて扱います。controller.resultは新しい生データを保持しているため、グラフに失敗しても保存できます。通信自体に失敗した場合は前回成功した結果が残ります。

colorsは部分指定でき、省略した項目は既定色を使います。CSSの16進色・色名・rgb()などを指定します。凡例を自分のHTMLに置くときは、その色と説明も合わせます。帯と軸の色はcolorsの対象外です。

要素の幅が変わるとグラフを再描画します。解析結果を使い回すので、リサイズで再測定・再解析はしません。別のグラフライブラリを使いたい場合はNMRGraphsを読み込まず、analysis.dataとanalysis.spectrumを使えます。

## 5. 保存と終了処理

```js
saveButton.onclick = () => {
  if (controller.result) saveMeasurement(controller.result);
};
```

JSONは原本の全2048点を保存し、グラフの表示範囲に切り詰めません。生データの取得と解析は恒久保存を伴いません。ページの再読み込み前に必要な結果を保存します。

画面部品を破棄するときはgraphs.dispose()でResizeObserverを解除し、stopWatching()で状態購読を解除します。操作完了後、必要ならcontroller.disconnect()を待ってからcontroller.dispose()を呼びます。disposeは装置停止・切断の代わりにはなりません。

より細かな引数・返り値・低水準APIは [APIリファレンス](./API.md) にまとめています。
