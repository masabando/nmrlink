import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";
import ReferenceTable from "@/components/ReferenceTable";
import MathFormula from "@/components/MathFormula";

export const metadata: Metadata = { title: "Signal analysis API" };

export default function ReferencePage() {
  return (
    <DocumentationArticle locale="en">
      <h1>Signal analysis API</h1>
      <p>Import from <code>nmrlink</code>. All functions are synchronous and preserve the input samples. See <Link href="/en/reference/analysis">analysis specifications</Link> for mathematical conventions.</p>
      <h2 id="analyzemeasurement">analyzeMeasurement(record, options)</h2>
      <p>Runs baseline correction, complex FFT and peak selection across all frequencies, using record.raw and record.sampleIntervalMs.</p>
      <ReferenceTable headings={["Option", "Default", "Meaning"]} rows={[
        ["startMs / endMs", "1 / 5", "FFT interval [ms], start included and end excluded"],
        ["tailPoints", "100", "Tail sample count used for the baseline"],
        ["truncate", "true", "Truncate corrected values toward zero"],
        ["window", "hann", "hann / rect"],
      ]} />
      <CodeBlock locale="en" language="js" code={`const { data, baseline, spectrum, peak } = analyzeMeasurement(record, {
  startMs: 1, endMs: 5, tailPoints: 100, truncate: true, window: "hann",
});`} />
      <p>data is the corrected array; baseline is the correctBaseline result; spectrum is the computeSpectrum result; peak is the bin with the largest amplitude. Ties select the first bin in ascending frequency order. Zero input still returns a bin with amplitude:0. Display limits do not restrict peak selection.</p>
      <h2 id="correctbaseline">correctBaseline(raw, options)</h2>
      <p>raw is an array of finite numeric pairs. Defaults are tailPoints=100 and truncate=true. tailPoints must be an integer from 1 to raw.length; truncate must be boolean.</p>
      <p>Returns <code>{"{ base, data, tailPoints, truncate }"}</code>. base contains the channel tail means; data is a new corrected array. Input length is not restricted to 2048. Incomplete pairs, non-finite numbers, invalid sample counts and arithmetic overflow throw.</p>
      <h2 id="computespectrum">computeSpectrum(data, options)</h2>
      <ReferenceTable headings={["Option", "Default", "Meaning"]} rows={[
        ["sampleIntervalMs", "Required", "Positive finite sample interval [ms]"],
        ["startMs", "0", "Start time [ms], included"],
        ["endMs", "data.length × sampleIntervalMs", "End time [ms], excluded"],
        ["window", "hann", "hann: symmetric Hann; rect: rectangular"],
      ]} />
      <p>data is the corrected two-channel array; this function does not correct the baseline itself. At least four selected samples are required. Samples are padded to the next power of two, up to <MathFormula tex={String.raw`2^{20}`} /> FFT points. Invalid ranges, windows or non-finite values throw.</p>
      <ReferenceTable headings={["Result field", "Meaning"]} rows={[
        ["bins", "All bins in ascending frequency order; each has hz, real, imaginary, amplitude, phaseRadians"],
        ["startMs / endMs", "Requested interval"],
        ["first / last", "Start / exclusive end sample indexes"],
        ["actualStartMs / actualEndExclusiveMs", "Actual selected time interval [ms]"],
        ["count / size", "Selected sample count / padded FFT size"],
        ["durationMs", "count × sampleIntervalMs"],
        ["spacingHz / resolutionHz", <>Bin spacing / observation-time <MathFormula tex={String.raw`1/T`} /> estimate</>],
        ["window / convention", "Window name / Data 1 + i Data 2"],
      ]} />
      <p>hz is the receiver-relative offset in Hz; phaseRadians uses the start of the selected interval as its time origin. amplitude is the magnitude of the complex component normalized by the sum of window weights.</p>
      <p><Link href="/en/guide/analysis">Guide: Analyze signals</Link> · <Link href="/en/reference/api">API index</Link></p>
    </DocumentationArticle>
  );
}
