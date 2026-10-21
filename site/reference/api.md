# APIリファレンス

NMRLinkを自分のアプリへ組み込むための引数・戻り値・エラーの扱いをまとめています。初めて使う場合は [最初の測定](../guides/first.md) から始めてください。

## 共通の測定条件と結果

全フィールドが必須で、整数です。未知のフィールドはvalidateParametersで取り除かれます。次は通信形式の制限であり、装置・試料に適した運転範囲を保証する値ではありません。

| フィールド | 単位・値 | 入力範囲 |
| --- | --- | --- |
| frequencyHz | Hz | 1〜2147483647 |
| pulse1Cycles・pulse2Cycles | RF周期数（時間ではない） | 0〜32767 |
| phase1Degrees・phase2Degrees | 度 | 0、90、180、270 |
| pulseIntervalMs | ms | 0〜32767 |
| measurementIntervalMs | ms | 1〜32767 |
| scans | 積算回数 | 1〜32767 |

measureは直接・遠隔とも次の形式のPromiseを返します。測定時に補正・FFTは行いません。

```js
{
  source: "instrument", // デモでは "demo"
  acquiredAt: "2026-10-20T00:00:00.000Z", // 取得完了時のISO文字列
  mode: "single", // または "double"
  parameters: { /* 検証済みの上記8項目 */ },
  sampleIntervalMs: 0.02,
  points: 2048,
  raw: [[123, -45], /* 2048組の [Data 1, Data 2] */]
}
```

デモはsimulationなどの追加情報を含みます。保存や解析ではsourceを保持してください。アプリが解析・表示用の配列を作るときはrawを書き換えず、原本として扱います。

## NMRDevice：直接接続と共通測定

`new NMRDevice(options = {})`。省略時はWebSerialTransportを使います。

| options | 既定値 | 意味 |
| --- | --- | --- |
| transport | new WebSerialTransport() | WebSerialTransportまたはNodeSerialTransportなど |
| responseTimeoutMs | 5000 | 通常応答・データ1行の最大待ち時間 |
| dataTimeoutMs | 30000 | 全サンプル転送の最大待ち時間 |
| measurementMarginMs | 20000 | 測定時間の見積もりに加える余裕 |

待ち時間は正の有限数です。測定終了待ちは条件から計算した見積もり＋measurementMarginMsであり、正確な進捗ではありません。

| メンバー | 戻り値 | 契約 |
| --- | --- | --- |
| connect() | `Promise<void>` | 接続。ブラウザではクリックから直接呼ぶ |
| measure(parameters, { mode = "single" } = {}) | `Promise<測定結果>` | 設定送信→1回の測定（scans積算）→生データ取得 |
| disconnect() | `Promise<void>` | 接続解放。装置停止命令ではない |
| state | 文字列 | disconnected / connecting / connected / measuring。読み取り用 |

同時操作と測定中のdisconnectを拒否します。ローカル入力不正では通信せず接続を維持します。通信異常では切断を試みて再接続を要求し、自動再送しません。測定と切断の両方で失敗した場合はAggregateErrorです。状態イベント・即時停止APIはありません。

動く画面は [直接接続サンプル](../guides/direct.md)、Node.js例は [Node.jsから使う](../guides/node.md) を参照してください。

## RemoteClient：自作の遠隔Web UI

```js
import { RemoteClient } from "nmrlink-server/browser";
import * as firestore from "firebase/firestore";

// auth / dbは同じFirebaseアプリの初期化済みインスタンス。
// Googleログインが完了してから利用する。
const client = new RemoteClient({
  auth, db, deviceId: "nmr-01", firestore,
  onClear: () => { /* UIの測定・解析結果と設定をクリア */ },
});
const unwatch = client.watchDevice(state => {
  // state.ownedがtrueのときだけ操作画面・結果を表示する。
  console.log(state);
}, error => console.error(error));

// 利用開始・測定・利用終了の各ボタンから順番に呼ぶ。
await client.acquire();
const result = await client.measure(parameters, { mode: "single" });
// 必要な結果を保存し、利用終了を確認してから：
await client.release();
unwatch();
```

