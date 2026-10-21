# NMRLink

教育用NMR装置の測定と波形解析を、自分のWeb UIに組み込めるJavaScriptライブラリです。Web Serial APIによる直接接続と、Node.js・Firebaseによる遠隔接続に対応しています。

[ドキュメント](https://masabando.github.io/nmrlink/) · [標準Web UI](https://masabando.github.io/nmrlink/examples/standard/) · [自作UI用の最小サンプル](./examples/direct/)

## 直接接続で使う

このリポジトリを取得し、秘密設定を置いていないコピーをLive ServerなどのWebサーバーから配信します。`examples/standard/index.html` を開くと、条件設定・Single/Double測定・FID/FFT・再解析・JSON/CSV/SVG/PNG保存を利用できます。模擬FIDは実機なしでも表示できます。

実機への接続にはWeb Serial対応デスクトップブラウザと、HTTPSまたは同じPCのlocalhostが必要です。直接接続版の実行にnpmやFirebaseは不要です。

自作UIでは、ES moduleから必要な機能を読み込みます。以下はリポジトリ直下にHTMLを置く場合のパスです。

```js
import { NMRController, analyzeMeasurement } from "./packages/nmrlink/src/index.js";
import { NMRGraphs } from "./packages/nmrlink/src/graphs.js";
import { saveMeasurement } from "./packages/nmrlink/src/browser.js";
```

[導入ガイド](https://masabando.github.io/nmrlink/guide/install.html)に、動かせる表示例とコピー用HTMLがあります。npmレジストリからのインストールは使用しません。

## 周波数を調整する

[周波数調整画面](https://masabando.github.io/nmrlink/examples/standard/frequency.html)でSingle測定を周波数走査し、FFTピーク振幅を比較できます。実測最大の候補、各点のFID/FFT、走査JSON・CSV・PNG保存を提供します。走査中の停止は現在の測定が完了してから次の点を開始しない方式です。実機なしの走査デモも使えます。

## パルスを校正する

[パルス校正画面](https://masabando.github.io/nmrlink/examples/standard/pulse.html)で固定周波数の周期数走査を行い、共通位相基準の符号付き信号とサイン近似から90°・180°の周期数候補を確認できます。波形の選択表示、再解析、保存と実機なしのデモを備えています。

## T1・T2を測定する

[T1測定](https://masabando.github.io/nmrlink/examples/standard/t1.html)では反転回復法の走査、共通位相での符号付き信号、指数関数近似、保存JSONの再解析を利用できます。

[T2測定](https://masabando.github.io/nmrlink/examples/standard/t2.html)ではスピンエコーの走査、エコーに追従する解析、指数関数近似、JSON保存・復元、CSV・PNG保存を利用できます。

## 設定・実機なしで遠隔操作の流れを試す

Node.js 24 LTSを推奨します。このリポジトリのルートで実行します。

```sh
npm ci
npm run demo
```

表示された http://127.0.0.1:4173 を開き、模擬ユーザーのログイン・測定・解析・保存・利用者交代を試せます。Firebase設定と実機は不要です。初回はネット接続が必要です。[デモの使い方](./examples/demo/README.md)を参照してください。

## 遠隔接続で使う

装置側PCのNode.jsプログラムがUSBシリアルで測定し、利用者のブラウザはFirebaseを介して接続します。同じLANやVPNは不要です。課金登録なしのSparkプランでAuthenticationとFirestoreを使用し、Functions・Storageは使用しません。

[遠隔接続の設定](https://masabando.github.io/nmrlink/docs/FIREBASE.html)に従って設定し、装置側PCで `npm start` を実行します。公開するWeb UIは `npm run export:remote` で生成した `dist/remote/` だけを配信します。秘密鍵・`.env.local`・利用許可ファイルは公開しません。

## パッケージと構成

| フォルダ | 内容 |
| --- | --- |
| [packages/nmrlink](./packages/nmrlink/) | 共通制御・Web Serial・解析・グラフ・保存 |
| [packages/nmrlink-server](./packages/nmrlink-server/) | Node.jsシリアル・Firebase連携・遠隔利用管理 |
| [examples](./examples/) | 標準Web UI・自作UI用の例・遠隔サンプル・デモ |
| [original](./original/) | 近藤先生から提供されたPython製の原本 |
| site / model | ドキュメントサイトの原稿・3Dモデル |
| tests | 模擬通信・解析・画面用処理のテスト |

npm workspacesで2つのパッケージを管理しています。`private: true` はnpmへの誤公開を防ぐ設定です。ソースを使う導入方法は上記ガイドを参照してください。JavaScriptのES modulesを提供しており、TypeScript型定義は含みません。

## 開発の背景

[近藤先生](https://www.phys.kindai.ac.jp/laboratory/kondo/)から提供された装置制御プログラムをもとに開発しています。許可を得て公開している[オリジナルのPythonコード](./original/)も参照できます。

## 開発・検証

依存パッケージ導入後、`npm test` で共通制御・通信・解析のテストを実行できます。`npm run docs:build` で公開サイトを生成し、`npm run docs:check` と `npm run test:docs` で確認します。

検証済みと未確認の範囲は[確認状況](./docs/STATUS.md)、装置との通信は[通信仕様](./docs/PROTOCOL.md)、ドキュメントサイトの作業は[公開・保守手順](./docs/PAGES.md)を参照してください。

## ライセンス

NMRLink本体は[MITライセンス](./LICENSE)で提供します。`original/` に含まれる近藤先生から提供されたプログラムは対象外で、ライセンス未定です。詳細は[original/README.md](./original/README.md)を参照してください。第三者のライブラリ・素材には、それぞれのライセンスが適用されます。
