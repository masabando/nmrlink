<section class="apparatus-hero" aria-labelledby="intro-title">
  <div class="hero-copy">
    <p class="hero-kicker">NMR × Web</p>
    <h1 id="intro-title">NMRLink</h1>
    <p class="hero-lead">NMR装置の測定と波形解析を、あなたのWeb UIに。</p>
    <p>近畿大学の近藤が開発を進めてきた学生実験用のNMR装置を制御するJavaScriptライブラリです。Web Serial APIによる接続、測定データの解析、グラフ表示を自分のWeb UIに組み込めます。</p>
    <div class="hero-actions"><a class="hero-primary" href="./guide/install.html">使い始める →</a><a href="./examples/standard/index.html">標準Web UIを開く</a></div>
  </div>
  <figure class="apparatus-card">
    <div id="apparatus-view" class="apparatus-view"><span class="apparatus-label">NMR APPARATUS</span></div>
    <figcaption><p id="apparatus-status" role="status">装置の3Dモデルを読み込んでいます…</p><div class="apparatus-tools"><button id="apparatus-rotation" type="button" disabled>回転を止める</button><button id="apparatus-reset" type="button" disabled>視点を戻す</button></div></figcaption>
    <noscript>3Dモデルの表示にはJavaScriptが必要です。</noscript>
  </figure>
</section>

## 対象装置と入手について

実際の測定には、対応する学生実験用NMR装置が必要です。一般のNMR装置を共通に制御するライブラリではありません。実機なしでも、模擬データによる表示や操作のデモを試せます。

装置は教材販売会社を通じての販売が計画されています。

## Web UIを使う

- [標準Web UIを開く](../../examples/standard/index.html)：条件設定・測定・FID/FFT・再解析・保存をまとめた画面です。[使い方](./standard.md)
- [周波数調整](../../examples/standard/frequency.html)：周波数走査で信号の強さを比較し、設定候補を確認できます。[使い方](./frequency.md)
- [パルス校正](../../examples/standard/pulse.html)：周期数を走査し、符号付き信号から90°・180°の候補を確認できます。[使い方](./pulse.md)
- [T1測定](../../examples/standard/t1.html)：反転回復曲線からT1を推定します。[使い方](./t1.md)
- [T2測定](../../examples/standard/t2.html)：スピンエコーの減衰からT2を推定します。[使い方](./t2.md)
- [自作UI用の最小サンプル](../../examples/direct/index.html)：ライブラリの呼び出し方を理解するための短い例です。[使い方](./direct.md) / [GitHubでコードを見る](https://github.com/masabando/nmrlink/tree/main/examples/direct)

## まず動きを見る

下の例は模擬装置です。「接続」→「測定」を押すと、実機なしでFIDとFFTを表示できます。コード欄は実機用です。

<!-- example:first -->

## 使い始める

- [導入する](./install.md)：静的HTMLから読み込む
- [最初の測定](./first.md)：接続してFIDを受け取る
- [FIDを表示する](./fid.md)：取得データをグラフへ
- [遠隔で使う](./remote.md)：装置側PCとFirebaseを経由する

## 利用できる機能

Single/Double測定、ベースライン補正、複素FFT、グラフ表示、JSON保存を組み込めます。直接接続はWeb Serial対応ブラウザ、遠隔接続は装置側PCとFirebaseを使います。[導入手順](./install.md) から始められます。

## 開発の背景

NMRLinkは、近畿大学の近藤から提供されたPython製の装置制御プログラムをもとに開発しています。オリジナルのPythonコードは、提供者の許可を得て[GitHubのoriginalフォルダ](https://github.com/masabando/nmrlink/tree/main/original)で公開しています。

[researchmap：近藤 康](https://researchmap.jp/kondo_yasushi)

## ライセンス

NMRLink本体は[MITライセンス](https://github.com/masabando/nmrlink/blob/main/LICENSE)で提供します。`original/` 内のPythonプログラムもMITライセンスです。第三者のライブラリ・素材には、それぞれのライセンスが適用されます。
