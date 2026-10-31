import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";
import RemoteNotice from "@/components/RemoteNotice";

export const metadata: Metadata = { title: "遠隔接続の仕組みと始め方" };

export default function Page() {
  return (
    <DocumentationArticle>
      <h1>遠隔接続の仕組みと始め方</h1>
      <RemoteNotice locale="ja" />
      <p>装置につないだPCでnmrlink-serverを動かし、別の場所のブラウザからGoogleアカウントでログインして操作する構成です。利用者のPCに装置をつなぐ必要はありません。</p>
      <h2>3つの場所で動きます</h2>
      <CodeBlock language="text" code={`利用者のブラウザ（静的Web UI）
        ↕ Firebase Authentication・Firestore
装置側PC（Node.js・nmrlink-server）
        ↕ USBシリアル
      NMR装置`} />
      <ul>
        <li>WebサーバーはHTML・JavaScriptを配信します。Node.jsを動かす必要はありません。</li>
        <li>Firebaseはログインと命令・結果の中継に使います。</li>
        <li>装置側PCが命令を受けてシリアル通信します。遠隔版の利用者ブラウザはWeb Serial APIを使いません。</li>
      </ul>
      <p>同じLANへの限定はありません。装置側PCと利用者のブラウザからFirebaseへの接続が必要です。装置側に公開HTTPサーバーを立てたり、ルーターのポート転送を設定したりする構成ではありません。</p>
      <h2>管理者が準備するもの</h2>
      <ol>
        <li>対応する実機、通信用USB、装置に接続したPCとNode.js 22以上。</li>
        <li>管理者のFirebaseプロジェクト。課金登録のないSparkプランで、GoogleログインとFirestoreを設定します。</li>
        <li>装置側PCの非公開設定と、利用を許可するアカウントの設定。</li>
        <li>公開用のWeb UIを置くHTTPSの静的Webサーバー。</li>
      </ol>
      <p><Link href="/guide/remote-admin">管理者の設定</Link>に、設定ファイルと配信の手順をまとめています。nmrlink-serverは現在npm公開していないため、GitHubのリポジトリから利用します。</p>
      <h2>利用者の操作</h2>
      <ol>
        <li>Web UIを開き、Googleアカウントでログインします。</li>
        <li>「利用開始・再開」で利用権を取得します。管理者の許可設定に合わない場合や、他の人が使用中の場合は取得できません。</li>
        <li>条件を確認し、SingleまたはDoubleで測定します。</li>
        <li>必要な結果をダウンロードします。</li>
        <li>「利用終了・データ削除」で終了します。削除が完了してから次の人が使えます。</li>
      </ol>
      <p>一度に利用できるのは1つのセッションです。順番待ちや予約はありません。同じアカウントでも別タブは別セッションです。同じタブの再読み込み後は「利用開始・再開」で再開します。</p>
      <h2>切断とデータの扱い</h2>
      <p>通信が途切れても、進行中の実機測定は即時停止しません。再接続の猶予は既定で3分です。測定中に切れた場合は、測定完了後から猶予を数えます。結果が不明なときに測定命令を自動再送しないでください。</p>
      <p>利用終了・猶予切れなどの引き継ぎ時にクラウド上の結果と要求を消去します。削除に失敗したまま次の人に渡しません。ダウンロードしたファイルや手元のコピーは、この削除の対象外です。</p>
      <p>許可されていない人や他の利用者には、通常の画面で測定結果を表示しません。ただし許可設定は装置側で判定し、Firestoreのアクセス制御には反映しません。厳密な機密保持が必要なデータには使わないでください。</p>
      <h2>自分の画面を作る</h2>
      <p>通信はRemoteClient、取得した記録の解析・グラフ・保存はNMRLinkを使います。<Link href="/guide/remote-ui">自作UIへの組み込み</Link>へ進んでください。</p>
      <h2 id="local-demo">実機・Firebaseなしで試す</h2>
      <p>リポジトリを取得して、ルートで次を実行するとローカルデモを開けます。実機・Googleアカウント・Firebaseの設定・課金登録は不要です。</p>
      <CodeBlock language="sh" code={`npm install
npm run demo`} />
      <p>表示されたlocalhostのURLを開き、デモログイン・利用開始・模擬測定・データ削除と交代を試せます。初回はエミュレーターやJavaをダウンロードする場合があります。終了はターミナルでCtrl+Cを押します。<a href="https://github.com/masabando/nmrlink/tree/main/examples/demo">ローカルデモの詳しい使い方</a>も参照してください。模擬環境での成功は実環境の検証とは別です。</p>
    </DocumentationArticle>
  );
}
