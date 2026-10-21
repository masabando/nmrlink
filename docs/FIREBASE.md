# Firebaseによる遠隔利用：導入と保守

2026-10-20。Firebase Authentication（Googleログイン）とCloud Firestore Standardだけを使用します。Cloud Functions、Cloud Storage、Cloud Run、Extensions、TTL削除は使用しません。

実際のFirebase設定を後回しにして操作を試す場合は、ルートで `npm run demo` を実行できます。[ローカルデモ](../examples/demo/README.md) を参照してください。

## 1. 課金登録なしで準備する

Firebase Consoleで専用プロジェクトを作成し、料金プランが **Spark** であることを確認します。請求先アカウントをリンクする操作は不要です。この実装にも課金の有効化処理はありません。既存のBlazeプロジェクトの課金を解除する機能ではありません。

1. Authenticationのログイン方法でGoogleを有効にします。
2. Authenticationの承認済みドメインへ、Web UIを置くドメインを追加します。ローカルで試す場合はlocalhostも明示的に登録します。
3. Firestoreの **Standard・Native mode・(default)** データベースを作成します。ロケーションを選び、本番ルールを設定します。テストモードでの公開はしません。
4. Webアプリを登録し、表示された公開設定をexamples/remote/config.jsへ記述します。config.example.jsをコピーして使います。
5. 装置側のサービスアカウントJSONを準備し、装置側PCだけの非公開の場所へ置きます。Googleアカウントのパスワードは使いません。

サービスアカウントには対象プロジェクトのFirestore操作とAuthenticationユーザー参照が必要です。Cloud Datastore UserとFirebase Authentication Viewerなど、用途に合う権限を管理者が設定してください。Admin SDKはFirestore Security Rulesを迂回するため、公開画面に秘密鍵を渡しません。

## 2. ルールとインデックスを適用する

nmrlink/ルートで依存を導入します。開発・検証ツールを含むためNode.js 24 LTSを推奨します。装置側の実行だけならNode.js 22以上です。

```sh
npm install
npx firebase login
npx firebase deploy --only firestore:rules,firestore:indexes --project YOUR_PROJECT_ID
```

このコマンドは、管理者が実際に利用するプロジェクトへルールとインデックスを適用します。実装作業では実プロジェクトへのデプロイは行っていません。ルールだけならFirebase Consoleにも貼り付けられます。インデックス設定は波形JSONと測定条件JSONの自動インデックスを無効にします。

## 3. 装置側の設定と起動

nmrlink/ルートで.env.exampleを.env.localへ、access-policy.example.jsonをaccess-policy.jsonへコピーします。

```dotenv
NMRLINK_PROJECT_ID=your-firebase-project-id
NMRLINK_DEVICE_ID=nmr-01
NMRLINK_SERIAL_PORT=/dev/cu.YOUR_DEVICE
NMRLINK_CREDENTIALS=./secrets/service-account.json
NMRLINK_ACCESS_POLICY=./access-policy.json
NMRLINK_RECONNECT_GRACE_MS=180000
NMRLINK_CONFIRM_DEVICE_IDLE=false
```

パスは.env.localの場所を基準に解決します。別の場所の設定を使う場合はNMRLINK_ENV_FILEへ.env.localのパスを指定します。秘密鍵はファイル参照だけで、コードや公開設定に埋め込みません。

```sh
npm start
```

ポート接続と前回データの削除が成功した後に受付可能になります。Ctrl+CまたはSIGTERMでは、実行中の測定完了を待ち、データを削除してから切断します。即時の装置停止ではありません。

前回の状態がmeasuringの場合、装置が今も測定中か判断できないため、自動受付を拒否します。管理者が装置の測定終了を確認してから、復旧時だけNMRLINK_CONFIRM_DEVICE_IDLE=trueを設定して起動します。復旧後はfalseに戻します。現在のプロトコルには停止・実行状態照会コマンドが確認できていません。

利用許可は起動時に読み込みます。変更時は利用終了後にプログラムを再起動します。

