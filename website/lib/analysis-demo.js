import { createDemoMeasurement } from "./demo-measurement.js";

// Comparison data for the analysis guide. Both records share the same FID and offset.
export function createAnalysisDemoMeasurements() {
  const base = createDemoMeasurement();
  const ideal = {
    ...base,
    raw: base.raw.map(([i, q]) => [i + 2200, q + 1800]),
  };

  // Fixed seed: reopening the page or reanalyzing never produces new noise.
  let seed = 12345;
  function random() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }
  function noise() {
    // Independent Gaussian samples for each channel, standard deviation 80 a.u.
    const radius = Math.sqrt(-2 * Math.log(1 - random()));
    const angle = 2 * Math.PI * random();
    return Math.round(80 * radius * Math.cos(angle));
  }
  const noisy = {
    ...ideal,
    raw: ideal.raw.map(([i, q]) => [i + noise(), q + noise()]),
  };
  return { ideal, noisy };
}
