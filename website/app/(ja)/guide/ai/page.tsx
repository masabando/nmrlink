import { sitePath } from "@/lib/site-path";
import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";

export const metadata: Metadata = { title: "AIと一緒に作る" };

export default function AIPage() {
  return (
    <DocumentationArticle>
      <h1>AIと一緒に作る</h1>
      <p>NMRLinkの資料をAIに渡して、自分のWeb UIを作れます。llms.txtには導入方法・API・コード例・装置操作の制約をまとめています。</p>
      <h2>llms.txtを渡す</h2>
      <p>使っているAIに、次のURLと作りたいものを伝えてください。</p>
      <CodeBlock language="text" code="https://masabando.github.io/nmrlink/llms.txt" />
      <p><a href={sitePath("/llms.txt")}>llms.txtを開く</a>。URLを渡すだけで読めるかはAIやツールによって異なります。取得できない場合は本文をコピーして会話に貼るか、テキストファイルとして添付してください。</p>
      <h2>静的HTMLで作る依頼例</h2>
      <p>ビルドせず、Live Serverなどで配信する場合です。<Link href="/guide/install#static-html">導入する</Link>と同じ配置を指定しています。</p>
      <CodeBlock language="text" code={`次の資料を読んで、NMRLinkを使うWeb UIを作ってください。
https://masabando.github.io/nmrlink/llms.txt

index.htmlと、その隣のnmrlink/フォルダを使います。
nmrlink/にはpackages/nmrlink/srcの中身を一式配置します。
Live Serverで配信し、npmやビルドは使いません。
import先は ./nmrlink/index.js、./nmrlink/graphs.js、./nmrlink/browser.js です。

必要な機能：
- 接続・切断、測定条件の入力、Single測定
- FID・FFT表示、JSON保存・読み込み
- 操作状態に応じたボタン制御とエラー表示

NMRControllerとNMRLinkの解析・グラフ・保存APIを使ってください。
接続は利用者のクリックから行い、自動測定・測定命令の自動再送はしないでください。
設定の初期値は例で、装置と試料に合わせて確認が必要だと示してください。
不正なJSONでは現在の記録とグラフを保持してください。
既存ファイルを上書きせず、HTMLと配置・起動方法を示してください。`} />
      <h2>npmで作る依頼例</h2>
      <CodeBlock language="text" code={`次の資料を読んで、Viteのブラウザアプリを作ってください。
https://masabando.github.io/nmrlink/llms.txt

npm install nmrlinkで導入し、nmrlink、nmrlink/graphs、nmrlink/browserを使います。
接続・切断・Single測定・FID/FFT・JSON保存と読み込みができる画面にしてください。
NMRControllerで状態とエラーを扱い、通信やFFTは独自実装しないでください。
接続はクリックから行い、自動測定や自動再送はしないでください。
実機なしで表示を確認する模擬データも用意し、実測定と区別してください。
画面を閉じるときの切断・購読解除・グラフの監視解除も説明してください。
ファイル一式、依存関係、起動方法を示してください。`} />
      <p>既存のプロジェクトを使う場合は、フレームワークと変更したいファイルも伝えます。NMRLink本体はUIフレームワークに依存しません。Next.jsではブラウザAPIを使う処理をクライアント側に置きます。</p>
      <h2>作った画面を確かめる</h2>
      <ol>
        <li>模擬データで、画面・入力・解析・保存・読み込み・エラー表示を確認します。</li>
        <li>対応する実機とブラウザ、HTTPSまたは同じPCのlocalhostを用意します。</li>
        <li>周波数・パルス周期数・位相・繰り返し間隔・積算回数を、装置と試料に合わせて確認します。</li>
        <li>意図しない自動測定や自動再送がないことを確認してから、実機を操作します。</li>
      </ol>
      <p>模擬データの表示成功は実機の動作確認とは別です。NMRLinkは測定中の即時停止には対応していません。遠隔接続は実環境で未検証のため、まず直接接続で作ってください。</p>
      <p>動かないときはエラーメッセージ、関連コード、OS・ブラウザ・配信方法をAIに伝えます。API名や引数はドキュメントと照合してください。</p>
      <h2>参考にする</h2>
      <ul>
        <li><Link href="/guide/first">最初のWeb UIを作る</Link>：動く表示例とコピー用HTML</li>
        <li><Link href="/guide/save">データの保存・読み込み</Link>：記録を残して再解析</li>
        <li><a href="https://github.com/masabando/nmrlink/tree/main/examples/direct">最小サンプルのソース</a></li>
        <li><Link href="/reference/api">APIリファレンス</Link></li>
      </ul>
    </DocumentationArticle>
  );
}
