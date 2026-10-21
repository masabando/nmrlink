# 遠隔Web UIへの組み込み

<div class="remote-notice"><span class="status-badge">未検証</span> 遠隔接続は実環境での動作確認ができていません。現時点での利用はお控えください。実機を使う場合は直接接続版をご利用ください。</div>

Googleログイン後、RemoteClientから利用開始・測定・終了を要求します。受け取った結果は直接接続と同じ解析・グラフを使えます。

## 呼び出し方

以下はFirebase初期化とログインが完了した画面へ組み込む抜粋です。画面全体のコードは [遠隔サンプル](./remote-sample.md) を参照してください。

```js
import { RemoteClient } from "nmrlink-server/browser";
import { analyzeMeasurement } from "nmrlink";
import * as firestore from "firebase/firestore";

const client = new RemoteClient({
  auth, db, deviceId: "nmr-01", firestore,
  onClear: () => graphs.clear(),
});
const unwatch = client.watchDevice(state => {
  // ownedがtrueの利用者だけ操作画面を表示する。
  measurementPanel.hidden = !state.owned;
}, error => { status.textContent = error.message; });

// 対応する各ボタンから順に呼び、例外を画面で処理する。
await client.acquire();
const record = await client.measure(parameters, { mode: "single" });
graphs.show(record, analyzeMeasurement(record));
await client.release();
unwatch();
```

このimportはworkspace・バンドラー向けです。静的HTML版の配布にはnpm run export:remoteを使います。グラフを加える場合はnmrlinkのブラウザ用モジュールも配信してください。

## 直接接続との違い

利用開始・終了・操作権はRemoteClientが担当し、NMRControllerへ置き換えません。RemoteClientの操作エラーはrejectするため、ボタン側でtry/catchを使います。サービスアカウントや許可ファイルをブラウザへ渡しません。

標準UIの閲覧制限は表示制御であり、Firestoreへの直接アクセスに対する厳密な秘匿ではありません。[詳細API](../reference/api.md) / [管理者の設定](../reference/firebase.md)
