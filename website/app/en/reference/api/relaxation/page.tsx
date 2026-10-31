import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";
import ReferenceTable from "@/components/ReferenceTable";
import MathFormula from "@/components/MathFormula";

export const metadata: Metadata = { title: "T1 and T2 API" };

export default function ReferencePage() {
  return (
    <DocumentationArticle locale="en">
      <h1>T1 and T2 API</h1>
      <p>Import from nmrlink. T1 uses inversion recovery; T2 uses spin echo. Acquisition, reanalysis and fitting are separate operations.</p>
      <h2 id="parameters">t1Parameters and t2Parameters</h2>
      <CodeBlock locale="en" language="js" code={`const calibrated = {
  frequencyHz: 402000, p90Cycles: 21, p180Cycles: 42,
  measurementIntervalMs: 200, scans: 64,
};
const t1 = t1Parameters(calibrated, 5);
const t2 = t2Parameters(calibrated, 5);`} />
      <p>t1Parameters(settings, tauMs) returns device settings for 180°(0°) → τ → 90°(0°); t2Parameters uses 90°(0°) → τ → 180°(90°). Calibration values above are examples. Require integer 0 &lt; p90Cycles &lt; p180Cycles and τ=1–32767 ms. Repetition interval must exceed τ+40.96 ms. Invalid settings throw.</p>
      <h2 id="sweeps">Delay planning and acquisition</h2>
      <p>t1Delays / t2Delays(startMs, endMs, stepMs) return ascending integer τ grids from 1 to 32767 ms, at most 201 points, without exceeding the endpoint.</p>
      <p>controller.t1Sweep / controller.t2Sweep(parameters, options) run Double measurements sequentially. Required options: startMs, endMs, stepMs. Optional: analysis={}, signal, onPoint. parameters is the ordinary device settings object produced above.</p>
      <p>Successful operations return ok:true with value containing points, stopped, analysis, parameters and delays; failures return ok:false and error. Cancellation waits for the current measurement; onPoint reports completed points. Low-level runT1Sweep / runT2Sweep(device, parameters, options) return the same value directly through a promise and reject on failure.</p>
      <h2 id="t2window">t2Window(tauMs, analysis)</h2>
      <p>For T2, analysis.startMs / endMs are offsets from the echo center, defaulting to −4 / +4 ms. Acquisition begins after the second pulse, so the center is at acquisition time τ. Returned startMs / endMs are absolute acquisition times.</p>
      <CodeBlock locale="en" language="js" code={`const window = t2Window(10, { startMs: -4, endMs: 4 });
// window.startMs === 6, window.endMs === 14`} />
      <p>The start offset must be negative and the end positive. The window must contain the center, stay within 0–40.96 ms and contain at least four samples. Scans validate every moving window in advance. T1 analysis uses ordinary absolute acquisition times.</p>
      <h2 id="evaluation">evaluateT1 and evaluateT2</h2>
      <p>evaluateT1(record, analysis={}) returns tau, amplitude, peakHz and record. evaluateT2 additionally returns the moving window. amplitude is the nonnegative FFT peak within the band. Defaults match <Link href="/en/reference/api/sweeps#evaluation">frequency evaluation</Link>, except for the relative T2 window.</p>
      <h2 id="analysis">analyzeT1 and analyzeT2</h2>
      <p>records is an array of measurement records with matching source, Double mode, sample interval and all settings except τ. Options: analysis={}, referenceIndex=null, fromMs and toMs. T1 also accepts phaseDegrees=0.</p>
      <ReferenceTable headings={["Property", "T1", "T2"]} rows={[
        ["Signal evaluation", "Signed projection at common frequency and phase", "Complex magnitude at a common frequency"],
        ["Reference", "Automatic or selected-point phase reference", "Frequency from the strongest or selected point"],
        ["points", "tau, signal, magnitude, quadrature, record", "tau, signal, magnitude, amplitude, peakHz, window, record"],
        ["Fit range units", "τ [ms]; defaults to measured min–max τ", "2τ [ms]; defaults to measured min–max 2τ"],
      ]} />
      <p>Returns points, reference, fit, warnings, fromMs and toMs. Invalid settings or no usable reference signal throw. Failed fits return fit:null and warnings. T1 also skips fitting when coherence is below 0.85. T2 uses magnitude without phase alignment.</p>
      <h2 id="fits">fitT1 and fitT2</h2>
      <p>fitT1 / fitT2(points, {"{ fromMs, toMs }"}) accept points with tau and signal. The fit range is required, with inclusive endpoints. Repeated τ values are averaged.</p>
      <ReferenceTable headings={["Property", "T1", "T2"]} rows={[
        ["Model", <MathFormula key="t1-model" tex={String.raw`A-Be^{-\tau/T}`} />, <><MathFormula tex={String.raw`Ae^{-2\tau/T}`} />, zero background</>],
        ["Minimum points", "Five distinct τ values", "Three distinct τ values"],
        ["Signal", "Both negative and positive values", "Nonnegative echo magnitude"],
        ["Failure examples", <>Zero/flat data, <MathFormula tex={String.raw`R^2<0.95`} />, <MathFormula tex={String.raw`\Delta t/T<0.8`} />, optimum at search boundary</>, "Zero/flat data, negative signal, optimum at search boundary"],
      ]} />
      <p>Results include T [ms], A, B, C, sse, r2, rmse, n, from, to and model. T2 has B:null and C:0. Direct fitting functions throw if fitting fails; analyzeT1 / analyzeT2 convert fit errors into warnings.</p>
      <p>A maximum τ below three times the estimated T1 is a warning rather than a reason to reject the fit. Short T2 ranges or low agreement also produce warnings. Assess estimates together with the measured range and conditions.</p>
      <p>warnings contains English strings; warningDetails contains code, message and details in the same order. Use warningDetails codes for UI translation.</p>
      <p><Link href="/en/reference/analysis#relaxation">Fit specifications</Link> · <Link href="/en/reference/api/files#archives">Archive loading</Link> · <Link href="/en/reference/api">API index</Link></p>
    </DocumentationArticle>
  );
}
