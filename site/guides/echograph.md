# T2減衰曲線を描く

`nmrlink/graphs` の `createT2Plot()` で、2τとエコー振幅のグラフを描けます。T2測定の標準Web UIも同じ関数を使います。

<!-- example:echograph -->

各点のtau（ms）とsignal（非負のエコー振幅）を渡します。実測では `analyzeT2(records).points` を使います。`fitT2(points, { fromMs, toMs })` の範囲は2τ [ms]です。T2の単位はmsで、モデルは `A exp(−2τ / T2)`、背景は0固定です。

返り値はSVGの文字列です。幅に応じて描き直す例を示しています。高さは280 px、横軸は0から2τを表示し、未測定の点を追加しません。近似できない場合や点だけを描きたい場合はfitを省略できます。

[T2測定の使い方](./t2.md) / [APIリファレンス](../reference/api.md)
