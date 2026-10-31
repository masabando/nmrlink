import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";
import FirstMeasurementPreview from "@/components/FirstMeasurementPreview";
import { firstMeasurementHTML } from "@/examples/first-measurement";

export const metadata: Metadata = { title: "Build your first Web UI" };

export default function FirstPage() {
  return (
    <DocumentationArticle locale="en">
      <h1>Build your first Web UI</h1>
      <p>Connect, measure, and display FID signals and an FFT spectrum in one HTML file. NMRLink handles communication and graph rendering.</p>
      <p>If you have not installed the library, start with <Link href="/en/guide/install">Installation</Link>.</p>

      <h2>Try it without hardware</h2>
      <p>Click Connect, then Measure. This preview uses a simulated device. It does not open a USB connection or send commands to hardware.</p>
      <FirstMeasurementPreview locale="en" />
      <p>The blue and orange lines are the two FID channels; the lower graph shows the complex FFT amplitude spectrum. The shaded band marks the FFT analysis range.</p>

      <h2>Copy and connect to hardware</h2>
      <p>The HTML below is for actual hardware. Clicking Connect opens the browser’s serial port picker.</p>
      <ol>
        <li>Follow the <Link href="/en/guide/install#static-html">static HTML installation steps</Link> to place <code>nmrlink/</code> in your working directory.</li>
        <li>Save the following code as <code>example.html</code> in the same directory.</li>
        <li>Review and adjust <code>parameters</code> for your device and sample.</li>
        <li>Serve the directory with a web server, open it in a supported browser, and click Connect, then Measure.</li>
      </ol>
      <p>The example uses 402000 Hz, a 21-cycle first pulse, a 42-cycle second pulse, and 128 scans. These values are not suitable for every device and sample.</p>
      <CodeBlock locale="en" language="html" code={firstMeasurementHTML("en")} />
      <p>
        For an npm project, change the import paths from <code>./nmrlink/index.js</code> to <code>nmrlink</code>
        {' '}and from <code>./nmrlink/graphs.js</code> to <code>nmrlink/graphs</code>, then use your project’s bundler.
      </p>

      <h2>How the code works</h2>
      <ol>
        <li><code>NMRController</code> manages connection and measurement. Use <code>onStateChange</code> to enable or disable the available buttons.</li>
        <li>Call <code>connect()</code> directly from the button click, without awaiting unrelated work first.</li>
        <li>Pass the measurement settings to <code>measure(parameters, {`{ mode: "single" }`})</code>.</li>
        <li>Receive the record in <code>onResult</code>, analyze it with <code>analyzeMeasurement</code>, and display it with <code>graphs.show</code>.</li>
        <li>Show communication and measurement errors with <code>onError</code>. Raw data remains in <code>controller.result</code> even if analysis fails.</li>
      </ol>
      <p>Measurements are not retried automatically and cannot be stopped immediately. Wait for the measurement to finish. Disconnect is not a measurement-stop command.</p>
      <p>For connection issues, see <Link href="/en/guide/browsers">Supported browsers and connection troubleshooting</Link>.</p>
      <p><Link href="/en/guide/measurement">Next: Control measurements →</Link></p>
    </DocumentationArticle>
  );
}
