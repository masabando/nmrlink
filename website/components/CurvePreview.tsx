"use client";

import { useEffect, useRef } from "react";
import type { Locale } from "@/lib/languages";

export default function CurvePreview({ kind, locale = "ja" }: {
  kind: "frequency" | "pulse" | "t1" | "t2"; locale?: Locale;
}) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    const element = host.current!;
    import("@/lib/curve-preview").then(({ mountCurvePreview }) => {
      if (!cancelled) dispose = mountCurvePreview(element, kind, locale);
    }).catch(() => {
      if (!cancelled) element.textContent = locale === "ja" ? "グラフを読み込めませんでした。" : "Could not load the graph.";
    });
    return () => { cancelled = true; dispose?.(); };
  }, [kind, locale]);
  return <div data-pagefind-ignore ref={host} className="my-6 min-h-[280px] min-w-0" aria-label={locale === "ja" ? "模擬データの表示例" : "Simulated data preview"} />;
}
