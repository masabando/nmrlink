# NMRLink 従来版Web UI

現行の日英Web UIは [website/](../../website/) にあります。このフォルダは従来版の測定画面です。

ライブラリはnpm公開済みの **nmrlink@0.1.4** を `vendor/nmrlink-0.1.4/` に同梱して固定しています。開発中の `packages/nmrlink/src/` は参照しません。同梱物はnpm配布アーカイブを変更せず展開したもので、ライセンスは同フォルダの `LICENSE` を参照してください。

装置を直接接続してSingle/Double測定、FID/FFT表示、再解析、保存を行う画面です。NMRController・analyzeMeasurement・NMRGraphsを使います。自作UIを学ぶ最小例はexamples/direct/です。

HTTPSまたはlocalhostで、Web Serial対応ブラウザから開きます。従来版を使う場合はこのフォルダのHTMLを直接開きます。生成・配信にはnmrlink/ルートでnpm run docs:buildを実行し、website/out/だけを配信します。

測定・解析の基本は [標準Web UIで測定する](https://masabando.github.io/nmrlink/guide/standard/) を参照してください。ただし従来版の画面間移動には、操作を完了してから切断する必要があります。通信エラー時に測定コマンドを自動再送することはありません。
