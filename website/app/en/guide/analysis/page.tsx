import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";
import AnalysisPreview from "@/components/AnalysisPreview";

export const metadata: Metadata = { title: "Analyze signals" };

export default function AnalysisPage() {
  return (
    <DocumentationArticle locale="en">
      <h1>Analyze signals</h1>
      <p>Apply baseline correction and a complex FFT to examine frequency, amplitude, and phase. Analysis does not modify the original <code>record.raw</code>.</p>

      <h2>Try a simulated FID</h2>
      <p>The preview starts with noise. Switch to Ideal signal to compare the two. Change the time range or window and click Reanalyze; no hardware connection or new measurement is involved.</p>
      <AnalysisPreview locale="en" compareNoise />
      <p>Both use the same simulated FID and constant offset; the noisy version adds a fixed noise sequence. Reanalysis and page reloads do not change the noise. Compare the corrected waveform and highlighted FFT interval. Invalid settings keep the previous graphs.</p>

      <h2>Correct the baseline and run the FFT</h2>
      <p><code>record</code> is a measurement record received through <code>controller.onResult</code> or another acquisition method. Use this import for static HTML; for npm, change the path to <code>nmrlink</code>.</p>
      <CodeBlock locale="en" language="js" code={`import { analyzeMeasurement } from "./nmrlink/index.js";

const analysis = analyzeMeasurement(record, {
  startMs: 1,
  endMs: 5,
  tailPoints: 100,
  window: "hann",
});

console.log(analysis.data);          // Corrected two-channel signal
console.log(analysis.baseline.base); // Tail mean for each channel
console.log(analysis.spectrum.bins); // Frequency, complex values, amplitude, phase
console.log(analysis.peak);          // Maximum peak across all frequencies`} />
      <p><code>analyzeMeasurement(record)</code> uses these settings by default.</p>

      <h2>Choose analysis settings</h2>
      <div className="my-6 overflow-x-auto">
        <table className="table table-sm">
          <thead><tr><th scope="col">Option</th><th scope="col">Default</th><th scope="col">Meaning</th></tr></thead>
          <tbody>
            <tr><td><code>startMs</code></td><td>1</td><td>FFT start time [ms], inclusive.</td></tr>
            <tr><td><code>endMs</code></td><td>5</td><td>FFT end time [ms], exclusive.</td></tr>
            <tr><td><code>tailPoints</code></td><td>100</td><td>Number of final samples used for the baseline mean.</td></tr>
            <tr><td><code>window</code></td><td><code>hann</code></td><td><code>hann</code>: Hann window; <code>rect</code>: rectangular window.</td></tr>
            <tr><td><code>truncate</code></td><td><code>true</code></td><td>Truncate corrected values toward zero. Use <code>false</code> to keep fractional values.</td></tr>
          </tbody>
        </table>
      </div>
      <p>The FFT range must lie within the acquisition, end after it starts, and contain at least four samples. A typical 2048-point record sampled every 0.02 ms covers 0–40.96 ms, excluding the endpoint.</p>
      <p>If the beginning contains a large transient, inspect the FID and consider starting later. If the tail still contains signal, that signal contributes to the baseline estimate.</p>
      <p>The FFT time range is separate from the displayed FID time range and the displayed spectrum frequency range.</p>

      <h2>Read peaks and frequencies</h2>
      <CodeBlock locale="en" language="js" code={`const { peak, spectrum } = analysis;
console.log(peak.hz);             // Offset from the receive frequency [Hz]
console.log(peak.amplitude);      // Amplitude [arbitrary units]
console.log(peak.phaseRadians);   // Phase [rad]
console.log(spectrum.count);      // Selected sample count
console.log(spectrum.size);       // FFT size after zero-padding
console.log(spectrum.resolutionHz); // Resolution estimate from observation time
console.log(spectrum.spacingHz);  // Frequency-bin spacing`} />
      <p>The two channels form <code>Data 1 + i Data 2</code>, so the spectrum contains negative and positive frequencies. <code>peak.hz</code> is a receiver-relative offset, not the configured frequency itself.</p>
      <p>The maximum peak is selected from all FFT bins without interpolation. It may lie outside the displayed frequency range. Phase is referenced to the start of the selected time range; do not interpret phase at near-zero amplitudes.</p>
      <p>Zero-padding makes frequency bins more closely spaced, but does not improve the resolution set by the observation time.</p>

      <h2>Reanalyze the same record</h2>
      <CodeBlock locale="en" language="js" code={`const record = controller.result;
if (record) {
  const analysis = analyzeMeasurement(record, {
    startMs: 2, endMs: 6, window: "rect",
  });
  graphs.show(record, analysis);
}`} />
      <p><code>graphs</code> is the <code>NMRGraphs</code> view from <Link href="/en/guide/first">Build your first Web UI</Link>. This code sends no measurement commands. The same analysis functions also work on saved records.</p>

      <h2>Use correction and FFT separately</h2>
      <CodeBlock locale="en" language="js" code={`import { correctBaseline, computeSpectrum } from "./nmrlink/index.js";

const corrected = correctBaseline(record.raw, {
  tailPoints: 100, truncate: false,
});
const spectrum = computeSpectrum(corrected.data, {
  sampleIntervalMs: record.sampleIntervalMs,
  startMs: 1, endMs: 5, window: "hann",
});`} />
      <p>Use these functions when you need fractional corrected values or separate processing steps. On its own, <code>computeSpectrum</code> defaults to the entire input time range.</p>
      <p>Invalid data and settings throw errors. Missing channel values and <code>NaN</code> are not replaced with zero. Use <code>try / catch</code> when your UI accepts editable inputs.</p>
      <p>See <Link href="/en/guide/measurement">Control measurements</Link> for acquisition, or <Link href="/en/reference/analysis">Analysis specifications</Link> for FFT conventions and normalization details.</p>
      <p><Link href="/en/guide/graphs">Next: Display graphs</Link></p>
    </DocumentationArticle>
  );
}
