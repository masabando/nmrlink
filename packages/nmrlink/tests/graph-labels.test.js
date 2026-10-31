import test from "node:test";
import assert from "node:assert/strict";
import { NMRGraphs, createRecordPlots, createFrequencyPlot, createPulsePlot, createT1Plot, createT2Plot } from "../src/graphs.js";

const record = () => ({ raw: Array.from({ length: 2048 }, () => [0, 0]), sampleIntervalMs: 0.02 });
const curves = [
  [createFrequencyPlot, [{ frequencyHz: 402000, amplitude: 10 }], "Set frequency [kHz]", "設定周波数 [kHz]"],
  [createPulsePlot, [{ length: 21, amplitude: 10, magnitude: 10 }], "First pulse [RF cycles]", "第1パルス [周期数]"],
  [createT1Plot, [{ tau: 5, signal: -10, magnitude: 10, quadrature: 2 }], "Delay τ [ms]", "待ち時間 τ [ms]"],
  [createT2Plot, [{ tau: 5, signal: 10 }], "2τ [ms]", "2τ [ms]"],
];

test("record plots default to Japanese; English and partial overrides preserve all numeric results", () => {
  const input = record();
  const before = JSON.stringify(input);
  const ja = createRecordPlots(input, { idPrefix: "labels" });
  const en = createRecordPlots(input, { idPrefix: "labels", locale: "en" });
  assert.match(ja.fid, />時間 \[ms\]<\/text>/);
  assert.match(ja.fid, />信号値 \[a.u.\]<\/text>/);
  assert.match(en.fid, />Time \[ms\]<\/text>/);
  assert.match(en.fft, />Frequency offset \[kHz\]<\/text>/);
  assert.match(en.fft, /aria-label="Complex FFT amplitude spectrum"/);
  assert.deepEqual(en.spectrum, ja.spectrum);
  assert.deepEqual(en.peak, ja.peak);
  assert.deepEqual(en.fid.match(/<polyline[^>]*>/g), ja.fid.match(/<polyline[^>]*>/g));
  const custom = createRecordPlots(input, { locale: "en", labels: { fid: { xLabel: "Elapsed [ms]" } } });
  assert.match(custom.fid, />Elapsed \[ms\]<\/text>/);
  assert.match(custom.fid, />Signal \[a.u.\]<\/text>/);
  assert.match(custom.fft, />Frequency offset \[kHz\]<\/text>/);
  assert.equal(JSON.stringify(input), before);
});

test("all curve functions support the same labels without changing geometry", () => {
  for (const [plot, points, english, japanese] of curves) {
    const ja = plot(points);
    const en = plot(points, { locale: "en" });
    assert.ok(ja.includes(japanese));
    assert.ok(en.includes(english));
    assert.match(en, />Signal \[a.u.\]<\/text>/);
    // Clip IDs are intentionally unique; coordinates and units must be unchanged.
    assert.deepEqual(en.match(/points="[^"]+"/g), ja.match(/points="[^"]+"/g));
    const custom = plot(points, { locale: "en", labels: { title: "Custom plot", xLabel: "X", yLabel: "Y" } });
    assert.match(custom, /aria-label="Custom plot"/);
    assert.match(custom, /<title>Custom plot<\/title>/);
    assert.match(custom, />X<\/text>/);
    assert.match(custom, />Y<\/text>/);
  }
  assert.match(createPulsePlot(curves[1][1], { locale: "en", mode: "magnitude" }), /signal magnitude/);
  for (const mode of ["magnitude", "quadrature"]) assert.match(createT1Plot(curves[2][1], { locale: "en", mode }), /Signal \[a.u.\]/);
});

test("custom text is escaped in SVG attributes, titles and axes; blank labels are allowed", () => {
  const literal = '<img src=x onerror="bad"> & "quoted"';
  for (const [plot, points] of curves) {
    const svg = plot(points, { labels: { title: literal, xLabel: literal, yLabel: literal } });
    assert.doesNotMatch(svg, /<img|onerror="bad"/);
    assert.match(svg, /&lt;img src=x onerror=&quot;bad&quot;&gt; &amp; &quot;quoted&quot;/);
  }
  const plots = createRecordPlots(record(), { labels: { fid: { title: literal, yLabel: literal }, fft: { xLabel: "" } } });
  assert.doesNotMatch(plots.fid, /<img|onerror="bad"/);
  assert.doesNotMatch(plots.fft, /受信周波数からの差/);
});

