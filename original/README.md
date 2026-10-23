# オリジナルの装置制御プログラム

近畿大学の近藤から提供されたPython製のNMR装置制御プログラムです。提供者の許可を得て公開しています。NMRLinkは、このプログラムの通信手順をもとに開発しています。

[researchmap：近藤 康](https://researchmap.jp/kondo_yasushi)

## ファイル

- `GUI8.py`：提供された原本を、内容・改行コードを変更せずに保存しています。

## 実行環境

Python 3、Tkinter、pyserial、Pillow、および対応するNMR装置が必要です。TkinterはPythonの導入方法によって別途インストールが必要です。

```sh
python3 -m pip install pyserial Pillow
python3 GUI8.py
```

このフォルダをカレントディレクトリとして実行します。シリアルポートを使用するほかのアプリやWeb UIは先に切断してください。測定条件と保存先は利用する装置・環境に合わせて確認してください。

NMRLink本体とは独立したPythonアプリです。直接接続のWeb UIや遠隔サーバーの実行に、このファイルは必要ありません。

## ライセンス

このフォルダのPythonプログラムは、著作者の許諾により[MITライセンス](./LICENSE)で提供します。著作権は近藤 康に帰属します。
