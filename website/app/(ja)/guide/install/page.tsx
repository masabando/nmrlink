import { sitePath } from "@/lib/site-path";
import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";

export const metadata: Metadata = { title: "導入する" };

export default function InstallPage() {
  return (
    <DocumentationArticle>
      <h1>導入する</h1>
      <p>NMRLinkは、npmを使うプロジェクトにも、ビルドなしの静的HTMLにも組み込めます。</p>

      <h2>必要な環境</h2>
      <ul>
        <li>実機測定には、対応する学生実験用NMR装置と、USB接続したPCが必要です。</li>
        <li>直接接続にはPC版のChrome・Edgeの最新版、またはFirefox 151以降を使います。Safariでは直接接続できません。</li>
        <li>ページはHTTPS、または装置を接続したPCのlocalhostで開きます。HTMLファイルを直接開くfile: URLは使いません。</li>
      </ul>
      <p>模擬データでの表示や保存済みデータの解析は、実機なしでも試せます。<Link href="/guide/browsers">対応ブラウザと動作確認環境の詳細</Link>も確認してください。</p>

      <h2>導入方法を選ぶ</h2>
      <ul>
        <li><a href="#npm">npmで導入する</a>：Viteなど、バンドラーを使うプロジェクト向け。</li>
        <li><a href="#static-html">静的HTMLで使う</a>：HTMLとJavaScriptをWebサーバーに置くだけで使いたい場合。</li>
      </ul>
      <p>既存の画面で測定するだけなら、<a href={sitePath("/ui/?lang=ja")}>標準Web UI</a>をそのまま利用できます。</p>

      <h2 id="npm" className="scroll-mt-24">npmで導入する</h2>
      <p>自分のプロジェクトで、次を実行します。</p>
      <CodeBlock language="sh" code="npm install nmrlink" />
      <p>JavaScriptから、必要な機能を読み込みます。</p>
      <CodeBlock language="js" code={`import { NMRController, analyzeMeasurement } from "nmrlink";
import { NMRGraphs } from "nmrlink/graphs";
import { saveMeasurement } from "nmrlink/browser";`} />
      <p>パッケージはES modules形式で、実行時依存パッケージはありません。TypeScript型定義は含みません。</p>
      <p><Link href="/guide/first">最初のWeb UIを作る →</Link></p>

      <h2 id="static-html" className="scroll-mt-24">静的HTMLで使う</h2>
      <p>npmのインストールやビルドは不要です。</p>
      <ol>
        <li><a href="https://github.com/masabando/nmrlink">GitHubのCodeメニューからZIPをダウンロード</a>し、展開します。</li>
        <li><code>packages/nmrlink/src</code> フォルダを、自分の作業フォルダへ <code>nmrlink</code> という名前で丸ごとコピーします。</li>
        <li>同じ作業フォルダに <code>example.html</code> を作ります。</li>
      </ol>
      <CodeBlock language="text" code={`my-nmr-ui/
├── example.html
└── nmrlink/       ← packages/nmrlink/src の中身をすべて配置`} />
      <p>HTMLでは <code>{'type="module"'}</code> を指定し、相対URLで読み込みます。</p>
      <CodeBlock language="html" code={`<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>NMRLink</title>
</head>
<body>
  <script type="module">
    import { NMRController, analyzeMeasurement } from "./nmrlink/index.js";
    import { NMRGraphs } from "./nmrlink/graphs.js";
    import { saveMeasurement } from "./nmrlink/browser.js";

    // ここに操作画面と測定処理を追加します。
  </script>
</body>
</html>`} />
      <p>作業フォルダをVS CodeのLive Serverなどで配信し、ブラウザで開きます。ローカルで実機に接続するときはlocalhostを使ってください。</p>
      <p>配置を変える場合はimport先も変更します。サンプルのコードを自分のフォルダへ移す場合も同様です。</p>
      <p><a href="https://masabando.github.io/nmrlink/examples/direct/">直接接続の最小サンプルを見る →</a></p>

      <h2>接続できない場合</h2>
      <ul>
        <li><Link href="/guide/browsers">対応ブラウザ・OS・動作確認環境</Link></li>
        <li><Link href="/guide/browsers#linux">Linuxの権限・Snapの設定</Link></li>
      </ul>
      <p>
        Node.jsでの利用は<Link href="/guide/measurement#node">Node.jsから使う</Link>、
        AIを使った実装は<Link href="/guide/ai">AIと一緒に作る</Link>を参照してください。
      </p>
    </DocumentationArticle>
  );
}
