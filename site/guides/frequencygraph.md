# 周波数応答を描く

`nmrlink/graphs` の `createFrequencyPlot()` で、設定周波数と信号振幅のグラフを描けます。周波数調整の標準Web UIも同じ関数を使います。

<!-- example:frequencygraph -->

## 実測データに置き換える

`evaluateFrequency(record, analysis)` または `runFrequencySweep()` が返したpointsを渡します。描画だけなら各点のfrequencyHz（Hz）・amplitude（信号振幅）があれば使えます。横軸はkHzへ変換し、高さは280 pxです。配列のデータ自体は変更しません。

返り値はSVGの文字列です。例のように要素のinnerHTMLへ配置し、ResizeObserverで幅の変更時に再描画します。軸・線・点の描画はライブラリが行います。

[周波数調整の使い方](./frequency.md) / [APIリファレンス](../reference/api.md)
