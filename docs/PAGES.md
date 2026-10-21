# GitHub Pagesでの公開と保守

原稿は既存のMarkdown、利用者向け原稿はsite/guides/、トップページはsite/guides/introduction.md、見た目はsite/style.css、生成処理はscripts/build-docs.jsです。生成HTMLを手で編集せず、原稿を変更して再生成します。閲覧側のビルドは不要です。ドキュメントのCSS・JavaScriptは同梱します。直接接続サンプルのNoto Sans JPはGoogle Fontsから読み込み、未接続時はシステムのsans-serifへフォールバックします。

## ローカルで確認

Node.js 24 LTSを推奨します。nmrlink/ルートで実行します。

```sh
npm ci
npm run docs:build
npm run docs:check
npm run test:docs
```

生成先はdist/pages/です。Live Serverでこのフォルダだけを開きます。ドキュメントのトップはindex.html、実機用サンプルはexamples/direct/index.htmlです。ファイルを直接開くfile: URLではなく、localhostのWebサーバーからアクセスします。

出力先は生成のたびに作り直します。秘密鍵、.env.local、利用許可ファイル、遠隔用config.js、node_modulesはコピーしません。公開対象はbuild-docs.jsの明示的なリストで管理します。

## GitHubで公開

1. nmrlink/をGitリポジトリのルートとしてGitHubへアップロードします。親のNMR/全体は対象にしません。
2. リポジトリのSettings → PagesでSourceをGitHub Actionsに設定します。
3. mainブランチへのpush、またはActionsのDeploy documentationから手動実行します。
4. Actionsが成功すると、PagesのURLでドキュメントと直接接続サンプルを公開できます。

既定のブランチ名がmain以外なら.github/workflows/pages.ymlのbranchesを変更します。URLにリポジトリ名が含まれるプロジェクトサイトでも、相対リンクで動作します。公開先は https://masabando.github.io/nmrlink/ です。

## サンプルについて

直接接続サンプルはソースをそのままコピーします。app.jsからライブラリへの相対参照も保持します。接続ボタンからWeb Serial APIを呼び、FID・FFTグラフの表示とJSON保存を行います。末尾100点の補正、FID表示0〜10 ms（縦軸は1〜5 msで調整、範囲外はクリップ）・1〜5 msのHann窓FFT（終端を含まない）、周波数表示±10 kHzは固定です。

PagesはHTTPSで配信されますが、Web Serialの対応・利用許可はブラウザや端末の設定にも依存します。装置の停止命令を持たないため、測定中の即時停止には対応しません。

## 文書を追加するとき

build-docs.jsのpages配列へ原稿パス・出力先・ナビゲーション名を追加し、groups配列の該当分類へ出力先を登録します。Markdownの相対リンクは公開先へ変換されます。docs:checkは公開ファイルのリンクとES moduleの相対import先を検査します。サーバーのソースや設定を公開対象へ追加する必要はありません。

ワークフローはGitHub公式の [upload-pages-artifact](https://github.com/actions/upload-pages-artifact) と [deploy-pages](https://github.com/actions/deploy-pages) を使い、生成・リンク確認に成功した出力だけを公開します。

## 表示例とコピー用コード

site/examples.jsを表示例とコピー用HTMLの共通原稿として使います。各Markdownの `<!-- example:名前 -->` に、動くプレビューと完全なHTMLコードを挿入します。コード欄はコピー用HTMLのdetailsを開くと現れ、コピーボタンから取得できます。コピー用HTMLはnmrlink/直下に保存する前提の相対importです。

操作プレビューは模擬装置ですが、対応するコピー用コードは実機用です。グラフ・解析・保存の例はどちらも模擬データです。各欄で区別を明示します。iframeは同じサイトから配信し、高さ通知はそのiframe自身のものだけ受け取ります。端末幅に応じたメニュー、ページ名検索、コードコピーはsite/site.jsで提供します。LANのHTTPでもコピーを試せるフォールバックを備えています。

公開ナビゲーションはbuild-docs.jsのgroups配列で管理します。原稿はsite/guides/とsite/reference/だけを公開します。本書を含むサイト保守・通信内部仕様・開発状況・リポジトリREADMEはPagesへ生成せず、リポジトリ内だけで管理します。API・解析・遠隔設定のURLはsite/reference/の原稿から生成します。
