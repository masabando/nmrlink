import test from 'node:test';
import assert from 'node:assert/strict';
import { lowpassFilter, analyzeMeasurement } from '../src/index.js';

const sampleIntervalMs = 0.02;
function amplitude(values, hz, channel = 0) {
  let real = 0, imag = 0;
  const from = 5000, to = values.length - 5000;
  for (let i = from; i < to; i++) {
    const phase = 2 * Math.PI * hz * i * sampleIntervalMs / 1000;
    real += values[i][channel] * Math.cos(phase);
    imag += values[i][channel] * Math.sin(phase);
  }
  return 2 * Math.hypot(real, imag) / (to - from);
}
test('final cutoff is -3 dB for every offered cutoff, with preserved quadrature', () => {
  for (const cutoffHz of [1000, 500, 200, 100]) {
    const data = Array.from({ length: 30000 }, (_, i) => {
      const a = 2 * Math.PI * cutoffHz * i * sampleIntervalMs / 1000;
      return [Math.cos(a), Math.sin(a)];
    });
    const before = JSON.stringify(data);
    const filtered = lowpassFilter(data, { sampleIntervalMs, cutoffHz }).data;
    for (const channel of [0, 1]) assert.ok(Math.abs(amplitude(filtered, cutoffHz, channel) - Math.SQRT1_2) < 1e-5);
    assert.equal(JSON.stringify(data), before);
  }
});
test('DC passes, high frequencies attenuate and both channels use the same response', () => {
  const dc = lowpassFilter(Array.from({ length: 2048 }, () => [37, -11]), { sampleIntervalMs, cutoffHz: 100 }).data;
  for (const pair of dc) { assert.ok(Math.abs(pair[0] - 37) < 1e-7); assert.ok(Math.abs(pair[1] + 11) < 1e-7); }
  const data = Array.from({ length: 30000 }, (_, i) => {
    const x = Math.cos(2 * Math.PI * 3000 * i * sampleIntervalMs / 1000);
    return [x, 2 * x];
  });
  const filtered = lowpassFilter(data, { sampleIntervalMs, cutoffHz: 500 }).data;
  assert.ok(amplitude(filtered, 3000) < 0.003);
  assert.ok(filtered.every(([a, b]) => Math.abs(b - 2 * a) < 1e-10));
});
test('analysis without LPF is unchanged; filtered analysis retains raw and baseline', () => {
  const record = { sampleIntervalMs, raw: Array.from({ length: 2048 }, (_, i) => [100 + Math.sin(i), 10 + Math.cos(i)]) };
  assert.deepEqual(analyzeMeasurement(record), analyzeMeasurement(record, { lowpassHz: null }));
  const before = JSON.stringify(record);
  const filtered = analyzeMeasurement(record, { lowpassHz: 1000 });
  assert.equal(filtered.data.length, 2048);
  assert.equal(filtered.lowpass.cutoffHz, 1000);
  assert.equal(JSON.stringify(record), before);
  assert.notDeepEqual(filtered.data, filtered.baseline.data);
});
test('invalid cutoff or sampling is rejected', () => {
  const data = [[1, 2], [2, 3], [3, 4], [4, 5]];
  for (const cutoffHz of [0, -1, NaN, Infinity, 25000]) assert.throws(() => lowpassFilter(data, { sampleIntervalMs, cutoffHz }), { code: 'INVALID_LOWPASS' });
  assert.throws(() => lowpassFilter(data, { sampleIntervalMs: -1, cutoffHz: 100 }), { code: 'INVALID_LOWPASS' });
});
test('analysis excludes the pre-FFT transmit transient from the filter', () => {
  const make = transient => ({ sampleIntervalMs, raw: Array.from({ length: 2048 }, (_, i) => [
    (i < 50 ? transient : 0) + Math.sin(i / 30),
    (i < 50 ? -transient : 0) + Math.cos(i / 30),
  ]) });
  const a = analyzeMeasurement(make(1000000), { lowpassHz: 100 });
  const b = analyzeMeasurement(make(0), { lowpassHz: 100 });
  assert.deepEqual(a.data.slice(50), b.data.slice(50));
  assert.equal(a.lowpass.startMs, 1);
  assert.equal(a.lowpass.data.length, 1998);
});
