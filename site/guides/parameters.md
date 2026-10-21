# 測定条件

条件は単位が分かる名前のオブジェクトで渡します。

```js
const parameters = {
  frequencyHz: 402000,
  pulse1Cycles: 21,
  phase1Degrees: 0,
  pulse2Cycles: 42,
  phase2Degrees: 90,
  pulseIntervalMs: 5,
  measurementIntervalMs: 200,
  scans: 128,
};
controller.measure(parameters, { mode: "single" });
```

## 指定する値

| 項目 | 意味 | 通信上の範囲 |
| --- | --- | --- |
| frequencyHz | 設定周波数 [Hz] | 1〜2147483647の整数 |
| pulse1Cycles / pulse2Cycles | 第1・第2パルスのRF周期数 | 0〜32767の整数 |
| phase1Degrees / phase2Degrees | 位相 [度] | 0 / 90 / 180 / 270 |
| pulseIntervalMs | パルス間隔 [ms] | 0〜32767の整数 |
| measurementIntervalMs | 測定間隔の装置設定 [ms] | 1〜32767の整数 |
| scans | 積算回数 | 1〜32767の整数 |

すべて必須です。パルスの値はマイクロ秒ではありません。Singleでも共通パケットに第2パルスの項目を含めます。ここに示す数値範囲は通信形式の制限で、適切な運転範囲の保証ではありません。

[測定する](./measurement.md)
