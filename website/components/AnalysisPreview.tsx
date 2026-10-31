"use client";

import { useEffect, useRef } from "react";
import type { Locale } from "@/lib/languages";

const labels = {
  ja: {
    legend: "模擬FIDの解析条件", signal: "表示するデータ", noisy: "ノイズあり", ideal: "理想信号", start: "FFT開始 [ms]", end: "FFT終了 [ms]", tail: "補正に使う末尾点数",
    window: "窓関数", rect: "矩形窓", apply: "再解析", fid: "FID・時間波形", fft: "FFT・振幅スペクトル",
    loading: "プレビューを準備しています…", baseline: "末尾平均（Data 1 / Data 2）：",
    error: "解析できません。前回のグラフを保持します：",
    loadError: "プレビューを読み込めませんでした。ページを再読み込みしてください。",
    summary: (hz: string, count: number, size: number, resolution: string, spacing: string) =>
      `最大ピーク ${hz} Hz · 使用 ${count}点 · FFT ${size}点 · 分解能の目安 ${resolution} Hz · ビン間隔 ${spacing} Hz`,
  },
  en: {
    legend: "Simulated FID analysis", signal: "Preview data", noisy: "With noise", ideal: "Ideal signal", start: "FFT start [ms]", end: "FFT end [ms]", tail: "Baseline tail samples",
    window: "Window", rect: "Rectangular", apply: "Reanalyze", fid: "FID / time-domain signal", fft: "FFT / amplitude spectrum",
    loading: "Preparing the preview…", baseline: "Tail mean (Data 1 / Data 2): ",
    error: "Analysis failed; previous graphs are kept: ", loadError: "Could not load the preview. Please reload the page.",
    summary: (hz: string, count: number, size: number, resolution: string, spacing: string) =>
      `Peak ${hz} Hz · ${count} samples · FFT ${size} points · Resolution estimate ${resolution} Hz · Bin spacing ${spacing} Hz`,
  },
};

export default function AnalysisPreview({ locale = "ja", fftColor, compareNoise = false }: { locale?: Locale; fftColor?: string; compareNoise?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const text = labels[locale];

  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    const element = host.current!;
    const status = element.querySelector<HTMLParagraphElement>("[data-status]")!;
    import("@/lib/analysis-preview").then(({ mountAnalysisPreview }) => {
      if (cancelled) return;
      dispose = mountAnalysisPreview({
        form: element.querySelector("form"), settings: element.querySelector("fieldset"), status,
        baseline: element.querySelector("[data-baseline]"),
        fid: element.querySelector("[data-fid]"), fft: element.querySelector("[data-fft]"),
      }, text, fftColor ? { fft: fftColor } : {}, locale);
    }).catch(error => {
      if (cancelled) return;
      status.textContent = text.loadError;
      console.warn("NMRLink analysis preview:", error);
    });
    return () => { cancelled = true; dispose?.(); };
  }, [text, fftColor, locale, compareNoise]);

  return (
    <div data-pagefind-ignore ref={host} className="my-6 min-w-0 rounded-box border border-base-300 p-4 sm:p-6">
      <form noValidate>
        <fieldset className="fieldset" disabled>
          <legend className="fieldset-legend">{text.legend}</legend>
          {compareNoise ? (
            <label className="mb-4 grid gap-2">{text.signal}
              <select className="select select-sm w-full" name="signal" defaultValue="noisy">
                <option value="noisy">{text.noisy}</option>
                <option value="ideal">{text.ideal}</option>
              </select>
            </label>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">{text.start}<input className="input input-sm w-full" name="startMs" type="number" defaultValue={1} min={0} max={40.96} step={0.02} required /></label>
            <label className="grid gap-2">{text.end}<input className="input input-sm w-full" name="endMs" type="number" defaultValue={5} min={0} max={40.96} step={0.02} required /></label>
            <label className="grid gap-2">{text.tail}<input className="input input-sm w-full" name="tailPoints" type="number" defaultValue={100} min={1} max={2048} step={1} required /></label>
            <label className="grid gap-2">{text.window}<select className="select select-sm w-full" name="window" defaultValue="hann"><option value="hann">Hann</option><option value="rect">{text.rect}</option></select></label>
          </div>
          <button type="submit" className="btn btn-sm mt-3 w-fit">{text.apply}</button>
        </fieldset>
      </form>
      <p data-status role="status">{text.loading}</p>
      <p data-baseline className="text-xs text-base-content/60" />
      <h3>{text.fid}</h3>
      <div data-fid className="min-w-0" />
      <h3>{text.fft}</h3>
      <div data-fft className="min-w-0" />
    </div>
  );
}
