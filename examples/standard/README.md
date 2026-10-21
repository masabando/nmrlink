# NMRLink 標準Web UI

装置を直接接続してSingle/Double測定、FID/FFT表示、再解析、保存を行う画面です。NMRController・analyzeMeasurement・NMRGraphsを使います。自作UIを学ぶ最小例はexamples/direct/です。

HTTPSまたはlocalhostで、Web Serial対応ブラウザから開きます。公開サイトのメニュー「Web UI」から起動できます。生成・配信にはnmrlink/ルートでnpm run docs:buildを実行し、dist/pages/だけを配信します。

利用手順は [標準Web UIで測定する](../../site/guides/standard.md) を参照してください。実機の操作確認は利用者が行い、変更後の確認は模擬データで行います。装置へのコマンドを勝手に再送しません。
