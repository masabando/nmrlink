import DocumentationArticle from "@/components/DocumentationArticle";
import type { Metadata } from "next";
import Link from "next/link";
import CodeBlock from "@/components/CodeBlock";
import SavePreview from "@/components/SavePreview";

export const metadata: Metadata = { title: "Save and load data" };

export default function SavePage() {
  return (
    <DocumentationArticle locale="en">
      <h1>Save and load data</h1>
      <p>Save raw samples and measurement settings as JSON, then reopen them for analysis without measuring again. You can also save graphs as images.</p>
      <h2>Try saving and reopening</h2>
      <p>Save the simulated JSON and select it with “Open measurement JSON”. Files are read locally in your browser without uploading them or sending device commands. A single record from a real measurement can also be opened.</p>
      <SavePreview locale="en" />
      <h2>Save raw JSON</h2>
      <p>Add this to <Link href="/en/guide/first">your first Web UI</Link>. These snippets assume that controller, graphs, and the button, input and status elements already exist.</p>
      <CodeBlock locale="en" language="js" code={`import { saveMeasurement } from "./nmrlink/browser.js";

saveButton.onclick = () => {
  if (controller.result) saveMeasurement(controller.result);
};`} />
      <p>With npm, import from <code>nmrlink/browser</code>. The readable, indented JSON preserves all 2048 raw two-channel samples. FID display limits and FFT intervals do not crop the saved data.</p>
      <p>A filename such as <code>nmrlink-2026-10-21_15-46-56-000_JST.json</code> expresses the acquisition time in Japan Standard Time. The <code>acquiredAt</code> field retains its UTC ISO timestamp.</p>
      <p>Saving is manual. Download any records you need before closing or reloading the page.</p>
      <h2>Open JSON and recalculate</h2>
      <CodeBlock locale="en" language="html" code={`<label for="open">Open measurement JSON</label>
<input id="open" type="file" accept=".json,application/json">
<p id="status" role="status"></p>`} />
      <CodeBlock locale="en" language="js" code={`import { readMeasurement } from "./nmrlink/browser.js";
import { analyzeMeasurement } from "./nmrlink/index.js";

const fileInput = document.querySelector("#open");
const status = document.querySelector("#status");
let currentRecord = controller.result;
const unsubscribeRecord = controller.onResult(record => {
  currentRecord = record; // Also update the record to save after a new measurement succeeds.
});

fileInput.onchange = async () => {
  const file = fileInput.files[0];
  if (!file) return;
  fileInput.disabled = true;
  try {
    const record = await readMeasurement(file);
    const analysis = analyzeMeasurement(record);
    graphs.show(record, analysis);
    currentRecord = record; // Replace only after reading and analysis succeed.
    status.textContent = "Loaded: " + file.name;
  } catch (error) {
    status.textContent = error.message; // Keep the previous record and graphs.
  } finally {
    fileInput.disabled = false;
    fileInput.value = ""; // Allow selecting the same file again.
  }
};

// Save an imported record when available:
saveButton.onclick = () => {
  const record = currentRecord;
  if (record) saveMeasurement(record);
};
// When removing the view: unsubscribeRecord();`} />
      <p>Validation checks the 2 MiB limit, 2048 samples at 0.02 ms intervals, two finite numbers per sample, acquisition time and measurement settings. Stored derived analysis values are discarded and recomputed. Simulated records keep <code>{'source: "demo"'}</code>.</p>
      <p>This API handles a single measurement record. Open full-scan JSON files for frequency adjustment, pulse calibration, T1 or T2 in their corresponding Web UI pages.</p>
      <h2>Save a graph as PNG</h2>
      <CodeBlock locale="en" language="js" code={`import { saveGraphPng } from "./nmrlink/browser.js";

savePngButton.onclick = async () => {
  const svg = fidElement.querySelector("svg");
  if (!svg) return;
  try {
    await saveGraphPng(svg, { filename: "fid.png", scale: 2 });
  } catch (error) {
    status.textContent = error.message;
  }
};`} />
      <p><code>fidElement</code> is the FID container passed to NMRGraphs. You can also pass an SVG from an FFT or response curve. PNG uses a white background and twice the SVG resolution by default. The scale must be greater than zero and at most four.</p>
      <p>Colors, visible limits and the FFT region are preserved in the image. PNG contains no raw data for reanalysis; save JSON as well. The standard Web UI also provides SVG and CSV downloads.</p>
      <p><Link href="/en/guide/ai">Next: Build with AI</Link></p>
    </DocumentationArticle>
  );
}
