import { sitePath } from "@/lib/site-path";
import type { Metadata } from "next";
import Link from "next/link";
import ReferenceTable from "@/components/ReferenceTable";
import MathFormula from "@/components/MathFormula";

export const metadata: Metadata = { title: "Pulse calibration guide" };

export default function WebUIGuidePage() {
  return (
    <article className="documentation" style={{ overflowWrap: "anywhere" }}>
      <h1>Pulse calibration guide</h1>
      <p>Keep frequency fixed and vary the first-pulse cycle count in Single measurements. Inspect Rabi oscillation peaks and troughs and use sine fits to estimate candidate 90° and 180° pulse lengths.</p>
      <p><a className="btn" href={sitePath("/ui/pulse/?lang=en")}>Open pulse calibration ↗</a></p>
      <p>Switch between Japanese and English using the language selector. Inputs, results, signal view and phase settings remain available when switching between the measurement pages.</p>
      <h2 id="settings">Preparation and settings</h2>
      <p>Enter the frequency checked by <Link href="/en/guide/frequency">frequency tuning</Link> into Fixed frequency (固定周波数). Follow <Link href="/en/guide/standard#settings">connection preparation</Link> and disconnect other apps using the same port. Measurement, Frequency tuning, Pulse calibration, T1 measurement and T2 measurement share the connection; finish active operations before switching, without disconnecting.</p>
      <ReferenceTable headings={["Setting", "Initial value", "Check"]} rows={[
        ["Start / end / step", "5 / 80 / 5 RF cycles", "Include the first peak and the region beyond it"],
        ["Fixed frequency / first phase", "402000 Hz / 0°", "Use your checked frequency"],
        ["Repetition / scans", "200 ms / 64 per point", "Adjust for your sample"],
        ["FFT / window / search band", "1–5 ms / Hann / ±3 kHz", "Common to all points"],
      ]} />
      <p>The initial grid has 16 points. Up to 201 are allowed, ending at the last on-grid point. Total time estimates exclude communication overhead.</p>
      <h2 id="steps">Operation</h2>
      <ol>
        <li>Review frequency, scan range, scans and analysis settings; click Start scan (走査開始).</li>
        <li>Inspect peaks and troughs in the initial Magnitude view (絶対値).</li>
        <li>Switch to Signed signal (符号付き信号) to check the positive peak and subsequent sign reversal.</li>
        <li>Click a cycle count in the list to inspect its FID and FFT.</li>
        <li>When a fit is available, click 近似値を候補欄へ to display rounded integer 90°/180° candidates.</li>
        <li>Save and switch to Measurement without disconnecting, then enter your chosen values manually.</li>
      </ol>
      <p>Copying candidates sends no command. It uses the fit for the currently selected view. The 21/42-cycle defaults in measurement screens are not established calibration values.</p>
      <h2 id="results">Read the results</h2>
      <p>Magnitude folds negative signals upward. Do not identify 90°/180° solely from its peaks and troughs; inspect signed data and phase agreement too. The axis starts at zero without adding a zero-cycle measurement.</p>
      <MathFormula block tex={String.raw`S(p)=A\sin\!\left(\frac{\pi p}{2p_{90}}\right)+B,\qquad p_{180}=2p_{90}`} />
      <p>p is the first-pulse RF cycle count. Magnitude fitting uses the absolute sine. Fits are attempted from three distinct lengths; phase inconsistency, low agreement and extrapolation generate warnings. Inspect the curve, R² and individual waveforms.</p>
      <p>Measured candidates use the first positive peak and the next positive-to-negative crossing, interpolated between neighboring points. They are distinct from sine-fit candidates. If no estimate is possible, such as for zero signal, the reason is shown.</p>
      <h3>Common phase reference</h3>
      <p>All points use one frequency and phase reference, retaining sign reversals. Select a point and click 選択点を位相基準にする, or enter an extra phase correction and click 全点を再解析. 自動基準に戻す restores automatic selection. Changing the reference clears candidate fields; check and copy them again. This does not remeasure or alter raw samples.</p>
      <h2 id="files">Save and load</h2>
      <ReferenceTable headings={["Download", "Contents"]} rows={[
        ["Full JSON (全データJSON)", "All raw records, settings, phase reference, signed analysis and fits"],
        ["Calibration CSV (校正CSV)", "Cycles, signed signal, magnitude, quadrature, reference frequency/phase"],
        ["PNG", "Current view with an available sin or |sin| fit"],
        ["選択点の生データJSON", "One selected record, readable in standard measurement"],
      ]} />
      <p>Open full JSON (全データJSONを開く) restores a pulse scan up to 32 MiB and 201 points, including stopped scans. Without hardware, switch views, inspect individual waveforms, change the phase reference/correction and save again. Analysis is recomputed from saved raw data.</p>
      <p>Import is disabled during scanning. Success replaces records and settings; invalid files retain them. Zero-signal records can still be opened for waveform inspection without a reference or fit. Open other archive types in their corresponding screens.</p>
      <h2 id="stop-demo">Stopping and trying without hardware</h2>
      <p>Stop after current measurement (現在の測定後に停止) waits for the active point. Errors do not retry and retain completed records. Save before another scan or closing the page. Filenames use Japan time.</p>
      <p>Pulse scan demo (パルス走査デモ) uses a synthetic signal with 90°=21 cycles. It sends no device commands and marks results as simulated. It does not validate physical calibration accuracy.</p>
      <p><Link href="/en/guide/t1">T1 guide</Link> · <Link href="/en/guide/t2">T2 guide</Link> · <Link href="/en/guide/standard">Standard measurement guide</Link></p>
    </article>
  );
}
