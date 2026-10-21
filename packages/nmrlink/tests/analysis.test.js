import test from "node:test";
import assert from "node:assert/strict";
import { correctBaseline, computeSpectrum } from "../src/index.js";
import { correctBaseline as pocBaseline } from "../../../tests/fixtures/poc/protocol.js";
import { spectrum as pocSpectrum } from "../../../tests/fixtures/poc/fft.js";

function waveform(count) {
  return Array.from({ length: count }, (_, index) => [
    30 + 350 * Math.cos(index * 0.31) * Math.exp(-index / 420) + Math.sin(index * 1.71),
    -20 + 280 * Math.sin(index * 0.31) * Math.exp(-index / 420) + Math.cos(index * 2.13),
  ]);
}
function close(actual, expected, tolerance = 1e-10) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

test("default baseline matches PoC exactly and preserves every raw sample", () => {
  for (const raw of [waveform(2048), Array.from({ length: 2048 }, (_, index) => [index % 11 - 5.7, index % 7 - 3.2])]) {
    const saved = structuredClone(raw);
    raw.forEach(Object.freeze);
    Object.freeze(raw);
    const expected = pocBaseline(raw);
    const actual = correctBaseline(raw);
    assert.deepEqual(actual.base, expected.base);
    assert.deepEqual(actual.data, expected.data);
    assert.deepEqual(raw, saved);
    assert.notEqual(actual.data[0], raw[0]);
  }
});

test("custom baseline tail and non-truncated correction are explicit options", () => {
  const raw = [[12.1, -16.7], [10, -20], [11, -21], [10, -20], [11, -21]];
  const corrected = correctBaseline(raw, { tailPoints: 4 });
  assert.deepEqual(corrected.base, [10.5, -20.5]);
  assert.deepEqual(corrected.data[0], [1, 3]);
  const floating = correctBaseline(raw, { tailPoints: 4, truncate: false });
  close(floating.data[0][0], 1.6);
  close(floating.data[0][1], 3.8);
});

test("FFT frequencies, amplitudes and range metadata match PoC exactly", () => {
  for (const count of [2048, 257, 37]) {
    const raw = waveform(count);
    const datasets = count === 2048 ? [raw, correctBaseline(raw).data] : [raw];
    for (const data of datasets) {
      for (const window of ["hann", "rect"]) {
        for (const [startMs, endMs] of [[0, count * 0.02], [0.031, count * 0.02 - 0.017]]) {
          const expected = pocSpectrum(data, 0.02, startMs, endMs, window);
          const actual = computeSpectrum(data, { sampleIntervalMs: 0.02, startMs, endMs, window });
          assert.deepEqual({ ...actual, bins: actual.bins.map(({ hz, amplitude }) => ({ hz, amplitude })) }, expected);
        }
      }
    }
  }
});

test("complex sine preserves positive/negative frequency, amplitude and phase", () => {
  for (const index of [-8, 8]) {
    const phase = 0.37;
    const data = Array.from({ length: 128 }, (_, sample) => {
      const angle = 2 * Math.PI * index * sample / 128 + phase;
      return [3 * Math.cos(angle), 3 * Math.sin(angle)];
    });
    const result = computeSpectrum(data, { sampleIntervalMs: 0.02, window: "rect" });
    const peak = result.bins.reduce((a, b) => a.amplitude > b.amplitude ? a : b);
    close(peak.hz, index * 1000 / 2.56);
    close(peak.amplitude, 3);
    close(peak.real, 3 * Math.cos(phase));
    close(peak.imaginary, 3 * Math.sin(phase));
    close(peak.phaseRadians, phase);
  }
});

test("complex FFT matches an independent direct DFT after windowing and padding", () => {
  const data = [[2, -1], [3, 4], [-2, 5], [0.5, -0.7], [1.2, 2], [0, -1], [-3, 0.1]];
  for (const window of ["rect", "hann"]) {
    const result = computeSpectrum(data, { sampleIntervalMs: 0.5, window });
    const weights = data.map((_, index) => window === "rect" ? 1 : 0.5 * (1 - Math.cos(2 * Math.PI * index / (data.length - 1))));
    const weight = weights.reduce((sum, value) => sum + value, 0);
    for (let bin = 0; bin < result.size; bin++) {
      const frequencyIndex = bin - result.size / 2;
      let real = 0, imaginary = 0;
      for (let sample = 0; sample < data.length; sample++) {
        const angle = -2 * Math.PI * frequencyIndex * sample / result.size;
        real += weights[sample] * (data[sample][0] * Math.cos(angle) - data[sample][1] * Math.sin(angle));
        imaginary += weights[sample] * (data[sample][0] * Math.sin(angle) + data[sample][1] * Math.cos(angle));
      }
      close(result.bins[bin].real, real / weight);
      close(result.bins[bin].imaginary, imaginary / weight);
      close(result.bins[bin].amplitude, Math.hypot(real, imaginary) / weight);
    }
  }
});

test("end is exclusive and zero padding changes spacing, not observation resolution", () => {
  const data = Array.from({ length: 2048 }, () => [2, 0]);
  const result = computeSpectrum(data, { sampleIntervalMs: 0.02, startMs: 5, endMs: 10 });
  assert.equal(result.first, 250);
  assert.equal(result.last, 500);
  assert.equal(result.count, 250);
  assert.equal(result.size, 256);
  assert.equal(result.resolutionHz, 200);
  assert.equal(result.spacingHz, 1000 / (256 * 0.02));
  close(result.bins.find(bin => bin.hz === 0).amplitude, 2);
  data.forEach(Object.freeze);
  Object.freeze(data);
  assert.doesNotThrow(() => computeSpectrum(data, { sampleIntervalMs: 0.02 }));
});

test("malformed, non-finite and incomplete inputs fail instead of propagating NaN", () => {
  for (const bad of [null, [], [[1]], [[1, 2, 3]], [[NaN, 0]], [[0, Infinity]], new Array(100)]) {
    assert.throws(() => correctBaseline(bad));
    assert.throws(() => computeSpectrum(bad, { sampleIntervalMs: 0.02 }));
  }
  const data = waveform(2048);
  for (const tailPoints of [0, 2049, 1.5, NaN]) assert.throws(() => correctBaseline(data, { tailPoints }));
  assert.throws(() => correctBaseline(data, { truncate: "false" }));
  for (const options of [
    {}, { sampleIntervalMs: 0 }, { sampleIntervalMs: Infinity },
    { startMs: -1 }, { startMs: 5, endMs: 5 }, { endMs: 41 },
    { endMs: 0.04 }, { window: "invalid" },
  ]) {
    assert.throws(() => computeSpectrum(data, { sampleIntervalMs: 0.02, ...options,
      ...(Object.keys(options).length === 0 ? { sampleIntervalMs: undefined } : {}) }));
  }
  assert.throws(() => correctBaseline(Array.from({ length: 100 }, () => [1e308, 1e308])));
  assert.throws(() => computeSpectrum(Array.from({ length: 8 }, () => [1e308, 1e308]), { sampleIntervalMs: 1 }));
});
