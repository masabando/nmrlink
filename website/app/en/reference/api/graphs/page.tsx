import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";
import ReferenceTable from "@/components/ReferenceTable";

export const metadata: Metadata = { title: "Graphs API" };

export default function ReferencePage() {
  return (
    <DocumentationArticle locale="en">
      <h1>Graphs API</h1>
      <p>Import from <code>nmrlink/graphs</code>. Rendering does not modify raw samples or analysis results.</p>
      <h2 id="nmrgraphs">NMRGraphs</h2>
      <p>A browser view class. fid and fft are required destination elements; peak and status are optional text elements.</p>
      <ReferenceTable headings={["Option", "Default", "Meaning"]} rows={[
        ["fid / fft", "Required", "Destination DOM elements"],
        ["peak / status", "null", "Peak / analysis description text elements"],
        ["displayEndMs", "10", "FID display end [ms]"],
        ["frequencyLimitHz", "10000", "FFT ±display limit [Hz]; axis uses kHz"],
        ["colors", "{}", "CSS colors for data1, data2 and fft"],
        ["locale / labels", "ja / {}", "Language / partial text overrides"],
      ]} />
      <CodeBlock locale="en" language="js" code={`const graphs = new NMRGraphs({ fid: fidElement, fft: fftElement, locale: "en" });
graphs.show(record, analyzeMeasurement(record));
// When removing the view: graphs.dispose();`} />
      <p>show(record, analysis) renders SVG. If analysis is omitted, it runs analyzeMeasurement with defaults. Height stays at 280 px while width follows the container. Resizing does not reacquire or reanalyze. clear() removes record references and the graphs; dispose() also disconnects the resize observer.</p>
      <p>If evaluation of the analysis argument fails, the previous view remains. A rendering failure inside show clears the view and throws. Complete validation and analysis before passing the result to show.</p>
      <h2 id="createrecordplots">createRecordPlots(record, options)</h2>
      <p>Returns <code>{"{ fid, fft, spectrum, peak }"}</code> without a DOM; fid and fft are SVG strings. Options include width=720 (minimum 160), plus the same displayEndMs, frequencyLimitHz, colors, locale and labels as NMRGraphs. analysis defaults to the standard analysis; idPrefix is generated automatically. Manual prefixes must be unique within a page.</p>
      <h2 id="curves">Response curve SVGs</h2>
      <ReferenceTable headings={["Function", "Required point fields", "Additional options and axis"]} rows={[
        ["createFrequencyPlot(points, options)", "frequencyHz, nonnegative amplitude", "Set frequency [kHz]"],
        ["createPulsePlot(points, options)", "length, signed amplitude", "fit=null, mode=signed / magnitude; RF cycle count"],
        ["createT1Plot(points, options)", "tau, signed signal", "fit=null, mode=signed / magnitude / quadrature; τ [ms]"],
        ["createT2Plot(points, options)", "Positive tau, nonnegative signal", "fit=null; 2τ [ms]"],
      ]} />
      <p>All accept width=720, locale=ja and labels={}, returning an SVG string at height 280 px with a minimum width of 160 px. Magnitude and quadrature modes require the corresponding point fields. T1 fits are drawn only in signed mode. Pulse, T1 and T2 axes start at zero without adding a measurement there. Callers handle responsive redraws.</p>
      <p>Use results from <Link href="/en/reference/api/sweeps#fitpulsecalibration">fitPulseCalibration</Link> and <Link href="/en/reference/api/relaxation#fits">fitT1 / fitT2</Link> for fit. Pulse magnitude mode needs a magnitude fit. These curve functions do not accept colors.</p>
      <h2 id="labels">locale, labels and colors</h2>
      <p>locale accepts ja (default) or en. NMRGraphs / createRecordPlots use title, xLabel and yLabel inside labels.fid and labels.fft. The four curve functions use those three keys directly in labels. Omitted strings use defaults; an empty string hides the text. title supplies both SVG title and aria-label.</p>
      <CodeBlock locale="en" language="js" code={`const graphs = new NMRGraphs({
  fid: fidElement, fft: fftElement, locale: "en",
  labels: { fid: { xLabel: "Time [ms]" }, fft: { yLabel: "Amplitude [a.u.]" } },
  colors: { data1: "#176caa", data2: "#b34e25", fft: "#7c3aed" },
});`} />
      <p>NMRGraphs also accepts fid.empty, fft.empty, peak.empty, peak.none, peak.outside, peak.value and status. peak.value placeholders are hz / outside; status placeholders are tailPoints / displayEndMs / startMs / endMs / window / frequencyLimitKHz. Strings are escaped as text, not interpreted as HTML. Unknown keys, placeholders, locales or non-string labels throw TypeError. Recreate the view to change languages.</p>
      <p>Default colors are #176caa for data1 and fft, #b34e25 for data2. Band and axis colors stay fixed. Changing label text does not convert units.</p>
      <p><Link href="/en/guide/graphs">Previews and copyable examples</Link> · <Link href="/en/reference/api/files#savegraphpng">PNG export</Link> · <Link href="/en/reference/api">API index</Link></p>
    </DocumentationArticle>
  );
}
