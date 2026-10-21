import { validateSamples } from "./sample-validation.js";

// Bound allocations and bitwise-index operations; normal acquisitions use 2048 points.
const MAX_FFT_SIZE = 2 ** 20;

/** In-place radix-2 forward FFT. The forward exponent has a negative sign. */
function forwardTransform(real, imaginary) {
  const size = real.length;
  for (let index = 1, reversed = 0; index < size; index++) {
    let bit = size >> 1;
    for (; reversed & bit; bit >>= 1) reversed ^= bit;
    reversed ^= bit;
    if (index < reversed) {
      [real[index], real[reversed]] = [real[reversed], real[index]];
      [imaginary[index], imaginary[reversed]] = [imaginary[reversed], imaginary[index]];
    }
  }
  for (let length = 2; length <= size; length *= 2) {
    const angle = -2 * Math.PI / length;
    for (let offset = 0; offset < size; offset += length) {
      for (let index = 0; index < length / 2; index++) {
        const cosine = Math.cos(angle * index);
        const sine = Math.sin(angle * index);
        const first = offset + index;
        const second = first + length / 2;
        const rotatedReal = real[second] * cosine - imaginary[second] * sine;
        const rotatedImaginary = real[second] * sine + imaginary[second] * cosine;
        real[second] = real[first] - rotatedReal;
        imaginary[second] = imaginary[first] - rotatedImaginary;
        real[first] += rotatedReal;
        imaginary[first] += rotatedImaginary;
      }
    }
  }
}

/**
 * Complex spectrum of channel 1 + i * channel 2, with receiver-relative Hz.
 * Range is [startMs, endMs); output frequencies are ascending, negative first.
 * A symmetric Hann or rectangular window is normalized by its summed weights.
 */
export function computeSpectrum(data, {
  sampleIntervalMs,
  startMs = 0,
  endMs = data?.length * sampleIntervalMs,
  window = "hann",
} = {}) {
  validateSamples(data);
  if (![sampleIntervalMs, startMs, endMs].every(Number.isFinite) ||
      sampleIntervalMs <= 0 || startMs < 0 || startMs >= endMs ||
      endMs > data.length * sampleIntervalMs + 1e-9) {
    throw new RangeError("FFT range must satisfy 0 <= startMs < endMs <= acquisition duration, with a positive sampleIntervalMs.");
  }
  if (!["hann", "rect"].includes(window)) throw new RangeError("Window must be hann or rect.");

  // Match the PoC's rounding tolerance at exact sample boundaries.
  const first = Math.ceil(startMs / sampleIntervalMs - 1e-9);
  const last = Math.min(data.length, Math.ceil(endMs / sampleIntervalMs - 1e-9));
  const count = last - first;
  if (count < 4) throw new RangeError("FFT requires at least four selected samples.");
  const size = 2 ** Math.ceil(Math.log2(count));
  if (size > MAX_FFT_SIZE) throw new RangeError(`FFT size exceeds ${MAX_FFT_SIZE} points.`);

  const real = new Float64Array(size);
  const imaginary = new Float64Array(size);
  let weight = 0;
  for (let index = 0; index < count; index++) {
    const value = window === "hann" ? 0.5 * (1 - Math.cos(2 * Math.PI * index / (count - 1))) : 1;
    real[index] = data[first + index][0] * value;
    imaginary[index] = data[first + index][1] * value;
    weight += value;
  }
  forwardTransform(real, imaginary);

  const bins = Array.from({ length: size }, (_, index) => {
    const transformedIndex = (index + size / 2) % size;
    const realValue = real[transformedIndex];
    const imaginaryValue = imaginary[transformedIndex];
    // Divide after hypot, just as the PoC does, for amplitude compatibility.
    const amplitude = Math.hypot(realValue, imaginaryValue) / weight;
    if (!Number.isFinite(amplitude)) throw new RangeError("FFT calculation overflowed.");
    return {
      hz: (index - size / 2) * 1000 / (size * sampleIntervalMs),
      real: realValue / weight,
      imaginary: imaginaryValue / weight,
      amplitude,
      phaseRadians: Math.atan2(imaginaryValue, realValue),
    };
  });
  return {
    startMs, endMs, first, last, count, size, window,
    actualStartMs: first * sampleIntervalMs,
    actualEndExclusiveMs: last * sampleIntervalMs,
    durationMs: count * sampleIntervalMs,
    spacingHz: 1000 / (size * sampleIntervalMs),
    resolutionHz: 1000 / (count * sampleIntervalMs),
    convention: "Data 1 + i Data 2",
    bins,
  };
}
