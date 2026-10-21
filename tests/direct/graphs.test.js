import test from "node:test";
import assert from "node:assert/strict";
import { createRecordPlots } from "../../packages/nmrlink/src/graphs.js";

test("direct plots preserve raw data and display a known complex frequency", () => {
  const raw = Array.from({ length: 2048 }, (_, index) => {
    const angle = 2 * Math.PI * 1220.703125 * index * 0.00002;
    return Object.freeze([100 + 500 * Math.cos(angle), -30 + 500 * Math.sin(angle)]);
  });
  const record = { raw: Object.freeze(raw), sampleIntervalMs: 0.02 };
  const before = JSON.stringify(record);
  const plots = createRecordPlots(record);
  assert.equal(JSON.stringify(record), before);
  const peak = plots.spectrum.bins.reduce((a, b) => a.amplitude > b.amplitude ? a : b);
  assert.ok(Math.abs(peak.hz - 1220.703125) <= plots.spectrum.spacingHz / 2);
  assert.equal(plots.spectrum.count, 200);
  assert.equal(plots.spectrum.endMs, 5);
  assert.equal(plots.spectrum.first, 50);
  assert.equal(plots.spectrum.last, 250);
  assert.equal(plots.spectrum.window, "hann");
  assert.equal((plots.fid.match(/<polyline /g) ?? []).length, 2);
  assert.equal((plots.fft.match(/<polyline /g) ?? []).length, 1);
  assert.ok(!/NaN|Infinity/.test(plots.fid + plots.fft));
});

test("zero signal renders finite axes and invalid data fails explicitly", () => {
  const plots = createRecordPlots({ raw: Array.from({ length: 2048 }, () => [0, 0]), sampleIntervalMs: 0.02 });
  assert.ok(!/NaN|Infinity/.test(plots.fid + plots.fft));
  assert.throws(() => createRecordPlots({ raw: [[NaN, 0]], sampleIntervalMs: 0.02 }));
});

test("large initial transient does not set FID scale or enter the FFT", () => {
  const raw = Array.from({ length: 2048 }, (_, index) => {
    const t = index * 0.00002;
    return [Math.round(500 * Math.cos(2 * Math.PI * 1000 * t)), Math.round(500 * Math.sin(2 * Math.PI * 1000 * t))];
  });
  const reference = createRecordPlots({ raw, sampleIntervalMs: 0.02 });
  const transient = raw.map((pair, index) => index < 50 ? [pair[0] + 300000, pair[1] + 200000] : [...pair]);
  const actual = createRecordPlots({ raw: transient, sampleIntervalMs: 0.02 }, { idPrefix: "test" });
  assert.deepEqual(actual.spectrum, reference.spectrum);
  assert.deepEqual(actual.fid.match(/<text[^>]*>[^<]*<\/text>/g), reference.fid.match(/<text[^>]*>[^<]*<\/text>/g));
  assert.match(actual.fid, /clip-path="url\(#test-fid\)"/);
  const coordinates = actual.fid.match(/<polyline points="([^"]+)"/)[1].split(" ");
  assert.equal(coordinates.length, 500); // Keep the full 0–10 ms trace, including the clipped start.
  assert.equal(coordinates[0].split(",")[0], "68.00");
});

test("FFT display covers 10 kHz and peak search includes frequencies outside it", () => {
  for (const frequency of [-3125, 12500]) {
    const raw = Array.from({ length: 2048 }, (_, index) => {
      const angle = 2 * Math.PI * frequency * index * 0.00002;
      return [500 * Math.cos(angle), 500 * Math.sin(angle)];
    });
    const plots = createRecordPlots({ raw, sampleIntervalMs: 0.02 });
    assert.equal(plots.peak.hz, frequency);
    assert.match(plots.fft, />-10<\/text>/);
    assert.match(plots.fft, />10<\/text>/);
  }
});

test("narrow plots keep their height and mark the FFT interval on the FID", () => {
  const record = { raw: Array.from({ length: 2048 }, () => [0, 0]), sampleIntervalMs: 0.02 };
  const plots = createRecordPlots(record, { width: 300 });
  for (const svg of [plots.fid, plots.fft]) assert.match(svg, /width="300" height="280" viewBox="0 0 300 280"/);
  assert.match(plots.fid, /fill-opacity="0.1"/);
  assert.match(plots.fid, /stroke-dasharray="4 3"/);
  assert.doesNotMatch(plots.fft, /fill-opacity="0.1"/);
});

test("line colors are independently configurable with defaults for omitted colors", () => {
  const record = { raw: Array.from({ length: 2048 }, () => [0, 0]), sampleIntervalMs: 0.02 };
  const plots = createRecordPlots(record, { colors: { data1: "#ff0000", data2: "green", fft: "rgb(100, 20, 200)" } });
  assert.match(plots.fid, /<polyline[^>]*stroke="#ff0000"/);
  assert.match(plots.fid, /<polyline[^>]*stroke="green"/);
  assert.match(plots.fft, /<polyline[^>]*stroke="rgb\(100, 20, 200\)"/);
  const partial = createRecordPlots(record, { colors: { fft: "purple" } });
  assert.match(partial.fid, /<polyline[^>]*stroke="#176caa"/);
  assert.match(partial.fft, /<polyline[^>]*stroke="purple"/);
  assert.throws(() => createRecordPlots(record, { colors: { fft: "" } }));
  const escaped = createRecordPlots(record, { colors: { fft: 'red" onload="bad' } });
  assert.ok(!escaped.fft.includes('stroke="red" onload='));
});
