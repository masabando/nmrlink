import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";
import ReferenceTable from "@/components/ReferenceTable";
import MathFormula from "@/components/MathFormula";

export const metadata: Metadata = { title: "Frequency and pulse scan API" };

export default function ReferencePage() {
  return (
    <DocumentationArticle locale="en">
      <h1>Frequency and pulse scan API</h1>
      <p>Import from nmrlink. Use NMRController.sweep / pulseSweep for hardware operations; independent synchronous functions reanalyze saved records.</p>
      <h2 id="planning">frequencySteps and pulseSteps</h2>
      <p>frequencySteps(startHz, endHz, stepHz) and pulseSteps(startCycles, endCycles, stepCycles) return ascending integer grids. Start must not exceed end; step must be positive; at most 201 points. Frequencies range from 1 to 2147483647 Hz; cycles from 1 to 32767. The grid never exceeds end or appends an off-grid endpoint. Invalid plans throw RangeError.</p>
      <h2 id="sweeps">controller.sweep and controller.pulseSweep</h2>
      <ReferenceTable headings={["Operation", "Required options", "Changed field / extra result"]} rows={[
        ["sweep(parameters, options)", "startHz, endHz, stepHz", "frequencyHz / frequencies"],
        ["pulseSweep(parameters, options)", "startCycles, endCycles, stepCycles", "pulse1Cycles / lengths"],
      ]} />
      <p>Shared options are analysis={}, signal (AbortSignal), and onPoint(point, completed, total). Scans run Single measurements sequentially and reject other connection, disconnection or measurement operations for the entire scan. All planned settings and analysis options are checked before the first command.</p>
      <CodeBlock locale="en" language="js" code={`const abort = new AbortController();
const completedPoints = [];
const outcome = await controller.sweep(parameters, {
  startHz: 398000, endHz: 406000, stepHz: 1000,
  analysis: { startMs: 1, endMs: 5, minHz: -3000, maxHz: 3000 },
  signal: abort.signal,
  onPoint: point => { completedPoints.push(point); },
});
// A separate stop button calls abort.abort(); the current measurement completes first.`} />
      <p>On success, value contains points, stopped, analysis, parameters and frequencies / lengths. Cancellation returns completed points. Communication, analysis or onPoint failure interrupts the scan with ok:false. Retain already notified points in the UI. onResult is not called for scans.</p>
      <p>Low-level runFrequencySweep(device, parameters, options) / runPulseSweep(...) return the same value directly through a promise and reject on failure. The caller manages device-wide exclusivity.</p>
      <h2 id="evaluation">evaluateFrequency and evaluatePulse</h2>
      <p>evaluateFrequency(record, analysis={}) returns frequencyHz, amplitude, peakHz and record; evaluatePulse returns length, amplitude, peakHz and record. At this stage amplitude is a nonnegative FFT peak.</p>
      <p>Analysis defaults: startMs=1, endMs=5, tailPoints=100, window=hann, minHz=-3000, maxHz=3000. Both peak-band endpoints are included. An invalid band or a band containing no FFT bins throws.</p>
      <h2 id="analyzepulsecalibration">analyzePulseCalibration(records, options)</h2>
      <p>records is an array of measurement records. Defaults: analysis={}, referenceIndex=null (automatic), phaseDegrees=0. Keep source, Single mode, sample interval and all settings except first-pulse length identical. An integer referenceIndex selects the phase-reference record; phaseDegrees adds a common correction to every point.</p>
      <ReferenceTable headings={["Result", "Contents"]} rows={[
        ["points", "length, signed amplitude, quadrature, magnitude, record"],
        ["reference", "hz, phaseRad, phaseDegrees, referenceIndex, coherence"],
        ["measured", "Candidates from the measured peak and zero crossing, or null"],
        ["fit / magnitudeFit", "Signed / magnitude sine fit, or null if not computable"],
        ["warnings", "Array of phase, extrapolation and fit warnings"],
      ]} />
      <p>Uses one common frequency and phase to retain sign reversals rather than aligning each point independently. Inconsistent records, invalid references or no usable reference signal throw. Missing peaks/crossings and incoherent phase produce warnings while fitting is still attempted.</p>
      <h2 id="fitpulsecalibration">signedPulseCandidates and fitPulseCalibration</h2>
      <p>signedPulseCandidates(points) requires at least five distinct lengths with signed amplitude. It uses a positive peak and positive-to-negative zero crossing to return p90, p180 and related fields; unmet conditions throw.</p>
      <p>fitPulseCalibration(points, options={}) attempts a fit from at least three distinct positive lengths, returning p90, p180, A, B, r2, rmse, from, to, n and model. The model is <MathFormula tex={String.raw`A\sin\!\left(\frac{\pi\ell}{2p_{90}}\right)+B`} />, where ℓ is length. magnitude:true fits the absolute sine; still supply the values in amplitude. Zero signals, invalid values and failed optimization throw.</p>
      <p>warnings contains English strings; warningDetails contains code, message and details in the same order. Use warningDetails codes for UI translation.</p>
      <p><Link href="/en/guide/graphs">Graph examples</Link> · <Link href="/en/reference/api/files#archives">Archive loading</Link> · <Link href="/en/reference/api">API index</Link></p>
    </DocumentationArticle>
  );
}
