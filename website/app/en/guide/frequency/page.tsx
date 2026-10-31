import { sitePath } from "@/lib/site-path";
import type { Metadata } from "next";
import Link from "next/link";
import ReferenceTable from "@/components/ReferenceTable";

export const metadata: Metadata = { title: "Frequency tuning guide" };

export default function WebUIGuidePage() {
  return (
    <article className="documentation" style={{ overflowWrap: "anywhere" }}>
      <h1>Frequency tuning guide</h1>
      <p>Run Single measurements at different frequencies and compare signal amplitudes using identical FFT settings. Find the largest measured response as a candidate frequency.</p>
      <p><a className="btn" href={sitePath("/ui/frequency/?lang=en")}>Open frequency tuning ↗</a></p>
      <p>Switch between Japanese and English using the language selector. Inputs and results are preserved when changing language or switching to Measurement.</p>
      <h2 id="settings">Preparation and settings</h2>
      <p>Follow <Link href="/en/guide/standard#settings">connection preparation</Link>, disconnect other apps using the same port, then connect. The connection is shared with Measurement, Pulse calibration, T1 measurement and T2 measurement, so you can switch between these pages without disconnecting. Keep pulse and acquisition settings identical across points.</p>
      <ReferenceTable headings={["Setting", "Initial value", "Meaning"]} rows={[
        ["Start / end / step", "400000 / 404000 / 1000 Hz", "A five-point frequency grid"],
        ["First pulse / phase", "21 RF cycles / 0°", "Single measurement settings"],
        ["Repetition / scans", "200 ms / 64 per point", "Adjust for your sample"],
        ["FFT interval / window", "1–5 ms / Hann", "Shared by all points"],
        ["Peak search band", "−3 to +3 kHz", "Offset from receiver frequency"],
      ]} />
      <p>Check the point count, final frequency and total time estimate before starting. At most 201 points; an off-grid endpoint is not appended. Estimates exclude communication overhead.</p>
      <h2 id="steps">Operation</h2>
      <ol>
        <li>Set the range, pulse, scans, FFT interval and search band.</li>
        <li>Click Start scan (走査開始) and inspect the response and point list.</li>
        <li>Click a frequency in the list to inspect its FID and FFT.</li>
        <li>Click Copy maximum-amplitude frequency to candidate to copy the strongest measured frequency into the candidate field. This sends no command.</li>
        <li>Save, switch to Measurement without disconnecting, and manually enter your chosen frequency in its settings.</li>
      </ol>
      <p>To finish early, click Stop after current measurement (現在の測定後に停止). It waits for the current point, then starts no further points. Communication/analysis errors also stop without retries, retaining completed points. Save before starting another scan, which replaces the previous record.</p>
      <h2 id="results">Read the results</h2>
      <p>Each point uses the last 100 samples for baseline correction and the specified FFT interval, window and search band to find its maximum amplitude. These values are compared across set frequencies. The lower FFT display spans ±10 kHz, separately from the evaluation band.</p>
      <p>The candidate is the largest measured point, not an interpolated or quadratic-fit optimum. If it lies at the range edge, reconsider the range; refine the step if needed. All-zero signals cannot be adopted. Noise and unrelated peaks can affect the result, so inspect the waveforms too.</p>
      <h2 id="files">Save and load</h2>
      <ReferenceTable headings={["Download", "Contents"]} rows={[
        ["Full JSON (全データJSON)", "Scan/analysis settings and all 2048 raw pairs at each point"],
        ["Scan CSV (走査CSV)", "Set frequency, peak amplitude and offset within the band; no raw samples"],
        ["PNG保存", "Frequency-response graph"],
        ["選択点の生データJSON", "One selected record, readable in standard measurement"],
      ]} />
      <p>Open full JSON (全データJSONを開く) restores a frequency scan up to 32 MiB and 201 points, including stopped scans. Candidates and FID/FFT views are recomputed from raw records without connecting or measuring again.</p>
      <p>Import is disabled during a scan. A successful import replaces records and settings; invalid files leave them intact. Other scan types and single-record JSON are not accepted here. Filenames use Japan time. Save before closing the page.</p>
      <h2 id="demo">Try without hardware</h2>
      <p>Frequency scan demo (周波数走査デモ) lets you try scanning, stopping, point selection and saving. No device command is sent, and simulated data is identified on screen and in downloads.</p>
      <p><Link href="/en/guide/pulse">Next: Pulse calibration</Link> · <Link href="/en/guide/standard">Standard measurement guide</Link></p>
    </article>
  );
}
