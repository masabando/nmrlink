# NMRLink

[English](./README.md) | 日本語

[![version](https://img.shields.io/github/v/tag/masabando/nmrlink?style=flat&label=version)](https://github.com/masabando/nmrlink/tags)
[![GitHub stars](https://img.shields.io/github/stars/masabando/nmrlink?style=flat&logo=github)](https://github.com/masabando/nmrlink/stargazers)
[![last commit](https://img.shields.io/github/last-commit/masabando/nmrlink?style=flat)](https://github.com/masabando/nmrlink/commits/main/)
[![docs build](https://img.shields.io/github/actions/workflow/status/masabando/nmrlink/pages.yml?branch=main&style=flat&label=docs)](https://github.com/masabando/nmrlink/actions/workflows/pages.yml)

[近藤 康（近畿大学）](https://researchmap.jp/kondo_yasushi)が開発を進めてきた学生実験用のNMR装置を制御するJavaScriptライブラリです。Web Serial APIによる接続、測定制御、信号解析、グラフ表示を自分のWeb UIに組み込めます。付属の標準Web UIから測定することもできます。

[ドキュメント](https://masabando.github.io/nmrlink/) · [npm](https://www.npmjs.com/package/nmrlink) · [標準Web UI](https://masabando.github.io/nmrlink/ui/?lang=ja) · [最小サンプル](./examples/direct/)

## 対象装置と入手について

実際の測定には、対応する学生実験用NMR装置とUSBシリアル接続が必要です。一般のNMR装置を共通に制御するライブラリではありません。実機なしでも、模擬データによる表示や操作を試せます。

装置は教材販売会社を通じての販売が計画されています。

## 標準Web UIを使う

[標準Web UI](https://masabando.github.io/nmrlink/ui/?lang=ja)から、次の操作ができます。

- Single・Double測定、FID・FFT表示、解析範囲・窓関数の変更
- 周波数調整、パルス校正、T1・T2測定と近似
- JSON保存・読み込み、CSV出力、SVG・PNG保存

実機への直接接続には、Web Serial対応のデスクトップブラウザと、HTTPSまたは同じPCのlocalhostが必要です。[対応ブラウザ・接続トラブル](https://masabando.github.io/nmrlink/guide/browsers/)を確認してください。装置・試料に合わせて測定条件を確認してください。測定中の即時停止には対応していません。

Web UIは現在日本語です。ライブラリのソースとともに自分のWebサーバーで配信することもできます。直接接続では、Firebase設定やNode.jsの常駐プログラムは不要です。

## 自分のWeb UIを作る

```sh
npm install nmrlink
```

```js
import { NMRController, analyzeMeasurement } from "nmrlink";
import { NMRGraphs } from "nmrlink/graphs";
import { saveMeasurement } from "nmrlink/browser";
```

Viteなどのバンドラーから利用できます。ビルドなしの静的HTMLでは、ソースを相対URLで読み込めます。[導入ガイド](https://masabando.github.io/nmrlink/guide/install/)、[パッケージのREADME](./packages/nmrlink/README.ja.md)、[最小サンプル](./examples/direct/)を参照してください。

読みやすいES modules形式で、実行時依存パッケージはありません。CommonJS形式とTypeScript型定義は含みません。

## 遠隔接続（未検証）

装置側PCのNode.jsプログラムとFirebaseを介して利用する構成です。実環境では未検証のため、現時点での利用はお控えください。[遠隔接続の説明](https://masabando.github.io/nmrlink/guide/remote/)を参照してください。

## 原本とライセンス

[近藤 康（近畿大学）](https://researchmap.jp/kondo_yasushi)から提供されたPythonの装置制御プログラムをもとに開発しています。許可を得て公開している[Pythonの原本](./original/)も参照できます。

NMRLink本体は[MITライセンス](./LICENSE)です。Pythonの原本には、別途[MITライセンスと著作権表示](./original/LICENSE)があります。第三者のライブラリ・素材には、それぞれのライセンスが適用されます。
