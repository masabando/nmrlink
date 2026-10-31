import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";

export const metadata: Metadata = { title: "測定を制御する" };

export default function MeasurementPage() {
  return (
    <DocumentationArticle>
      <h1>測定を制御する</h1>
      <p>接続・条件の送信・測定は <code>NMRController</code> で扱います。ボタンの有効化やエラー表示を組み合わせて、自分の操作画面を作ります。</p>
      <p>以下は<Link href="/guide/first">最初のWeb UI</Link>のHTMLに組み込むコードの抜粋です。各例は独立した完成コードではなく、同じ <code>controller</code> と <code>parameters</code> を使います。</p>

      <h2>接続と切断</h2>
      <CodeBlock language="js" code={`const controller = new NMRController();
const connect = document.getElementById("connect");
const disconnect = document.getElementById("disconnect");
const status = document.getElementById("status");

connect.onclick = async () => {
  const result = await controller.connect();
  if (result.ok) status.textContent = "接続しました";
};
disconnect.onclick = async () => {
  const result = await controller.disconnect();
  if (result.ok) status.textContent = "切断しました";
};`} />
      <p>ポート選択にユーザー操作が必要なので、<code>connect()</code> はボタンクリックから直接呼びます。先に別の非同期処理を待たないようにしてください。</p>
      <p>同じポートを別のアプリやタブで使っている場合は、先にそちらを切断します。<code>disconnect()</code> は測定停止ではなく、測定中の切断は拒否されます。</p>

      <h2>測定条件を指定する</h2>
      <CodeBlock language="js" code={`const parameters = {
  frequencyHz: 402000,
  pulse1Cycles: 21, phase1Degrees: 0,
  pulse2Cycles: 42, phase2Degrees: 90,
  pulseIntervalMs: 5,
  measurementIntervalMs: 200,
  scans: 128,
};`} />
      <div className="my-6 overflow-x-auto">
        <table className="table table-sm">
          <thead><tr><th scope="col">項目</th><th scope="col">意味</th><th scope="col">指定できる値</th></tr></thead>
          <tbody>
            <tr><td><code>frequencyHz</code></td><td>設定周波数 [Hz]</td><td>1〜2147483647の整数</td></tr>
            <tr><td><code>pulse1Cycles / pulse2Cycles</code></td><td>第1・第2パルスのRF周期数</td><td>0〜32767の整数</td></tr>
            <tr><td><code>phase1Degrees / phase2Degrees</code></td><td>位相 [度]</td><td>0 / 90 / 180 / 270</td></tr>
            <tr><td><code>pulseIntervalMs</code></td><td>パルス間隔 [ms]</td><td>0〜32767の整数</td></tr>
            <tr><td><code>measurementIntervalMs</code></td><td>測定間隔の装置設定 [ms]</td><td>1〜32767の整数</td></tr>
            <tr><td><code>scans</code></td><td>積算回数</td><td>1〜32767の整数</td></tr>
          </tbody>
        </table>
      </div>
      <p>すべて必須です。パルス長はマイクロ秒ではなくRFの周期数で指定します。Singleでも第2パルスの項目を含めます。表の範囲は通信形式の制限であり、装置・試料に適した運転範囲を保証するものではありません。</p>
      <p>フォームの値を使う場合は数値に変換します。送信前に入力だけを検証するには、次のように <code>validateParameters</code> を使えます。この呼び出しでは装置へ送信しません。</p>
      <CodeBlock language="js" code={`import { validateParameters } from "./nmrlink/index.js";

try {
  validateParameters(parameters);
  status.textContent = "入力形式に問題はありません";
} catch (error) {
  status.textContent = error.message;
}`} />

      <h2>SingleとDoubleを実行する</h2>
      <CodeBlock language="js" code={`const measure = document.getElementById("measure");

measure.onclick = () => controller.measure(parameters, { mode: "single" });

// Doubleを使う場合は、上のハンドラーを次に置き換えます。
// measure.onclick = () => controller.measure(parameters, { mode: "double" });`} />
      <p><code>measure()</code> は条件の送信からデータ取得までを行います。積算は <code>scans</code> を装置へ渡して実行します。同時操作の要求は拒否され、キューには積まれません。</p>
      <p>測定は自動再送しません。即時停止や正確な進捗通知には対応していないため、実行中は完了を待ってください。</p>

      <h2>状態でボタンを切り替える</h2>
      <CodeBlock language="js" code={`controller.onStateChange(state => {
  connect.disabled = !state.canConnect;
  measure.disabled = !state.canMeasure;
  disconnect.disabled = !state.canDisconnect;
  if (state.busy) status.textContent = "処理中…";
});`} />
      <ul>
        <li><code>canConnect / canMeasure / canDisconnect</code>：各ボタンを操作できるか。</li>
        <li><code>busy</code>：接続・測定などの操作中か。設定フォームの無効化にも使えます。</li>
        <li><code>operation</code>：<code>connect / disconnect / measure / sweep</code>、または操作していないときは <code>null</code>。</li>
        <li><code>hasResult</code>：保存や再解析に使える結果があるか。</li>
      </ul>

      <h2>結果とエラーを受け取る</h2>
      <CodeBlock language="js" code={`controller.onResult(record => {
  status.textContent = "測定完了：" + record.points + "点";
  // record.raw には補正前の [Data 1, Data 2] が入ります。
});
controller.onError(error => {
  status.textContent = error.message;
});`} />
      <p>成功時だけ <code>onResult</code> が呼ばれます。結果は2048点 × 2チャンネルで、<code>sampleIntervalMs</code> は0.02 msです。取得時刻・条件・モードも記録されます。</p>
      <p>最後に成功した結果は <code>controller.result</code> に残ります。次の通信や解析が失敗しても消えないので、前回の結果を新しい測定結果と取り違えないように表示してください。</p>
      <p>操作メソッドを <code>await</code> する場合は、成功時の <code>{`{ ok: true, value }`}</code> と失敗時の <code>{`{ ok: false, error }`}</code> を確認できます。<code>NMRController</code> の操作失敗は <code>onError</code> にも通知されます。</p>

      <h2>見込み時間を表示する</h2>
      <CodeBlock language="js" code={`import { measurementDurationMs } from "./nmrlink/index.js";

const seconds = measurementDurationMs(parameters, { mode: "single" }) / 1000;
status.textContent = "測定の見込み：約" + seconds.toFixed(1) + "秒";`} />
      <p>通信転送やコマンド処理の時間を含まない目安です。実際の完了時間や進捗を保証するものではありません。</p>

      <h2>画面を片付ける</h2>
      <p>コンポーネントなどを破棄するときは、実行中の操作が終わるのを待ち、必要な切断を行ってから監視を解除します。</p>
      <CodeBlock language="js" code={`async function closeUI() {
  if (controller.state.busy) return;
  if (controller.state.canDisconnect) {
    const result = await controller.disconnect();
    if (!result.ok) return;
  }
  controller.dispose();
  graphs.dispose();
}`} />
      <p><code>dispose()</code> は監視の解除です。装置の測定停止や切断を暗黙には行いません。<code>graphs</code> は<Link href="/guide/first">最初のWeb UI</Link>で作成したグラフ表示です。</p>
      <p>接続のトラブルは<Link href="/guide/browsers">対応ブラウザと接続トラブル</Link>を確認してください。</p>
      <h2 id="node">Node.jsから接続する場合</h2>
      <p>解析関数はnpmのnmrlinkだけでNode.jsから使えます。実機のシリアル接続には別途NodeSerialTransportが必要です。これはnpm未公開のnmrlink-serverに含まれるため、リポジトリで使います。Node.js 22以上が必要で、Node.js版の実機接続は未検証です。</p>
      <CodeBlock language="sh" code={`git clone https://github.com/masabando/nmrlink.git
cd nmrlink
npm install`} />
      <p>次をリポジトリのルートにmeasure.mjsとして保存し、ポート名と条件を確認したうえでnode measure.mjsを実行します。これは実機を測定するコードで、模擬データの例ではありません。</p>      <CodeBlock language="js" code={`import { NMRDevice, analyzeMeasurement } from "nmrlink";
import { NodeSerialTransport } from "nmrlink-server";

console.log(await NodeSerialTransport.listPorts());
const device = new NMRDevice({
  transport: new NodeSerialTransport({ path: "/dev/cu.YOUR_DEVICE" }),
});
try {
  await device.connect();
  const record = await device.measure({
    frequencyHz: 402000,
    pulse1Cycles: 21, phase1Degrees: 0,
    pulse2Cycles: 42, phase2Degrees: 90,
    pulseIntervalMs: 5, measurementIntervalMs: 200, scans: 128,
  }, { mode: "single" });
  console.log(analyzeMeasurement(record).peak);
} finally {
  await device.disconnect();
}`} />
      <p>ポート一覧の取得だけでは接続しません。pathを明示し、自動再接続・自動再送は行いません。NMRGraphsやダウンロード用のsaveMeasurementはブラウザ向けです。Firebase経由の構成は<Link href="/guide/remote">遠隔で使う（未検証）</Link>を参照してください。</p>
      <p><Link href="/guide/analysis">次へ：信号を解析する →</Link></p>
    </DocumentationArticle>
  );
}
