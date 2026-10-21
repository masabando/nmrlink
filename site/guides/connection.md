# 接続と切断

ポート選択と接続状態の管理をNMRControllerへ任せます。

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
