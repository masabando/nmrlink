# 導入する

ビルドなしの静的HTMLから使えます。ライブラリはGitHubリポジトリから取得し、そのまま配信できます。npmレジストリからのインストールは使用しません。

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

## バンドラーで使う

workspace内ではnmrlink、nmrlink/graphs、nmrlink/browserのパッケージ名でimportできます。静的ブラウザでは相対URLを使います。

[最初の測定へ進む](./first.md)
