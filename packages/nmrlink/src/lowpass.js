import { validateSamples } from './sample-validation.js';
import { createError } from './errors.js';

/** Offline LPF: second-order Butterworth in each direction, with odd reflection.
 * cutoffHz is the FINAL -3.0103 dB frequency after both passes, in Hz.
 * Each channel uses identical coefficients. Input samples are never modified.
 */
export function lowpassFilter(data, { sampleIntervalMs, cutoffHz }) {
  validateSamples(data);
  const sampleRate = 1000 / sampleIntervalMs;
  if (!Number.isFinite(sampleRate) || sampleRate <= 0 || !Number.isFinite(cutoffHz) || cutoffHz <= 0 || cutoffHz >= sampleRate / 2 || data.length < 4) {
    throw createError(RangeError, 'INVALID_LOWPASS');
  }
  // Bilinear prewarping compensates for the squared response of two passes.
  const k = Math.tan(Math.PI * cutoffHz / sampleRate) / (Math.SQRT2 - 1) ** 0.25;
  const norm = 1 / (1 + Math.SQRT2 * k + k * k);
  const b0 = k * k * norm, b1 = 2 * b0, b2 = b0;
  const a1 = 2 * (k * k - 1) * norm;
  const a2 = (1 - Math.SQRT2 * k + k * k) * norm;
  const padding = Math.min(data.length - 1, Math.ceil(3 * sampleRate / cutoffHz));
  function pass(values) {
    // Steady-state initialization for the first value avoids a DC startup step.
    let z1 = (1 - b0) * values[0], z2 = (b2 - a2) * values[0];
    return values.map(x => {
      const y = b0 * x + z1;
      z1 = b1 * x - a1 * y + z2;
      z2 = b2 * x - a2 * y;
      if (!Number.isFinite(y)) throw createError(RangeError, 'INVALID_LOWPASS');
      return y;
    });
  }
  const channels = [0, 1].map(channel => {
    const values = data.map(pair => pair[channel]);
    const left = Array.from({ length: padding }, (_, i) => 2 * values[0] - values[padding - i]);
    const right = Array.from({ length: padding }, (_, i) => 2 * values.at(-1) - values[values.length - 2 - i]);
    const forward = pass([...left, ...values, ...right]);
    return pass(forward.reverse()).reverse().slice(padding, padding + values.length);
  });
  return {
    data: data.map((_, i) => [channels[0][i], channels[1][i]]),
    cutoffHz, method: 'butterworth-2-forward-backward', paddingSamples: padding,
  };
}