test("unsupported options fail explicitly", () => {
  for (const [plot, points] of curves) {
    for (const options of [{ locale: "fr" }, { labels: null }, { labels: { xLabel: 10 } }, { labels: { typo: "x" } }]) assert.throws(() => plot(points, options), TypeError);
  }
  for (const options of [
    { locale: "fr" }, { labels: [] }, { labels: { fid: null } }, { labels: { fft: [] } }, { labels: { typo: "x" } },
    { labels: { fid: { title: 1 } } }, { labels: { status: () => "x" } },
    { labels: { peak: { value: "{amplitude}" } } }, { labels: { status: "{typo}" } },
  ]) assert.throws(() => createRecordPlots(record(), options), TypeError);
});

test("browser views localize messages and preserve overrides through resize, clear and dispose", t => {
  const originalObserver = globalThis.ResizeObserver;
  const originalStyle = globalThis.getComputedStyle;
  t.after(() => {
    if (originalObserver === undefined) delete globalThis.ResizeObserver; else globalThis.ResizeObserver = originalObserver;
    if (originalStyle === undefined) delete globalThis.getComputedStyle; else globalThis.getComputedStyle = originalStyle;
  });
  globalThis.ResizeObserver = class {
    constructor(callback) { this.callback = callback; }
    observe() {}
    disconnect() { this.disconnected = true; }
  };
  globalThis.getComputedStyle = () => ({ paddingLeft: "0", paddingRight: "0" });
  const element = () => ({ clientWidth: 360, innerHTML: "", textContent: "", querySelector: () => ({ style: {} }) });
  const fid = element(), fft = element(), peak = element(), status = element();
  const graphs = new NMRGraphs({ fid, fft, peak, status, locale: "en", labels: { fid: { xLabel: "Elapsed [ms]", empty: "Waiting" } } });
  graphs.show(record());
  assert.equal(peak.textContent, "Maximum peak: no signal");
  assert.match(status.textContent, /Baseline: mean of the last 100 samples/);
  assert.match(fft.innerHTML, /Frequency offset/);
  fid.clientWidth = 500;
  graphs.observer.callback([{ target: fid, contentRect: { width: 500 } }]);
  assert.match(fid.innerHTML, /width="500"/);
  assert.match(fid.innerHTML, /Elapsed/);
  const signal = record();
  signal.raw = signal.raw.map((_, index) => [Math.cos(2 * Math.PI * 12500 * index * 0.00002), Math.sin(2 * Math.PI * 12500 * index * 0.00002)]);
  graphs.show(signal);
  assert.match(peak.textContent, /12500.0 Hz.*outside display range/);
  graphs.dispose();
  assert.equal(graphs.observer.disconnected, true);
  assert.equal(fid.textContent, "Waiting");
  assert.equal(fft.textContent, "Measure to display the spectrum.");
  assert.equal(peak.textContent, "Maximum peak: no measurement");
  assert.equal(status.textContent, "");

  const custom = new NMRGraphs({ fid, fft, peak, status, locale: "en", frequencyLimitHz: 1000, labels: {
    peak: { empty: "Empty", none: "None", outside: "!", value: "At {hz}{outside}" },
    status: "{tailPoints}|{displayEndMs}|{startMs}|{endMs}|{window}|{frequencyLimitKHz}",
  } });
  custom.show(signal);
  assert.equal(peak.textContent, "At 12500.0!");
  assert.equal(status.textContent, "100|10|1|5|hann|1");
  custom.dispose();
  assert.equal(peak.textContent, "Empty");

  const defaults = new NMRGraphs({ fid, fft, peak, status });
  defaults.show(record());
  assert.equal(peak.textContent, "最大ピーク：信号なし");
  assert.equal(status.textContent, "末尾100点の平均で補正。FID表示は0〜10 ms、縦軸は1〜5 msで自動調整（範囲外はクリップ）。薄い青の帯はFFT範囲。FFTは1〜5 ms（終端を含まない）、hann窓。周波数表示は±10 kHz。");
  defaults.dispose();
  assert.equal(fid.textContent, "測定すると波形を表示します。");
  assert.equal(peak.textContent, "最大ピーク：未測定");
});
