"use client";
import { useEffect, useRef } from "react";
import { createT2Plot } from "../../../packages/nmrlink/src/graphs.js";

export default function T2Curve({ result, locale, empty, plotRef }) {
  const host = useRef(null);
  useEffect(() => {
    const element = host.current;
    function draw() {
      if (!result.points.length) {
        element.textContent = empty;
        return;
      }
      const points =
        result.decay?.points ??
        result.points.map((point) => ({
          tau: point.tau,
          signal: point.amplitude,
        }));
      element.innerHTML = createT2Plot(points, {
        locale,
        fit: result.decay?.fit,
        width: Math.max(160, Math.floor(element.clientWidth)),
      });
      const svg = element.querySelector("svg");
      svg.style.width = "100%";
      svg.style.height = "280px";
    }
    plotRef.current = element;
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(element);
    return () => {
      observer.disconnect();
      plotRef.current = null;
    };
  }, [result, locale, empty, plotRef]);
  return <div ref={host} className="min-h-[280px] min-w-0" />;
}
