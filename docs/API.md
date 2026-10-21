# APIリファレンス

2026-10-21更新。実装に対応した暫定APIです。現在はJavaScript ES modulesで、TypeScriptの型定義、CommonJS、npm公開版はありません。引数は省略可能と明記したもの以外は必須です。

最初に画面へ組み込む場合は [自作Web UIの作り方](./UI.md) を参照してください。

## 1. importと公開範囲

| 用途 | import先 | 主なAPI |
| --- | --- | --- |
| 静的ブラウザ | 配信先のpackages/nmrlink/src/index.jsへの相対URL | NMRDevice、correctBaseline、computeSpectrum |
| Node.js（workspace内） | nmrlink | 同上。装置接続にはNodeSerialTransportを指定 |
| Node.js（workspace内） | nmrlink-server | NodeSerialTransport、RemoteAgent、FirebaseStore、createAccessPolicy |
| 遠隔ブラウザ（バンドラー使用） | nmrlink-server/browser | RemoteClient |
| 遠隔ブラウザ（静的配信） | 配信先のbrowser/remote-client.jsへの相対URL | RemoteClient |

ブラウザの素のES modulesではパッケージ名を直接解決できません。相対URLを使うか、バンドラー・import mapを利用します。静的遠隔配布は [遠隔サンプル](../examples/remote/README.md) のexport:remoteが必要なファイルを揃えます。Node.js用のnmrlink-serverルートをブラウザへ読み込まないでください。

UIから通常使うのはNMRDevice、解析関数、RemoteClientです。transportとprotocolは接続の差し替え・低水準処理向け、RemoteAgentとFirebaseStoreはサーバー組み込み向けです。index.jsでexportされていないファイル、および以下の表にないクラスのメソッド・プロパティは内部実装です。技術的に呼べても、アプリから依存しないでください。APIは公開前のため変更される可能性があります。

## 2. 共通の測定条件と結果

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

## 3. NMRDevice：直接接続と共通測定

`new NMRDevice(options = {})`。省略時はWebSerialTransportを使います。

| options | 既定値 | 意味 |
| --- | --- | --- |
| transport | new WebSerialTransport() | 下記接続契約を満たす接続先 |
| responseTimeoutMs | 5000 | 通常応答・データ1行の最大待ち時間 |
| dataTimeoutMs | 30000 | 全サンプル転送の最大待ち時間 |
| measurementMarginMs | 20000 | PoC由来の測定時間見積もりに加える余裕 |

待ち時間は正の有限数です。測定終了待ちは条件から計算した見積もり＋measurementMarginMsであり、正確な進捗ではありません。

| メンバー | 戻り値 | 契約 |
| --- | --- | --- |
| connect() | `Promise<void>` | 接続。ブラウザではクリックから直接呼ぶ |
| measure(parameters, { mode = "single" } = {}) | `Promise<測定結果>` | 設定送信→1回の測定（scans積算）→生データ取得 |
| disconnect() | `Promise<void>` | 接続解放。装置停止命令ではない |
| state | 文字列 | disconnected / connecting / connected / measuring。読み取り用 |

同時操作と測定中のdisconnectを拒否します。ローカル入力不正では通信せず接続を維持します。通信異常では切断を試みて再接続を要求し、自動再送しません。測定と切断の両方で失敗した場合はAggregateErrorです。状態イベント・即時停止APIはありません。applyParameters、response、busy、transportなどは内部用です。

動く画面は [直接接続サンプル](../examples/direct/README.md)、Node.js例は [サーバーREADME](../packages/nmrlink-server/README.md) を参照してください。

## 4. 接続の差し替え

`new WebSerialTransport({ serial = navigator.serial } = {})` はブラウザ用です。`new NodeSerialTransport({ path, SerialPortClass } )` はNode.js用で、pathは必須、SerialPortClassはテスト時だけ差し替えます。`NodeSerialTransport.listPorts()` はポート情報配列のPromiseを返し、ポートを開きません。

