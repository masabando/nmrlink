import { sitePath } from "@/lib/site-path";
import type { Metadata } from "next";
import Link from "next/link";
import ReferenceTable from "@/components/ReferenceTable";
import MathFormula from "@/components/MathFormula";

export const metadata: Metadata = { title: "T1 measurement guide" };

export default function WebUIGuidePage() {
  return (
    <article className="documentation" style={{ overflowWrap: "anywhere" }}>
      <h1>T1 measurement guide</h1>
      <p>Inversion recovery repeats Double measurements with 180° (phase 0°) → delay τ → 90° (phase 0°) → FID acquisition, estimating T1 from signed signal recovery.</p>
      <p><a className="btn" href={sitePath("/ui/t1/?lang=en")}>Open T1 measurement ↗</a></p>
      <p>Use the language selector to switch between Japanese and English. Inputs, results, view, fit range and phase settings are retained when switching between the measurement pages.</p>
      <h2 id="settings">Preparation and settings</h2>
      <p>Use values checked by <Link href="/en/guide/frequency">frequency tuning</Link> and <Link href="/en/guide/pulse">pulse calibration</Link>. Follow <Link href="/en/guide/standard#settings">connection preparation</Link>, disconnecting other apps using the same port. Measurement, Frequency tuning, Pulse calibration, T1 measurement and T2 measurement share the connection; finish active operations before switching between them without disconnecting.</p>
      <ReferenceTable headings={["Setting", "Initial value", "Check"]} rows={[
        ["τ start / end / step", "5 / 100 / 5 ms", "Include negative-to-positive recovery"],
        ["Frequency / 90° and 180°", "402000 Hz / 21 and 42 RF cycles", "Use checked frequency and calibrated lengths"],
        ["Repetition / scans", "200 ms / 64 per point", "Allow sufficient recovery"],
        ["FFT / window / search band", "1–5 ms / Hann / ±3 kHz", "Common interval in FID after the second pulse"],
      ]} />
      <p>Defaults are starting examples. τ must be an integer from 1 to 32767 ms; at most 201 points, ending at the last on-grid delay. Repetition interval must exceed maximum τ+40.96 ms, and also allow sufficient sample recovery.</p>
      <p>Total and per-point estimates update with the settings. They exclude communication overhead and are not demo playback durations.</p>
      <h2 id="steps">Operation</h2>
      <ol>
        <li>Set frequency, pulse lengths, τ range, repetition interval and scans.</li>
        <li>Check FFT and search-band settings, then click Start scan (走査開始).</li>
        <li>Inspect negative-to-positive recovery. Click a τ button to view its FID and FFT.</li>
        <li>Set the fit range in τ [ms] and click Update fit (近似を更新).</li>
        <li>If needed, review the phase reference/correction and click Reanalyze all points (全点を再解析).</li>
        <li>Save full JSON, T1 CSV and PNG as needed, then disconnect when finished, or switch to another measurement page without disconnecting.</li>
      </ol>
      <p>Stop after current measurement (現在の測定後に停止) waits for the active point. Communication errors do not retry and retain completed records. Save before beginning a new scan.</p>
      <h2 id="results">Read the results</h2>
      <MathFormula block tex={String.raw`S(\tau)=A-Be^{-\tau/T_1}`} />
      <p>T1 and τ are in ms. Inspect T1, R², A, B, B/A, RMSE and the point count. Ideal inversion gives B/A=2, but A and B are fitted independently. The axis begins at zero without adding a zero-delay point.</p>
      <p>A common frequency and phase retain negative signals. For 選択点を位相基準にする, choose a sufficiently recovered positive FID. Extra phase correction applies to all points. Magnitude (絶対値) and Quadrature (直交成分) change only the display; the fit always uses signed signal.</p>
      <p>Fitting requires at least five distinct delays, both signal signs and other acceptance conditions. A maximum τ below three times estimated T1 is a warning, not a rejection by itself. Coherence below 0.85, zero/flat signal or an inadequate fit produces an explanation. See the <Link href="/en/reference/api/relaxation#fits">fitting API</Link> for exact conditions.</p>
      <h2 id="files">Save and load</h2>
      <ReferenceTable headings={["Download", "Contents"]} rows={[
        ["Full JSON (全データJSON)", "All raw records, measurement/analysis settings, phase reference and fit range/results"],
        ["T1 CSV", "τ, signed signal, magnitude, quadrature, reference frequency and phase"],
        ["PNG", "Current recovery view; an available fit is included in signed mode"],
        ["選択点の生データJSON", "One selected record for reanalysis in standard measurement"],
      ]} />
      <p>Open full JSON (全データJSONを開く) restores T1 scans up to 32 MiB and 201 points, including stopped scans. Without hardware, inspect FID/FFT, switch views, change phase references or fit ranges and save again. Fits are recomputed from raw records.</p>
      <p>Import is disabled during measurement. Success replaces records and settings; failure keeps them. Zero-signal records can still be opened for waveform inspection. Use each corresponding screen for other scan types. Save before closing; filenames use Japan time.</p>
      <h2 id="demo">Try without hardware</h2>
      <p>T1 scan demo (T1走査デモ) uses synthetic FID with T1=20 ms to try scanning, stopping, analysis and saving. No device command is sent; screen and downloads identify DEMO data. This does not validate hardware accuracy.</p>
      <p><Link href="/en/guide/t2">T2 measurement guide</Link> · <Link href="/en/guide/standard">Standard measurement guide</Link></p>
    </article>
  );
}