これはバンドラー向けの呼び出し順の抜粋です。画面では各操作の例外処理とボタンの排他制御を行います。[遠隔サンプル](../guides/remote-sample.md) に静的配信版があります。

コンストラクター必須引数はauth、db、deviceId、firestore（Firebaseのmodular SDK）です。deviceIdは英数字・ハイフン・アンダースコアの1〜80文字。任意引数storageはsessionStorage既定、onClearは空関数既定です。storageはgetItem / setItem / removeItemを持ち、利用セッションのUUIDをタブ単位で保持します。秘密鍵や許可設定は渡しません。

| メンバー | 契約 |
| --- | --- |
| watchDevice(onState, onError) | 監視解除関数を返す。通知は { state, owned, online } のみ |
| acquire(): `Promise<void>` | 許可・操作権を装置側へ要求。同じタブのセッション再開にも使う。成功後60秒ごとのheartbeat |
| measure(parameters, { mode = "single", timeoutMs = 600000 } = {}) | 測定結果のPromise。入力は装置側でも検証 |
| release(): `Promise<void>` | 利用終了とデータ削除を要求。成功後ローカルセッションも解除 |
| clearLocal(): void | ローカルセッション・heartbeatの解除とonClear。装置側の利用終了・削除は行わない |

stateはoffline / idle / occupied / measuring / cleaning。onlineはクラウドからの最近の更新に基づく表示であり、測定成功の保証ではありません。ownedがfalseなら標準UIでは他人の結果を表示しません。閲覧制限は画面の表示制御です。Firestoreへ直接アクセスした場合の厳密な秘匿は保証しません。

同時要求や直前の要求から約1.1秒以内の操作は拒否される場合があります。オフラインで測定を送信待ちにせず、応答待ち期限切れでも自動再送しません。タイムアウトは装置停止・利用終了を意味しません。

画面を破棄するときはunwatchを呼び、終了済みならclearLocalでheartbeatも解除します。アカウント切替時は古いアカウントのままreleaseを完了し、clearLocalと監視解除を行ってからログアウトします。切断・閉じる操作でreleaseが届く保証はないため、装置側の再接続猶予も使います。

## 解析・操作・表示をまとめて使う

操作・解析・描画・保存は、それぞれ必要なAPIを読み込んで使います。

| import先 | export | 実行環境 |
| --- | --- | --- |
| nmrlink | analyzeMeasurement、NMRController | ブラウザ / Node.js |
| nmrlink/graphs | NMRGraphs、createRecordPlots | NMRGraphsはブラウザ、SVG生成関数はNode.jsでも使用可能 |
| nmrlink/browser | saveMeasurement、saveGraphPng、readMeasurement | ブラウザ |

素のブラウザES modulesでは、例と同様にpackages/nmrlink/src/index.js・graphs.js・browser.jsへの相対URLで読み込みます。ルートimportはDOMへ依存せず、グラフ・保存は別入口です。

### analyzeMeasurement(record, options = {})

補正→複素FFT→全周波数の最大振幅ビンを一度に計算します。optionsはstartMs=1、endMs=5、tailPoints=100、truncate=true、window="hann"が既定値です。短いレコードへ自動で範囲を変更せず、不正範囲はthrowします。

戻り値は `{ data, baseline, spectrum, peak }`。dataは補正後配列、baselineはcorrectBaselineの戻り値、spectrumはcomputeSpectrumの戻り値、peakは振幅最大のbinです。同振幅なら先に現れるbinを選び、全ゼロの場合はpeak.amplitudeも0です。原本を変更しません。解析結果は渡したrecordと対応付けて扱い、別測定の結果を混ぜないでください。

### NMRController

`new NMRController({ device = new NMRDevice() } = {})`。NMRDeviceの通信手順を変えず、UIに必要な操作状態・結果・エラーを管理します。

