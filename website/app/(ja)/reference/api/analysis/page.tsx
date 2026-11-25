import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";
import ReferenceTable from "@/components/ReferenceTable";
import MathFormula from "@/components/MathFormula";

export const metadata: Metadata = { title: "信号解析 API" };

export default function ReferencePage() {
  return (
    <DocumentationArticle>
      <h1>信号解析 API</h1>
      <p>import先は<code>nmrlink</code>です。すべて同期関数で、入力の生データを変更しません。計算の規約は<Link href="/reference/analysis">解析の仕様</Link>を参照してください。</p>
      <h2 id="analyzemeasurement">analyzeMeasurement(record, options)</h2>
      <p>ベースライン補正→複素FFT→全周波数の最大振幅ビンをまとめて計算します。record.rawとrecord.sampleIntervalMsを使います。</p>
      <ReferenceTable headings={["option", "既定値", "意味"]} rows={[
        ["startMs / endMs", "1 / 5", "FFT範囲 [ms]、開始を含み終了を含まない"],
        ["tailPoints", "100", "ベースラインに使う末尾の点数"],
        ["truncate", "true", "差し引き後の値を0方向へ整数化"],
        ["window", "hann", "hann / rect"],
        ["lowpassHz", "null", "任意のLPFカットオフ [Hz]。nullで無効"],
      ]} />
      <CodeBlock language="js" code={`const { data, baseline, spectrum, peak } = analyzeMeasurement(record, {
  startMs: 1,
  endMs: 5,
  tailPoints: 100,
  truncate: true,
  window: "hann",
  lowpassHz: 500,
});`} />
      <p>dataは補正後の配列、baselineはcorrectBaselineの戻り値、spectrumはcomputeSpectrumの戻り値、peakは振幅最大のbinです。同振幅なら周波数の昇順で先のbinを選び、全ゼロでもamplitude:0のbinを返します。表示範囲でピーク探索を制限しません。</p>
      <h3 id="lowpass">ローパスフィルター（LPF）</h3>
      <p>lowpassHzにカットオフ周波数をHzで指定します。未指定またはnullならLPFの計算を行いません。ベースライン補正後、FFT開始時刻から取得末尾までに2次Butterworthを前後方向へ適用し、それ以前の表示データは未処理のまま残します。カットオフは前後処理後の−3 dB周波数です。</p>
      <p>dataはその区間がフィルター後の値となり、spectrumもフィルター後の値で計算します。baseline.dataはフィルター前です。追加のlowpassにはcutoffHz・startMs・method・paddingSamplesと処理区間のdataが入ります。rawは変更しません。狭いLPFは共鳴信号自体を弱め、端点付近の波形にも影響します。</p>
      <h3 id="compare-lowpass">複数のLPFを比較する</h3>
      <p>lowpassHzは1回の呼び出しで1つ指定します。同じ元のrecordに対して、カットオフだけを変えて解析してください。nullは「なし」です。フィルターを重ね掛けせず、それぞれを独立に計算します。</p>
      <CodeBlock language="js" code={`import { analyzeMeasurement } from "nmrlink";

const cutoffs = [null, 1000, 500, 200, 100];
const results = cutoffs.map(lowpassHz => ({
  lowpassHz,
  analysis: analyzeMeasurement(record, {
    startMs: 1,
    endMs: 5,
    tailPoints: 100,
    truncate: true,
    window: "hann",
    lowpassHz,
  }),
}));

console.table(results.map(({ lowpassHz, analysis }) => ({
  lowpassHz,
  peakHz: analysis.peak.hz,
  amplitude: analysis.peak.amplitude,
})));`} />
      <p>resultsの各要素にはdata・spectrum・peakを含む解析結果が入ります。この表では最大ピークの周波数と振幅を比較します。信号を減衰させると残ったノイズが最大ピークになることもあります。スペクトルの重ね描きは<Link href="/reference/api/graphs#createrecordplots">グラフAPIのfftSeries</Link>を参照してください。</p>
      <h3 id="lowpassfilter">配列を直接処理する：lowpassFilter()</h3>
      <p>独立関数は入力した2チャンネル配列の全体を同一係数で処理します。ベースライン補正や送信過渡の除外は行いません。入力は変更せず、data・cutoffHz・method・paddingSamplesを返します。4点以上、カットオフは0より大きくナイキスト周波数未満が必要です。無効なフィルター設定はINVALID_LOWPASSです。</p>
      <CodeBlock language="js" code={`import { lowpassFilter } from "nmrlink";

const result = lowpassFilter(data, {
  sampleIntervalMs: record.sampleIntervalMs,
  cutoffHz: 500,
});`} />
      <h2 id="correctbaseline">correctBaseline(raw, options)</h2>
      <p>rawは有限数値2つの配列の配列です。tailPoints=100・truncate=trueが既定です。tailPointsは1〜raw.lengthの整数、truncateはbooleanです。</p>
      <p>戻り値は<code>{"{ base, data, tailPoints, truncate }"}</code>。baseは各チャンネルの末尾平均、dataは新しい補正後配列です。2048点に限定しません。不完全なチャンネル対、非有限数値、不正な点数、演算のオーバーフローは例外です。</p>
      <h2 id="computespectrum">computeSpectrum(data, options)</h2>
      <ReferenceTable headings={["option", "既定値", "意味"]} rows={[
        ["sampleIntervalMs", "必須", "正の有限数値、サンプル間隔 [ms]"],
        ["startMs", "0", "開始時刻 [ms]、開始を含む"],
        ["endMs", "data.length × sampleIntervalMs", "終了時刻 [ms]、終了を含まない"],
        ["window", "hann", "hann：対称Hann窓、rect：矩形窓"],
      ]} />
      <p>dataはベースライン補正済みの2チャンネル配列です。この関数自体は補正しません。範囲内の4点以上を使い、次の2のべき乗までゼロ埋めします。FFTサイズの上限は<MathFormula tex={String.raw`2^{20}`} />です。データ範囲外や不正な窓、非有限数値は例外です。</p>
      <ReferenceTable headings={["戻り値のフィールド", "内容"]} rows={[
        ["bins", "周波数昇順の全FFTビン。各binはhz・real・imaginary・amplitude・phaseRadians"],
        ["startMs / endMs", "要求した範囲"],
        ["first / last", "サンプル添字の開始・終了（終了排他）"],
        ["actualStartMs / actualEndExclusiveMs", "実際に使用した時刻範囲 [ms]"],
        ["count / size", "選択した点数 / ゼロ埋め後のFFT点数"],
        ["durationMs", "count × sampleIntervalMs"],
        ["spacingHz / resolutionHz", <>FFTビン間隔 / 観測時間による<MathFormula tex={String.raw`1/T`} />の目安</>],
        ["window / convention", "窓名 / Data 1 + i Data 2"],
      ]} />
      <p>hzは受信基準からの差[Hz]、phaseRadiansは選択範囲の先頭を時間原点とする位相[rad]です。amplitudeは窓の重み合計で正規化した複素振幅の絶対値です。</p>
      <p><Link href="/guide/analysis">使い方：信号を解析する</Link> · <Link href="/reference/api">API一覧</Link></p>
    </DocumentationArticle>
  );
}
