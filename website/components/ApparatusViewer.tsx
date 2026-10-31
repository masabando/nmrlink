"use client";

import { useEffect, useRef } from "react";
import { messages, type Locale } from "@/lib/languages";

export default function ApparatusViewer({ locale = "ja" }: { locale?: Locale }) {
  const text = messages[locale];
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    const container = host.current!;

    // Three.jsは、この表示が必要なブラウザ側でだけ読み込みます。
    import("@/lib/apparatus-scene").then(({ createApparatusScene }) => {
      if (cancelled) return;
      const modelUrl = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/model/nmr_apparatus.glb`;
      dispose = createApparatusScene(container, modelUrl, text.modelControls, () => {
        container.textContent = text.modelError;
      });
    }).catch(error => {
      if (cancelled) return;
      container.textContent = text.modelError;
      console.warn("NMR apparatus viewer:", error);
    });

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [text.modelControls, text.modelError]);

  return (
    <div
      ref={host}
      role="group"
      aria-label={text.model}
      className="h-80 min-w-0 overflow-hidden rounded-box border border-base-300 bg-[radial-gradient(ellipse_at_50%_40%,#bacbc3_0%,#849f92_100%)] sm:h-96 [&_canvas]:block [&_canvas]:h-full [&_canvas]:w-full [&_canvas]:cursor-grab [&_canvas:active]:cursor-grabbing"
    />
  );
}
