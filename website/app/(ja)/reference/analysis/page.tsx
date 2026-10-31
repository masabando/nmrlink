import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import MathFormula from "@/components/MathFormula";
import ReferenceTable from "@/components/ReferenceTable";

export const metadata: Metadata = { title: "解析の仕様" };

export default function ReferencePage() {
  return (
    <DocumentationArticle>
      <h1>解析の仕様</h1>
      <p>NMRLinkが測定値をどのように補正・変換・近似するかをまとめています。関数の引数・戻り値は<Link href="/reference/api/analysis">信号解析API</Link>、操作例は<Link href="/guide/analysis">解析ガイド</Link>を参照してください。</p>
      <h2 id="baseline">ベースライン補正</h2>
      <p>各チャンネルの末尾tailPoints点の平均をbaseとして、すべての点から差し引きます。既定は100点、truncate:trueで差し引き後の値をMath.truncにより0方向へ整数化します。falseなら小数を残します。</p>
      <p>補正は新しい配列へ行い、rawを書き換えません。末尾にも信号が残っていれば、その成分も平均に含まれます。装置由来のオフセットと信号を自動判別する処理ではありません。</p>
      <MathFormula block tex={String.raw`b_c=\frac{1}{K}\sum_{n=L-K}^{L-1}x_{n,c},\qquad y_{n,c}=x_{n,c}-b_c`} />
      <p>Lは全点数、KはtailPoints、cはチャンネルです。整数化を有効にした場合は、差し引き後の値へ適用します。</p>
      <h2 id="complex-fft">複素FFTの規約</h2>
      <MathFormula block tex={String.raw`z_j=I_j+iQ_j`} />
      <MathFormula block tex={String.raw`X_k=\frac{\displaystyle\sum_{j=0}^{N-1} w_jz_j\,e^{-i2\pi kj/M}}{\displaystyle\sum_{j=0}^{N-1} w_j}`} />
      <MathFormula block tex={String.raw`A_k=|X_k|,\qquad \phi_k=\operatorname{atan2}\!\left(\operatorname{Im}X_k,\operatorname{Re}X_k\right)`} />
      <p>I・QはData 1・Data 2、Nは選択点数、jは選択した区間の先頭を0とする添字、Mはゼロ埋め後のFFT点数です。A・φはamplitude・phaseRadiansに対応します。順方向の指数は負。片側の実信号スペクトルではなく、負・正の両周波数を返し、振幅を2倍にはしません。</p>
      <p>hzは受信基準からの相対周波数です。binは−Nyquistから正側へ昇順で、正のNyquistは含みません。通常の0.02 ms間隔ではサンプリング周波数50 kHz、Nyquistは25 kHzです。Data 2の符号を変えると、複素信号の周波数の向きも反転します。</p>
      <h2 id="window">時間範囲・窓・正規化</h2>
      <p>FFT区間は[startMs, endMs)です。両端の時刻を次の式でサンプル添字へ変換し、終了添字は全点数を上限とします。Δtはサンプル間隔です。最低4点が必要で、実際の区間はactualStartMs・actualEndExclusiveMsで確認できます。</p>
      <MathFormula block tex={String.raw`n(t)=\left\lceil\frac{t}{\Delta t}-10^{-9}\right\rceil`} />
      <p>hannは次のN点の対称窓、rectは<MathFormula tex={String.raw`w_j=1`} />です。窓掛け後、次の2のべき乗Mまでゼロ埋めします。実部・虚部・振幅を窓の重み合計で正規化するため、ゼロ埋め点数そのもので振幅は割りません。</p>
      <MathFormula block tex={String.raw`w_j=\frac{1}{2}\left(1-\cos\frac{2\pi j}{N-1}\right),\qquad 0\le j<N`} />
      <ReferenceTable headings={["通常の既定解析", "値"]} rows={[
        ["取得記録", "2048点、0.02 ms間隔、0〜40.96 ms（終端排他）"],
        ["FFT区間", "1〜5 ms（終端排他）、200点"],
        ["FFT点数", "256点（ゼロ埋め後）"],
        ["ビン間隔 spacingHz", <MathFormula key="spacing" tex={String.raw`\frac{1000}{256\times0.02}=195.3125\,\mathrm{Hz}`} />],
        ["分解能の目安 resolutionHz", <MathFormula key="resolution" tex={String.raw`\frac{1000}{200\times0.02}=250\,\mathrm{Hz}`} />],
      ]} />
      <p>ゼロ埋めは周波数軸の刻みを細かくしますが、観測時間による分解能は改善しません。windowを変えるとピークの広がり・漏れ方も変わります。FFTの表示範囲と、計算に使う時間区間は別です。</p>
      <h2 id="phase">ピーク・振幅・位相</h2>
      <p>analyzeMeasurementは全周波数から最大振幅のFFTビンを選びます。同振幅は昇順で最初のbinです。evaluateFrequencyなどは指定帯域内で探索します。ピーク周波数はビン値で、補間はしません。</p>
      <p>位相の時間原点は選択範囲の先頭です。絶対取得時刻への位相補償は行いません。ほぼゼロの振幅では位相は評価に使わないでください。振幅は任意単位で、物理単位への校正は装置側の仕様によります。</p>
      <h2 id="common-phase">共通周波数・共通位相</h2>
      <p>パルス校正とT1は、全記録で同じ周波数の複素成分を評価し、共通の位相を引いて実部を符号付き信号とします。各点を個別に正方向へ合わせず、パルスの符号反転やT1の負から正への回復を残します。magnitudeは位相に依存しない絶対値、quadratureは直交成分です。</p>
      <p>自動の共通周波数は各記録のFFT振幅の2乗を合計して選び、重複する走査値は件数で重みを調整します。位相は強い点から求め、パルスでは短い側を正方向、T1では回復の傾きを正方向へ揃えます。手動referenceIndexは位相基準だけを変え、周波数は引き続き全点から選びます。</p>
      <h2 id="pulse">パルスのサイン近似</h2>
      <p>符号付きと絶対値のモデルは次の式です。ℓはlength（RF周期数）で、<MathFormula tex={String.raw`p_{180}=2p_{90}`} />です。実測の山・ゼロ交差による候補と、最小二乗の推定値は区別します。少なくとも3点から推定を試みますが、測定範囲外の候補は外挿です。位相不一致や低い一致度はwarningsで示します。</p>
      <MathFormula block tex={String.raw`S(\ell)=A\sin\!\left(\frac{\pi\ell}{2p_{90}}\right)+B`} />
      <MathFormula block tex={String.raw`S_{\mathrm{mag}}(\ell)=A\left|\sin\!\left(\frac{\pi\ell}{2p_{90}}\right)\right|+B`} />
      <h2 id="relaxation">T1・T2の指数近似</h2>
      <ReferenceTable headings={["項目", "T1", "T2"]} rows={[
        ["信号モデル", <MathFormula key="t1-model" tex={String.raw`S(\tau)=A-Be^{-\tau/T_1}`} />, <MathFormula key="t2-model" tex={String.raw`S(2\tau)=Ae^{-2\tau/T_2}`} />],
        ["横軸・近似範囲", "τ [ms]", "2τ [ms]"],
        ["評価する信号", "共通位相の符号付き成分", "移動するエコー窓での共通周波数の複素振幅絶対値"],
        ["背景", "Aを推定", "0に固定"],
      ]} />
      <p>T2の取得時刻は第2パルス後からで、エコー中心はτです。解析窓を中心に追従させます。T2の手動referenceIndexは共通周波数を選ぶ点を指定します。</p>
      <p>同じτは平均し、範囲内の信号値に対する残差平方和を最小化します。対数振幅の直線近似ではありません。T1は異なるτが5点以上、負正両方の信号が必要です。T2は非負の3点以上から推定します。詳しい成立条件は<Link href="/reference/api/relaxation#fits">近似API</Link>を参照してください。</p>
      <p>r2・rmse・warningsも推定値と一緒に確認してください。短い範囲からの推定は、測定範囲や位相基準に敏感になる場合があります。近似値を装置の測定条件へ自動反映することはありません。</p>
      <h2 id="invalid-data">不正データの扱い</h2>
      <p>不完全なチャンネル対、NaN・Infinity、範囲外の時刻、演算のオーバーフローはエラーです。不正値を0に置き換えず、短い記録に合わせて解析範囲を自動変更しません。生データは保持したまま、呼び出し側でエラーを表示してください。</p>
    </DocumentationArticle>
  );
}
