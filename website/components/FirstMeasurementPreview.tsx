"use client";

import { useEffect, useRef } from "react";
import type { Locale } from "@/lib/languages";

const labels = {
  ja: {
    connect: "接続", measure: "測定", disconnect: "切断", loading: "プレビューを準備しています…",
    idle: "未接続", connected: "接続しました", busy: "処理中…", done: "測定完了：2048点 × 2チャンネル",
    fid: "FID・時間波形", fft: "FFT・振幅スペクトル", empty: "測定するとグラフを表示します。",
    error: "プレビューを読み込めませんでした。ページを再読み込みしてください。",
  },
  en: {
    connect: "Connect", measure: "Measure", disconnect: "Disconnect", loading: "Preparing the preview…",
    idle: "Disconnected", connected: "Connected", busy: "Working…", done: "Measurement complete: 2048 points × 2 channels",
    fid: "FID / time-domain signal", fft: "FFT / amplitude spectrum", empty: "Measure to display the graphs.",
    error: "Could not load the preview. Please reload the page.",
  },
};

export default function FirstMeasurementPreview({ locale = "ja" }: { locale?: Locale }) {
  const host = useRef<HTMLDivElement>(null);
  const text = labels[locale];

  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    const element = host.current!;
    const status = element.querySelector<HTMLParagraphElement>("[data-status]")!;
    import("@/lib/first-measurement-preview").then(({ mountFirstMeasurementPreview }) => {
      if (cancelled) return;
      dispose = mountFirstMeasurementPreview({
        connect: element.querySelector("[data-connect]"),
        measure: element.querySelector("[data-measure]"),
        disconnect: element.querySelector("[data-disconnect]"),
        status,
        fid: element.querySelector("[data-fid]"),
        fft: element.querySelector("[data-fft]"),
      }, text, locale);
    }).catch(error => {
      if (cancelled) return;
      status.textContent = text.error;
      console.warn("NMRLink preview:", error);
    });
    return () => { cancelled = true; dispose?.(); };
  }, [text, locale]);

  return (
    <div data-pagefind-ignore ref={host} className="my-6 min-w-0 rounded-box border border-base-300 p-4 sm:p-6">
      <div className="flex flex-wrap gap-2">
        <button type="button" data-connect className="btn btn-sm" disabled>{text.connect}</button>
        <button type="button" data-measure className="btn btn-sm" disabled>{text.measure}</button>
        <button type="button" data-disconnect className="btn btn-sm" disabled>{text.disconnect}</button>
      </div>
      <p data-status role="status">{text.loading}</p>
      <h3>{text.fid}</h3>
      <div data-fid className="min-w-0">{text.empty}</div>
      <h3>{text.fft}</h3>
      <div data-fft className="min-w-0">{text.empty}</div>
    </div>
  );
}
