# 接続と切断

ポート選択と接続状態の管理をNMRControllerへ任せます。実機への直接接続に使うブラウザは、[導入ページのOS・ブラウザ案内](./install.md)を確認してください。Safariでは直接接続できません。

<!-- example:connection -->

## 使うAPI

| API | 動作 |
| --- | --- |
| controller.connect() | 接続を開始。既定はWeb Serial |
| controller.disconnect() | 通信資源を解放 |
| state.canConnect | 接続ボタンを有効にできるか |
| state.canDisconnect | 切断ボタンを有効にできるか |

connectはクリックから直接呼びます。先に別の非同期処理を待つと、ポート選択に必要なユーザー操作を失う場合があります。Pythonや別タブでポートを使用している場合は先に切断します。

disconnectは装置停止命令ではありません。測定中の切断は拒否されます。[状態とエラー](./state.md) も参照してください。

## Linuxで接続する

Linuxでは、ブラウザを実行するユーザーにシリアルポートの読み書き権限が必要です。Debian系では、ポートへのアクセスを `dialout` グループで管理する場合があります。

まず、装置のポートと現在のグループを確認します。`/dev/ttyACM0` は例なので、実際のポート名に置き換えてください。

```sh
ls -l /dev/ttyACM0
id -nG
```

ポートの所属グループが `dialout` で、利用ユーザーがそのグループに入っていない場合は、管理者に追加を依頼します。管理者権限を持つユーザーが自分自身を追加する場合の例です。

```sh
sudo usermod -aG dialout "$USER"
```

追加後はデスクトップからログアウトし、再ログインしてブラウザを起動してください。端末やブラウザを開き直すだけでは、新しいグループが反映されない場合があります。ポートの所属グループや権限の設定方法はディストリビューションによって異なります。[Debianのグループに関する説明](https://wiki.debian.org/SystemGroups)も参照してください。

Pythonの制御プログラム、シリアルモニター、別のブラウザやタブなど、同じポートを使っているアプリは先に切断します。

### Snap版Chromiumで接続する場合

Snap版Chromiumでは、Linux側のポート権限に加えて、Snap側の `raw-usb` インターフェースの接続が必要になる場合があります。`raw-usb` はユーザーを追加するグループではなく、SnapアプリにUSB機器へのアクセスを許可する仕組みです。USBシリアルの `/dev/ttyUSB*`・`/dev/ttyACM*` へのアクセスも関係します。

まず、ChromiumがSnapで導入されているかと、権限の接続状態を確認します。

```sh
snap list chromium
snap connections chromium
```

`raw-usb` の行があり、Slot欄が `-` なら未接続です。管理者が次を実行すると、ChromiumにUSB機器へのアクセスを許可できます。

```sh
sudo snap connect chromium:raw-usb
```

Chromiumを完全に終了して起動し直し、接続を試してください。この許可はNMR装置だけに限定されません。`dialout` などLinux側の読み書き権限も別途必要で、これだけで接続成功を保証するものではありません。`raw-usb` の行がない、またはplugがないというエラーになる場合は、そのパッケージに同じ手順は適用できません。

Snap版Firefoxには、Web Serialのポートが表示されない[既知の問題](https://bugzilla.mozilla.org/show_bug.cgi?id=2038075)があり、確認した公式パッケージ定義には `raw-usb`・`serial-port` のplugがありません。上のコマンドの `chromium` を `firefox` に置き換える対処は使えません。[Mozilla公式の導入案内](https://support.mozilla.org/en-US/kb/install-firefox-linux)で非Snap版の導入方法を確認してください。

参照：[Snapのraw-usb仕様](https://snapcraft.io/docs/reference/interfaces/raw-usb-interface/)、[snapdのUSBシリアルアクセス定義](https://github.com/canonical/snapd/blob/master/interfaces/builtin/raw_usb.go)、[Firefox Snapのパッケージ定義](https://github.com/canonical/firefox-snap/blob/stable/snapcraft.yaml)。

### 接続できないとき

次の情報を確認すると、原因を切り分けやすくなります。

- Linuxディストリビューションとバージョン
- ブラウザの名前・バージョン・導入方法
- 装置のポート名と、その読み書き権限
- ポート選択画面が開くか、装置が一覧に出るか、選択後に接続できるか
- 画面に表示されたエラーメッセージ

ブラウザの導入方法によっては、追加のデバイスアクセス制限が接続に影響する場合があります。
