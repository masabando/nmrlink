# ベースライン補正と複素FFT

2026-10-20。解析処理はnmrlinkパッケージに含め、ブラウザ・Node.jsのどちらでも同じ関数を使います。UI、Firebase、装置接続、外部の数値計算パッケージには依存しません。測定APIは引き続き生データだけを返します。

## まとめて解析する

`analyzeMeasurement(record, options)` で補正・複素FFT・全周波数の最大ピークを一度に取得できます。既定は末尾100点補正、1〜5 ms、Hann窓です。戻り値はdata・baseline・spectrum・peak。表示は別入口のNMRGraphsが担当します。[自作UIの手順](./UI.md) と [API契約](./API.md) を参照してください。以下は個別の解析関数の説明です。

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

静的ページからは、nmrlink/src/index.jsを相対パスで読み込む使い方もできます。解析の前後でrecord.rawと測定条件は変更されません。

## correctBaseline(raw, options)

rawは `[[ch1, ch2], ...]` という有限数値の配列です。

| オプション | 既定値 | 意味 |
| --- | --- | --- |
| tailPoints | 100 | ベースライン平均に使う末尾の点数 |
| truncate | true | 差し引いた値をMath.truncでゼロ方向へ整数化 |

返り値は `{ base, data, tailPoints, truncate }` です。baseはチャンネルごとの平均、dataは補正後の新しい配列です。rawの配列・各行は書き換えません。

既定値はPoCの末尾100点補正とPython intの切り捨て方に合わせています。PoCと違って2048点に固定せず、tailPoints以上の長さを受け付けます。短いデータにはtailPointsを明示します。浮動小数のまま差し引きたい場合だけtruncate:falseを指定します。

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

境界の丸めはPoCと同じ許容差を使い、区間は `[startMs, endMs)` です。最低4点が必要です。FFTの割当サイズは最大2^20点に制限します。

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

位相の時間原点は選択した範囲の先頭です。絶対時刻に合わせた位相補償は行いません。ほぼゼロの振幅の位相に物理的な意味を持たせないでください。振幅の物理単位や周波数設定と実RF周波数の関係は装置側の確認事項です。

ゼロ埋めでビン間隔を細かくしても、実際の観測時間による分解能は改善しません。UIの周波数表示範囲もFFTの計算範囲とは別です。

## デモへの組み込み

`npm run demo` で測定すると、自動で末尾100点補正と1〜5 msのHann窓FFTを行います。

- ベースライン補正の有無と末尾点数を変更できます。
- FFT開始・終了時刻、窓関数を変更して再測定なしで再解析できます。
- 時間波形は補正後または生データを表示し、FFT振幅は別のキャンバスに表示します。
- 周波数の表示範囲を変更しても、保存対象のFFTは全ビンを維持します。
- 測定・解析JSONは、生データと測定条件にanalysisを追加した形式です。
- 生データCSVは従来どおり未補正の2048点、FFT CSVは複素成分・振幅・位相の全ビンです。
- 不正な解析条件ではスペクトルとFFT保存を無効にし、生データの表示・保存は維持します。条件を直せば同じ測定から復帰できます。
- 利用終了・交代時は、解析結果と解析条件もクリアします。

解析結果はブラウザ内だけに保持し、Firestoreへは追加保存しません。

## PoCとの一致とテスト

根拠は既存のNMR/docs/protocol.jsのcorrectBaselineとNMR/docs/fft.jsのspectrumです。PoCファイル自体は変更していません。

`packages/nmrlink/tests/analysis.test.js` は、既定の補正と、FFTの全ビンの周波数・振幅・範囲メタデータがPoCと完全一致することを検証します。2048点・非2べき乗長、補正前後、Hann／矩形、端数の境界を含めます。複素成分は独立した直接DFTと照合し、正負の周波数・振幅・位相の符号と正規化も検証します。

`tests/demo/analysis.test.js` はSingle／Doubleの合成波形から補正とFFTまでをPoCと照合し、解析条件を変更しても生データ・測定条件が変わらないこと、不正条件の後にも解析し直せることを確認します。

```sh
npm test
npm run test:demo
```

照合用テストだけが親プロジェクトのPoCを相対参照します。配布ライブラリ本体は参照しません。独立リポジトリへの切り出し時には、参照用フィクスチャの同梱を検討します。

数値処理の一致は、実機データの測定精度や装置の校正を保証するものではありません。

### ブラウザでの確認記録

2026-10-20にChrome上で、補正のオン／オフ、Hann／矩形、1〜5 msから0〜40.96 msへの再解析、不正範囲での解析無効化と復帰を確認しました。ブラウザ保存したJSON同士で取得時刻・生データ・測定条件が同一であることを確認し、解析だけが更新されていることを検証しています。FFT CSVは2048ビンと複素成分・位相を保存できました。

同じNode.js実行環境でのPoC照合は完全一致です。Chromeで計算・JSON保存した値をNode.jsのPoCと照合した場合、振幅の最大差は約1.11e-14でした（Math関数などの実行環境による浮動小数誤差）。周波数と補正データは一致し、クロス環境の振幅は絶対1e-10＋相対1e-12以内で確認しました。JSONでは符号付きゼロが通常の0になる点も区別しています。
