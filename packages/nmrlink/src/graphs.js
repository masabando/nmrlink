import { analyzeMeasurement } from "./analysis.js";

// Unique SVG clip IDs allow multiple graph views on the same page.
let nextGraphId = 0;
const DEFAULT_COLORS = { data1: "#176caa", data2: "#b34e25", fft: "#176caa" };

function lineColors(options = {}) {
  if (!options || typeof options !== "object" || Array.isArray(options)) throw new TypeError("colors must be an object.");
  const colors = { ...DEFAULT_COLORS, ...options };
  for (const key of Object.keys(colors)) {
    if (!(key in DEFAULT_COLORS) || typeof colors[key] !== "string" || !colors[key].trim()) throw new TypeError("Expected colors.data1, colors.data2 and colors.fft to be non-empty CSS color strings.");
  }
  return colors;
}

const escapeAttribute = value => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

/** Build a responsive SVG. All plotted values come from validated numeric data. */
function plot(series, { title, xLabel, xMinimum, xMaximum, nonnegative = false, scaleFrom = xMinimum, scaleUntil = xMaximum, clipId, width = 720, selection, colors, markers = false, xFormatter = null }) {
  const height = 280;
  const margin = { left: 68, right: 20, top: 20, bottom: 52 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  let largest = 0;
  for (const points of series) {
    for (const [x, y] of points) {
      if (x >= scaleFrom && x < scaleUntil) largest = Math.max(largest, Math.abs(y));
    }
  }
  largest = largest > 0 ? largest * 1.1 : 1;
  const yMinimum = nonnegative ? 0 : -largest;
  const yMaximum = largest;
  const xPosition = value => margin.left + (value - xMinimum) / (xMaximum - xMinimum) * plotWidth;
  const yPosition = value => margin.top + (yMaximum - value) / (yMaximum - yMinimum) * plotHeight;
  const format = value => Math.abs(value) >= 10000 ? value.toExponential(1) : Number(value.toPrecision(4)).toString();
  const elements = [];

  for (let tick = 0; tick <= 4; tick++) {
    const x = xMinimum + (xMaximum - xMinimum) * tick / 4;
    const y = yMinimum + (yMaximum - yMinimum) * tick / 4;
    elements.push(`<path d="M ${xPosition(x)} ${margin.top} V ${margin.top + plotHeight}" stroke="#e0e5e8"/>`);
    elements.push(`<path d="M ${margin.left} ${yPosition(y)} H ${width - margin.right}" stroke="#e0e5e8"/>`);
    elements.push(`<text x="${xPosition(x)}" y="${height - 30}" text-anchor="middle">${xFormatter ? xFormatter(x) : format(x)}</text>`);
    elements.push(`<text x="${margin.left - 8}" y="${yPosition(y) + 4}" text-anchor="end">${format(y)}</text>`);
  }
  elements.push(`<path d="M ${margin.left} ${margin.top} V ${margin.top + plotHeight} H ${width - margin.right}" fill="none" stroke="#66757c"/>`);
  elements.push(`<defs><clipPath id="${clipId}"><rect x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}"/></clipPath></defs>`);
  if (selection) {
    const left = xPosition(selection[0]);
    const right = xPosition(selection[1]);
    elements.push(`<g clip-path="url(#${clipId})"><rect x="${left}" y="${margin.top}" width="${right - left}" height="${plotHeight}" fill="#176caa" fill-opacity="0.1"/><path d="M ${left} ${margin.top} V ${margin.top + plotHeight} M ${right} ${margin.top} V ${margin.top + plotHeight}" stroke="#176caa" stroke-dasharray="4 3"/></g>`);
  }
  series.forEach((points, index) => {
    const coordinates = points.map(([x, y]) => `${xPosition(x).toFixed(2)},${yPosition(y).toFixed(2)}`).join(" ");
    elements.push(`<polyline points="${coordinates}" fill="none" stroke="${escapeAttribute(colors[index])}" stroke-width="1.5" stroke-linejoin="round" clip-path="url(#${clipId})"/>`);
    if (markers && index === 0) for (const [x, y] of points) {
      elements.push(`<circle cx="${xPosition(x)}" cy="${yPosition(y)}" r="3" fill="${escapeAttribute(colors[index])}" clip-path="url(#${clipId})"/>`);
    }
  });
  elements.push(`<text x="${margin.left + plotWidth / 2}" y="${height - 6}" text-anchor="middle">${xLabel}</text>`);
  elements.push(`<text x="16" y="${margin.top + plotHeight / 2}" transform="rotate(-90 16 ${margin.top + plotHeight / 2})" text-anchor="middle">信号値 [a.u.]</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}" style="font-family:inherit;font-size:12px;fill:#34454e"><title>${title}</title>${elements.join("")}</svg>`;
}

/** Analyze without modifying record.raw; share the same pipeline in browser/tests. */
export function createRecordPlots(record, { width = 720, displayEndMs = 10, frequencyLimitHz = 10000, analysis = analyzeMeasurement(record), idPrefix = `nmr-${++nextGraphId}`, colors = {} } = {}) {
  if (!Number.isFinite(width) || width < 160) throw new RangeError("Plot width must be at least 160 pixels.");
  if (typeof idPrefix !== "string" || !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(idPrefix)) throw new TypeError("Invalid SVG ID prefix.");
  if (!Number.isFinite(displayEndMs) || displayEndMs <= 0 || !Number.isFinite(frequencyLimitHz) || frequencyLimitHz <= 0) throw new RangeError("Display limits must be positive finite numbers.");
  const palette = lineColors(colors);
  const { data, spectrum, peak } = analysis;
  const endMs = Math.min(displayEndMs, data.length * record.sampleIntervalMs);
  const displayed = data.slice(0, Math.ceil(endMs / record.sampleIntervalMs - 1e-9));
  const channels = [0, 1].map(channel => displayed.map((pair, index) => [index * record.sampleIntervalMs, pair[channel]]));
  const visibleBins = spectrum.bins.filter(bin => Math.abs(bin.hz) <= frequencyLimitHz);
  const displayLimit = Math.min(frequencyLimitHz, 500 / record.sampleIntervalMs);
  return {
    fid: plot(channels, { title: "FID：Data 1とData 2", xLabel: "時間 [ms]", xMinimum: 0, xMaximum: endMs, scaleFrom: spectrum.actualStartMs, scaleUntil: spectrum.actualEndExclusiveMs, clipId: `${idPrefix}-fid`, width, selection: [spectrum.actualStartMs, spectrum.actualEndExclusiveMs], colors: [palette.data1, palette.data2] }),
    fft: plot([visibleBins.map(bin => [bin.hz / 1000, bin.amplitude])], {
      title: "複素FFTの振幅スペクトル", xLabel: "受信周波数からの差 [kHz]",
      xMinimum: -displayLimit / 1000, xMaximum: displayLimit / 1000, nonnegative: true, clipId: `${idPrefix}-fft`, width, colors: [palette.fft],
    }),
    peak,
    spectrum,
  };
}

/** Browser graph view. Resize redraws the saved analysis, without remeasuring. */
export class NMRGraphs {
  constructor({ fid, fft, peak = null, status = null, displayEndMs = 10, frequencyLimitHz = 10000, colors = {} }) {
    if (!fid || !fft) throw new TypeError("FID and FFT elements are required.");
    Object.assign(this, { fid, fft, peakElement: peak, statusElement: status, displayEndMs, frequencyLimitHz });
    this.colors = lineColors(colors);
    this.idPrefix = `nmr-${++nextGraphId}`;
    this.widths = new Map();
    this.observer = new ResizeObserver(entries => {
      let changed = false;
      for (const entry of entries) {
        if (this.widths.get(entry.target) !== entry.contentRect.width) {
          this.widths.set(entry.target, entry.contentRect.width);
          changed = true;
        }
      }
      if (changed && this.record) this.render();
    });
    this.observer.observe(fid);
    this.observer.observe(fft);
  }

  show(record, analysis = analyzeMeasurement(record)) {
    this.record = record;
    this.analysis = analysis;
    try { this.render(); }
    catch (error) { this.clear(); throw error; }
  }

  render() {
    const { record, analysis } = this;
    const widthOf = element => {
      const style = getComputedStyle(element);
      return Math.max(160, element.clientWidth - parseFloat(style.paddingLeft || 0) - parseFloat(style.paddingRight || 0));
    };
    const options = { analysis, displayEndMs: this.displayEndMs, frequencyLimitHz: this.frequencyLimitHz, idPrefix: this.idPrefix, colors: this.colors };
    const fid = createRecordPlots(record, { ...options, width: widthOf(this.fid) });
    const fft = createRecordPlots(record, { ...options, width: widthOf(this.fft) });
    this.fid.innerHTML = fid.fid;
    this.fft.innerHTML = fft.fft;
    for (const element of [this.fid, this.fft]) {
      const svg = element.querySelector("svg");
      svg.style.display = "block";
      svg.style.width = "100%";
      svg.style.height = "280px";
    }
    if (this.peakElement) {
      const peak = analysis.peak;
      const outside = Math.abs(peak.hz) > this.frequencyLimitHz ? "（表示範囲外）" : "";
      this.peakElement.textContent = peak.amplitude === 0 ? "最大ピーク：信号なし"
        : `最大ピーク：${peak.hz.toFixed(1)} Hz（受信周波数からの差）${outside}。全周波数から探索・FFTビン値。`;
    }
    if (this.statusElement) {
      const { spectrum, baseline } = analysis;
      const interval = `${spectrum.actualStartMs}〜${spectrum.actualEndExclusiveMs} ms`;
      this.statusElement.textContent = `末尾${baseline.tailPoints}点の平均で補正。FID表示は0〜${this.displayEndMs} ms、縦軸は${interval}で自動調整（範囲外はクリップ）。薄い青の帯はFFT範囲。FFTは${interval}（終端を含まない）、${spectrum.window}窓。周波数表示は±${this.frequencyLimitHz / 1000} kHz。`;
    }
  }

  clear() {
    this.record = null;
    this.analysis = null;
    this.fid.textContent = "測定すると波形を表示します。";
    this.fft.textContent = "測定するとスペクトルを表示します。";
    if (this.peakElement) this.peakElement.textContent = "最大ピーク：未測定";
    if (this.statusElement) this.statusElement.textContent = "";
  }

  dispose() {
    this.observer.disconnect();
    this.clear();
  }
}

/** Build the frequency-response curve with the same SVG axes as FID/FFT graphs. */
export function createFrequencyPlot(points, { width = 720 } = {}) {
  if (!Array.isArray(points) || !points.length || !Number.isFinite(width) || width < 160) {
    throw new TypeError("At least one frequency point and a width of 160 or greater are required.");
  }
  const sorted = [...points].sort((a, b) => a.frequencyHz - b.frequencyHz);
  if (!sorted.every(point => Number.isFinite(point.frequencyHz) && Number.isFinite(point.amplitude) && point.amplitude >= 0)) {
    throw new TypeError("Frequency and nonnegative amplitude must be finite.");
  }
  let min = sorted[0].frequencyHz / 1000;
  let max = sorted.at(-1).frequencyHz / 1000;
  if (min === max) { min -= 0.1; max += 0.1; }
  const svg = plot([sorted.map(point => [point.frequencyHz / 1000, point.amplitude])], {
    title: "設定周波数とFFTピーク振幅", xLabel: "設定周波数 [kHz]", xMinimum: min, xMaximum: max,
    nonnegative: true, scaleUntil: Infinity, clipId: `sweep-${++nextGraphId}`, width, colors: [DEFAULT_COLORS.fft], markers: true, xFormatter: value => Number(value.toFixed(6)).toString(),
  });
  return svg;
}

/** Signed pulse response and optional fitted curve, at a fixed vertical height. */
export function createPulsePlot(points, { width = 720, fit = null, mode = "signed" } = {}) {
  if (!Array.isArray(points) || !points.length || !Number.isFinite(width) || width < 160) throw new TypeError("Valid pulse points and plot width are required.");
  if (!["signed", "magnitude"].includes(mode)) throw new TypeError("Invalid pulse plot mode.");
  const magnitude = mode === "magnitude";
  const sorted = points.map(point => ({ ...point, amplitude: magnitude ? point.magnitude : point.amplitude })).sort((a, b) => a.length - b.length);
  if (!sorted.every(point => Number.isFinite(point.length) && Number.isFinite(point.amplitude))) throw new TypeError("Pulse lengths and signed values must be finite.");
  const min = sorted[0].length, max = sorted.at(-1).length;
  const series = [sorted.map(point => [point.length, point.amplitude])];
  if (fit) {
    if (![fit.A, fit.B, fit.p90].every(Number.isFinite) || fit.p90 <= 0) throw new TypeError("Invalid pulse fit.");
    series.push(Array.from({ length: 201 }, (_, index) => {
      const length = min + (max - min) * index / 200;
      const value = Math.sin(Math.PI * length / (2 * fit.p90));
      return [length, fit.A * (magnitude ? Math.abs(value) : value) + fit.B];
    }));
  }
  return plot(series, { title: magnitude ? "パルス周期数と信号の絶対値" : "パルス周期数と符号付き信号", nonnegative: magnitude, xLabel: "第1パルス [周期数]", xMinimum: 0,
    xMaximum: min === max ? max + 1 : max, scaleUntil: Infinity, clipId: `pulse-${++nextGraphId}`, width,
    colors: [DEFAULT_COLORS.data1, DEFAULT_COLORS.data2], markers: true });
}

/** T1 response: preserve signed recovery; magnitude/quadrature are display-only. */
export function createT1Plot(points, { width = 720, fit = null, mode = "signed" } = {}) {
  if (!["signed", "magnitude", "quadrature"].includes(mode) || !Array.isArray(points) || !points.length || !Number.isFinite(width) || width < 160) throw new TypeError("Invalid T1 plot settings.");
  const key = mode === "signed" ? "signal" : mode;
  const sorted = [...points].sort((a, b) => a.tau - b.tau);
  if (!sorted.every(point => Number.isFinite(point.tau) && Number.isFinite(point[key]))) throw new TypeError("T1 points must be finite.");
  const min = sorted[0].tau, max = sorted.at(-1).tau;
  const series = [sorted.map(point => [point.tau, point[key]])];
  if (fit && mode === "signed") {
    if (![fit.A, fit.B, fit.T, fit.from, fit.to].every(Number.isFinite) || fit.T <= 0) throw new TypeError("Invalid T1 fit.");
    series.push(Array.from({ length: 201 }, (_, index) => {
      const tau = fit.from + (fit.to - fit.from) * index / 200;
      return [tau, fit.A - fit.B * Math.exp(-tau / fit.T)];
    }));
  }
  return plot(series, { title: "T1・反転回復曲線", xLabel: "待ち時間 τ [ms]", xMinimum: 0,
    xMaximum: min === max ? max + 1 : max, scaleUntil: Infinity, nonnegative: mode === "magnitude",
    clipId: `t1-${++nextGraphId}`, width, colors: [DEFAULT_COLORS.data1, DEFAULT_COLORS.data2], markers: true });
}

/** Echo amplitude versus 2*tau; background is fixed at zero. */
export function createT2Plot(points, {width = 720, fit = null} = {}) {
  if (!Array.isArray(points) || !points.length || !Number.isFinite(width) || width < 160) throw new TypeError("Invalid T2 plot settings.");
  const sorted = [...points].sort((a,b)=>a.tau-b.tau);
  if (!sorted.every(p=>Number.isFinite(p.tau)&&p.tau>0&&Number.isFinite(p.signal)&&p.signal>=0)) throw new TypeError("T2 points must be finite and nonnegative.");
  const series = [sorted.map(p=>[2*p.tau,p.signal])];
  if (fit) {
    if (![fit.T,fit.A,fit.from,fit.to].every(Number.isFinite) || fit.T<=0) throw new TypeError("Invalid T2 fit.");
    series.push(Array.from({length:201},(_,i)=>{const x=fit.from+(fit.to-fit.from)*i/200;return [x,fit.A*Math.exp(-x/fit.T)];}));
  }
  return plot(series,{title:"T2・エコー減衰曲線",xLabel:"2τ [ms]",xMinimum:0,xMaximum:Math.max(...sorted.map(p=>2*p.tau)),scaleUntil:Infinity,nonnegative:true,
    clipId:`t2-${++nextGraphId}`,width,colors:[DEFAULT_COLORS.data1,DEFAULT_COLORS.data2],markers:true});
}