両接続は115200 bps・8N1・フロー制御なし、DTR/RTS有効化後1秒待機です。UIは通常NMRDevice経由で利用します。独自transportは以下の契約を実装してください。

| メンバー | 契約 |
| --- | --- |
| connect(): `Promise<void>` | 通信可能になるまで待つ |
| disconnect(): `Promise<void>` | 待機読み取りを解除し、資源を解放する |
| write(bytes): `Promise<void>` | Uint8Arrayを送信し、送信完了まで待つ |
| readLine(timeoutMs): `Promise<string>` | 改行を除いたASCIIの1行。正の待ち時間内に取得できなければreject |
| clearInput(): void | 既存の受信待ちデータ・部分行を破棄する。ファームウェアの停止や通信同期の回復ではない |
| state: string | 接続状態。少なくともdisconnected / connecting / connected / disconnectingを区別 |

読み取りは同時に1つです。異常を正常データへ置換しません。Node接続は解放失敗時にfaultedとなり、再接続を拒否します。disconnectで解放を再試行します。接続の詳細は [通信仕様](./PROTOCOL.md) を参照してください。

## 5. 解析と低水準API

`correctBaseline(raw, { tailPoints = 100, truncate = true } = {})` は `{ base, data, tailPoints, truncate }` を返します。baseは2チャンネルの末尾平均、dataは新しい補正後配列です。

`computeSpectrum(data, { sampleIntervalMs, startMs = 0, endMs = data.length * sampleIntervalMs, window = "hann" })` は複素FFT結果を返します。windowはhann / rect。範囲は終端を含まず、4点以上が必要です。各binはhz、real、imaginary、amplitude、phaseRadiansを含みます。規格化、位相原点、全メタデータは [解析仕様](./ANALYSIS.md) に記載しています。

```js
import { correctBaseline, computeSpectrum } from "nmrlink";

const corrected = correctBaseline(result.raw);
const spectrum = computeSpectrum(corrected.data, {
  sampleIntervalMs: result.sampleIntervalMs,
  startMs: 1,
  endMs: 5,
  window: "hann",
});
```

上記importはNode.jsまたはバンドラー向けです。ブラウザ静的配信では相対URLに置き換えます。解析の入力不正は同期的にthrowします。

nmrlinkは次の低水準APIもexportしています。通常のUIからコマンドを直接送る必要はありません。

| export | 契約 |
| --- | --- |
| SAMPLE_COUNT / SAMPLE_INTERVAL_MS / PARAMETER_BYTES | 2048 / 0.02 / 18 |
| SERIAL_OPTIONS | 固定のシリアル設定（凍結オブジェクト） |
| validateParameters(input) | 検証済み設定の新しいオブジェクト。不正値はthrow |
| encodeParameters(input) | little-endianの18バイトUint8Array |
| encodeCommand(command) | parameters / single / double / readのUint8Array |
| parseSampleLine(line) | 符号付き整数のカンマ区切りを2要素配列へ変換 |
| new LineDecoder({ maxLineBytes = 65536 } = {}) | push(Uint8Array)で完全行の配列、finish()で終端検証、reset()で状態破棄 |

## 6. RemoteClient：自作の遠隔Web UI

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

これはバンドラー向けの呼び出し順の抜粋です。画面では各操作の例外処理とボタンの排他制御を行います。[遠隔サンプル](../examples/remote/README.md) に静的配信版があります。

コンストラクター必須引数はauth、db、deviceId、firestore（Firebaseのmodular SDK）です。deviceIdは英数字・ハイフン・アンダースコアの1〜80文字。任意引数storageはsessionStorage既定、onClearは空関数既定です。storageはgetItem / setItem / removeItemを持ち、利用セッションのUUIDをタブ単位で保持します。秘密鍵や許可設定は渡しません。