```json
{
  "allowedDomains": ["ktc.ac.jp"],
  "allowedEmails": [],
  "allowedEmailPatterns": [],
  "deniedEmails": []
}
```

拒否を優先し、許可条件のいずれかへの一致を認めます。ドメイン・メールは大文字小文字を区別せず、正規表現もiフラグで評価します。JSON内の正規表現の例は `"@ktc\\.ac\\.jp$"` です。不正な設定は起動エラー、空の許可条件は全員不許可です。確認済みメール・Googleプロバイダー・有効なアカウントを装置側で参照します。

## 4. Web UIを配置する

公開Firebase設定をexamples/remote/config.jsへ記述した後、ルートで実行します。

```sh
npm run export:remote
```

**dist/remote/の中身だけ**をHTTPSのWebサーバーへ置きます。ローカルなら、このdist/remote/をLive Serverの配信ルートにします。Node.js・npmは公開サーバー側には不要です。ビルド・圧縮はせず、読みやすいHTML/JSをコピーします。

.env.local、サービスアカウントJSON、利用許可ファイルやリポジトリ全体をWebサーバーへアップロードしません。装置側の秘密ファイルがあるリポジトリルートを、そのまま静的サーバーで公開しないでください。

ブラウザ用SDKはgstatic.comのFirebase 13.0.0を読み込みます。SDKを含めて外部CDNなしで配信する場合の同梱方法は今後の対応です。静的ページの動作にFirebase Hostingは必須ではありません。

## 5. 利用者の操作

1. Googleアカウントでログインします。
2. 「利用開始・再開」を押します。不許可なら操作欄を表示しません。ほかの利用者が使用中なら「使用中」と表示します。
3. 測定条件を確認して測定します。必要な結果をJSONで保存します。
4. 「利用終了・データ削除」を押して確認します。
5. データ削除完了後に次の人が利用できます。

同じタブの再読み込みではsessionStorageに保持したセッションIDを使い、利用開始・再開できます。異なるタブは別セッションです。同じGoogleアカウントでも別セッションから操作権を奪えません。

画面は60秒ごとにheartbeat要求を出します。標準の切断猶予は3分、最低1分で設定可能です。測定中は装置側で処理を継続し、完了時から再接続の猶予を与えます。ブラウザがバックグラウンドになってタイマーが止まった場合も、この猶予の対象です。

測定要求の応答待ちは標準10分です。これを超える測定にはRemoteClient.measureのtimeoutMsを指定します。待ち時間が終わっても装置停止を意味しません。測定要求は自動再送しません。

## 6. ファイルの役割

| ファイル | 役割 |
| --- | --- |
| packages/nmrlink-server/src/access-policy.js | ローカルの利用許可判定 |
| packages/nmrlink-server/src/firebase-store.js | Firestore保存、要求の確保、削除、エージェントの排他 |
| packages/nmrlink-server/src/remote-agent.js | 利用開始、操作権、測定、終了・猶予切れの処理 |
| packages/nmrlink-server/src/start.js | 設定・秘密鍵の読み込み、実機接続、起動と終了 |
| packages/nmrlink-server/browser/remote-client.js | 自作UIでも利用できるブラウザクライアント |
| firebase/firestore.rules | 認証、要求の形式と所有者、状態・結果の書き込み禁止 |
| examples/remote/ | Googleログイン付き最小画面 |
| scripts/export-remote.js | 公開ファイルだけの書き出し |

RemoteClientはauth、db、deviceIdとFirebaseのmodular firestore SDKを受け取ります。Googleログインの画面はUI側が担当します。実際の組み込み方はexamples/remote/app.jsを参照してください。ブラウザ版NMRLink本体にはFirebase依存を追加していません。

## 7. Firestoreのデータ構造

```text
agents/{deviceId}                    装置側ワーカーの排他リース。ブラウザはアクセス不可
 devices/{deviceId}                  状態・利用者UID・セッションID・更新時刻
   requests/{uid}                   その利用者の直近1件の要求と処理状態
   results/{requestId}               JSON文字列の測定結果
```

