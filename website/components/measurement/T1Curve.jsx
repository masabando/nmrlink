"use client";
import { useEffect, useRef } from "react";
import { createT1Plot } from "../../../packages/nmrlink/src/graphs.js";

export default function T1Curve({ result, mode, locale, empty, plotRef }) {
  const host = useRef(null);
  useEffect(() => {
    const element = host.current;
    function draw() {
      if (!result.points.length) {
        element.textContent = empty;
        return;
      }
      const points =
        result.recovery?.points ??
        result.points.map((point) => ({
          tau: point.tau,
          signal: 0,
          quadrature: 0,
          magnitude: point.amplitude,
        }));
      element.innerHTML = createT1Plot(points, {
        locale,
        mode,
        fit: result.recovery?.fit,
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
  }, [result, mode, locale, empty, plotRef]);
  return <div ref={host} className="min-h-[280px] min-w-0" />;
}
