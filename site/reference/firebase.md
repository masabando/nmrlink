# 遠隔接続を設定する

<div class="remote-notice"><span class="status-badge">未検証</span> 遠隔接続は実環境での動作確認ができていません。現時点での利用はお控えください。実機を使う場合は直接接続版をご利用ください。</div>

Firebase AuthenticationのGoogleログインとCloud Firestoreを設定し、ブラウザから装置を遠隔操作できるようにします。

Firebase設定や実機なしで操作を試す場合は、ルートで `npm run demo` を実行できます。[ローカルデモ](../guides/demo.md) を参照してください。

## 1. 課金登録なしで準備する

Firebase Consoleで専用プロジェクトを作成し、料金プランが **Spark** であることを確認します。請求先アカウントをリンクする操作は不要です。

1. Authenticationのログイン方法でGoogleを有効にします。
2. Authenticationの承認済みドメインへ、Web UIを置くドメインを追加します。ローカルで試す場合はlocalhostも明示的に登録します。
3. Firestoreの **Standard・Native mode・(default)** データベースを作成します。ロケーションを選び、本番ルールを設定します。テストモードでの公開はしません。
4. Webアプリを登録し、表示された公開設定をexamples/remote/config.jsへ記述します。config.example.jsをコピーして使います。
5. 装置側のサービスアカウントJSONを準備し、装置側PCだけの非公開の場所へ置きます。Googleアカウントのパスワードは使いません。

サービスアカウントには対象プロジェクトのFirestore操作とAuthenticationユーザー参照が必要です。Cloud Datastore UserとFirebase Authentication Viewerなど、用途に合う権限を管理者が設定してください。Admin SDKはFirestore Security Rulesを迂回するため、公開画面に秘密鍵を渡しません。

## 2. ルールとインデックスを適用する

nmrlink/ルートで依存を導入します。Node.js 24 LTSを推奨します。装置側の実行だけならNode.js 22以上です。

```sh
npm install
npx firebase login
npx firebase deploy --only firestore:rules,firestore:indexes --project YOUR_PROJECT_ID
```

このコマンドは、管理者が実際に利用するプロジェクトへルールとインデックスを適用します。ルールだけならFirebase Consoleにも貼り付けられます。インデックス設定は波形JSONと測定条件JSONの自動インデックスを無効にします。

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

前回の状態がmeasuringの場合、装置が今も測定中か判断できないため、自動受付を拒否します。管理者が装置の測定終了を確認してから、復旧時だけNMRLINK_CONFIRM_DEVICE_IDLE=trueを設定して起動します。復旧後はfalseに戻します。起動設定によって測定を停止することはできません。

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

ブラウザ用SDKはgstatic.comのFirebase 13.0.0を読み込みます。遠隔サンプルの利用には、このCDNへのネット接続が必要です。静的ページの動作にFirebase Hostingは必須ではありません。

## 5. 利用者の操作

1. Googleアカウントでログインします。
2. 「利用開始・再開」を押します。不許可なら操作欄を表示しません。ほかの利用者が使用中なら「使用中」と表示します。
3. 測定条件を確認して測定します。必要な結果をJSONで保存します。
4. 「利用終了・データ削除」を押して確認します。
5. データ削除完了後に次の人が利用できます。

同じタブの再読み込みではsessionStorageに保持したセッションIDを使い、利用開始・再開できます。異なるタブは別セッションです。同じGoogleアカウントでも別セッションから操作権を奪えません。

画面は60秒ごとにheartbeat要求を出します。標準の切断猶予は3分、最低1分で設定可能です。測定中は装置側で処理を継続し、完了時から再接続の猶予を与えます。ブラウザがバックグラウンドになってタイマーが止まった場合も、この猶予の対象です。

測定要求の応答待ちは標準10分です。これを超える測定にはRemoteClient.measureのtimeoutMsを指定します。待ち時間が終わっても装置停止を意味しません。測定要求は自動再送しません。

## 6. データ削除と異常時

利用終了・猶予切れでは状態をcleaningへ変更し、結果と全利用者の要求を200文書ずつ削除します。削除完了まで新規要求をルールで拒否し、次の利用者へ渡しません。装置側は測定結果のファイル保存を行いません。

通常の終了処理はメモリ上のセッション・結果を解放します。ブラウザUIも表示結果と設定を初期値へ戻します。結果はJSONダウンロード以外は永続保存せず、FirestoreのIndexedDB永続キャッシュも有効にしません。オフライン端末や既にダウンロードしたコピーまで削除する保証はありません。

通信障害・無料枠超過・削除失敗・リース喪失では新規処理を停止し、idleには戻しません。管理者が原因を解消して再起動すると、残存データの削除から再開します。クラウド書き込みの結果が不明な場合に、測定を自動再送しないことを優先します。

リースは30秒ごとに更新し、有効期間は120秒です。期限切れを検出した旧ワーカーは再開できません。外部ネットワークが切れている間も、既に実行した物理的な測定の停止は保証できません。複数の起動プロセスを普段から同じ装置へ向ける運用はしません。

## 7. 無料枠と利用量

Sparkの無料枠は無制限ではありません。アプリは課金を有効にしませんが、複数装置や長時間運用で上限に達すると遠隔利用が停止します。再起動するだけで無料枠は回復しません。

主な周期処理は30秒ごとの装置リース・オンライン状態の更新と、利用中の60秒ごとのheartbeatです。Firestoreの監視も読み取り回数を消費します。1台を24時間起動する場合、リースとオンライン更新だけで約5760文書書き込み／日、利用者の接続維持や測定でも追加の読み書きが発生します。測定回数と利用台数を含めFirebase Consoleで確認してください。

結果JSONは400,000バイト以下に制限し、測定条件JSONもルールで2000文字以下に制限します。2048点×2chをJSON文字列にすることで、Firestoreのネスト配列禁止に対応します。標準波形を保存できることと無料枠全体に収まることは別です。

料金条件の参照： [Firebaseの料金プラン](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)、[Firestore無料枠](https://firebase.google.com/docs/firestore/quotas)、[監視と読み取り料金](https://firebase.google.com/docs/firestore/pricing)。


自作UIからの操作は [遠隔Web UIへの組み込み](../guides/remote-ui.md)、呼び出し契約は [APIリファレンス](./api.md) を参照してください。
