import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";
import ReferenceTable from "@/components/ReferenceTable";

export const metadata: Metadata = { title: "グラフ API" };

export default function ReferencePage() {
  return (
    <DocumentationArticle>
      <h1>グラフ API</h1>
      <p>import先は<code>nmrlink/graphs</code>です。描画は生データ・解析結果を変更しません。</p>
      <h2 id="nmrgraphs">NMRGraphs</h2>
      <p>ブラウザ用の表示クラスです。fid・fftには描画先のDOM要素を必ず渡します。peak・statusは任意のテキスト表示先です。</p>
      <ReferenceTable headings={["option", "既定値", "意味"]} rows={[
        ["fid / fft", "必須", "FID / FFTを入れるDOM要素"],
        ["peak / status", "null", "最大ピーク / 解析条件のテキスト要素"],
        ["displayEndMs", "10", "FID表示の終了時刻 [ms]"],
        ["frequencyLimitHz", "10000", "FFT表示の±範囲 [Hz]。軸はkHz"],
        ["colors", "{}", "data1・data2・fftのCSS色"],
        ["locale / labels", "ja / {}", "表示言語 / 文字列の部分上書き"],
      ]} />
      <CodeBlock language="js" code={`const graphs = new NMRGraphs({ fid: fidElement, fft: fftElement, locale: "ja" });
graphs.show(record, analyzeMeasurement(record));
// 画面を取り除くとき：graphs.dispose();`} />
      <p>show(record, analysis)はSVGを描画します。analysis省略時は既定のanalyzeMeasurementを使います。表示は高さ280 pxで横幅に追従し、再描画時に再測定・再解析しません。clear()は記録参照と表示を消し、dispose()は幅の監視も解除します。</p>
      <p>解析引数の計算が失敗した場合は直前の表示を保持しますが、show内部の描画失敗は表示をclearして例外を投げます。入力の検証・解析を先に完了してからshowへ渡してください。</p>
      <h2 id="createrecordplots">createRecordPlots(record, options)</h2>
      <p>DOMを使わず<code>{"{ fid, fft, spectrum, peak }"}</code>を返します。fid・fftはSVG文字列です。width=720（160以上）と、NMRGraphsと同じdisplayEndMs・frequencyLimitHz・colors・locale・labelsを受け取ります。analysisは既定解析、idPrefixは自動生成です。手動のidPrefixを同じページ内で重複させないでください。</p>
      <h2 id="curves">走査曲線のSVG</h2>
      <ReferenceTable headings={["関数", "必要な点の値", "追加optionと横軸"]} rows={[
        ["createFrequencyPlot(points, options)", "frequencyHz、非負のamplitude", "設定周波数 [kHz]"],
        ["createPulsePlot(points, options)", "length、amplitude（符号付き）", "fit=null、mode=signed / magnitude。横軸はRF周期数"],
        ["createT1Plot(points, options)", "tau、signal（符号付き）", "fit=null、mode=signed / magnitude / quadrature。横軸τ [ms]"],
        ["createT2Plot(points, options)", "正のtau、非負のsignal", "fit=null。横軸2τ [ms]"],
      ]} />
      <p>全関数がwidth=720・locale=ja・labels={}を受け取り、SVG文字列を返します。高さ280 px、幅の下限160 pxです。magnitude・quadrature表示には同名の点フィールドが必要です。T1の近似はsigned表示だけに描きます。パルス・T1・T2の横軸は0始まりですが、0の測定点は追加しません。幅への追従は呼び出し元で行います。</p>
      <p>fitには<Link href="/reference/api/sweeps#fitpulsecalibration">fitPulseCalibration</Link>・<Link href="/reference/api/relaxation#fits">fitT1 / fitT2</Link>の結果を渡します。パルスのmagnitude表示には絶対値用の近似を渡してください。曲線関数にはcolorsオプションはありません。</p>
      <h2 id="labels">locale・labels・colors</h2>
      <p>localeはja（既定）またはen。NMRGraphs / createRecordPlotsのlabelsはfid・fftの下にtitle・xLabel・yLabelを指定します。曲線4関数はlabels直下に同じ3項目を指定します。省略した文字列は既定値、空文字列は表示なしです。titleはSVGのtitleとaria-labelに使います。</p>
      <CodeBlock language="js" code={`const graphs = new NMRGraphs({
  fid: fidElement, fft: fftElement, locale: "en",
  labels: { fid: { xLabel: "Time [ms]" }, fft: { yLabel: "Amplitude [a.u.]" } },
  colors: { data1: "#176caa", data2: "#b34e25", fft: "#7c3aed" },
});`} />
      <p>NMRGraphsではfid.empty・fft.emptyと、peak.empty・peak.none・peak.outside・peak.value、statusも上書きできます。peak.valueの差し込み名はhz / outside、statusはtailPoints / displayEndMs / startMs / endMs / window / frequencyLimitKHzです。HTMLは解釈せずエスケープします。不明なキー・差し込み名・locale、文字列以外はTypeErrorです。言語変更時はビューを作り直します。</p>
      <p>colorsの既定値はdata1とfftが#176caa、data2が#b34e25です。帯と軸の色は変更しません。ラベル変更だけでは単位換算は行いません。</p>
      <p><Link href="/guide/graphs">表示例とコピー用コード</Link> · <Link href="/reference/api/files#savegraphpng">PNG保存</Link> · <Link href="/reference/api">API一覧</Link></p>
    </DocumentationArticle>
  );
}