```js
const controller = new NMRController({ device });
const unsubscribe = controller.onStateChange(state => {
  measureButton.disabled = !state.canMeasure;
});
controller.onResult(record => graphs.show(record, analyzeMeasurement(record)));
controller.onError(error => { status.textContent = error.message; });
connectButton.onclick = () => controller.connect();
```

- onStateChange(callback)は登録時に現在状態も通知します。onResult(callback)、onError(callback)とともに監視解除関数を返します。
- stateはconnection、operation（connect / disconnect / measure / sweep / null）、busy、canConnect、canDisconnect、canMeasure、hasResultを含みます。resultは最後に成功した測定結果またはnullです。
- connect / disconnect / measureの引数はNMRDeviceと同じです。ただし戻り値はPromiseで成功時 `{ ok: true, value }`、失敗時 `{ ok: false, error }` です。操作のエラーはonErrorへ通知し、rejectしません。NMRDeviceの操作はrejectします。
- 操作中の追加要求はキューへ入れず拒否し、自動再送しません。connect内の装置呼び出しの前に非同期処理を挟まず、クリックのユーザー操作を維持します。
- 測定に失敗しても前回のresultは保持します。結果通知のリスナー（解析・描画など）の例外はonErrorへ通知し、取得成功を通信失敗へ変えません。
- 待機中の物理切断は500 msごとの状態確認で通知します。dispose()は監視・リスナーを解除しますが、装置を切断・停止しません。操作中のdisposeは拒否します。必要なdisconnectを完了してからdisposeします。

### NMRGraphs

`new NMRGraphs({ fid, fft, peak = null, status = null, displayEndMs = 10, frequencyLimitHz = 10000, colors = {} })`。fid / fftは描画先のDOM要素、peak / statusは任意のテキスト表示先です。

```js
const graphs = new NMRGraphs({ fid: fidElement, fft: fftElement });
const analysis = analyzeMeasurement(record, { startMs: 1, endMs: 5 });
graphs.show(record, analysis);
```

show(record, analysis)で描画し、analysis省略時は既定のanalyzeMeasurementを呼びます。補正後FIDは0〜10 ms、FFTは±10 kHz、高さ280 pxが既定です。FIDの縦軸は解析区間から決め、範囲外はクリップし、FFT区間を帯で示します。FFTの横軸はkHz、最大ピークの数値はHzです。

ResizeObserverで横幅の変化に追従し、保持した解析結果を再描画します。再解析・再測定しません。clear()で表示と保持参照を消し、dispose()で監視も解除します。複数のビューは固有のSVG IDを持ちます。showの描画失敗はthrowし、サンプルは結果を保持したままエラー表示します。解析関数自体の例外も画面側で扱ってください。

低水準のcreateRecordPlots(record, options)は `{ fid, fft, spectrum, peak }` を返すSVG生成関数です。optionsはwidth=720（160以上）、displayEndMs=10、frequencyLimitHz=10000、analysis=既定解析、idPrefix=自動生成です。同じDOM内で手動のidPrefixを重複させないでください。通常はNMRGraphsを使います。

### saveMeasurement(record)

測定結果を改行・インデント付きJSONでダウンロードします。原本を変更せず、ファイル名には日本時間の取得時刻とJSTを使います。JSON内のacquiredAtは変更しません。ブラウザのクリックから呼び出します。ライブラリが勝手に測定結果を永続保存することはありません。

### グラフの線色

NMRGraphsとcreateRecordPlotsにはcolorsオプションを渡せます。各値はCSSの色文字列で、未指定の項目は既定色を使います。

```js
const graphs = new NMRGraphs({
  fid: fidElement,
  fft: fftElement,
  colors: {
    data1: "#176caa",
    data2: "#b34e25",
    fft: "#7c3aed",
  },
});
```

