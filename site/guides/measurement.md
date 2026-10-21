# 測定する

SingleまたはDoubleを実行し、2048点の生データを受け取ります。

<!-- example:measurement -->

## 戻ってくるデータ

| フィールド | 内容 |
| --- | --- |
| raw | 補正前の[Data 1, Data 2]が2048組 |
| sampleIntervalMs | 0.02 ms |
| points | 2048 |
| acquiredAt | 取得完了のISO時刻 |
| parameters / mode | 実際に渡した測定条件とモード |
| source | 実機はinstrument、模擬はdemo |

controller.onResultは成功時だけ呼ばれます。最後に成功した結果はcontroller.resultで取得できます。通信失敗で前回結果を消しません。Doubleはmeasure(parameters, { mode: "double" })で指定します。

積算は装置へscansを渡して実行します。即時停止、正確な進捗通知、自動再測定は提供していません。[FIDを表示する](./fid.md) へ進めます。
