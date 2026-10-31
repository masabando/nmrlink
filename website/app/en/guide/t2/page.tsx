import type { Metadata } from "next";
import Link from "next/link";
import ReferenceTable from "@/components/ReferenceTable";
import { sitePath } from "@/lib/site-path";
import MathFormula from "@/components/MathFormula";

export const metadata: Metadata = { title: "T2 measurement guide" };

export default function WebUIGuidePage() {
  return (
    <article className="documentation" style={{ overflowWrap: "anywhere" }}>
      <h1>T2 measurement guide</h1>
      <p>Spin echo repeats Double measurements with 90° (phase 0°) → delay τ → 180° (phase 90°) → echo acquisition, estimating T2 from echo-amplitude decay.</p>
      <p><a className="btn" href={sitePath("/ui/t2/?lang=en")}>Open T2 measurement ↗</a></p>
      <p>Choose Japanese or English in the header. Settings and results are retained when switching between measurement pages.</p>
      <h2 id="settings">Preparation and settings</h2>
      <p>Use values checked by <Link href="/en/guide/frequency">frequency tuning</Link> and <Link href="/en/guide/pulse">pulse calibration</Link>. Follow <Link href="/en/guide/standard#settings">connection preparation</Link> and disconnect other apps using the same port first. All five measurement pages share a connection; switch after the current operation finishes without disconnecting.</p>
      <ReferenceTable headings={["Setting", "Initial value", "Check"]} rows={[
        ["τ start / end / step", "5 / 35 / 2 ms", "Keep the analysis window within acquisition time"],
        ["Frequency / 90° and 180°", "402000 Hz / 21 and 42 RF cycles", "Use checked frequency and calibrated lengths"],
        ["Repetition / scans", "200 ms / 64 per point", "Allow sufficient recovery"],
        ["FFT relative to echo center", "−4 to +4 ms", "Window must contain the center"],
        ["Window / search band", "Hann / ±3 kHz", "Common to all points"],
      ]} />
      <p>Defaults are starting examples. τ is an integer; up to 201 points, ending at the last on-grid delay. Repetition interval must exceed maximum τ+40.96 ms and allow sufficient sample recovery. Total/per-point estimates exclude communication overhead.</p>
      <h2 id="steps">Operation</h2>
      <ol>
        <li>Set frequency, calibrated pulse lengths, τ range, repetition interval and scans.</li>
        <li>Check the relative FFT window and search band, then click Start scan (走査開始).</li>
        <li>Inspect decay versus 2τ [ms]. Click a τ button to view its echo and FFT.</li>
        <li>Set the fit range in 2τ [ms] and click Update fit (近似を更新).</li>
        <li>If needed, change the reference point, or edit analysis settings and click Apply analysis (解析条件を適用).</li>
        <li>Save full JSON, T2 CSV and PNG as needed, then disconnect.</li>
      </ol>
      <p>Stop after current measurement (現在の測定後に停止) waits for the active point. Errors do not retry and retain completed records. Save before starting another scan.</p>
      <h2 id="results">Read the results</h2>
      <MathFormula block tex={String.raw`S(2\tau)=Ae^{-2\tau/T_2}`} />
      <p>T2 is in ms; the screen shows T2, R², A, RMSE and point count. Background is fixed at zero. Both the axis and fit range use 2τ rather than τ. The axis starts at zero without adding a zero-time measurement.</p>
      <h3>A window that follows the echo</h3>
      <p>Waveform time zero is after the second pulse; the echo center is τ. For τ=15 ms and a −4 to +4 ms window, analysis uses 11–19 ms. Every window must contain the center and stay within 0–40.96 ms. With the default ±4 ms window, valid integer device delays are 4–36 ms.</p>
      <p>A strong echo supplies a common frequency; all points are evaluated by complex magnitude at that frequency. 選択点を周波数基準にする selects it manually. Unlike T1, this uses no signed projection or common phase alignment.</p>
      <p>Apply analysis (解析条件を適用) reanalyzes existing points without remeasuring. Echo waveforms show 0–40.96 ms and FFT spans ±10 kHz; the band marks the actual analysis window. The last 100 samples define the baseline, so inspect signal remaining in the tail for late echoes.</p>
      <p>Fits are attempted from three distinct delays. Short ranges or poor agreement produce estimates with warnings; zero or flat data and other failed fits show a reason. See <Link href="/en/reference/api/relaxation#fits">fit acceptance conditions</Link>.</p>
      <h2 id="files">Save and load</h2>
      <ReferenceTable headings={["Download", "Contents"]} rows={[
        ["Full JSON (全データJSON)", "All raw records, settings, reference frequency and fit range/results"],
        ["T2 CSV", "τ, 2τ, echo amplitude, common frequency and actual analysis window"],
        ["PNG保存", "Echo decay curve with an available fit"],
        ["選択点の生データJSON", "One selected record, readable in standard measurement"],
      ]} />
      <p>Open full JSON (全データJSONを開く) restores T2 scans up to 32 MiB and 201 points, including stopped scans. Without hardware, inspect waveforms/FFT, change fit ranges, reference frequency or analysis settings and save again. Results are recomputed from raw data rather than simply showing stored fits.</p>
      <p>Import is disabled during measurement. Success replaces records and settings; failure keeps them. Zero-signal records can still be opened for waveform inspection. Use corresponding screens for other scan types such as T1. Save before closing; filenames use Japan time.</p>
      <h2 id="demo">Try without hardware</h2>
      <p>T2 scan demo (T2走査デモ) uses synthetic echoes with T2=22 ms to try scanning, stopping, analysis, saving and loading. No device command is sent; screen and downloads identify DEMO data. This does not validate hardware accuracy.</p>
      <p><Link href="/en/guide/t1">T1 measurement guide</Link> · <Link href="/en/guide/standard">Standard measurement guide</Link></p>
    </article>
  );
}