| メンバー | 契約 |
| --- | --- |
| watchDevice(onState, onError) | 監視解除関数を返す。通知は { state, owned, online } のみ |
| acquire(): `Promise<void>` | 許可・操作権を装置側へ要求。同じタブのセッション再開にも使う。成功後60秒ごとのheartbeat |
| measure(parameters, { mode = "single", timeoutMs = 600000 } = {}) | 測定結果のPromise。入力は装置側でも検証 |
| release(): `Promise<void>` | 利用終了とデータ削除を要求。成功後ローカルセッションも解除 |
| clearLocal(): void | ローカルセッション・heartbeatの解除とonClear。装置側の利用終了・削除は行わない |

stateはoffline / idle / occupied / measuring / cleaning。onlineはクラウドからの最近の更新に基づく表示であり、測定成功の保証ではありません。ownedがfalseなら標準UIでは他人の結果を表示しません。閲覧制限は合意した表示制御であり、Firestore直接アクセスに対する厳密な秘匿ではありません。

同時要求や直前の要求から約1.1秒以内の操作は拒否される場合があります。オフラインで測定を送信待ちにせず、応答待ち期限切れでも自動再送しません。タイムアウトは装置停止・利用終了を意味しません。sendやsessionIdなどは内部用です。

画面を破棄するときはunwatchを呼び、終了済みならclearLocalでheartbeatも解除します。アカウント切替時は古いアカウントのままreleaseを完了し、clearLocalと監視解除を行ってからログアウトします。切断・閉じる操作でreleaseが届く保証はないため、装置側の再接続猶予も使います。

## 7. サーバー組み込みAPI

通常の運用はルートのnpm startを使います。[Firebase導入手順](./FIREBASE.md) が設定と復旧の入口です。独自Node.jsプログラムへ組み込む場合だけ次を使います。

| API | 契約 |
| --- | --- |
| createAccessPolicy(config) | Admin AuthのUserRecordを受け取りbooleanを返す判定関数。設定不正は生成時にthrow |
| new FirebaseStore(db, deviceId) | Admin Firestoreインスタンスと装置IDで永続化を構成。データ操作メソッドはRemoteAgent向け内部契約 |
| new RemoteAgent(options) | store、auth（Admin Auth）、device、isAllowedが必須 |
| agent.start(): `Promise<void>` | lease取得→残存データ削除→装置接続→受付開始 |
| agent.stop(): `Promise<void>` | 実行中測定の完了を待って終了。正常時はデータ削除・offline化・切断・lease解放 |

RemoteAgentの任意optionsはreconnectGraceMs（180000、60000以上の安全な整数）、confirmDeviceIdle（false）、onError（console.error）です。isAllowedにはcreateAccessPolicyの戻り値、deviceにはNodeSerialTransportを指定したNMRDevice、storeにはFirebaseStoreを渡します。プロセスの終了シグナルでstopを呼び、処理が終わるまで待つ責任は組み込み側にあります。同じインスタンスを繰り返しstartする使い方は提供しません。

致命的なクラウドエラー後は受付を停止します。stopだけで削除成功や装置の待機状態を保証せず、原因解消後の再起動・回収が必要です。前回measuringのまま停止した場合、実機の終了を管理者が確認するまで再受付しません。

許可ファイルの形式、Firestore構造、サービスアカウントの管理、データ削除の範囲は [Firebase導入手順](./FIREBASE.md) と [利用仕様](../SPEC.md) を参照してください。

## 8. エラーの扱いと拡張時の約束

低水準APIは同期の入力検証をthrow、非同期操作をPromiseのrejectで通知します。NMRControllerの操作は例外としてonErrorとokによる結果通知へ変換します（第9節）。エラーメッセージは診断用で、文字列による分岐を安定APIとして保証しません。統一エラーコード体系は未提供です。