要求はacquire、heartbeat、measure、releaseの4種です。UIDはFirestore認証から固定され、メールの自己申告値は受け取りません。装置側は要求をpendingからrunningへトランザクションで変更してから装置操作します。runningやdoneを再受信しても測定しません。実行済みか不明な要求は再起動時に捨て、自動再実行しません。

利用者は自分の要求だけを書けます。pending／runningの置換、他人の要求、装置状態や測定結果の書き込みは拒否します。要求は1アカウントにつき装置ごとに1文書で、終わった要求の置き換えには1秒以上の間隔が必要です。

利用許可の結果をFirestoreの閲覧権限へ反映しない仕様です。Googleログイン済みなら、文書IDを知って直接SDKを使った場合に他セッションの状態・結果を読む可能性があります。標準UIは自分の操作権があるときだけ操作欄と取得結果を表示します。厳密なデータ秘匿を目的とした実装ではありません。

## 8. データ削除と異常時

利用終了・猶予切れでは状態をcleaningへ変更し、結果と全利用者の要求を200文書ずつ削除します。削除完了まで新規要求をルールで拒否し、次の利用者へ渡しません。装置側は測定結果のファイル保存を行いません。

通常の終了処理はメモリ上のセッション・結果を解放します。ブラウザUIも表示結果と設定を初期値へ戻します。結果はJSONダウンロード以外は永続保存せず、FirestoreのIndexedDB永続キャッシュも有効にしません。オフライン端末や既にダウンロードしたコピーまで削除する保証はありません。

通信障害・無料枠超過・削除失敗・リース喪失では新規処理を停止し、idleには戻しません。管理者が原因を解消して再起動すると、残存データの削除から再開します。クラウド書き込みの結果が不明な場合に、測定を自動再送しないことを優先します。

リースは30秒ごとに更新し、有効期間は120秒です。期限切れを検出した旧ワーカーは再開できません。外部ネットワークが切れている間も、既に実行した物理的な測定の停止は保証できません。複数の起動プロセスを普段から同じ装置へ向ける運用はしません。

## 9. 無料枠と利用量

Sparkの無料枠は無制限ではありません。アプリは課金を有効にしませんが、複数装置や長時間運用で上限に達すると遠隔利用が停止します。再起動するだけで無料枠は回復しません。

主な周期処理は30秒ごとの装置リース・オンライン状態の更新と、利用中の60秒ごとのheartbeatです。Firestoreの監視も読み取り回数を消費します。1台を24時間起動する場合、リースとオンライン更新だけで約5760文書書き込み／日、利用者heartbeatはさらに要求作成・claim・完了更新を消費します。測定回数と利用台数を含めFirebase Consoleで確認してください。

結果JSONは400,000バイト以下に制限し、測定条件JSONもルールで2000文字以下に制限します。2048点×2chをJSON文字列にすることで、Firestoreのネスト配列禁止に対応します。標準波形を保存できることと無料枠全体に収まることは別です。

料金条件の参照： [Firebaseの料金プラン](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)、[Firestore無料枠](https://firebase.google.com/docs/firestore/quotas)、[監視と読み取り料金](https://firebase.google.com/docs/firestore/pricing)。

## 10. テストと確認範囲

```sh
npm test
npm run test:firebase
```

test:firebaseはdemo-nmrlinkというデモプロジェクトIDとlocalhostのAuthentication／Firestore Emulatorだけを使います。実プロジェクトへのログインや課金登録は不要です。初回はFirebase CLIによるエミュレーターのダウンロードと、Java 21以上が必要です。Javaの場所を変える場合はJAVA_HOMEで指定します。開発用Javaは通常運用には不要です。

エミュレーターではルールの拒否・許可、Googleユーザー情報参照、ブラウザ用クライアントから利用開始・測定要求・結果取得・利用終了時の削除、排他、前回要求の非再実行、猶予切れ、削除失敗を検証します。実際のGoogleログイン画面・クラウド上のSparkプロジェクト・実機は未検証です。

## APIと確認範囲

自作UIのRemoteClientとサーバー組み込みの契約は [APIリファレンス](./API.md)、実環境で保留している確認は [実装・確認状況](./STATUS.md) を参照してください。
