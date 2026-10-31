import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";
import ReferenceTable from "@/components/ReferenceTable";

export const metadata: Metadata = { title: "API reference" };

export default function ReferencePage() {
  return (
    <DocumentationArticle locale="en">
      <h1>API reference</h1>
      <p>Arguments, return values, defaults and error behavior for integrating NMRLink. For a step-by-step introduction, start with <Link href="/en/guide/first">your first Web UI</Link>.</p>
      <h2>Browse by feature</h2>
      <ul>
        <li><Link href="/en/reference/api/measurement">Connection and measurement</Link>: NMRController, NMRDevice, parameters, records and timing</li>
        <li><Link href="/en/reference/api/analysis">Signal analysis</Link>: analyzeMeasurement, correctBaseline and computeSpectrum</li>
        <li><Link href="/en/reference/api/graphs">Graphs</Link>: NMRGraphs, SVG generation, languages, labels and colors</li>
        <li><Link href="/en/reference/api/files">Save and load</Link>: JSON, PNG, timestamps and scan archives</li>
        <li><Link href="/en/reference/api/sweeps">Frequency and pulse scans</Link>: planning, cancellation, common phase and sine fits</li>
        <li><Link href="/en/reference/api/relaxation">T1 and T2</Link>: pulse settings, delay scans, echo windows and exponential fits</li>
      </ul>
      <h2>Entry points</h2>
      <ReferenceTable headings={["Import", "Contents", "Environment"]} rows={[
        ["nmrlink", "Control, analysis, scans and JSON validation", "Browser / Node.js; hardware access depends on the transport"],
        ["nmrlink/graphs", "NMRGraphs and SVG generators", "NMRGraphs requires a browser; SVG generators also run in Node.js"],
        ["nmrlink/browser", "Downloads, File reading, PNG and timestamps", "Downloads, File reading and PNG require a browser; timestamp formatting also works in Node.js"],
      ]} />
      <CodeBlock locale="en" language="js" code={`import { NMRController, analyzeMeasurement } from "nmrlink";
import { NMRGraphs } from "nmrlink/graphs";
import { saveMeasurement, readMeasurement } from "nmrlink/browser";`} />
      <p>For static HTML, use ./nmrlink/index.js, ./nmrlink/graphs.js and ./nmrlink/browser.js according to the <Link href="/en/guide/install#static-html">installation layout</Link>. TypeScript declarations are not included.</p>
      <h2>Error conventions</h2>
      <ul>
        <li>NMRController operations resolve with success or failure objects and also report failures through onError.</li>
        <li>NMRDevice and low-level scan promises reject on failure.</li>
        <li>Synchronous analysis, validation and SVG generators throw for invalid input.</li>
        <li>Measurements are never retried automatically. Scan cancellation waits for the current measurement to finish.</li>
      </ul>
      <p>Library-created errors and warnings use English messages and stable codes. Translate UI text using code, not by matching message. Graph locale does not translate diagnostics. Browser/OS failures at operation boundaries retain the original exception in cause.</p>
      <h2 id="error-codes">Error codes and UI translation</h2>
      <p>Exception classes such as TypeError, RangeError and AggregateError are preserved. Codes are also available through ERROR_CODES. details contains values such as parameter names and bounds. English message wording may improve; do not use it for program logic. cause is present when an underlying exception is retained.</p>
      <CodeBlock locale="en" language="js" code={`import { ERROR_CODES, analyzeMeasurement } from "nmrlink";

try {
  const analysis = analyzeMeasurement(record, { startMs: 5, endMs: 1 });
  graphs.show(record, analysis);
} catch (error) {
  if (error.code === ERROR_CODES.INVALID_FFT_RANGE) {
    status.textContent = "Set FFT end after start, within the acquisition range.";
  } else {
    status.textContent = "Analysis failed. Check the input.";
    console.error(error);
  }
}`} />
      <ReferenceTable headings={["Example code", "Meaning / details"]} rows={[
        ["INVALID_PARAMETER_RANGE", "Parameter out of range; name, minimum, maximum"],
        ["INVALID_FFT_RANGE / INSUFFICIENT_FFT_SAMPLES", "Invalid FFT interval / too few samples"],
        ["INVALID_JSON / RECORD_TOO_LARGE", "Malformed JSON / measurement JSON too large"],
        ["NO_REFERENCE_SIGNAL", "No usable common reference signal"],
        ["DEVICE_NOT_CONNECTED / DEVICE_BUSY", "Disconnected / another operation is running"],
        ["WEB_SERIAL_UNAVAILABLE / RESPONSE_TIMEOUT", "Unsupported browser API / device response timeout"],
        ["PORT_SELECTION_CANCELLED / SERIAL_PERMISSION_DENIED", "Port selection cancelled / access denied"],
      ]} />
      <p>Use <code>Object.keys(ERROR_CODES)</code> to list the codes. For unknown codes, show a general message in the selected language and retain details in the console. Unknown errors from user callbacks or replacement transports are wrapped with codes at operation boundaries.</p>
      <h2 id="warnings">Warning codes</h2>
      <p>analyzePulseCalibration, analyzeT1 and analyzeT2 retain warnings as an array of English strings. The added warningDetails array contains matching <code>{"{ code, message, details }"}</code> objects in the same order. Use code for translation. Archive parsers recompute derived values, so old JSON without warningDetails can still be loaded.</p>
      <CodeBlock locale="en" language="js" code={`for (const warning of result.warningDetails) {
  console.log(warning.code, warning.message, warning.details);
}
// result.warnings === the same messages as strings (in the same order).`} />

      <p>See <Link href="/en/reference/analysis">analysis specifications</Link> for FFT conventions, normalization, phase and fit models.</p>
      <p>The separate nmrlink-server remote API is covered by <Link href="/en/guide/remote-ui">remote UI integration</Link>. Remote operation remains unverified in a real environment.</p>
    </DocumentationArticle>
  );
}