測定要求の再送は新しい実測を起こす可能性があります。不明な結果を自動リトライせず、装置・セッション状態を確認します。新しい解析は生データを保持して追加し、装置プロトコルはnmrlink側へ集約します。Firebase依存を共通測定・解析へ持ち込まない方針です。

## 9. 解析・操作・表示をまとめて使う

2026-10-21追加。直接接続サンプルは、以下のAPIで解析・操作状態・描画・保存を共通化しています。HTMLのIDやボタン配置はライブラリで固定しません。

| import先 | export | 実行環境 |
| --- | --- | --- |
| nmrlink | analyzeMeasurement、NMRController | ブラウザ / Node.js |
| nmrlink/graphs | NMRGraphs、createRecordPlots | NMRGraphsはブラウザ、SVG生成関数はNode.jsでも使用可能 |
| nmrlink/browser | saveMeasurement | ブラウザ |

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
- stateはconnection、operation（connect / disconnect / measure / null）、busy、canConnect、canDisconnect、canMeasure、hasResultを含みます。resultは最後に成功した測定結果またはnullです。
- connect / disconnect / measureの引数はNMRDeviceと同じです。ただし戻り値はPromiseで成功時 `{ ok: true, value }`、失敗時 `{ ok: false, error }` です。操作のエラーはonErrorへ通知し、rejectしません。低水準NMRDeviceは従来どおりrejectします。
- 操作中の追加要求はキューへ入れず拒否し、自動再送しません。connect内の装置呼び出しの前に非同期処理を挟まず、クリックのユーザー操作を維持します。
- 測定に失敗しても前回のresultは保持します。結果通知のリスナー（解析・描画など）の例外はonErrorへ通知し、取得成功を通信失敗へ変えません。
- 待機中の物理切断は500 msごとの状態確認で通知します。dispose()は監視・リスナーを解除しますが、装置を切断・停止しません。操作中のdisposeは拒否します。必要なdisconnectを完了してからdisposeします。

### NMRGraphs

`new NMRGraphs({ fid, fft, peak = null, status = null, displayEndMs = 10, frequencyLimitHz = 10000 })`。fid / fftは描画先のDOM要素、peak / statusは任意のテキスト表示先です。

```js
const graphs = new NMRGraphs({ fid: fidElement, fft: fftElement });
const analysis = analyzeMeasurement(record, { startMs: 1, endMs: 5 });
graphs.show(record, analysis);
```

show(record, analysis)で描画し、analysis省略時は既定のanalyzeMeasurementを呼びます。補正後FIDは0〜10 ms、FFTは±10 kHz、高さ280 pxが既定です。FIDの縦軸は解析区間から決め、範囲外はクリップし、FFT区間を帯で示します。グラフの軸はkHz、最大ピークの数値はHzです。

ResizeObserverで横幅の変化に追従し、保持した解析結果を再描画します。再解析・再測定しません。clear()で表示と保持参照を消し、dispose()で監視も解除します。複数のビューは固有のSVG IDを持ちます。showの描画失敗はthrowし、サンプルは結果を保持したままエラー表示します。解析関数自体の例外も画面側で扱ってください。

低水準のcreateRecordPlots(record, options)は `{ fid, fft, spectrum, peak }` を返すSVG生成関数です。optionsはwidth=720（160以上）、displayEndMs=10、frequencyLimitHz=10000、analysis=既定解析、idPrefix=自動生成です。同じDOM内で手動のidPrefixを重複させないでください。通常はNMRGraphsを使います。

### saveMeasurement(record)

測定結果を改行・インデント付きJSONでダウンロードします。原本を変更せず、ファイル名には取得時刻を使います。ブラウザのクリックから呼び出します。ライブラリが勝手に測定結果を永続保存することはありません。

### グラフの線色

NMRGraphsとcreateRecordPlotsにはcolorsオプションを渡せます。各値はCSSの色文字列で、未指定の項目は従来の色を使います。

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
