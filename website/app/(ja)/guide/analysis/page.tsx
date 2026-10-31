import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";
import AnalysisPreview from "@/components/AnalysisPreview";

export const metadata: Metadata = { title: "信号を解析する" };

export default function AnalysisPage() {
  return (
    <DocumentationArticle>
      <h1>信号を解析する</h1>
      <p>測定結果にベースライン補正と複素FFTを適用し、周波数・振幅・位相を調べます。解析しても元の <code>record.raw</code> は変更されません。</p>

      <h2>模擬FIDで試す</h2>
      <p>初期表示は「ノイズあり」です。「理想信号」と切り替えて比較できます。解析範囲や窓関数を変えたら「再解析」を押してください。装置への接続や再測定は行いません。</p>
      <AnalysisPreview compareNoise />
      <p>両方とも同じ模擬FIDに一定のオフセットを加え、ノイズありには固定のノイズを重ねています。ノイズは再解析やページの再読み込みで変わりません。末尾平均を差し引いた波形とFFT範囲を比較してみてください。不正な設定では直前のグラフを保持します。</p>

      <h2>補正とFFTをまとめて実行する</h2>
      <p><code>record</code> は <code>controller.onResult</code> などで受け取った測定結果です。静的HTMLでは次のように読み込みます。npmではimport先を <code>nmrlink</code> にします。</p>
      <CodeBlock language="js" code={`import { analyzeMeasurement } from "./nmrlink/index.js";

const analysis = analyzeMeasurement(record, {
  startMs: 1,
  endMs: 5,
  tailPoints: 100,
  window: "hann",
});

console.log(analysis.data);          // 補正後の2チャンネル波形
console.log(analysis.baseline.base); // チャンネルごとの末尾平均
console.log(analysis.spectrum.bins); // 周波数・複素成分・振幅・位相
console.log(analysis.peak);          // 全周波数中の最大ピーク`} />
      <p>引数を省略した <code>analyzeMeasurement(record)</code> でも、上記の条件で解析します。</p>

      <h2>解析条件を選ぶ</h2>
      <div className="my-6 overflow-x-auto">
        <table className="table table-sm">
          <thead><tr><th scope="col">オプション</th><th scope="col">既定値</th><th scope="col">意味</th></tr></thead>
          <tbody>
            <tr><td><code>startMs</code></td><td>1</td><td>FFT開始時刻 [ms]。開始点を含みます。</td></tr>
            <tr><td><code>endMs</code></td><td>5</td><td>FFT終了時刻 [ms]。終了点は含みません。</td></tr>
            <tr><td><code>tailPoints</code></td><td>100</td><td>ベースライン平均を求める末尾の点数。</td></tr>
            <tr><td><code>window</code></td><td><code>hann</code></td><td><code>hann</code>：Hann窓、<code>rect</code>：矩形窓。</td></tr>
            <tr><td><code>truncate</code></td><td><code>true</code></td><td>補正値を0方向へ整数化。<code>false</code> では小数を保ちます。</td></tr>
          </tbody>
        </table>
      </div>
      <p>FFT範囲は取得時間内で、開始より終了を後にし、最低4点を含めます。通常の2048点・0.02 ms間隔では取得区間は0〜40.96 ms（終端を含まない）です。</p>
      <p>先頭に大きな過渡信号がある場合は、その後から解析するなど、FIDを見ながら範囲を選びます。末尾にも信号が残っている場合は、末尾平均にその信号が含まれることにも注意してください。</p>
      <p>解析範囲はFFTに使う時間区間です。FIDの表示時間やスペクトルの横軸の表示範囲とは別に設定します。</p>

      <h2>ピークと周波数を読む</h2>
      <CodeBlock language="js" code={`const { peak, spectrum } = analysis;
console.log(peak.hz);             // 受信周波数からの差 [Hz]
console.log(peak.amplitude);      // 振幅 [任意単位]
console.log(peak.phaseRadians);   // 位相 [rad]
console.log(spectrum.count);      // 選択したサンプル数
console.log(spectrum.size);       // ゼロ埋め後のFFT点数
console.log(spectrum.resolutionHz); // 観測時間による分解能の目安
console.log(spectrum.spacingHz);  // 周波数ビンの間隔`} />
      <p>2チャンネルを <code>Data 1 + i Data 2</code> として扱うため、負・正の周波数が返ります。<code>peak.hz</code> は設定周波数そのものではなく、受信基準からの差です。</p>
      <p>最大ピークは全周波数のFFTビンから選び、ビン間の補間は行いません。グラフの表示範囲外にあることもあります。位相の時間原点は選んだ解析区間の先頭で、ほぼゼロ振幅の位相は評価に使わないでください。</p>
      <p>ゼロ埋めでビン間隔が細かくなっても、観測時間による分解能が改善するわけではありません。</p>

      <h2>同じ結果を再解析する</h2>
      <CodeBlock language="js" code={`const record = controller.result;
if (record) {
  const analysis = analyzeMeasurement(record, {
    startMs: 2, endMs: 6, window: "rect",
  });
  graphs.show(record, analysis);
}`} />
      <p><code>graphs</code> は<Link href="/guide/first">最初のWeb UI</Link>で作った <code>NMRGraphs</code> です。この処理では測定命令を送りません。保存済みの測定結果にも同じ解析関数を使えます。</p>

      <h2>補正とFFTを個別に使う</h2>
      <CodeBlock language="js" code={`import { correctBaseline, computeSpectrum } from "./nmrlink/index.js";

const corrected = correctBaseline(record.raw, {
  tailPoints: 100, truncate: false,
});
const spectrum = computeSpectrum(corrected.data, {
  sampleIntervalMs: record.sampleIntervalMs,
  startMs: 1, endMs: 5, window: "hann",
});`} />
      <p>浮動小数の補正値を使う場合や、処理を分けたい場合に使います。<code>computeSpectrum</code> 単独の範囲の既定値はデータ全体です。</p>
      <p>不正なデータや範囲はエラーになります。<code>NaN</code> や不完全なチャンネル対を0に置き換えることはありません。各関数は例外を投げるため、入力を変更できる画面では <code>try / catch</code> で表示してください。</p>
      <p>実機データの取得は<Link href="/guide/measurement">測定を制御する</Link>、FFTの規約や正規化の詳細は<Link href="/reference/analysis">解析の仕様</Link>を参照してください。</p>
      <p><Link href="/guide/graphs">次へ：グラフを表示する</Link></p>
    </DocumentationArticle>
  );
}
