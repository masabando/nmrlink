# NMRLink

教育用NMR装置の制御・測定データの解析・グラフ表示を、自分のWeb UIに組み込めるJavaScriptライブラリです。Web Serial APIでブラウザから装置へ直接接続します。

[ドキュメント](https://masabando.github.io/nmrlink/) · [npm](https://www.npmjs.com/package/nmrlink) · [標準Web UI](https://masabando.github.io/nmrlink/examples/standard/) · [最小サンプル](./examples/direct/)

## ライブラリを使う

```sh
npm install nmrlink
```

```js
import { NMRController, analyzeMeasurement } from "nmrlink";
import { NMRGraphs } from "nmrlink/graphs";
import { saveMeasurement } from "nmrlink/browser";
```

Viteなどのバンドラーから利用できます。ビルドなしの静的HTMLでは、リポジトリ内のソースを相対URLで読み込めます。表示例とコピーして使えるコードは[導入ガイド](https://masabando.github.io/nmrlink/guide/install.html)、APIの詳細は[リファレンス](https://masabando.github.io/nmrlink/docs/API.html)を参照してください。

ES modules形式で、実行時依存パッケージはありません。TypeScript型定義は含みません。

## 標準Web UIを使う

[標準Web UI](https://masabando.github.io/nmrlink/examples/standard/)から測定できます。実機なしで試すための模擬データ表示もあります。

- Single・Double測定、FID・FFT表示、解析範囲・窓関数の変更
- 周波数調整、パルス校正、T1・T2測定と近似
- JSON保存・読み込み、CSV出力、SVG・PNG保存

実機への接続にはWeb Serial対応のデスクトップブラウザ、HTTPSまたは同じPCのlocalhost、USBシリアル接続が必要です。装置・試料に合わせて測定条件を確認してください。測定中の即時停止には対応していません。

自分のWebサーバーで使う場合は、このリポジトリの直接接続用コピーを配信し、`examples/standard/` を開きます。FirebaseやNode.jsの常駐プログラムは不要です。自作UIの構成は[最小サンプル](./examples/direct/)で確認できます。

## 遠隔接続（未検証）

装置側PCのNode.jsプログラムとFirebaseを介して利用する構成です。実環境では未検証のため、現時点での利用はお控えください。[遠隔接続の説明](https://masabando.github.io/nmrlink/guide/remote.html)を参照してください。

実機とFirebase設定を使わずに操作の流れを試す場合は、Node.js 24でリポジトリのルートから実行します。

```sh
npm ci
npm run demo
```

表示されたURLを開きます。詳しくは[デモの使い方](./examples/demo/README.md)を参照してください。

## リポジトリの構成

| フォルダ | 内容 |
| --- | --- |
| [packages/nmrlink](./packages/nmrlink/) | 装置制御・Web Serial・解析・グラフ・保存。npm配布対象 |
| [packages/nmrlink-server](./packages/nmrlink-server/) | Node.jsシリアル接続・Firebase連携。npm未公開 |
| [examples](./examples/) | 標準Web UI・最小サンプル・遠隔サンプル・デモ |
| site / model | ドキュメントサイトの原稿・3Dモデル |
| docs | 通信仕様・組み込み・ビルド手順 |
| tests | 通信・解析・画面用処理のテスト |
| [original](./original/) | 近藤先生から提供されたPythonプログラム |

テストは `npm test`、配布物の独立インストール確認は `npm run test:package` で実行します。サイトの生成・参照確認は `npm run docs:build` と `npm run docs:check` です。[サイトのビルド手順](./docs/PAGES.md)も参照してください。

## 原本とライセンス

[近藤先生](https://www.phys.kindai.ac.jp/laboratory/kondo/)から提供された装置制御プログラムをもとに開発しています。許可を得て公開している[Pythonの原本](./original/)も参照できます。

NMRLink本体は[MITライセンス](./LICENSE)です。`original/` の提供プログラムはMITの対象外で、ライセンス未定です。第三者のライブラリ・素材には、それぞれのライセンスが適用されます。
