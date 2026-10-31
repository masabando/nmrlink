import { createFrequencyPlot, createPulsePlot, createT1Plot, createT2Plot } from "../../packages/nmrlink/src/graphs.js";
import { fitPulseCalibration, fitT1, fitT2 } from "../../packages/nmrlink/src/index.js";

export function mountCurvePreview(element, kind, locale = "ja") {
  let points, fit, plot;
  if (kind === "frequency") {
    points = Array.from({ length: 9 }, (_, i) => {
      const frequencyHz = 398000 + i * 1000;
      return { frequencyHz, amplitude: 1000 * Math.exp(-(((frequencyHz - 402000) / 1800) ** 2)) };
    });
    plot = createFrequencyPlot;
  } else if (kind === "pulse") {
    points = Array.from({ length: 16 }, (_, i) => {
      const length = 5 + i * 5;
      return { length, amplitude: 1000 * Math.sin(Math.PI * length / 42) };
    });
    fit = fitPulseCalibration(points);
    plot = createPulsePlot;
  } else if (kind === "t1") {
    points = Array.from({ length: 20 }, (_, i) => {
      const tau = 5 + i * 5;
      return { tau, signal: 1000 * (1 - 2 * Math.exp(-tau / 20)) };
    });
    fit = fitT1(points, { fromMs: 5, toMs: 100 });
    plot = createT1Plot;
  } else {
    points = Array.from({ length: 16 }, (_, i) => {
      const tau = 5 + i * 2;
      return { tau, signal: 1000 * Math.exp(-2 * tau / 22) };
    });
    fit = fitT2(points, { fromMs: 10, toMs: 70 });
    plot = createT2Plot;
  }
  const draw = () => {
    element.innerHTML = plot(points, { width: Math.max(160, Math.floor(element.clientWidth)), fit, locale });
  };
  const observer = new ResizeObserver(draw);
  observer.observe(element);
  draw();
  return () => { observer.disconnect(); element.replaceChildren(); };
}
