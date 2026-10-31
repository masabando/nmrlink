import { previewErrorMessage } from "./preview-errors.js";
import { analyzeMeasurement } from "../../packages/nmrlink/src/index.js";
import { readMeasurement, saveMeasurement, saveGraphPng } from "../../packages/nmrlink/src/browser.js";
import { NMRGraphs } from "../../packages/nmrlink/src/graphs.js";
import { createDemoMeasurement } from "./demo-measurement.js";

export function mountSavePreview(host, text, locale = "ja") {
  const get = selector => host.querySelector(selector);
  const input = get("input");
  const save = get("[data-save]");
  const png = get("[data-png]");
  const status = get("[data-status]");
  const graphs = new NMRGraphs({ fid: get("[data-fid]"), fft: get("[data-fft]"), locale });
  let record = createDemoMeasurement();
  let disposed = false;
  let request = 0;
  graphs.show(record);
  status.textContent = text.ready;
  save.disabled = png.disabled = input.disabled = false;

  save.onclick = () => {
    try { saveMeasurement(record); }
    catch (error) { status.textContent = text.error + previewErrorMessage(error, locale); }
  };
  png.onclick = async () => {
    png.disabled = true;
    try { await saveGraphPng(get("[data-fid] svg"), { filename: "nmrlink-fid.png" }); }
    catch (error) { if (!disposed) status.textContent = text.error + previewErrorMessage(error, locale); }
    finally { if (!disposed) png.disabled = false; }
  };
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    const current = ++request;
    try {
      const candidate = await readMeasurement(file);
      const analysis = analyzeMeasurement(candidate);
      if (disposed || current !== request) return;
      graphs.show(candidate, analysis);
      record = candidate;
      status.textContent = `${text.loaded} ${file.name} · ${record.source} · ${record.points} ${text.points}`;
    } catch (error) {
      if (!disposed && current === request) status.textContent = text.error + previewErrorMessage(error, locale);
    } finally {
      if (!disposed && current === request) input.value = "";
    }
  };
  return () => {
    disposed = true;
    save.onclick = png.onclick = input.onchange = null;
    graphs.dispose();
  };
}
