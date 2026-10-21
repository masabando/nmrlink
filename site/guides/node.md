# Node.jsから使う

装置に接続したPCのNode.jsから、同じ測定APIを使えます。Node.js 22以上が必要です。直接接続用のWeb UIではNode.jsの常駐プログラムは不要です。

## 接続して測定する

nmrlink/ルートでnpm ciを実行し、次のコードをmeasure.jsとして保存してnode measure.jsで実行します。ポートと条件は環境に合わせて変更してください。

```js
import { NMRDevice } from "nmrlink";
import { NodeSerialTransport } from "nmrlink-server";

console.log(await NodeSerialTransport.listPorts());
const device = new NMRDevice({
  transport: new NodeSerialTransport({ path: "/dev/cu.YOUR_DEVICE" }),
});
try {
  await device.connect();
  const record = await device.measure({
    frequencyHz: 402000,
    pulse1Cycles: 21, phase1Degrees: 0,
    pulse2Cycles: 42, phase2Degrees: 90,
    pulseIntervalMs: 5, measurementIntervalMs: 200, scans: 128,
  }, { mode: "single" });
  console.log(record.raw);
} finally {
  await device.disconnect();
}
```

ポート一覧の取得は装置を開きません。pathは明示指定し、自動再接続や測定の自動再送はしません。結果は補正前の2048点です。analyzeMeasurementはNode.jsでも使えます。NMRGraphsとsaveMeasurementはブラウザ向けです。

[APIリファレンス](../reference/api.md) / [遠隔で使う](./remote.md)
