import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";

export const metadata: Metadata = { title: "Control measurements" };

export default function MeasurementPage() {
  return (
    <DocumentationArticle locale="en">
      <h1>Control measurements</h1>
      <p>Use <code>NMRController</code> to connect, send settings, and acquire data. Combine its state and error notifications with your own UI.</p>
      <p>These are excerpts for the HTML in <Link href="/en/guide/first">Build your first Web UI</Link>, not standalone programs. They share the same <code>controller</code> and <code>parameters</code>.</p>

      <h2>Connect and disconnect</h2>
      <CodeBlock locale="en" language="js" code={`const controller = new NMRController();
const connect = document.getElementById("connect");
const disconnect = document.getElementById("disconnect");
const status = document.getElementById("status");

connect.onclick = async () => {
  const result = await controller.connect();
  if (result.ok) status.textContent = "Connected";
};
disconnect.onclick = async () => {
  const result = await controller.disconnect();
  if (result.ok) status.textContent = "Disconnected";
};`} />
      <p>Port selection requires a user gesture. Call <code>connect()</code> directly from the button click, without awaiting unrelated work first.</p>
      <p>Disconnect any other app or tab using the same port first. <code>disconnect()</code> is not a measurement-stop command and is rejected while measuring.</p>

      <h2>Set measurement parameters</h2>
      <CodeBlock locale="en" language="js" code={`const parameters = {
  frequencyHz: 402000,
  pulse1Cycles: 21, phase1Degrees: 0,
  pulse2Cycles: 42, phase2Degrees: 90,
  pulseIntervalMs: 5,
  measurementIntervalMs: 200,
  scans: 128,
};`} />
      <div className="my-6 overflow-x-auto">
        <table className="table table-sm">
          <thead><tr><th scope="col">Field</th><th scope="col">Meaning</th><th scope="col">Accepted values</th></tr></thead>
          <tbody>
            <tr><td><code>frequencyHz</code></td><td>Frequency [Hz]</td><td>Integer from 1 to 2147483647</td></tr>
            <tr><td><code>pulse1Cycles / pulse2Cycles</code></td><td>First and second pulse lengths in RF cycles</td><td>Integer from 0 to 32767</td></tr>
            <tr><td><code>phase1Degrees / phase2Degrees</code></td><td>Phase [degrees]</td><td>0 / 90 / 180 / 270</td></tr>
            <tr><td><code>pulseIntervalMs</code></td><td>Inter-pulse delay [ms]</td><td>Integer from 0 to 32767</td></tr>
            <tr><td><code>measurementIntervalMs</code></td><td>Device interval setting [ms]</td><td>Integer from 1 to 32767</td></tr>
            <tr><td><code>scans</code></td><td>Acquisition count</td><td>Integer from 1 to 32767</td></tr>
          </tbody>
        </table>
      </div>
      <p>All fields are required. Pulse lengths are RF cycle counts, not microseconds. Include the second-pulse fields even for Single. These limits come from the wire format; they do not guarantee suitable operating conditions for your device and sample.</p>
      <p>Convert form input values to numbers. Use <code>validateParameters</code> to check input before sending it. This call does not communicate with hardware.</p>
      <CodeBlock locale="en" language="js" code={`import { validateParameters } from "./nmrlink/index.js";

try {
  validateParameters(parameters);
  status.textContent = "Input format is valid";
} catch (error) {
  status.textContent = error.message;
}`} />

      <h2>Run Single or Double</h2>
      <CodeBlock locale="en" language="js" code={`const measure = document.getElementById("measure");

measure.onclick = () => controller.measure(parameters, { mode: "single" });

// For Double, replace the handler above with:
// measure.onclick = () => controller.measure(parameters, { mode: "double" });`} />
      <p><code>measure()</code> sends settings and acquires the result. The device performs the acquisition count specified by <code>scans</code>. Requests made during another operation are rejected rather than queued.</p>
      <p>Measurements are not retried automatically. Immediate stop and precise progress notifications are not available; wait for the operation to finish.</p>

      <h2>Update buttons from state</h2>
      <CodeBlock locale="en" language="js" code={`controller.onStateChange(state => {
  connect.disabled = !state.canConnect;
  measure.disabled = !state.canMeasure;
  disconnect.disabled = !state.canDisconnect;
  if (state.busy) status.textContent = "Working…";
});`} />
      <ul>
        <li><code>canConnect / canMeasure / canDisconnect</code>: whether each operation is available.</li>
        <li><code>busy</code>: whether an operation is running. You can also use it to disable a settings form.</li>
        <li><code>operation</code>: <code>connect / disconnect / measure / sweep</code>, or <code>null</code> when idle.</li>
        <li><code>hasResult</code>: whether a result is available for saving or reanalysis.</li>
      </ul>

      <h2>Receive results and errors</h2>
      <CodeBlock locale="en" language="js" code={`controller.onResult(record => {
  status.textContent = "Measurement complete: " + record.points + " points";
  // record.raw contains uncorrected [Data 1, Data 2] pairs.
});
controller.onError(error => {
  status.textContent = error.message;
});`} />
      <p><code>onResult</code> runs only after success. Each record contains 2048 points × 2 channels with <code>sampleIntervalMs</code> equal to 0.02 ms. Acquisition time, settings, and mode are also recorded.</p>
      <p>The last successful record remains in <code>controller.result</code> if a later communication or analysis step fails. Make sure your UI does not present a previous result as a new measurement.</p>
      <p>When awaiting an operation, check <code>{`{ ok: true, value }`}</code> for success or <code>{`{ ok: false, error }`}</code> for failure. Failed <code>NMRController</code> operations also notify <code>onError</code>.</p>

      <h2>Show an estimated duration</h2>
      <CodeBlock locale="en" language="js" code={`import { measurementDurationMs } from "./nmrlink/index.js";

const seconds = measurementDurationMs(parameters, { mode: "single" }) / 1000;
status.textContent = "Estimated measurement time: " + seconds.toFixed(1) + " s";`} />
      <p>The estimate excludes serial transfer and command overhead. It does not guarantee an exact completion time or report progress.</p>

      <h2>Clean up the UI</h2>
      <p>Before removing a component, wait for the current operation to finish, disconnect as needed, and release the UI resources.</p>
      <CodeBlock locale="en" language="js" code={`async function closeUI() {
  if (controller.state.busy) return;
  if (controller.state.canDisconnect) {
    const result = await controller.disconnect();
    if (!result.ok) return;
  }
  controller.dispose();
  graphs.dispose();
}`} />
      <p><code>dispose()</code> releases state monitoring. It does not implicitly stop or disconnect the device. <code>graphs</code> is the graph view created in <Link href="/en/guide/first">Build your first Web UI</Link>.</p>
      <p>For connection issues, see <Link href="/en/guide/browsers">Supported browsers and connection troubleshooting</Link>.</p>
      <h2 id="node">Connect from Node.js</h2>
      <p>The npm nmrlink package can run analysis in Node.js. Serial hardware access additionally requires NodeSerialTransport from nmrlink-server, which is not published to npm. Use the repository with Node.js 22 or later. Node.js hardware connection remains unverified.</p>
      <CodeBlock locale="en" language="sh" code={`git clone https://github.com/masabando/nmrlink.git
cd nmrlink
npm install`} />
      <p>Save the following as measure.mjs at the repository root. Check the port and parameters, then run node measure.mjs. This code performs a physical measurement; it is not a simulated-data example.</p>      <CodeBlock locale="en" language="js" code={`import { NMRDevice, analyzeMeasurement } from "nmrlink";
import { NodeSerialTransport } from "nmrlink-server";

console.log(await NodeSerialTransport.listPorts());
const device = new NMRDevice({
  transport: new NodeSerialTransport({ path: "/dev/cu.YOUR_DEVICE" }),
});
try {
  await device.connect();
  const record = await device.measure({
    frequencyHz: 402000,
    pulse1Cycles: 21, phase1Degrees: 0,
    pulse2Cycles: 42, phase2Degrees: 90,
    pulseIntervalMs: 5, measurementIntervalMs: 200, scans: 128,
  }, { mode: "single" });
  console.log(analyzeMeasurement(record).peak);
} finally {
  await device.disconnect();
}`} />
      <p>Listing ports does not open them. Specify path explicitly; there is no automatic reconnection or resend. NMRGraphs and the download helper saveMeasurement are browser-only. For Firebase-based operation, see <Link href="/en/guide/remote">Remote access (unverified)</Link>.</p>
      <p><Link href="/en/guide/analysis">Next: Analyze signals →</Link></p>
    </DocumentationArticle>
  );
}
