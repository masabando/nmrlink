# Firebase遠隔接続サンプル

初回設定は [Firebase導入手順](../../docs/FIREBASE.md) を参照してください。

1. config.example.jsをconfig.jsにコピーし、公開Firebase設定と装置IDを入力します。
2. nmrlink/ルートでnpm run export:remoteを実行します。
3. dist/remote/だけをHTTPSサーバーに置きます。ローカルではそのフォルダをLive Serverで配信します。
4. 装置側PCで.env.localと利用許可ファイルを設定し、nmrlink/ルートでnpm startします。
5. 画面でGoogleログイン→利用開始→測定→JSON保存→利用終了と進みます。

Web UIは静的HTML/JSだけです。秘密鍵や装置側の設定を公開フォルダに入れないでください。ブラウザ用クライアントはpackages/nmrlink-server/browser/remote-client.jsです。自作画面でも使えます。

課金登録なしのSparkを前提に、AuthenticationとFirestoreだけを使います。Functions・Storageは不要です。遠隔接続は実環境で未検証です。現時点での利用はお控えください。

自作UIのRemoteClient契約は [APIリファレンス](../../docs/API.md) を参照してください。
