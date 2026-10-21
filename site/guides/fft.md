# FFTを表示する

Data 1 + i Data 2を複素FFTし、振幅スペクトルと最大ピークを表示します。

<!-- example:fft -->

## 表示と解析は別に設定する

| 指定先 | オプション | 既定値 |
| --- | --- | --- |
| NMRGraphs | frequencyLimitHz | 10000（横軸は−10〜10 kHz） |
| NMRGraphs | peak | 最大ピークを表示する任意DOM要素 |
| analyzeMeasurement | startMs / endMs | 1 / 5 ms |
| analyzeMeasurement | window | hann |

ピークは表示範囲に限らず全周波数から探索し、数値はHzで示します。FFTビンの最大値であり、補間による周波数推定ではありません。表示範囲外なら明記します。

表示を広げても解析区間や分解能は変わりません。[解析範囲を変える](./range.md) / [数値処理の規約](../reference/analysis.md)
