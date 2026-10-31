import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";
import ReferenceTable from "@/components/ReferenceTable";
import MathFormula from "@/components/MathFormula";

export const metadata: Metadata = { title: "Connection and measurement API" };

export default function ReferencePage() {
  return (
    <DocumentationArticle locale="en">
      <h1>Connection and measurement API</h1>
      <p>Import from <code>nmrlink</code>. Use NMRController for UI operation state; use NMRDevice when handling rejecting promises directly or replacing the transport.</p>
      <h2 id="parameters">Parameters and validateParameters</h2>
      <p><code>validateParameters(input)</code> returns a copy containing only these eight required fields. It does not change the input or convert numeric strings.</p>
      <ReferenceTable headings={["Field", "Meaning", "Range"]} rows={[
        ["frequencyHz", "Set frequency [Hz]", "Integer 1–2147483647"],
        ["pulse1Cycles / pulse2Cycles", "First / second pulse RF cycle counts", "Integer 0–32767"],
        ["phase1Degrees / phase2Degrees", "Phase [degrees]", "0 / 90 / 180 / 270"],
        ["pulseIntervalMs", "Inter-pulse delay [ms]", "Integer 0–32767"],
        ["measurementIntervalMs", "Device repetition interval setting [ms]", "Integer 1–32767"],
        ["scans", "Acquisition count", "Integer 1–32767"],
      ]} />
      <p>These are encoding limits, not guaranteed operating settings for your apparatus or sample. Include second-pulse fields even for Single measurements. An invalid object throws TypeError; out-of-range values throw RangeError.</p>
      <h2 id="record">Measurement record</h2>
      <CodeBlock locale="en" language="js" code={`const record = {
  source: "instrument", // "demo" for simulated data
  acquiredAt: "2026-10-21T06:00:00.000Z",
  mode: "single", // "single" or "double"
  parameters: { frequencyHz: 402000, pulse1Cycles: 21, phase1Degrees: 0,
    pulse2Cycles: 42, phase2Degrees: 90, pulseIntervalMs: 5,
    measurementIntervalMs: 200, scans: 64 },
  sampleIntervalMs: 0.02,
  points: 2048,
  raw: Array.from({ length: 2048 }, () => [0, 0]),
};`} />
      <p>raw holds uncorrected [Data 1, Data 2] pairs. Acquisition does not apply baseline correction or FFT. Retain source and the original samples separately from derived arrays. Display-only demo records may use parameters:null.</p>
      <h2 id="nmrcontroller">NMRController</h2>
      <CodeBlock locale="en" language="js" code={`const controller = new NMRController({ device: new NMRDevice() });
// After controller.connect() succeeds from a connect button, run from a measure button.
const result = await controller.measure(parameters, { mode: "single" });
if (result.ok) console.log(result.value);
else console.error(result.error);`} />
      <p>Constructor options may be omitted. connect(), disconnect() and measure(parameters, options) resolve with <code>{"{ ok: true, value }"}</code> or <code>{"{ ok: false, error }"}</code>. The default measurement mode is single; double is also supported.</p>
      <ReferenceTable headings={["Member", "Contract"]} rows={[
        ["state", "connection, operation, busy, canConnect, canDisconnect, canMeasure, hasResult"],
        ["state.operation", "connect / disconnect / measure / sweep / null"],
        ["result", "Last acquired measurement record, or null"],
        ["onStateChange(callback)", "Also reports current state immediately; returns an unsubscribe function"],
        ["onResult(callback)", "Reports successful Single/Double records; returns an unsubscribe function"],
        ["onError(callback)", "Reports operation and notification-listener errors; returns an unsubscribe function"],
        ["dispose()", "Releases monitoring and listeners; throws while busy; does not stop or disconnect"],
      ]} />
      <p>Concurrent operations are refused, without queuing or automatic retries. Call connect directly from a user click. Failures retain the last successful record. Scans use onPoint rather than onResult; result becomes the last evaluated point.</p>
      <h2 id="nmrdevice">NMRDevice</h2>
      <ReferenceTable headings={["Constructor option", "Default", "Meaning"]} rows={[
        ["transport", "new WebSerialTransport()", "Communication transport"],
        ["responseTimeoutMs", "5000", "Maximum wait for an ordinary response / one sample line [ms]"],
        ["dataTimeoutMs", "30000", "Maximum total sample transfer time [ms]"],
        ["measurementMarginMs", "20000", "Margin added to the measurement estimate [ms]"],
      ]} />
      <p>Timeouts must be positive finite numbers. connect() and disconnect() return Promise&lt;void&gt;; measure(parameters, options) returns a promise of a measurement record. Failures reject. state is disconnected / connecting / connected / measuring.</p>
      <p>Disconnecting during measurement is refused. Invalid local input sends no commands; communication failure attempts disconnection and requires reconnection. A measurement error combined with a cleanup error produces AggregateError. There is no immediate-stop API.</p>
      <h2 id="measurementdurationms">measurementDurationMs</h2>
      <p><code>measurementDurationMs(parameters, {"{ mode: 'single' }"})</code> returns an estimate in ms. The default mode is single.</p>
      <CodeBlock locale="en" language="js" code={`// Double includes the inter-pulse delay in every acquisition.
const milliseconds = measurementDurationMs(parameters, { mode: "double" });`} />
      <MathFormula block tex={String.raw`t_{\mathrm{estimate}}=\left\lceil n_{\mathrm{scans}}\left(t_{\mathrm{interval}}+40.96+t_{\mathrm{extra}}\right)\right\rceil`} />
      <p>Use scans for the count and measurementIntervalMs for the interval. All time values are in ms. The extra time is pulseIntervalMs for Double and zero for Single. Serial transfer and command overhead are excluded.</p>
      <h2 id="low-level">Low-level communication helpers</h2>
      <p>Normally, let NMRDevice handle these. WebSerialTransport implements connect, disconnect, write(bytes), readLine(timeoutMs) and clearInput. LineDecoder splits received bytes into lines with push, finish and reset.</p>
      <p>WebSerialTransport defaults serial to navigator.serial. write(Uint8Array) and readLine(timeoutMs) return promises; readLine resolves to one string line. LineDecoder defaults maxLineBytes to 65536; push accepts Uint8Array and returns completed string lines. finish() throws for an incomplete line; reset() discards state. Non-ASCII and oversized lines are refused.</p>
      <p>SAMPLE_COUNT=2048, SAMPLE_INTERVAL_MS=0.02 and PARAMETER_BYTES=18. SERIAL_OPTIONS uses 115200 baud, 8 data bits, 1 stop bit, no parity and no flow control. encodeParameters returns an 18-byte Uint8Array; encodeCommand supports parameters / single / double / read; parseSampleLine returns two integers. Invalid input throws.</p>
      <p><Link href="/en/guide/measurement">Guide: Control measurements</Link> · <Link href="/en/reference/api">API index</Link></p>
    </DocumentationArticle>
  );
}
