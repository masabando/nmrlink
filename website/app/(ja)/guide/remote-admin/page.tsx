import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";
import RemoteNotice from "@/components/RemoteNotice";

export const metadata: Metadata = { title: "管理者の設定" };

export default function Page() {
  return (
    <DocumentationArticle>
      <h1>管理者の設定</h1>
      <RemoteNotice locale="ja" />
      <p>以下は構成と設定の手順です。実環境での遠隔運用を確認済みという意味ではありません。管理者のGoogleパスワードを設定ファイルに書く必要はありません。</p>
      <h2>Firebaseを準備する</h2>
      <ol>
        <li>専用プロジェクトをSparkプランで作成し、課金アカウントをリンクしません。</li>
        <li>AuthenticationでGoogleログインを有効にし、Web UIを配信するドメインを承認済みドメインに登録します。ローカルで試す場合はlocalhostも確認します。</li>
        <li>Cloud FirestoreのStandard・Nativeモードで(default)データベースを作成します。テスト用の全開放ルールは使いません。</li>
        <li>Webアプリを登録し、公開設定を取得します。</li>
        <li>装置側PC用のサービスアカウント鍵JSONを作成します。Firestoreの読み書きとFirebase Authenticationのユーザー参照に必要なIAM権限を付与します。Admin SDKはSecurity Rulesを経由せずIAM権限で動作します。</li>
      </ol>
      <h2>リポジトリと非公開設定</h2>
      <p>Node.js 22以上を用意し、リポジトリのルートで実行します。nmrlink-serverはnpmに公開していません。</p>
      <CodeBlock language="bash" code={`git clone https://github.com/masabando/nmrlink.git
cd nmrlink
npm install
cp .env.example .env.local
cp access-policy.example.json access-policy.json
cp examples/remote/config.example.js examples/remote/config.js`} />
      <p>サービスアカウント鍵をsecrets/service-account.jsonに保存し、.env.localを編集します。鍵・.env.local・access-policy.jsonは公開しません。パスは.env.localからの相対パスです。</p>
      <CodeBlock language="dotenv" code={`NMRLINK_PROJECT_ID=your-firebase-project-id
NMRLINK_DEVICE_ID=nmr-01
NMRLINK_SERIAL_PORT=/dev/cu.YOUR_DEVICE
NMRLINK_CREDENTIALS=./secrets/service-account.json
NMRLINK_ACCESS_POLICY=./access-policy.json
NMRLINK_RECONNECT_GRACE_MS=180000
NMRLINK_CONFIRM_DEVICE_IDLE=false`} />
      <p>プロジェクトID、装置ID、実際のシリアルポート名を合わせます。猶予時間はミリ秒で、最小60000です。</p>
      <h2>利用を許可するアカウント</h2>
      <p>access-policy.jsonの例です。ドメインは完全一致です。下の設定ならktc.ac.jpの学生・教職員を許可します。</p>
      <CodeBlock language="json" code={`{
  "allowedDomains": [
    "ktc.ac.jp"
  ],
  "allowedEmails": [],
  "allowedEmailPatterns": [],
  "deniedEmails": []
}`} />
      <p>deniedEmailsを優先し、allowedDomains・allowedEmails・allowedEmailPatternsのいずれかに一致すれば許可します。大文字・小文字は区別しません。許可条件が全て空なら誰も許可しません。無効な設定は起動時にエラーになります。</p>
      <p>正規表現も使えます。例えばJSONのallowedEmailPatternsに入れる文字列は<code>{String.raw`"@ktc\\.ac\\.jp$"`}</code>です。単純なドメイン制限にはallowedDomainsの方が読みやすくなります。変更は利用終了後にサーバーを再起動して反映します。</p>
      <p>この設定は装置の利用許可です。Firestore Rulesに許可一覧を反映する仕組みはありません。現在のルールは、Google認証済みユーザーによる装置情報と既知IDの結果の取得を許しています。通常の画面で隠すことと、データへの厳密なアクセス制御は異なります。</p>
      <h2>Firestoreのルールとインデックス</h2>
      <p>リポジトリ内のfirebase/firestore.rulesとfirebase/firestore.indexes.jsonを使います。次のコマンドは指定したクラウドプロジェクトへ設定を反映します。</p>
      <CodeBlock language="bash" code={`npx firebase login
npx firebase deploy --only firestore:rules,firestore:indexes --project YOUR_PROJECT_ID`} />
      <h2>公開するWeb UIと装置側PCを分ける</h2>
      <p>examples/remote/config.jsにFirebase Webアプリの公開設定とdeviceIdを書きます。.env.localと同じプロジェクト・装置IDを使ってください。公開設定のAPIキーと、非公開のサービスアカウント鍵は別物です。</p>
      <CodeBlock language="js" code={`export const firebaseConfig = {
  apiKey: "YOUR_PUBLIC_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  appId: "YOUR_WEB_APP_ID",
};
export const deviceId = "nmr-01";`} />
      <CodeBlock language="bash" code="npm run export:remote" />
      <p>生成されたdist/remote/の中身だけをHTTPSのWebサーバーに置きます。Firebase Hostingは必須ではありません。リポジトリ全体を配信すると秘密情報が漏れるため、配信対象にしないでください。Firebase SDKはネットワークから読み込みます。</p>
      <p>装置側PCではUSBを接続し、リポジトリのルートで起動します。これはWebサーバーの起動ではありません。</p>
      <CodeBlock language="bash" code="npm start" />
      <h2>終了・復旧・無料枠</h2>
      <p>装置1台につきエージェントは1つだけ動かします。Ctrl+Cでは進行中の測定を待ち、データを消去して切断します。クラウド通信や削除に失敗した場合は新しい利用を受け付けません。原因を解消してから再起動してください。</p>
      <p>測定中に異常終了した記録がある場合は、装置が測定していないことを管理者が確認してからNMRLINK_CONFIRM_DEVICE_IDLE=trueで復旧します。その後はfalseに戻します。この設定は装置を停止させる命令ではありません。</p>
      <p>課金登録なしのSparkプランを前提とし、Cloud Functions・Cloud Storageは使いません。無料枠は無制限ではなく、待機中の状態更新や監視も使用量に含まれます。上限や通信障害で操作・削除が止まる可能性があります。</p>
      <p><a href="https://firebase.google.com/docs/projects/billing/firebase-pricing-plans">Firebase pricing plans</a> · <a href="https://firebase.google.com/docs/firestore/quotas">Firestore quotas</a></p>
      <p><Link href="/guide/remote">仕組みと利用の流れ</Link> · <Link href="/guide/remote-ui">自作UIへの組み込み</Link></p>
    </DocumentationArticle>
  );
}
