import { sitePath } from "@/lib/site-path";
import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";

export const metadata: Metadata = { title: "Installation" };

export default function InstallPage() {
  return (
    <DocumentationArticle locale="en">
      <h1>Installation</h1>
      <p>Add NMRLink to an npm project or use it directly from static HTML without a build step.</p>

      <h2>Requirements</h2>
      <ul>
        <li>Actual measurements require a compatible educational NMR apparatus and a PC connected to it by USB.</li>
        <li>For direct hardware access, use the latest desktop Chrome or Edge, or Firefox 151 or later. Safari cannot connect directly.</li>
        <li>Open your page over HTTPS or localhost on the PC connected to the device. Do not open the HTML file through a file: URL.</li>
      </ul>
      <p>You can try simulated graphs and analyze saved data without hardware. See <Link href="/en/guide/browsers">supported browsers and tested configurations</Link> for details.</p>

      <h2>Choose an installation method</h2>
      <ul>
        <li><a href="#npm">Install with npm</a>: for projects using a bundler such as Vite.</li>
        <li><a href="#static-html">Use static HTML</a>: for HTML and JavaScript files served directly by a web server.</li>
      </ul>
      <p>If you only want to measure with an existing interface, open the <a href={sitePath("/ui/?lang=en")}>standard Web UI</a>.</p>

      <h2 id="npm" className="scroll-mt-24">Install with npm</h2>
      <p>Run this in your own project:</p>
      <CodeBlock locale="en" language="sh" code="npm install nmrlink" />
      <p>Import the features you need in your JavaScript:</p>
      <CodeBlock locale="en" language="js" code={`import { NMRController, analyzeMeasurement } from "nmrlink";
import { NMRGraphs } from "nmrlink/graphs";
import { saveMeasurement } from "nmrlink/browser";`} />
      <p>The package uses ES modules and has no runtime dependencies. TypeScript declarations are not included.</p>
      <p><Link href="/en/guide/first">Build your first Web UI →</Link></p>

      <h2 id="static-html" className="scroll-mt-24">Use static HTML</h2>
      <p>No npm installation or build step is required.</p>
      <ol>
        <li><a href="https://github.com/masabando/nmrlink">Download a ZIP from the Code menu on GitHub</a> and extract it.</li>
        <li>Copy the entire <code>packages/nmrlink/src</code> folder into your working directory and rename it <code>nmrlink</code>.</li>
        <li>Create <code>example.html</code> in the same working directory.</li>
      </ol>
      <CodeBlock locale="en" language="text" code={`my-nmr-ui/
├── example.html
└── nmrlink/       ← all files from packages/nmrlink/src`} />
      <p>Set <code>{'type="module"'}</code> in your HTML and use relative URLs:</p>
      <CodeBlock locale="en" language="html" code={`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>NMRLink</title>
</head>
<body>
  <script type="module">
    import { NMRController, analyzeMeasurement } from "./nmrlink/index.js";
    import { NMRGraphs } from "./nmrlink/graphs.js";
    import { saveMeasurement } from "./nmrlink/browser.js";

    // Add your interface and measurement code here.
  </script>
</body>
</html>`} />
      <p>Serve the working directory with VS Code Live Server or another web server, then open it in your browser. Use localhost for local hardware access.</p>
      <p>Adjust the imports if you change the file layout. This also applies when moving example code into your own directory.</p>
      <p><a href="https://masabando.github.io/nmrlink/examples/direct/">View the minimal direct-connection example (Japanese) →</a></p>

      <h2>Connection troubleshooting</h2>
      <ul>
        <li><Link href="/en/guide/browsers">Supported browsers, operating systems, and tested configurations</Link></li>
        <li><Link href="/en/guide/browsers#linux">Linux permissions and Snap settings</Link></li>
      </ul>
      <p>
        For Node.js, see <Link href="/en/guide/measurement#node">Use from Node.js</Link>.
        {' '}For AI-assisted implementation, see <Link href="/en/guide/ai">Build with AI</Link>.
      </p>
    </DocumentationArticle>
  );
}