colorsは部分指定も可能です。data1はFIDの第1チャンネル、data2は第2チャンネル、fftは振幅スペクトルです。既定値はdata1とfftが#176caa、data2が#b34e25です。リサイズ後も指定色を維持します。FFT範囲の帯・軸の色はこのオプションでは変更しません。自作HTMLに凡例を置く場合は、その文字色・説明も指定色に合わせてください。

### saveGraphPng(svg, options = {})

NMRGraphsの描画先に含まれるSVG要素をPNGとして保存します。ブラウザのクリックから `await` し、失敗はtry/catchで扱います。

`filename` は既定で `nmrlink-graph.png`、`scale` は既定で2です。白背景に表示中の軸・波形・線色・解析区間を描画します。scaleは0より大きく4以下で、出力は各辺8192 px以下・合計16メガピクセル以下です。元のSVGと生データは変更しません。

### parseMeasurement(text) / readMeasurement(file)

`parseMeasurement` はnmrlinkから読み込むJSON文字列の解析関数、`readMeasurement` はnmrlink/browserから読み込むFile用の非同期関数です。どちらも検証した測定結果を返します。通信や測定は実行しません。

対象は2048点・0.02 ms間隔の測定結果JSON（UTF-8で2 MiB以下）です。source（instrument/demo）、mode（single/double）、取得日時、点数、サンプル間隔、測定条件、2チャンネルの有限数値を検証します。表示専用のdemoはparameters:nullを許容します。数値文字列を数値へ変換せず、不正値を拒否します。未知のフィールドと保存済み解析結果は戻り値に含めません。

parseMeasurementは不正データをthrowし、readMeasurementは読み込み・検証の失敗をrejectします。画面側は成功後に結果を置き換えてください。

### formatFileTimestamp(acquiredAt)

nmrlink/browserから読み込みます。ISO形式の取得日時を、ファイル名用の日本時間（例：`2026-10-21_15-46-56-000_JST`）に変換します。端末のタイムゾーン設定には依存しません。不正な日時はthrowします。標準Web UIのJSON・CSV・SVG・PNGとローカルデモの保存で共用しています。

## 周波数走査

`frequencySteps(startHz, endHz, stepHz)` は正の整数Hzによる昇順の測定周波数を返します。最大201点で、終了を超えず、刻み幅に合わない終了値は追加しません。

`evaluateFrequency(record, options)` は `{ frequencyHz, amplitude, peakHz, record }` を返します。optionsはstartMs=1、endMs=5、tailPoints=100、window="hann"、minHz=-3000、maxHz=3000が既定値です。全点を同じ条件で再計算するための関数で、原本は変更しません。

`controller.sweep(parameters, options)` は全走査を1つの操作として保持し、接続・切断・追加測定を拒否します。optionsにはstartHz、endHz、stepHz、analysis、任意のsignalとonPointを渡します。各点はSingle測定です。onPoint(point, completed, total)は各点の取得・解析後に呼び、controller.resultは最後に取得・評価できた点の測定結果です。onResultは走査では呼ばず、onPointで各点を扱います。

成功時は `{ ok:true, value:{ points, stopped, frequencies, analysis, parameters } }`、失敗時は `{ ok:false, error }` です。停止はsignalのabortを測定の間で確認し、進行中の測定の完了を待ちます。失敗した点は再送せず走査を中断するため、画面はonPointで完了した点を保持してください。onPoint内の例外も中断の対象です。

低水準の `runFrequencySweep(device, parameters, options)` は同じ走査をNMRDevice互換のmeasureを持つ装置に対して行い、結果を直接返すPromiseです。失敗はrejectします。装置全体の操作の排他制御は呼び出し元が行うため、通常のWeb UIはcontroller.sweepを使います。

nmrlink/graphsの `createFrequencyPlot(points, { width=720 })` は評価点から周波数応答のSVGを生成します。横軸は設定周波数のkHz、縦軸はピーク振幅、高さは280 pxです。

## パルス校正

`pulseSteps(startCycles, endCycles, stepCycles)` は1〜32767の整数周期の昇順グリッドを返します。最大201点、終了値を超えない刻み幅です。

