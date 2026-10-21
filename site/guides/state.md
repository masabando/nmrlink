# 状態とエラー

同時操作の防止や結果保持を、自分のUIで書き直す必要はありません。

<!-- example:state -->

「不正な条件のエラーを試す」は入力検証だけを実行します。装置へ送信しません。

## 状態でボタンを制御する

| state | 用途 |
| --- | --- |
| busy / operation | 操作中か、connect / disconnect / measure / sweepのどれか |
| canConnect / canDisconnect / canMeasure | 対応するボタンの有効化 |
| connection | disconnected / connecting / connected / measuring |
| hasResult | 保存できる結果があるか |

NMRControllerの操作は成功時 { ok: true, value }、失敗時 { ok: false, error }を返し、エラーはonErrorへ通知します。処理中の追加要求は拒否し、キューに積みません。NMRDeviceを直接使う場合はPromiseのrejectをtry/catchで扱います。

待機中の切断は500 msごとの状態確認で通知します。画面部品を破棄する場合は、操作完了後に必要なdisconnectを待ち、controller.dispose()で監視を解除します。

[最初の測定](./first.md) / [APIの詳細](../reference/api.md)
