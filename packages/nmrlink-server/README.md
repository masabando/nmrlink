# nmrlink-server

NMR装置に接続したPCで動くNode.js用パッケージです。シリアル接続に加えて、Firebase経由の遠隔受付、利用許可、操作権、結果の取得と終了時削除を実装しています。[Firebase導入手順](../../docs/FIREBASE.md) を参照してください。

## 導入

Node.js 22以上を使用し、リポジトリのnmrlink/ルートで実行します。

```sh
npm install
npm test
```

ルートのpackage-lock.jsonで依存バージョンを固定します。以降の同じ依存構成の導入にはnpm ciを使えます。Node.js用のserialportはこのサーバーパッケージだけの依存です。静的なブラウザ版にインストールは不要です。

## 接続して測定する例

以下はES moduleの例です。Node.jsで実行します。装置を使用中のPythonやブラウザは先に切断してください。

```js
import { NMRDevice } from "nmrlink";
import { NodeSerialTransport } from "nmrlink-server";

// 一覧表示は接続や測定を行いません。
console.log(await NodeSerialTransport.listPorts());

// 実際のポート名へ変更してください。Macでは通常 /dev/cu.usb... です。
const transport = new NodeSerialTransport({ path: "/dev/cu.YOUR_DEVICE" });
const device = new NMRDevice({ transport });

try {
  await device.connect();
  const result = await device.measure({
    frequencyHz: 402000,
    pulse1Cycles: 21,
    phase1Degrees: 0,
    pulse2Cycles: 42,
    phase2Degrees: 90,
    pulseIntervalMs: 5,
    measurementIntervalMs: 200,
    scans: 1,
  }, { mode: "single" });
  console.log(result.raw);
} finally {
  await device.disconnect();
}
```

数値はPoCに由来する例です。装置・試料に合わせて条件を確認してください。出力はベースライン補正前の2048点×2チャンネルです。実装による自動ファイル保存は行いません。

## 接続の動作

- ポートはpathで明示指定します。自動選択や自動再接続は行いません。
- 115200 bps・8N1・フロー制御なしで接続します。
- DTR／RTSを有効にして1秒待機し、既存のブラウザ版とPython版の接続準備に合わせます。
- 送信はserialportのwriteとdrainの両方を待ちます。
- 分割受信したバイト列を共通のLineDecoderで組み立てます。
- タイムアウト、不正受信、ポートのerror／closeで待機を解除し、接続を閉じます。測定を自動再送しません。
- clearInputはアプリ内の受信バッファをクリアします。送信データまで破棄するserialport.flushは呼びません。
- disconnectは装置の即時停止命令ではありません。NMRDeviceは測定中の明示的な切断を拒否します。

## ファイルと保守

- src/node-serial-transport.js：Node.jsの接続、受信、送信、切断
- src/index.js：公開APIの一覧
- tests/node-serial-transport.test.js：serialport公式のSerialPortMockを用いた結合テスト

NodeSerialTransportは共通NMRDeviceが使うconnect、disconnect、write、readLine、clearInputを提供します。stateで接続状態を確認できます。ネイティブポートの解放に失敗して開いたままの場合はfaultedにし、新しい接続を拒否します。disconnectで解放を再試行できます。

テスト用にSerialPortClassを差し替えられます。通常の利用では指定しません。装置のコマンドや測定手順はここへ重複実装せず、nmrlink側を変更してください。

## 検証範囲

公式の模擬ポートによって、Single／Double測定、7バイト単位の分割受信、再接続、タイムアウト、切断通知、設定信号の失敗、不正波形、不正バイト、送信中のエラー通知、保留中の読み取り解除を検証しています。

実機接続と実際のOSドライバーでの動作は未検証です。模擬ポートの成功は実機の測定精度や接続安定性を保証しません。

## 遠隔利用

装置側からFirebaseへ接続する構成で、課金登録なしで利用できる設計を維持します。Cloud FunctionsとCloud Storageには依存しません。リポジトリのルートでnpm startを実行すると、.env.localと利用許可ファイルを使って起動します。Firestoreルール、設定例、静的Web UIも用意しています。

詳しくは [利用仕様](../../SPEC.md)、[通信仕様](../../docs/PROTOCOL.md)、[全体README](../../README.md) を参照してください。

参照： [serialportのストリームAPI](https://serialport.io/docs/api-stream/)、[公式の模擬ポート](https://serialport.io/docs/api-binding-mock/)。

## 自作UIとサーバーの組み込み

ブラウザでは `nmrlink-server/browser` のRemoteClientを使います。パッケージのルートはNode.js専用です。静的配信では相対URLからbrowser/remote-client.jsを読み込みます。

[APIリファレンス](../../docs/API.md) にRemoteClient、RemoteAgent、FirebaseStoreの役割とライフサイクルをまとめています。通常の管理者はnpm startを使い、RemoteAgentの内部メソッドを直接呼ぶ必要はありません。遠隔接続とNode.js実ポートの動作は実環境で未検証です。
