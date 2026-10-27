# 導入する

ビルドなしの静的HTMLから使えます。ライブラリはGitHubリポジトリから取得し、そのまま配信できます。npmを使うプロジェクトにも導入できます。

## リポジトリを取得する

[GitHubのCodeメニューからZIPをダウンロード](https://github.com/masabando/nmrlink)するか、次のコマンドで取得します。

```sh
git clone https://github.com/masabando/nmrlink.git
cd nmrlink
```

静的HTMLから直接接続・解析を使う場合、npmのインストールやビルドは不要です。Node.jsからの利用やローカルデモでは、リポジトリのルートで `npm ci` を実行して依存パッケージを導入します。Node.js 24 LTSを推奨します。

## 静的HTMLで使う

HTMLをnmrlink/ルートに置いた場合の読み込みです。

```js
import { NMRController, analyzeMeasurement } from "./packages/nmrlink/src/index.js";
import { NMRGraphs } from "./packages/nmrlink/src/graphs.js";
import { saveMeasurement } from "./packages/nmrlink/src/browser.js";
```

コピー用HTMLはこの相対パスを使います。nmrlink/直下へexample.htmlなどの名前で保存し、Live Serverなどで開きます。別フォルダへ置く場合はimport先を調整します。秘密鍵などを置いていない直接接続用の作業フォルダを使ってください。

## 利用環境

| 用途 | 必要なもの |
| --- | --- |
| 実機へ直接接続 | Web Serial対応デスクトップブラウザ、HTTPSまたは同じPCのlocalhost、USBシリアル接続 |
| 模擬グラフの表示 | ES modulesとResizeObserverが使えるブラウザ |

スマホでこのサイトや模擬グラフを閲覧できます。実機との直接接続には対応ブラウザと接続した端末を使います。file: URLではなくWebサーバーから配信してください。

Linuxで実機に接続する場合は、[接続と切断のLinux向け案内](./connection.md)でシリアルポートの権限を確認してください。

## OSとブラウザの選び方

実機への直接接続には、デスクトップ版のChromeまたはEdgeの最新版を基本の選択肢として使ってください。Firefoxも151以降でWeb Serialに対応しています。SafariはWeb Serialに対応していないため、Macでも実機への直接接続には使えません。

| OS | 直接接続に使うブラウザ | 注意点 |
| --- | --- | --- |
| macOS | Chrome、Edge、Firefox 151以降 | Safariでは実機へ直接接続できません |
| Windows | Chrome、Edge、Firefox 151以降 | 組織の管理ポリシーで機器へのアクセスが制限される場合があります |
| Linux | Chrome、Edge、Firefox 151以降 | シリアルポートの権限とブラウザの導入方法を確認してください |

これはブラウザのAPI対応に基づく案内であり、すべての組み合わせでNMRLinkの実機動作を確認した一覧ではありません。NMRLinkの標準Web UIはmacOSのChromeで実機確認しています。Debian 13のFirefoxでの成功報告は、ライブラリ化前のブラウザ制御プログラムに対するもので、NMRLinkの動作確認とは区別しています。

Firefoxでは、初回のポート選択前にサイトの機器アクセスを許可するためのアドオン導入案内が表示される場合があります。組織管理下では管理者によるWeb Serialの許可も必要になる場合があります。古いFirefoxやESR版を使う場合は、対応バージョンか確認してください。

Snap版Chromiumでは、Snapの `raw-usb` 権限の接続が必要になる場合があります。Linux側のポート権限とは別の設定です。確認方法とコマンドは[接続と切断のSnap版Chromium向け手順](./connection.md)を参照してください。

LinuxのSnap版Firefoxには、Web Serialのポートが表示されない[既知の問題](https://bugzilla.mozilla.org/show_bug.cgi?id=2038075)があります。通常のユーザー権限に加えて、配布パッケージによる制限も確認してください。Firefoxを使う場合は、[Mozilla公式のLinux導入案内](https://support.mozilla.org/en-US/kb/install-firefox-linux)から非Snap版の導入方法も確認できます。[Linuxでの接続手順](./connection.md)も参照してください。

スマホ・タブレットは、このドキュメントや模擬グラフの閲覧に使えます。NMRLinkの実機への直接接続は、装置をUSB接続したPCで行ってください。Safariでもドキュメントの閲覧や保存済みデータの表示・解析は可能です。直接接続の制限は、これらの閲覧・解析の制限ではありません。

対応状況の詳細は[MDNのWeb Serial API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API#browser_compatibility)と[MozillaのFirefox対応案内](https://hacks.mozilla.org/2026/05/web-serial-support-in-firefox/)を参照してください。

## バンドラーで使う

プロジェクトで次を実行します。

```sh
npm install nmrlink
```

```js
import { NMRController, analyzeMeasurement } from "nmrlink";
import { NMRGraphs } from "nmrlink/graphs";
import { saveMeasurement } from "nmrlink/browser";
```

Viteなどのバンドラーから使えます。ブラウザへHTMLをそのまま配信する場合は、上記「静的HTMLで使う」の相対URLを使います。npmパッケージはES modules形式で、実行時依存パッケージはありません。TypeScript型定義は含みません。

[最初の測定へ進む](./first.md)

## AIと一緒にWeb UIを作る

[AI向けドキュメント（llms.txt）](../llms.txt)に、導入方法・API・最小コード例・制約をまとめています。AIにこのファイルのURLや内容を渡し、自作Web UIの実装に利用できます。渡し方と依頼文の例は[AIと一緒にWeb UIを作る](./ai.md)を参照してください。
