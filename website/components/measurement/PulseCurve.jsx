"use client";
import { useEffect, useRef } from "react";
import { createPulsePlot } from "../../../packages/nmrlink/src/graphs.js";

export default function PulseCurve({ result, mode, locale, empty, plotRef }) {
  const host = useRef(null);
  useEffect(() => {
    const element = host.current;
    function draw() {
      if (!result.points.length) {
        element.textContent = empty;
        return;
      }
      const values =
        result.calibration?.points ??
        result.points.map((point) => ({
          length: point.length,
          amplitude: 0,
          magnitude: point.amplitude,
        }));
      const fit =
        mode === "magnitude"
          ? result.calibration?.magnitudeFit
          : result.calibration?.fit;
      element.innerHTML = createPulsePlot(values, {
        locale,
        mode,
        fit,
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