`controller.pulseSweep(parameters, options)` は第1パルス周期数だけを変えてSingle測定し、走査全体をoperation="sweep"として排他制御します。optionsはstartCycles・endCycles・stepCycles・analysis・signal・onPointです。周波数走査と同じ停止・エラー契約を持ちます。成功時valueは `{ points, stopped, lengths, analysis, parameters }` で、各pointは `{ length, amplitude, peakHz, record }`。ここでのamplitudeは探索帯域内の非負のFFTピークで、符号付き解析は次の関数で行います。低水準のrunPulseSweep(device, parameters, options)も公開し、失敗はrejectします。

`analyzePulseCalibration(records, { analysis={}, referenceIndex=null, phaseDegrees=0 })` は共通位相基準の符号付き解析です。全点でsource、Singleモード、サンプル間隔、第1パルス周期数以外の測定条件を揃えます。analysisの既定値は周波数走査と同じです。referenceIndex=nullは自動、整数はrecordsの選択点を位相基準にします。phaseDegreesは全点への追加補正です。

戻り値は `{ points, reference, measured, fit, warnings }`。pointsはlength・amplitude（符号付き）・quadrature・magnitude・record、referenceはhz・phaseRad・phaseDegrees・referenceIndex・coherenceです。信号がゼロ、不一致な測定条件、不正な基準はthrowします。実測の山・符号反転が得られない場合はmeasuredがnullになりますが、3点以上でサイン近似を試みます。位相不一致などはwarningsへ返し、計算できない場合だけfitがnullになります。原本は変更しません。

`signedPulseCandidates(points)` は実測の山と符号反転から候補を返し、`fitPulseCalibration(points)` は符号付きサイン近似を返します。実測候補の条件を満たさない場合、signedPulseCandidatesはthrowします。fitPulseCalibrationは有効な3点以上から近似を試みます。近似はp90・p180・A・B・r2・rmse・from・to・nを含み、モデルは `A*sin(pi*length/(2*p90))+B` です。

nmrlink/graphsの `createPulsePlot(points, { width=720, fit=null, mode="signed" })` は符号付き曲線と任意の近似をSVGへ描画します。`mode: "magnitude"` ではmagnitudeを使い、絶対値を非負の縦軸で表示します（絶対値用の近似を渡すと|sin|曲線を表示します）。pointsはlength・amplitude、絶対値表示ではmagnitudeを持つ配列で、横軸は周期数、高さ280 pxです。

`parsePulseCalibration(text)` はパルス校正の全データJSONを検証し、`{ source, acquiredAt, settings, points, calibration, referenceIndex, phaseDegrees }` を返します。保存された近似値は使わず、生データから解析し直します。途中停止した走査にも対応し、不正な条件・測定点・位相基準は例外になります。上限は32 MiB・201点です。

`parseFrequencySweep(text)` は周波数走査の全データJSONを検証し、`{ source, acquiredAt, settings, points }` を返します。各点の振幅とピーク周波数は生データから再計算します。途中停止した走査に対応し、上限は32 MiB・201点です。不正な条件や測定点は例外になります。

## T1測定

`NMRController.t1Sweep(parameters, options)` は走査全体を排他制御します。`options` は `{ startMs, endMs, stepMs, analysis, signal, onPoint }`。`onPoint(point, completed, total)` で取得済みの点を通知します。停止は現在の測定完了後です。

