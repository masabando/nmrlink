# パルス応答を描く

`nmrlink/graphs` の `createPulsePlot()` で、パルス周期数と信号のグラフを描けます。パルス校正の標準Web UIも同じ関数を使います。

<!-- example:pulsegraph -->

## 表示するデータ

各点のlength（周期数）とamplitude（符号付き信号）を渡します。実測では `analyzePulseCalibration(records).points` を使います。サンプルの近似は `fitPulseCalibration(points)` で求めています。点だけを描く場合はfitを省略できます。

横軸は0から、高さは280 pxです。返り値はSVGの文字列で、例ではResizeObserverを使って幅の変更時に描き直します。未測定の0周期の点は追加しません。

## 絶対値を描く

絶対値表示では各点のmagnitudeを使い、絶対値用の近似を渡します。

```js
const magnitudePoints = points.map(point => ({
  length: point.length,
  amplitude: point.magnitude,
}));
const fit = fitPulseCalibration(magnitudePoints, { magnitude: true });
container.innerHTML = createPulsePlot(points, {
  width: container.clientWidth,
  mode: "magnitude",
  fit,
});
```

実測の解析結果を使う場合は、符号付きにresult.fit、絶対値にresult.magnitudeFitを渡せます。絶対値では符号が折り返され、近似曲線は|sin|になります。

[パルス校正の使い方](./pulse.md) / [APIリファレンス](../reference/api.md)
