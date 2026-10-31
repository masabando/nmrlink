import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";
import AnalysisPreview from "@/components/AnalysisPreview";
import CurvePreview from "@/components/CurvePreview";
import { curveHTML } from "@/examples/graph-curves";

export const metadata: Metadata = { title: "Display graphs" };

export default function GraphsPage() {
  return (
    <DocumentationArticle locale="en">
      <h1>Display graphs</h1>
      <p>Use NMRGraphs for FID and FFT, and SVG functions for frequency sweeps, pulse calibration, T1 and T2. All previews below use simulated data without connecting to hardware.</p>
      <h2>FID and FFT</h2>
      <AnalysisPreview locale="en" fftColor="#7c3aed" />
      <p>The preview uses the same library as the example below. Replace the graph constructor in <Link href="/en/guide/first">Your first Web UI</Link> with the following settings; keep the imports and result handler.</p>
      <CodeBlock locale="en" language="js" code={`// Replace the NMRGraphs constructor in the first Web UI with this.
const graphs = new NMRGraphs({
  fid: document.getElementById("fid"),
  fft: document.getElementById("fft"),
  displayEndMs: 10,
  frequencyLimitHz: 10000,
  locale: "en",
  colors: { data1: "#176caa", data2: "#b34e25", fft: "#7c3aed" },
});`} />
      <p>For npm, import from <code>nmrlink</code> and <code>nmrlink/graphs</code>. The HTML examples assume the library source folder is available as <code>./nmrlink/</code>.</p>
      <ul>
        <li><code>displayEndMs</code>: FID display end in ms (default 10).</li>
        <li><code>frequencyLimitHz</code>: FFT display limit in ±Hz (default 10000); the axis uses kHz.</li>
        <li><code>colors</code>: CSS colors for <code>data1</code>, <code>data2</code> and <code>fft</code>. Omitted keys retain their defaults.</li>
      </ul>
      <p>Display limits do not change the FFT analysis interval. The shaded FID region marks that interval. The vertical FID scale follows the analysis interval and clips larger early signals. Width follows the container; graph height stays at 280 px.</p>
      <p>Pass an existing analysis to <code>graphs.show(record, analysis)</code> to reuse it. Optional <code>peak</code> and <code>status</code> elements display the peak and analysis description.</p>
      <CodeBlock locale="en" language="js" code={`// When replacing the displayed result:
graphs.show(record, analysis);
// To clear the graphs:
graphs.clear();
// When removing the view:
graphs.dispose();`} />
      <h2>Language and custom labels</h2>
      <p>Set locale to <code>en</code> for English or <code>ja</code> for Japanese (the default). Labels override only the supplied strings, keeping the other labels in the selected language. Titles also set the SVG accessible name. Empty strings hide the corresponding text. Label changes do not convert units or change analysis.</p>
      <CodeBlock locale="en" language="js" code={`const graphs = new NMRGraphs({
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
      <p>NMRGraphs and createRecordPlots use nested <code>labels.fid</code> and <code>labels.fft</code>, each with title, xLabel and yLabel. The four curve functions use a flat <code>labels</code> object with the same three keys. NMRGraphs also accepts fid.empty and fft.empty for the text shown by clear().</p>
      <p>For optional peak and status elements, use the following string templates. Omit them to use the built-in translation. Do not put HTML in labels; strings are displayed as text. Unknown keys, unsupported locales and non-string values are rejected.</p>
      <CodeBlock locale="en" language="js" code={`// Pass this object as the labels option when creating NMRGraphs.
const labels = {
  peak: {
    empty: "No measurement",
    none: "No signal",
    outside: " (outside range)",
    value: "Peak: {hz} Hz{outside}",
  },
  status: "FFT: {startMs}–{endMs} ms; {window}; baseline: {tailPoints} samples",
};`} />
      <p>peak.value supports <code>{"{hz}"}</code> and <code>{"{outside}"}</code>. status supports <code>{"{tailPoints}"}</code>, <code>{"{displayEndMs}"}</code>, <code>{"{startMs}"}</code>, <code>{"{endMs}"}</code>, <code>{"{window}"}</code> and <code>{"{frequencyLimitKHz}"}</code>. Unknown placeholder names are rejected. Set these options when creating the view; recreate it to change languages. PNG and SVG exports retain the displayed labels.</p>
      <h2>Response curves</h2>
      <p>Each example can be pasted into a separate HTML file. To combine them on one page, give each container a unique ID and update its selector. Blue dots are simulated samples; orange lines are fits. Replace the points with your analysis results. Fits are estimates, not a validation of the experiment.</p>
      <h3>Frequency response</h3>
      <p>Supply frequencyHz in Hz and a nonnegative amplitude. The horizontal axis is in kHz.</p>
      <CurvePreview kind="frequency" locale="en" />
      <CodeBlock locale="en" language="html" code={curveHTML("frequency", "en")} />
      <h3>Pulse response</h3>
      <p>length is the RF cycle count; amplitude preserves the sign. The optional sine fit estimates 90° and 180° pulses.</p>
      <CurvePreview kind="pulse" locale="en" />
      <CodeBlock locale="en" language="html" code={curveHTML("pulse", "en")} />
      <h3>T1 recovery</h3>
      <p>tau is in ms and signal is signed. The fit uses A − B exp(−τ/T1).</p>
      <CurvePreview kind="t1" locale="en" />
      <CodeBlock locale="en" language="html" code={curveHTML("t1", "en")} />
      <h3>T2 decay</h3>
      <p>Supply tau in ms and a nonnegative signal. The graph plots 2τ; fit limits are also expressed as 2τ in ms.</p>
      <CurvePreview kind="t2" locale="en" />
      <CodeBlock locale="en" language="html" code={curveHTML("t2", "en")} />
      <p>Omit <code>fit</code> to show only the measured points. Pulse and T1 plots also support <code>{'mode: "magnitude"'}</code> using each point’s <code>magnitude</code>; T1 additionally supports <code>{'"quadrature"'}</code>. T1 fits are shown only in signed mode. Color options above apply to NMRGraphs, not these four curve functions.</p>
      <p>Pulse, T1 and T2 horizontal axes begin at zero without inventing a measurement at zero. ResizeObserver redraws these SVG curves to match their containers. Disconnect it when removing the view. NMRGraphs handles its own resize observer.</p>
      <p><Link href="/en/guide/analysis">Signal analysis and FFT settings</Link></p>
      <p><Link href="/en/guide/save">Next: Save and load data</Link></p>
    </DocumentationArticle>
  );
}