- `t1Delays(startMs, endMs, stepMs)`：整数のτグリッド（1〜32767 ms、最大201点）。
- `t1Parameters({ frequencyHz, p90Cycles, p180Cycles, measurementIntervalMs, scans }, tauMs)`：180°(0°) → τ → 90°(0°)の装置パラメータを作り、繰り返し間隔も検証。
- `runT1Sweep(device, parameters, options)`：全点を事前検証し、Double測定を順番に実行。`{ points, stopped, analysis, parameters, delays }` を返す。
- `evaluateT1(record, analysis)`：`{ tau, amplitude, peakHz, record }`。amplitudeは探索帯域内の最大振幅。
- `analyzeT1(records, { analysis, referenceIndex=null, phaseDegrees=0, fromMs, toMs })`：共通位相で全点を評価し、`{ points, reference, fit, warnings, fromMs, toMs }` を返す。pointsはtau・signal・magnitude・quadrature・recordを持つ。位相不一致や近似不成立はfit=nullとwarningsで通知する。
- `fitT1(points, { fromMs, toMs })`：tau・signalを持つ配列から近似。T・A・B・r2・rmse・n・from・toなどを返す。Tの単位はms。不十分な測定範囲や負正の欠如は例外。
- `parseT1Measurement(text)`：T1全データJSONを検証し、設定・生データ・位相基準・近似範囲を復元して再計算。32 MiB・201点まで。

`nmrlink/graphs` の `createT1Plot(points, { width=720, fit=null, mode="signed" })` は回復曲線をSVGで返します。modeはsigned・magnitude・quadrature。指数関数の近似曲線はsigned表示だけに重ねます。高さは280 pxです。

`measurementDurationMs(parameters, { mode="single" }={})` は測定条件から装置の測定時間をms単位で概算します。積算回数 ×（繰り返し間隔＋40.96 ms＋Doubleの場合のパルス間隔）を切り上げます。通信時間は含みません。

パルス校正の `analyzePulseCalibration` は符号付きのfitに加えて絶対値用のmagnitudeFitを返します。`fitPulseCalibration(points, { magnitude=false })` は3点以上で広い周期範囲の最小二乗近似を試みます。位相不一致やゼロ交差の未測定は近似を止めずwarningsで示します。

## 走査グラフの表示例

[周波数応答](../guides/frequencygraph.md)・[パルス応答](../guides/pulsegraph.md)・[T1回復曲線](../guides/relaxationgraph.md)には、表示例とコピーして使えるHTMLを用意しています。

## T2測定

`NMRController.t2Sweep(parameters, { startMs, endMs, stepMs, analysis, signal, onPoint })` は走査全体を排他制御します。τを変えてDouble測定を行い、現在の1点の完了後に停止できます。

- `t2Delays(startMs, endMs, stepMs)`：整数τグリッド、最大201点。
- `t2Parameters({ frequencyHz, p90Cycles, p180Cycles, measurementIntervalMs, scans }, tauMs)`：90°(0°) → τ → 180°(90°)の装置条件を作ります。
- `t2Window(tauMs, analysis)`：analysis.startMs/endMsをエコー中心に対する相対値として受け取り、第2パルス後の絶対範囲に変換。中心を含み、0〜40.96 msに収まる必要があります。既定は±4 msです。
- `evaluateT2(record, analysis)`：`{ tau, amplitude, peakHz, window, record }`。amplitudeは窓内のFFTピーク振幅。
- `runT2Sweep(device, parameters, options)`：全点の条件・移動する解析窓を事前検証し、`{ points, stopped, analysis, parameters, delays }` を返します。
- `analyzeT2(records, { analysis, referenceIndex=null, fromMs, toMs })`：強い点から共通周波数を選び、各点の複素振幅の絶対値を評価。`{ points, reference, fit, warnings, fromMs, toMs }` を返します。pointsはtau・signal・magnitude・window・recordなどを持ちます。基準点は手動指定も可能です。
- `fitT2(points, { fromMs, toMs })`：tau・signalから `A exp(−2τ / T2)` を近似。範囲は2τ [ms]、返り値のTはT2 [ms]です。3点以上で推定を試みます。
- `parseT2Measurement(text)`：T2全データJSONを検証し、生データから解析し直して設定・基準点・近似範囲を復元。32 MiB・201点まで。

`nmrlink/graphs` の `createT2Plot(points, { width=720, fit=null })` は0始まりの2τ [ms]のSVGを返します。[表示例とコピーできるHTML](../guides/echograph.md)を利用できます。
