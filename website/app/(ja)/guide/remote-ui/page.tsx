import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";
import RemoteNotice from "@/components/RemoteNotice";

export const metadata: Metadata = { title: "自作UIへの組み込み" };

export default function Page() {
  return (
    <DocumentationArticle>
      <h1>自作UIへの組み込み</h1>
      <RemoteNotice locale="ja" />
      <p>遠隔接続にはnmrlink-serverのRemoteClientを使います。直接接続用のNMRControllerにRemoteClientを渡す構成ではありません。取得後の測定記録には、直接接続と同じNMRLinkの解析・グラフ・保存APIを使えます。</p>
      <h2>ファイルを配置する</h2>
      <p>最初はリポジトリのexamples/remoteを参照してください。npm run export:remoteはremote-client.jsをdist/remote/にコピーし、サンプルのimport先を修正します。自作UIではこのファイルと、必要なNMRLinkのブラウザ用モジュールを一緒に配信します。</p>
      <p>以下は、remote-client.jsとconfig.jsを画面のJavaScriptと同じ場所に置く例です。Firebase公開設定は<Link href="/guide/remote-admin">管理者の設定</Link>に従って用意します。サービスアカウント鍵をブラウザに渡してはいけません。</p>
      <h2>初期化する</h2>
      <CodeBlock language="js" code={`import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import * as firestore from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";
import { RemoteClient } from "./remote-client.js";
import { firebaseConfig, deviceId } from "./config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = firestore.getFirestore(app);
let record = null;

const client = new RemoteClient({
  auth, db, deviceId, firestore,
  onClear() {
    record = null;
    // 結果、グラフ、入力条件、保存ボタンを初期化します。
  },
});`} />
      <p>Firestoreの永続キャッシュは有効にしません。onClearは利用権を失った場合などにも呼ばれます。recordだけでなく、画面上の結果や保存対象も忘れずに消してください。</p>
      <h2>ログインして状態を監視する</h2>
      <p>次は上の初期化コードに続ける操作例です。login・measureSingle・finishをボタンのクリックに結びつけます。renderStateでは画面を更新し、busy中は操作を無効にします。measureはownedかつonlineのときだけ有効にしてください。</p>
      <CodeBlock language="js" code={`let state = { owned: false, online: false, state: "offline" };
let busy = false;
let unwatch;

function renderState() {
  // Update status and button states in your own UI.
}

async function operate(action) {
  if (busy) return;
  busy = true;
  renderState();
  try {
    await action();
  } catch (error) {
    console.error(error); // Also show the message in your UI.
  } finally {
    busy = false;
    renderState();
  }
}

async function login() {
  await operate(async () => {
    await signInWithPopup(auth, new GoogleAuthProvider());
    unwatch?.();
    unwatch = client.watchDevice(next => {
      state = next;
      renderState();
    }, error => {
      state = { ...state, online: false };
      console.error(error);
      renderState();
    });
    await client.acquire();
  });
}

async function measureSingle(parameters) {
  if (!state.owned || !state.online) return;
  await operate(async () => {
    record = await client.measure(parameters, { mode: "single" });
    // Analyze, display and enable saving of record here.
  });
}

async function finish() {
  await operate(async () => {
    await client.release();
    // Only sign out after release succeeds.
    unwatch?.();
    unwatch = undefined;
    client.clearLocal();
    state = { owned: false, online: false, state: "offline" };
    await signOut(auth);
  });
}`} />
      <p>これはUIとの接続箇所を示す抜粋です。実際のログイン復元はonAuthStateChangedで扱い、ログイン済みでも利用権の取得は明示操作にします。全体の認証・ボタン・保存処理は<a href="https://github.com/masabando/nmrlink/blob/main/examples/remote/app.js">遠隔サンプルのapp.js</a>で確認できます。</p>
      <p>終了前に必要な結果の保存を促してください。releaseに失敗したときに、終了できた表示にしたり、そのまま別の人へ引き継いだりしません。clearLocalだけではクラウド上の利用権は解放されません。</p>
      <h2>RemoteClientの操作</h2>
      <ul>
        <li><code>watchDevice(onState, onError)</code>：state・owned・onlineを通知し、監視解除関数を返します。測定結果は通知しません。</li>
        <li><code>acquire()</code>：利用権を取得・再開し、ハートビートを開始します。Googleログインが必要です。</li>
        <li><code>measure(parameters, options)</code>：記録を返します。modeはsingleまたはdouble。timeoutMsの既定値は600000です。</li>
        <li><code>release()</code>：利用終了とデータ削除を要求します。</li>
        <li><code>clearLocal()</code>：タブ内のセッション情報とハートビートを消し、onClearを呼びます。実機停止・クラウドの解放は行いません。</li>
      </ul>
      <p>コンストラクターはauth・db・deviceId・firestoreを受け取ります。storageの既定値はsessionStorage、onClearは画面を初期化するコールバックです。deviceIdは英数字・ハイフン・アンダースコアで1〜80文字です。</p>
      <h2>解析・グラフ・保存を共通化する</h2>
      <p>measureが返すrecordを、直接接続と同じように扱います。下はnpmでnmrlinkを導入したブラウザアプリの例です。静的HTMLで配信する場合は、importを配置したモジュールの相対パスに変更してください。</p>
      <CodeBlock language="js" code={`import { analyzeMeasurement } from "nmrlink";

// record is returned by await client.measure(...).
const analysis = analyzeMeasurement(record, {
  startMs: 1,
  endMs: 5,
  tailPoints: 100,
  window: "hann",
});
console.log(analysis);`} />
      <p>引数と表示・保存の例は<Link href="/guide/analysis">信号を解析する</Link>・<Link href="/guide/graphs">グラフを表示する</Link>・<Link href="/guide/save">保存・読み込み</Link>を参照してください。解析範囲は装置と測定方法に合わせて設定します。</p>
      <h2>通信が途切れた場合</h2>
      <p>measureのタイムアウトは即時停止でも利用終了でもありません。失敗やタイムアウト後に自動再送せず、装置状態を確認してください。既定の再接続猶予は3分で、測定中の切断は測定完了後から数えます。</p>
      <p>同じタブのセッション情報で再開します。別タブへの切り替えやclearLocalで、別のセッションとして扱われることがあります。画面を離れるときはまずreleaseを完了させ、その後に監視を解除します。ページ終了イベントで非同期のreleaseが必ず完了するとは考えないでください。</p>
      <p><Link href="/guide/remote">仕組みと始め方</Link> · <Link href="/guide/remote-admin">管理者の設定</Link></p>
    </DocumentationArticle>
  );
}
