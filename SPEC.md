# NMRLinkの構成と利用方針

NMRLinkは、教育用NMR装置の制御とデータ解析をWeb UIから利用するためのJavaScriptライブラリです。

## 直接接続

ブラウザのWeb Serial APIからUSBシリアル接続します。静的Webサーバーで配信でき、Firebaseやサーバープロセスを必要としません。標準Web UIと自作UIは同じ公開APIを利用します。

## 遠隔接続（未検証）

装置側PCのNode.jsプログラムがシリアル通信を担当し、ブラウザとFirebase Authentication・Firestoreを介して通信します。同一LANやVPNを前提としません。課金登録を必要としない構成とし、Cloud Functions・Cloud Storageは使いません。

装置側で利用許可を判定し、一度に一人が操作します。利用終了時は要求・測定結果を削除し、次の利用者へ渡します。画面上の閲覧制限はFirestoreへの直接アクセスに対する厳密な秘匿を保証しません。

実環境では未検証です。詳細は[遠隔接続](https://masabando.github.io/nmrlink/guide/remote.html)と[Firebase設定](https://masabando.github.io/nmrlink/docs/FIREBASE.html)を参照してください。

## パッケージ

- `nmrlink`：装置制御、Web Serial、解析、描画、ブラウザの保存処理。npmで配布します。
- `nmrlink-server`：Node.jsシリアル通信、Firebase連携、操作権管理。リポジトリから利用します。

UIフレームワークに依存せず、人が読んで改変できるJavaScriptと設定ファイルを提供します。測定結果には補正前の生データと取得条件を保持し、表示や再解析で上書きしません。

## 仕様と使い方

- [公開API](https://masabando.github.io/nmrlink/docs/API.html)
- [解析の仕様](https://masabando.github.io/nmrlink/docs/ANALYSIS.html)
- [装置の通信仕様](./docs/PROTOCOL.md)
- [標準Web UIの使い方](https://masabando.github.io/nmrlink/guide/standard.html)
