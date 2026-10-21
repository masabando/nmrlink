# 遠隔で使う

<div class="remote-notice"><span class="status-badge">未検証</span> 遠隔接続は実環境での動作確認ができていません。現時点での利用はお控えください。実機を使う場合は直接接続版をご利用ください。</div>

装置側PCが測定し、利用者のブラウザが結果を受け取ります。UIと装置側PCは同じLANでなくても構いません。

```text
利用者のWeb UI ←→ Firebase ←→ 装置側PC（nmrlink-server）←→ USBシリアル ←→ 装置
```

## 使い始めるまで

1. [管理者の設定](../reference/firebase.md)：Spark、Googleログイン、Firestore、装置側PCの.env.local・許可ファイルを準備。
2. 装置側PCでnpm startを実行。
3. 静的なWeb UIを配信し、Googleログインして利用開始。
4. 1人ずつ測定し、必要な結果を保存して利用終了。

課金登録なしを前提に、AuthenticationとFirestoreを使います。Functions・Storageは不要です。

## 自分の画面へ組み込む

[遠隔Web UIへの組み込み](./remote-ui.md) でRemoteClientと共通グラフをつなぎます。予約・待ち行列はなく、交代前に測定データを削除する構成です。
