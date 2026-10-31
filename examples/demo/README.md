# ローカルデモ

nmrlink/ルートで実行します。

```sh
npm run demo
```

表示された http://127.0.0.1:4173 を開きます。Firebaseプロジェクト、課金登録、サービスアカウント、Googleアカウント、実機の準備は不要です。.env.localや本番の公開設定は読み込みません。

初めてこのリポジトリを導入する場合だけ、先にnpm installを実行してください。Node.js 24 LTSを推奨します。

## 試す流れ

1. 学生Aを選んで「デモログイン」します。
2. 「利用開始・再開」を押します。
3. SingleまたはDoubleで「模擬測定」します。約1.5秒で2048点×2チャンネルを取得し、合成波形を表示します。
4. ベースライン補正、FFT範囲、窓を変えて「解析を更新」を試します。再測定は行いません。必要なら測定・解析JSON、生データCSV、FFT CSVを保存します。ファイル名と中身にdemoと記録します。
5. 「利用終了・データ削除」→「データを削除して終了」で交代します。

「別タブで学生Bを試す」から別ユーザーを開けます。学生Aが利用中なら学生Bには操作欄・波形を表示せず、利用開始も拒否します。学生Aが終了すると学生Bが開始できます。「外部利用者」はログインできますが利用開始を拒否します。

Googleの認証画面は出しません。Authentication Emulatorに模擬Google資格情報を渡します。実際のGoogleアカウント・パスワードは入力しません。ログインはタブのメモリ上だけで、再読み込み後は再度デモログインしてください。同じタブ・同じ利用者なら、残っている操作セッションを「利用開始・再開」で引き継げます。

実機の測定時間・信号強度・精度を再現するシミュレーターではありません。周波数、第1パルス周期数・位相、パルス間隔、積算数を合成波形へ反映していますが、物理的な評価には使えません。

## 停止とデータの寿命

起動したターミナルでCtrl+Cを押します。デモサーバーとエミュレーターをまとめて停止します。エミュレーターのデータはファイルへexportせず、次回起動時は空になります。ブラウザで保存したJSON・CSVは残ります。

操作権は3分間heartbeatがないと解放されます。バックグラウンドタブでタイマーが止まった場合も対象です。利用者の順番・データ削除・許可判定には本番と同じRemoteAgent、FirebaseStore、RemoteClientとFirestoreルールを使います。

## 初回のダウンロードとJava

初回はnpm依存、Firebaseエミュレーター、必要ならJava 21のダウンロードにネット接続が必要です。Java 21以上が既に使える場合はそれを使います。Mac/Linuxで見つからない場合は、Adoptium公式配布のJREを.cache/demo-java/へ取得し、SHA-256を照合します。OSのJava設定は変更しません。WindowsでJavaがない場合はJava 21以上を別途導入してください。

ブラウザ用Firebase SDKはesbuildで.cache/demo-public/へ読みやすい形式でまとめます。デモ画面は外部CDNに依存しません。キャッシュはGit管理対象外で、ソースは通常のJS/HTMLです。

## 接続先

| 用途 | 接続先 |
| --- | --- |
| Web UI | 127.0.0.1:4173 |
| Firestore Emulator | 127.0.0.1:8086 |
| Authentication Emulator | 127.0.0.1:9098 |
| Emulator Hub / Logging / WebSocket | 4401 / 4501 / 9151 |
| プロジェクトID | demo-nmrlink-local |

すべてループバックで待ち受けます。通常のFirebase結合テストとはポートを分けています。同じデモを二重起動するとポート競合になるので、先に古いターミナルでCtrl+Cを押してください。

デモ実行プロセスは固定のエミュレーター接続先を検証し、不一致なら起動を拒否します。実機用シリアルポートも開きません。Admin SDKが必要とする資格情報の形式は、起動時にメモリ上で作る使い捨て鍵で満たします。実在のサービスアカウント鍵は使いません。

## 保守と検証

- scripts/demo.js：Java準備、エミュレーター起動・終了
- scripts/demo/java.js：既存Javaの検出、必要な場合のローカルJRE準備
- scripts/demo/runtime.js：デモ専用の装置・受付・静的サーバー
- scripts/demo/mock-controller.js：模擬装置。実際のNMRDeviceとNodeSerialTransportを使用
- scripts/demo/config.js：固定のデモ接続先
- examples/demo/app.js、index.html：デモ用画面
- firebase.demo.json：本番やテストと分離したエミュレーター設定

```sh
npm test
npm run test:demo
npm run test:firebase
```

test:demoは実機もエミュレーターも使わず、合成波形と実際のプロトコル処理を検証します。Firebaseルールと利用交代はtest:firebaseで検証できます。デモ画面の変更後はデモを再起動し、ブラウザを再読み込みしてください。

ベースライン補正・複素FFTもデモ画面で確認できます。[解析の仕様](https://masabando.github.io/nmrlink/reference/analysis/)を参照してください。
