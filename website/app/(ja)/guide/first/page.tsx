import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";
import FirstMeasurementPreview from "@/components/FirstMeasurementPreview";
import { firstMeasurementHTML } from "@/examples/first-measurement";

export const metadata: Metadata = { title: "最初のWeb UIを作る" };

export default function FirstPage() {
  return (
    <DocumentationArticle>
      <h1>最初のWeb UIを作る</h1>
      <p>接続・測定・FIDとFFTの表示までを、1枚のHTMLにまとめます。通信やグラフの描画処理はNMRLinkへ任せます。</p>
      <p>ライブラリの配置がまだなら、先に<Link href="/guide/install">導入する</Link>を確認してください。</p>

      <h2>実機なしで試す</h2>
      <p>「接続」→「測定」の順に押してみてください。このプレビューは模擬装置で動作し、USB接続や実機への命令送信は行いません。</p>
      <FirstMeasurementPreview />
      <p>青と橙が2チャンネルのFID、下が複素FFTの振幅スペクトルです。FID上の薄い青の帯はFFTの解析範囲を示します。</p>

      <h2>コピーして実機で使う</h2>
      <p>下のHTMLは実機用です。「接続」を押すとポート選択画面が開きます。</p>
      <ol>
        <li><Link href="/guide/install#static-html">静的HTMLの導入手順</Link>に沿って、作業フォルダへ <code>nmrlink/</code> を配置します。</li>
        <li>次のコードを <code>example.html</code> として、同じ作業フォルダへ保存します。</li>
        <li>コード内の <code>parameters</code> を、装置と試料に合わせて確認・変更します。</li>
        <li>Webサーバーから配信し、対応ブラウザで開いて「接続」→「測定」の順に操作します。</li>
      </ol>
      <p>例の条件は周波数402000 Hz、第1パルス21周期、第2パルス42周期、積算128回です。すべての装置・試料に適した値ではありません。</p>
      <CodeBlock language="html" code={firstMeasurementHTML("ja")} />
      <p>
        npmで導入した場合は、import先の <code>./nmrlink/index.js</code> を <code>nmrlink</code>、
        <code>./nmrlink/graphs.js</code> を <code>nmrlink/graphs</code> に変更し、プロジェクトのバンドラーで読み込みます。
      </p>

      <h2>コードの要点</h2>
      <ol>
        <li><code>NMRController</code> が接続と測定を管理します。<code>onStateChange</code> で、操作できるボタンを切り替えます。</li>
        <li><code>connect()</code> はボタンクリックから直接呼びます。先に別の非同期処理を待たないようにします。</li>
        <li><code>measure(parameters, {`{ mode: "single" }`})</code> に測定条件を渡します。</li>
        <li><code>onResult</code> で結果を受け取り、<code>analyzeMeasurement</code> で解析し、<code>graphs.show</code> で表示します。</li>
        <li>通信や測定のエラーは <code>onError</code> で表示します。解析に失敗しても、生データは <code>controller.result</code> に残ります。</li>
      </ol>
      <p>測定の自動再送や即時停止は行いません。測定中は完了を待ってください。「切断」は測定停止の操作ではありません。</p>
      <p>接続できない場合は<Link href="/guide/browsers">対応ブラウザと接続トラブル</Link>を確認してください。</p>
      <p><Link href="/guide/measurement">次へ：測定を制御する →</Link></p>
    </DocumentationArticle>
  );
}
