import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";
import AnalysisPreview from "@/components/AnalysisPreview";
import CurvePreview from "@/components/CurvePreview";
import { curveHTML } from "@/examples/graph-curves";

export const metadata: Metadata = { title: "グラフを表示する" };

export default function GraphsPage() {
  return (
    <DocumentationArticle>
      <h1>グラフを表示する</h1>
      <p>FID・FFTはNMRGraphs、周波数調整・パルス校正・T1・T2はSVGを返す関数で表示します。このページの表示例はすべて模擬データで、実機には接続しません。</p>
      <h2>FIDとFFT</h2>
      <AnalysisPreview locale="ja" fftColor="#7c3aed" />
      <p>上の表示例も、下のコードと同じライブラリを使っています。<Link href="/guide/first">最初のWeb UI</Link>のグラフ作成部分を、次で置き換えてください。importと結果を受け取る処理はそのまま使います。</p>
      <CodeBlock locale="ja" language="js" code={`// 最初のWeb UIのNMRGraphs作成部分を、次で置き換えます。
const graphs = new NMRGraphs({
  fid: document.getElementById("fid"),
  fft: document.getElementById("fft"),
  displayEndMs: 10,
  frequencyLimitHz: 10000,
  locale: "ja",
  colors: { data1: "#176caa", data2: "#b34e25", fft: "#7c3aed" },
});`} />
      <p>npmではimport先を<code>nmrlink</code>と<code>nmrlink/graphs</code>にします。HTML例ではライブラリのソース一式を<code>./nmrlink/</code>に配置します。</p>
      <ul>
        <li><code>displayEndMs</code>：FIDの表示終了時刻[ms]。既定値10。</li>
        <li><code>frequencyLimitHz</code>：FFTの表示範囲[±Hz]。既定値10000。横軸の表記はkHz。</li>
        <li><code>colors</code>：<code>data1</code>・<code>data2</code>・<code>fft</code>のCSS色。省略した色は既定値を使います。</li>
      </ul>
      <p>表示範囲を変えてもFFTの解析範囲は変わりません。FIDの薄い帯が解析範囲です。FIDの縦軸は解析範囲内の信号に合わせ、先頭などの大きな信号はクリップします。横幅はコンテナに追従し、高さは280 pxを保ちます。</p>
      <p><code>graphs.show(record, analysis)</code>に既存の解析結果を渡せば再利用できます。任意の<code>peak</code>・<code>status</code>要素を指定すると最大ピークと解析条件も表示します。</p>
      <CodeBlock locale="ja" language="js" code={`// When replacing the displayed result:
graphs.show(record, analysis);
// To clear the graphs:
graphs.clear();
// When removing the view:
graphs.dispose();`} />
      <h2>言語とラベルを変える</h2>
      <p>localeで英語のen・日本語のja（既定）を選びます。labelsは指定した文字列だけを上書きし、残りは選んだ言語の既定値を使います。titleはSVGの読み上げ用の名前にもなります。空文字列ならその文字を表示しません。単位の換算や解析条件の変更は行いません。</p>
      <CodeBlock locale="ja" language="js" code={`const graphs = new NMRGraphs({
  fid: fidElement,
  fft: fftElement,
  locale: "en",
  labels: {
    fid: { title: "My FID", xLabel: "Time [ms]", yLabel: "Signal [a.u.]" },
    fft: { xLabel: "Frequency offset [kHz]" },
  },
});

const svg = createT1Plot(points, {
  fit,
  locale: "en",
  labels: { title: "Inversion recovery", xLabel: "Delay τ [ms]" },
});`} />
      <p>NMRGraphsとcreateRecordPlotsでは、labels.fid・labels.fftのそれぞれにtitle・xLabel・yLabelを指定します。4種類の曲線関数はlabels直下に同じ3項目を指定します。NMRGraphsではclear()時の文言もfid.empty・fft.emptyで変えられます。</p>
      <p>任意のpeak・status要素の文章は、次の文字列テンプレートで変えられます。省略すれば標準の翻訳を使います。HTMLは使わず、通常のテキストとして表示します。不明なキー・未対応のlocale・文字列以外の値はエラーになります。</p>
      <CodeBlock locale="ja" language="js" code={`// Pass this object as the labels option when creating NMRGraphs.
const labels = {
  peak: {
    empty: "No measurement",
    none: "No signal",
    outside: " (outside range)",
    value: "Peak: {hz} Hz{outside}",
  },
  status: "FFT: {startMs}–{endMs} ms; {window}; baseline: {tailPoints} samples",
};`} />
      <p>peak.valueでは<code>{"{hz}"}</code>と<code>{"{outside}"}</code>を使えます。statusでは<code>{"{tailPoints}"}</code>・<code>{"{displayEndMs}"}</code>・<code>{"{startMs}"}</code>・<code>{"{endMs}"}</code>・<code>{"{window}"}</code>・<code>{"{frequencyLimitKHz}"}</code>を使えます。不明な差し込み名はエラーになります。言語はビュー作成時に指定し、切り替える場合はビューを作り直します。PNG・SVGの保存にも表示中のラベルを使います。</p>
      <h2>走査・緩和測定のグラフ</h2>
      <p>以下はそれぞれ別のHTMLファイルに貼って使える例です。同じページに並べる場合は、表示先のIDとそのセレクターを重複しない名前に変えてください。青の点は模擬データ、橙の線は近似です。実際に使うときはpointsを測定・解析結果に置き換えます。近似値は推定であり、実験の妥当性を保証するものではありません。</p>
      <h3>周波数応答</h3>
      <p>frequencyHzはHz単位、amplitudeは非負の振幅です。横軸はkHzで表示します。</p>
      <CurvePreview kind="frequency" locale="ja" />
      <CodeBlock locale="ja" language="html" code={curveHTML("frequency")} />
      <h3>パルス応答</h3>
      <p>lengthはRFの周期数、amplitudeは符号付き信号です。任意のサイン近似を重ね、90°・180°のパルス候補を調べます。</p>
      <CurvePreview kind="pulse" locale="ja" />
      <CodeBlock locale="ja" language="html" code={curveHTML("pulse")} />
      <h3>T1回復曲線</h3>
      <p>tauは待ち時間[ms]、signalは符号付き信号です。近似式はA − B exp(−τ/T1)です。</p>
      <CurvePreview kind="t1" locale="ja" />
      <CodeBlock locale="ja" language="html" code={curveHTML("t1")} />
      <h3>T2減衰曲線</h3>
      <p>tauはパルス間隔[ms]、signalは非負の信号です。横軸は2τで、近似範囲の指定も2τ[ms]です。</p>
      <CurvePreview kind="t2" locale="ja" />
      <CodeBlock locale="ja" language="html" code={curveHTML("t2")} />
      <p><code>fit</code>を省略すると測定点だけを表示します。パルスとT1は<code>{'mode: "magnitude"'}</code>で各点の<code>magnitude</code>を表示でき、T1は<code>{'"quadrature"'}</code>にも対応します。T1の近似線は符号付き表示だけに描きます。上の色指定はNMRGraphs用で、この4つの曲線関数には適用されません。</p>
      <p>パルス・T1・T2の横軸は0から始まりますが、0の測定点を補ってはいません。SVG曲線はResizeObserverで幅に合わせて再描画し、画面を取り除くときに監視を解除します。NMRGraphsは内部で幅の変化を監視します。</p>
      <p><Link href="/guide/analysis">信号の解析とFFTの設定</Link></p>
      <p><Link href="/guide/save">次へ：データの保存・読み込み</Link></p>
    </DocumentationArticle>
  );
}
