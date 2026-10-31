import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";
import ReferenceTable from "@/components/ReferenceTable";
import MathFormula from "@/components/MathFormula";

export const metadata: Metadata = { title: "接続・測定 API" };

export default function ReferencePage() {
  return (
    <DocumentationArticle>
      <h1>接続・測定 API</h1>
      <p>import先は<code>nmrlink</code>です。操作画面ではNMRControllerを使い、直接Promiseの例外を扱いたい場合やtransportを差し替える場合はNMRDeviceを使います。</p>
      <h2 id="parameters">測定条件・validateParameters</h2>
      <p><code>validateParameters(input)</code>は次の8項目だけをコピーして返し、元のオブジェクトを変更しません。全項目が必須で、数値文字列は受け付けません。</p>
      <ReferenceTable headings={["項目", "単位・意味", "入力範囲"]} rows={[
        ["frequencyHz", "設定周波数 [Hz]", "1〜2147483647の整数"],
        ["pulse1Cycles / pulse2Cycles", "第1・第2パルスのRF周期数", "0〜32767の整数"],
        ["phase1Degrees / phase2Degrees", "位相 [度]", "0 / 90 / 180 / 270"],
        ["pulseIntervalMs", "パルス間隔 [ms]", "0〜32767の整数"],
        ["measurementIntervalMs", "繰り返し間隔の装置設定 [ms]", "1〜32767の整数"],
        ["scans", "積算回数", "1〜32767の整数"],
      ]} />
      <p>表は通信形式の制限で、装置・試料に適した値を保証しません。Singleでも第2パルスの項目を含めます。不正なオブジェクトはTypeError、値が範囲外ならRangeErrorです。</p>
      <h2 id="record">測定記録</h2>
      <CodeBlock language="js" code={`const record = {
  source: "instrument", // 模擬データは "demo"
  acquiredAt: "2026-10-21T06:00:00.000Z",
  mode: "single", // "single" または "double"
  parameters: { frequencyHz: 402000, pulse1Cycles: 21, phase1Degrees: 0,
    pulse2Cycles: 42, phase2Degrees: 90, pulseIntervalMs: 5,
    measurementIntervalMs: 200, scans: 64 },
  sampleIntervalMs: 0.02,
  points: 2048,
  raw: Array.from({ length: 2048 }, () => [0, 0]),
};`} />
      <p>rawは補正前の[Data 1, Data 2]です。取得時には補正・FFTを行いません。sourceと生データを保持し、解析用の配列と区別してください。表示専用のdemo記録ではparameters:nullも使えます。</p>
      <h2 id="nmrcontroller">NMRController</h2>
      <CodeBlock language="js" code={`const controller = new NMRController({ device: new NMRDevice() });
// 接続ボタンからcontroller.connect()が成功した後、測定ボタンで実行します。
const result = await controller.measure(parameters, { mode: "single" });
if (result.ok) console.log(result.value);
else console.error(result.error);`} />
      <p>コンストラクターの引数は省略できます。connect()・disconnect()・measure(parameters, options)は成功時に<code>{"{ ok: true, value }"}</code>、失敗時に<code>{"{ ok: false, error }"}</code>を返すPromiseです。measureのmodeはsingleが既定、doubleにも対応します。</p>
      <ReferenceTable headings={["メンバー", "内容"]} rows={[
        ["state", "connection、operation、busy、canConnect、canDisconnect、canMeasure、hasResult"],
        ["state.operation", "connect / disconnect / measure / sweep / null"],
        ["result", "最後に取得できた測定記録、またはnull"],
        ["onStateChange(callback)", "登録時にも現在状態を通知。監視解除関数を返す"],
        ["onResult(callback)", "Single/Double測定の成功時にrecordを通知。監視解除関数を返す"],
        ["onError(callback)", "操作や通知リスナーのエラーを通知。監視解除関数を返す"],
        ["dispose()", "監視タイマーと購読を解除。実行中は例外。停止・切断は行わない"],
      ]} />
      <p>同時操作は拒否し、キューや自動再送はありません。接続はクリックから直接呼んでください。通信失敗でも直前の成功記録は残ります。走査ではonResultではなくonPointを使い、resultは最後に評価できた点になります。</p>
      <h2 id="nmrdevice">NMRDevice</h2>
      <ReferenceTable headings={["コンストラクターのoptions", "既定値", "意味"]} rows={[
        ["transport", "new WebSerialTransport()", "通信の差し替え先"],
        ["responseTimeoutMs", "5000", "通常応答・データ1行の最大待ち時間 [ms]"],
        ["dataTimeoutMs", "30000", "全サンプル転送の最大待ち時間 [ms]"],
        ["measurementMarginMs", "20000", "測定時間の見積もりに加える余裕 [ms]"],
      ]} />
      <p>待ち時間は正の有限数です。connect()・disconnect()はPromise&lt;void&gt;、measure(parameters, options)はPromise&lt;測定記録&gt;です。失敗はrejectします。stateはdisconnected / connecting / connected / measuringです。</p>
      <p>測定中の切断は拒否します。ローカル入力の不正では通信せず、通信異常では切断を試み、再接続が必要です。測定と後片付けの両方が失敗した場合はAggregateErrorです。即時停止APIはありません。</p>
      <h2 id="measurementdurationms">measurementDurationMs</h2>
      <p><code>measurementDurationMs(parameters, {"{ mode: 'single' }"})</code>はms単位の見込み時間を返します。mode省略時はsingleです。</p>
      <CodeBlock language="js" code={`// Doubleではパルス間隔も各積算に含めます。
const milliseconds = measurementDurationMs(parameters, { mode: "double" });`} />
      <MathFormula block tex={String.raw`t_{\mathrm{estimate}}=\left\lceil n_{\mathrm{scans}}\left(t_{\mathrm{interval}}+40.96+t_{\mathrm{extra}}\right)\right\rceil`} />
      <p>積算数はscans、間隔はmeasurementIntervalMsを使います。各時間の数値はmsです。追加時間はDoubleではpulseIntervalMs、Singleでは0です。通信転送・命令処理の時間を含みません。</p>
      <h2 id="low-level">通信部品を直接使う場合</h2>
      <p>通常はNMRDeviceに任せます。WebSerialTransportはconnect・disconnect・write(bytes)・readLine(timeoutMs)・clearInputを持ちます。LineDecoderは受信バイトを行に分割するpush・finish・resetを持ちます。</p>
      <p>WebSerialTransportのコンストラクターはserialを省略するとnavigator.serialを使います。write(Uint8Array)とreadLine(timeoutMs)はPromise、readLineは1行の文字列を返します。LineDecoderのmaxLineBytesは65536が既定です。push(Uint8Array)は完成した行の配列を返し、finish()は未完の行が残っていれば例外、reset()は状態を破棄します。非ASCII・長すぎる行は拒否します。</p>
      <p>SAMPLE_COUNT=2048、SAMPLE_INTERVAL_MS=0.02、PARAMETER_BYTES=18です。SERIAL_OPTIONSは115200 baud・8 data bits・1 stop bit・parity none・flowControl noneです。encodeParametersは18バイトのUint8Array、encodeCommandはparameters / single / double / readのコマンドバイト、parseSampleLineは整数2値の配列を返します。不正入力は例外です。</p>
      <p><Link href="/guide/measurement">使い方：測定を制御する</Link> · <Link href="/reference/api">API一覧</Link></p>
    </DocumentationArticle>
  );
}
