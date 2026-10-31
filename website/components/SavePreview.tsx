"use client";

import { useEffect, useRef } from "react";
import type { Locale } from "@/lib/languages";

const labels = {
  ja: { save: "JSONを保存", png: "FIDをPNGで保存", open: "測定JSONを開く", loading: "プレビューを準備しています…", ready: "模擬データを表示しています。JSONを保存して、もう一度開いてみてください。", loaded: "読み込みました：", points: "点", error: "処理できません（現在のデータは保持します）：", failed: "プレビューを読み込めませんでした。" },
  en: { save: "Save JSON", png: "Save FID as PNG", open: "Open measurement JSON", loading: "Preparing the preview…", ready: "Showing simulated data. Save the JSON, then open it again.", loaded: "Loaded:", points: "samples", error: "Operation failed (current data is kept): ", failed: "Could not load the preview." },
};

export default function SavePreview({ locale = "ja" }: { locale?: Locale }) {
  const host = useRef<HTMLDivElement>(null);
  const text = labels[locale];
  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    const element = host.current!;
    import("@/lib/save-preview").then(({ mountSavePreview }) => {
      if (!cancelled) dispose = mountSavePreview(element, text, locale);
    }).catch(() => {
      if (!cancelled) element.querySelector("[data-status]")!.textContent = text.failed;
    });
    return () => { cancelled = true; dispose?.(); };
  }, [text, locale]);
  return (
    <div data-pagefind-ignore ref={host} className="my-6 min-w-0 rounded-box border border-base-300 p-4 sm:p-6">
      <div className="flex flex-wrap gap-2">
        <button data-save className="btn btn-sm" disabled>{text.save}</button>
        <button data-png className="btn btn-sm" disabled>{text.png}</button>
      </div>
      <label className="my-4 grid gap-2">{text.open}<input type="file" accept=".json,application/json" className="file-input file-input-sm w-full" disabled /></label>
      <p data-status role="status">{text.loading}</p>
      <h3>FID</h3><div data-fid className="min-w-0" />
      <h3>FFT</h3><div data-fft className="min-w-0" />
    </div>
  );
}
