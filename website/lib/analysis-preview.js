import { previewErrorMessage, previewFormError } from "./preview-errors.js";
import { analyzeMeasurement } from "../../packages/nmrlink/src/index.js";
import { NMRGraphs } from "../../packages/nmrlink/src/graphs.js";
import { createAnalysisDemoMeasurements } from "./analysis-demo.js";

export function mountAnalysisPreview(elements, text, colors = {}, locale = "ja") {
  const records = createAnalysisDemoMeasurements();
  const signal = elements.form.elements.namedItem("signal");
  const graphs = new NMRGraphs({ fid: elements.fid, fft: elements.fft, colors, locale });

  function analyze(event) {
    event?.preventDefault();
    const inputError = previewFormError(elements.form, locale);
    if (inputError) {
      elements.status.textContent = text.error + inputError;
      return;
    }
    const form = elements.form.elements;
    try {
      const record = signal?.value === "noisy" ? records.noisy : records.ideal;
      const result = analyzeMeasurement(record, {
        startMs: Number(form.namedItem("startMs").value),
        endMs: Number(form.namedItem("endMs").value),
        tailPoints: Number(form.namedItem("tailPoints").value),
        window: form.namedItem("window").value,
      });
      graphs.show(record, result);
      const spectrum = result.spectrum;
      elements.status.textContent = text.summary(result.peak.hz.toFixed(1), spectrum.count, spectrum.size,
        spectrum.resolutionHz.toFixed(1), spectrum.spacingHz.toFixed(1));
      elements.baseline.textContent = text.baseline + result.baseline.base.map(value => value.toFixed(1)).join(" / ");
    } catch (error) {
      // 不正な設定では、直前の有効な解析結果を表示したままにします。
      elements.status.textContent = text.error + previewErrorMessage(error, locale);
    }
  }

  elements.form.addEventListener("submit", analyze);
  signal?.addEventListener("change", analyze);
  elements.settings.disabled = false;
  analyze();
  return () => {
    elements.form.removeEventListener("submit", analyze);
    signal?.removeEventListener("change", analyze);
    graphs.dispose();
  };
}
