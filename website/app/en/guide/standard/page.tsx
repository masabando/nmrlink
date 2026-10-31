import { sitePath } from "@/lib/site-path";
import type { Metadata } from "next";
import Link from "next/link";
import ReferenceTable from "@/components/ReferenceTable";

export const metadata: Metadata = { title: "Standard measurement guide" };

export default function WebUIGuidePage() {
  return (
    <article className="documentation" style={{ overflowWrap: "anywhere" }}>
      <h1>Standard measurement guide</h1>
      <p>Run Single or Double measurements, inspect FID and FFT, reanalyze and save data without writing code. Actual measurements require the compatible educational NMR apparatus.</p>
      <p><a className="btn" href={sitePath("/ui/?lang=en")}>Open standard measurement ↗</a></p>
      <p>Use the language selector at the top to switch between Japanese and English. Your connection, inputs, and results are preserved. Your language choice is remembered for the next visit.</p>
      <h2 id="settings">Preparation and settings</h2>
      <p>Connect the apparatus to a PC by its communication USB cable and use a <Link href="/en/guide/browsers">supported browser</Link>. Use HTTPS or localhost on the PC connected to the device. Finish operations and disconnect other apps or measurement screens using the same port.</p>
      <ReferenceTable headings={["Setting", "Initial value", "Check"]} rows={[
        ["Frequency", "402000 Hz", "Use the value checked by frequency tuning"],
        ["First / second pulse", "21 / 42 RF cycles; phase 0° / 90°", "Use calibrated cycle counts, not durations"],
        ["Pulse / repetition interval", "5 / 200 ms", "Choose for the apparatus and sample"],
        ["Scans / mode", "128 / Single", "Double also uses the second pulse"],
        ["FFT interval / window", "1–5 ms / Hann", "Choose the interval by inspecting FID"],
        ["FID / FFT display", "0–10 ms / ±10 kHz", "Display settings are separate from analysis"],
      ]} />
      <p>Initial values are starting examples, not calibrated settings. The estimated measurement time updates with the settings. It excludes serial transfer and command overhead; use it as a planning aid.</p>
      <h2 id="steps">Operation</h2>
      <ol>
        <li>Click Connect (接続), select the device port and grant access.</li>
        <li>Review settings and the estimate, then click Measure (測定する). Wait for completion.</li>
        <li>Inspect FID, FFT, acquisition time and the recorded measurement settings.</li>
        <li>Change analysis or display values and click Reanalyze (再解析) if needed. This does not measure again.</li>
        <li>Save the data you need and click Disconnect (切断).</li>
      </ol>
      <p>Immediate stopping is not supported; disconnect is not a stop command. Finish the current operation before switching pages. Measurement, Frequency tuning, Pulse calibration, T1 measurement and T2 measurement share the connection, inputs and results.</p>
      <h2 id="results">Read the results</h2>
      <p>Blue and orange FID traces are the two baseline-corrected channels. The shaded band marks the FFT interval; this interval determines the vertical scale. Large early transients may be clipped. Baseline correction uses the last 100 samples by default.</p>
      <p>The FFT axis shows the receiver-relative offset in kHz. The maximum peak is selected from all FFT bins, so it can lie outside the visible range. Distinguish the peak readout in Hz from the axis in kHz.</p>
      <p>The FFT interval, window and tail count affect analysis; FID and FFT display limits affect appearance. Raw JSON can still be saved if analysis fails. See <Link href="/en/reference/analysis">analysis specifications</Link> for details.</p>
      <h2 id="files">Save and load</h2>
      <ReferenceTable headings={["Download", "Contents"]} rows={[
        ["Raw JSON (生データJSON)", "All 2048 uncorrected sample pairs, settings and acquisition time; for reanalysis"],
        ["FID CSV / FFT CSV", "Corrected time-domain signal / computed spectrum"],
        ["SVG / PNG", "Visible graphs; these do not replace raw data"],
      ]} />
      <p>Open JSON (JSONを開く) loads one measurement record for offline reanalysis: NMRLink JSON with 2048 samples at 0.02 ms spacing, at most 2 MiB. CSV, images, full-scan JSON and Python-specific formats are not accepted.</p>
      <p>Reading is local without uploads or device commands. Imported settings are shown with the result without changing the measurement form. Invalid files retain the current record; importing is disabled during measurement.</p>
      <p>Filenames use Japan time. Save before closing the page: data is retained while switching measurement pages, but not after a reload or closing the page. A new measurement, demo or successful import replaces the displayed record.</p>
      <h2 id="demo">Try without hardware</h2>
      <p>Click Show simulated FID (模擬FIDを表示) to try graphs, analysis and downloads. DEMO / demo identifies simulated results on screen and in saved data. No device command is sent; this does not reproduce or validate hardware accuracy.</p>
      <h2 id="next">Continue with tuning and measurements</h2>
      <p>Check conditions using <Link href="/en/guide/frequency">frequency tuning</Link> and <Link href="/en/guide/pulse">pulse calibration</Link>, then proceed to <Link href="/en/guide/t1">T1</Link> or <Link href="/en/guide/t2">T2</Link>. For building a custom UI, use the <Link href="/en/guide/first">library guide</Link>.</p>
    </article>
  );
}
