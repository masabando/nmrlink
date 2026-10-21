# ベースライン補正と複素FFT

取得した2チャンネルのデータを補正し、複素FFTで周波数・振幅・位相を求めます。ブラウザとNode.jsで利用できます。元の生データは変更しません。

## 補正とFFTをまとめて実行する

`analyzeMeasurement(record, options)` で補正・複素FFT・全周波数の最大ピークを一度に取得できます。既定は末尾100点補正、1〜5 ms、Hann窓です。戻り値はdata・baseline・spectrum・peak。表示は別入口のNMRGraphsが担当します。[最初の測定](../guides/first.md) と [API契約](./api.md) を参照してください。個別の関数は以下で説明します。

## 使い方

```js
import { correctBaseline, computeSpectrum } from "nmrlink";

// recordはdevice.measureなどで取得した測定結果です。
const corrected = correctBaseline(record.raw);
const fft = computeSpectrum(corrected.data, {
  sampleIntervalMs: record.sampleIntervalMs,
  startMs: 1,
  endMs: 5,
  window: "hann",
});

console.log(corrected.base); // [ch1のベースライン, ch2のベースライン]
console.log(fft.bins);       // 周波数、複素成分、振幅、位相
```

静的HTMLでは、packages/nmrlink/src/index.jsへの相対URLから読み込みます。解析の前後でrecord.rawと測定条件は変更されません。

## correctBaseline(raw, options)

rawは `[[ch1, ch2], ...]` という有限数値の配列です。

| オプション | 既定値 | 意味 |
| --- | --- | --- |
| tailPoints | 100 | ベースライン平均に使う末尾の点数 |
| truncate | true | 差し引いた値をMath.truncでゼロ方向へ整数化 |

返り値は `{ base, data, tailPoints, truncate }` です。baseはチャンネルごとの平均、dataは補正後の新しい配列です。rawの配列・各行は書き換えません。

既定では末尾100点で補正し、0へ向かって整数化します。データ長は2048点に固定せず、tailPoints以上を受け付けます。短いデータにはtailPointsを明示します。浮動小数のまま差し引きたい場合だけtruncate:falseを指定します。

不完全なチャンネル対、NaN／Infinity、範囲外のtailPoints、計算のオーバーフローはエラーです。不正値をゼロへ置き換えません。

## computeSpectrum(data, options)

| オプション | 既定値 | 意味 |
| --- | --- | --- |
| sampleIntervalMs | 必須 | 正の有限数値、サンプル間隔 [ms] |
| startMs | 0 | 解析開始時刻 [ms]、開始を含む |
| endMs | data.length × sampleIntervalMs | 解析終了時刻 [ms]、終了を含まない |
| window | hann | hann：対称Hann窓、rect：矩形窓 |

2チャンネルを **Data 1 + i Data 2** として、負の指数を使う複素の順方向FFTを行います。実信号用の片側スペクトルではなく、負・正の周波数を返し、振幅を2倍にはしません。

範囲内のサンプルを取り出して窓を掛け、次の2のべき乗へゼロ埋めします。窓はサンプル数Nに対して `0.5 * (1 - cos(2πi/(N-1)))` です。振幅と複素成分は窓の重みの合計で正規化します。入力配列は変更しません。

境界の丸めには小さな許容差を使い、区間は `[startMs, endMs)` です。最低4点が必要です。FFTの割当サイズは最大2^20点に制限します。

### 返り値

主なメタデータ：

- startMs、endMs：要求した解析範囲
- first、last：使用するサンプル添字の開始・終了（終了排他）
- actualStartMs、actualEndExclusiveMs：実際に使用した時刻範囲
- count：切り出した点数、size：ゼロ埋め後のFFT点数
- durationMs：count × サンプル間隔
- spacingHz：ゼロ埋め後の周波数ビン間隔
- resolutionHz：観測時間からの1/Tの目安
- window、convention：窓と複素信号の規約

binsは周波数の昇順で、負のNyquist周波数から正側までの全ビンです。

| フィールド | 内容 |
| --- | --- |
| hz | 受信基準からの相対周波数 [Hz] |
| real | 窓の重みで正規化した実部 |
| imaginary | 同じく虚部 |
| amplitude | 複素振幅の絶対値 |
| phaseRadians | atan2による位相 [rad] |

位相の時間原点は選択した範囲の先頭です。絶対時刻に合わせた位相補償は行いません。ほぼゼロの振幅の位相は評価に使わないでください。振幅は任意単位です。物理単位への換算は、利用する装置の仕様に従ってください。

ゼロ埋めでビン間隔を細かくしても、実際の観測時間による分解能は改善しません。UIの周波数表示範囲もFFTの計算範囲とは別です。

