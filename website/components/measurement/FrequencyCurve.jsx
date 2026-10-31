"use client";

import { useEffect, useRef } from "react";
import { createFrequencyPlot } from "../../../packages/nmrlink/src/graphs.js";

export default function FrequencyCurve({ points, locale, empty, plotRef }) {
  const host = useRef(null);
  useEffect(() => {
    const element = host.current;
    function draw() {
      element.innerHTML = points.length
        ? createFrequencyPlot(points, {
            locale,
            width: Math.max(160, Math.floor(element.clientWidth)),
          })
        : "";
      if (!points.length) element.textContent = empty;
      const svg = element.querySelector("svg");
      if (svg) {
        svg.style.width = "100%";
        svg.style.height = "280px";
      }
    }
    plotRef.current = element;
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(element);
    return () => {
      observer.disconnect();
      plotRef.current = null;
    };
  }, [points, locale, empty, plotRef]);
  return <div ref={host} className="min-h-[280px] min-w-0" />;
}
