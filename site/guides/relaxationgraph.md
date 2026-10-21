# T1回復曲線を描く

`nmrlink/graphs` の `createT1Plot()` で、待ち時間τと信号の回復曲線を描けます。T1測定の標準Web UIも同じ関数を使います。

<!-- example:relaxationgraph -->

## 実測データに置き換える

各点のtau（ms）とsignal（符号付き信号）を渡します。実測では `analyzeT1(records).points` を使います。サンプルでは `fitT1(points, { fromMs, toMs })` で指数関数近似を求め、fitとして渡しています。点だけを描く場合はfitを省略できます。

モデルは `A − B exp(−τ / T1)` です。T1と横軸のτの単位はmsです。近似関数が例外になった場合も、fitを省略すれば取得点を表示できます。

横軸は0から、高さは280 pxです。返り値はSVGの文字列で、例ではResizeObserverで幅の変更時に描き直します。未測定のτ=0の点は追加しません。

## 表示モード

modeはsigned・magnitude・quadratureから選べます。絶対値表示には各点のmagnitude、直交成分表示にはquadratureが必要です。`analyzeT1()` の結果にはこれらが含まれます。指数関数の近似曲線はsigned表示のときだけ重ねます。

[T1測定の使い方](./t1.md) / [APIリファレンス](../reference/api.md)
