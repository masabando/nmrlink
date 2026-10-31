import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";

export const metadata: Metadata = { title: "対応ブラウザと接続トラブル" };

export default function BrowsersPage() {
  return (
    <DocumentationArticle>
      <h1>対応ブラウザと接続トラブル</h1>
      <p>実機への直接接続には、USB接続したPCでChromeまたはEdgeの最新版を使うのがおすすめです。</p>

      <h2>どのブラウザを使えばいい？</h2>
      <p>次の表はWeb Serial APIの対応に基づく案内です。NMRLinkの実機で確認した環境は、次の節で分けて示します。</p>
      <div className="my-6 overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr><th scope="col">OS</th><th scope="col">直接接続に使えるブラウザ</th><th scope="col">注意点</th></tr>
          </thead>
          <tbody>
            <tr><td>macOS</td><td>Chrome・Edgeの最新版、Firefox 151以降</td><td>Safariでは直接接続できません</td></tr>
            <tr><td>Windows</td><td>Chrome・Edgeの最新版、Firefox 151以降</td><td>組織の管理ポリシーにより制限される場合があります</td></tr>
            <tr><td>Linux</td><td>Chrome・Edgeの最新版、Firefox 151以降</td><td>ポートの権限とブラウザの配布形式も確認してください</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Firefoxでは、初回の機器アクセス時にアドオンの導入を案内される場合があります。
        古いFirefoxやESR版を使う場合は、対応バージョンか確認してください。
      </p>
      <p>スマホ・タブレットやSafariでも、ドキュメント・模擬グラフ・保存済みデータの表示や解析は可能です。実機への直接接続は対応ブラウザを使うPCで行ってください。</p>

      <h2>実機で確認した環境</h2>
      <ul>
        <li><strong>NMRLinkの標準Web UI：</strong>macOSのChromeで、標準測定・周波数調整・パルス校正・T1測定・T2測定を確認済みです。</li>
        <li><strong>その他の組み合わせ：</strong>ブラウザがAPIに対応していても、NMRLinkの実機動作をすべて確認したわけではありません。</li>
      </ul>
      <p>Debian 13のFirefoxでの成功報告は、ライブラリ化前のブラウザ制御プログラムに対するものです。</p>

      <h2>接続できないときの確認順</h2>
      <ol>
        <li>
          <strong>ブラウザとURLを確認する。</strong>
          対応ブラウザで、HTTPSまたは装置を接続したPCのlocalhostから開いてください。
          file: URLや、通常のHTTPのLANアドレスでは直接接続できません。
        </li>
        <li>
          <strong>USB接続を確認する。</strong>
          装置の電源と通信用USBケーブルを確認し、OSでシリアルポートとして認識されるか調べます。
        </li>
        <li>
          <strong>ほかのアプリやタブがポートを使っていないか確認する。</strong>
          Pythonの制御プログラム、シリアルモニター、別の測定画面などは、測定の完了を待って切断してください。
        </li>
        <li>
          <strong>「接続」を押し、装置のポートを選んで許可する。</strong>
          ポートが出ない場合はOSの権限や配布パッケージの制限を、許可できない場合はブラウザのサイト設定や組織の管理ポリシーを確認します。
        </li>
      </ol>
      <p>
        自作UIでは、ポート選択を接続ボタンのクリックから直接呼んでください。
        詳しいAPIの扱いは<Link href="/guide/measurement">測定を制御する</Link>を参照してください。
      </p>

      <h2 id="linux">Linuxで確認すること</h2>
      <h3>OS側のシリアルポート権限</h3>
      <p>
        ブラウザを実行するユーザーに、装置のポートを読み書きする権限が必要です。
        Debian系では、ポートの所属グループが <code>dialout</code> の場合があります。
        グループを追加した場合は、デスクトップからログアウトして再ログインしてください。
      </p>
      <p>/dev/ttyACM0は例です。実際のポート名に置き換え、所属グループと現在のユーザーのグループを確認します。</p>
      <CodeBlock language="sh" code={`ls -l /dev/ttyACM0
id -nG`} />
      <p>ポートの所属グループがdialoutで、利用者が未加入の場合は管理者へ追加を依頼します。管理者権限を持つユーザーが自分自身を追加する例です。実行後はデスクトップからログアウトし、再ログインしてください。</p>
      <CodeBlock language="sh" code={`sudo usermod -aG dialout "$USER"`} />
      <h3>Snapなどの配布形式による制限</h3>
      <p>
        Snap版Chromiumでは、OSの権限に加えてSnapの <code>raw-usb</code> インターフェースの接続が必要になる場合があります。
      </p>
      <p>
        Snap版Firefoxには、ポートが表示されない<a href="https://bugzilla.mozilla.org/show_bug.cgi?id=2038075">既知の問題</a>があります。
        Chromium用のコマンドをそのままFirefoxに置き換える対処は使わず、
        <a href="https://support.mozilla.org/en-US/kb/install-firefox-linux">Mozilla公式の案内</a>で非Snap版の導入方法も確認してください。
      </p>
      <CodeBlock language="sh" code={`snap list chromium
snap connections chromium`} />
      <p>raw-usbの行があり、Slot欄が「-」なら未接続です。管理者が次を実行すると、ChromiumにUSB機器へのアクセスを許可できます。</p>
      <CodeBlock language="sh" code="sudo snap connect chromium:raw-usb" />
      <p>Chromiumを完全に終了して起動し直します。この許可はNMR装置だけには限定されず、OS側の権限も別途必要です。raw-usbの行がないパッケージには適用できず、接続成功を保証するものではありません。<a href="https://snapcraft.io/docs/reference/interfaces/raw-usb-interface/">Snapのraw-usb仕様</a>も参照してください。</p>

      <h2>解決しない場合</h2>
      <p>次の情報があると、原因を切り分けやすくなります。</p>
      <ul>
        <li>OSとブラウザの名前・バージョン。Linuxではブラウザの導入方法も。</li>
        <li>ポート選択画面が開くか、装置が一覧に出るか、選択したあとに接続できるか。</li>
        <li>画面に表示されたエラーメッセージ。</li>
      </ul>
      <p><Link href="/guide/install">導入するに戻る</Link></p>
      <p>
        参照：<a href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API#browser_compatibility">MDNのWeb Serial API対応表</a>、
        <a href="https://hacks.mozilla.org/2026/05/web-serial-support-in-firefox/">MozillaのFirefox対応案内</a>。
      </p>
    </DocumentationArticle>
  );
}
