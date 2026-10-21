# 最初の測定

接続・測定・グラフ表示までを1枚のHTMLへまとめます。

## 試す

プレビューは模擬装置です。コピー用HTMLは実機用で、クリックするとポート選択画面を開きます。既定の測定条件は例なので、装置・試料に合わせて確認してください。

<!-- example:first -->

## 流れ

1. NMRControllerを作る。
2. onStateChangeでボタンを制御する。
3. 接続ボタンからconnectを呼ぶ。
4. measureへ条件を渡す。
5. onResultで解析し、graphs.showへ渡す。

通信や測定の失敗はonErrorへ届きます。解析に失敗してもcontroller.resultに生データが残ります。測定は自動再送しません。

[測定条件](./parameters.md) / [データを保存する](./save.md)
