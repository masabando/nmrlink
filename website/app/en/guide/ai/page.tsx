import { sitePath } from "@/lib/site-path";
import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";

export const metadata: Metadata = { title: "Build with AI" };

export default function AIPage() {
  return (
    <DocumentationArticle locale="en">
      <h1>Build with AI</h1>
      <p>Give an AI assistant the NMRLink documentation to help build your own Web UI. The llms.txt file collects installation instructions, APIs, examples and device operation constraints.</p>
      <h2>Share llms.txt</h2>
      <p>Give your assistant this URL together with a description of what you want to build.</p>
      <CodeBlock locale="en" language="text" code="https://masabando.github.io/nmrlink/llms.txt" />
      <p><a href={sitePath("/llms.txt")}>Open llms.txt</a>. Whether a URL is fetched automatically depends on the assistant and its tools. If it cannot read the URL, paste the text into the conversation or attach it as a text file.</p>
      <h2>Prompt for static HTML</h2>
      <p>This uses Live Server or another static server without a build step, with the folder layout shown in <Link href="/en/guide/install#static-html">installation</Link>.</p>
      <CodeBlock locale="en" language="text" code={`Read this documentation and build a Web UI using NMRLink:
https://masabando.github.io/nmrlink/llms.txt

Use index.html beside a nmrlink/ folder containing all files from packages/nmrlink/src.
Serve with Live Server, without npm or a build step.
Import from ./nmrlink/index.js, ./nmrlink/graphs.js and ./nmrlink/browser.js.

Include:
- Connect/disconnect, measurement settings and Single measurement
- FID/FFT graphs and JSON save/load
- Buttons reflecting operation state, plus error messages

Use NMRController and the NMRLink analysis, graph and save APIs.
Request the port from a user click. Do not measure or resend commands automatically.
Explain that initial settings are examples to be checked for the apparatus and sample.
Keep the current record and graphs if a JSON import fails.
Do not overwrite existing files. Provide the HTML, folder layout and startup instructions.`} />
      <h2>Prompt for npm</h2>
      <CodeBlock locale="en" language="text" code={`Read this documentation and build a Vite browser app:
https://masabando.github.io/nmrlink/llms.txt

Install with npm install nmrlink and use nmrlink, nmrlink/graphs and nmrlink/browser.
Include connect/disconnect, Single measurement, FID/FFT and JSON save/load.
Use NMRController for state and errors. Do not reimplement serial communication or FFT.
Connect from a user click; do not measure or resend commands automatically.
Provide simulated data for checking the UI without hardware, clearly separate from real measurements.
Explain disconnecting, unsubscribing and disposing graph observers when removing a view.
Provide the files, dependencies and startup instructions.`} />
      <p>For an existing project, specify the framework and files you want to change. NMRLink is framework independent. In Next.js, browser API operations belong on the client side.</p>
      <h2>Check the generated UI</h2>
      <ol>
        <li>Use simulated data to check the layout, inputs, analysis, save/load and error handling.</li>
        <li>Prepare compatible hardware, a supported browser and HTTPS or localhost on the same PC.</li>
        <li>Check frequency, RF cycle counts, phases, repetition interval and scan count for the apparatus and sample.</li>
        <li>Check for unintended automatic measurements or retries before operating the instrument.</li>
      </ol>
      <p>A successful simulated preview does not verify hardware operation. NMRLink cannot stop an ongoing measurement immediately. Remote operation is unverified in a real environment; begin with a direct connection.</p>
      <p>When troubleshooting, share the error message, relevant code, OS, browser and serving method. Check generated API names and arguments against the documentation.</p>
      <h2>Related examples</h2>
      <ul>
        <li><Link href="/en/guide/first">Your first Web UI</Link>: a working preview and HTML to copy</li>
        <li><Link href="/en/guide/save">Save and load data</Link>: keep records for reanalysis</li>
        <li><a href="https://github.com/masabando/nmrlink/tree/main/examples/direct">Minimal sample source</a></li>
        <li><Link href="/en/reference/api">API reference</Link></li>
      </ul>
    </DocumentationArticle>
  );
}
