import { validateParameters, SAMPLE_COUNT, SAMPLE_INTERVAL_MS } from "./protocol.js";

/** Shared integer grid for frequency and pulse scans. */
export function integerSteps(start, end, step, maximum) {
  if (![start, end, step].every(Number.isInteger) || start < 1 || end > maximum || end < start || step < 1) {
    throw new RangeError(`走査範囲は1〜${maximum}の整数、開始≤終了、刻み幅は1以上で指定してください。`);
  }
  const count = Math.floor((end - start) / step) + 1;
  if (count > 201) throw new RangeError("走査は201点以内で指定してください。");
  return Array.from({ length: count }, (_, index) => start + index * step);
}

/** Validate the complete plan, then measure sequentially without retries. */
export async function runSingleSweep(device, parameters, {
  field, values, analysis = {}, evaluate, signal, onPoint = () => {}, mode = "single", validateMeasurement = () => {},
}) {
  const common = validateParameters(parameters);
  const planned = values.map(value => validateParameters({ ...common, [field]: value }));
  if (!["single", "double"].includes(mode)) throw new TypeError("Invalid measurement mode.");
  planned.forEach(validateMeasurement);
  const settings = { ...analysis };
  evaluate({ parameters: common, sampleIntervalMs: SAMPLE_INTERVAL_MS, raw: Array.from({ length: SAMPLE_COUNT }, () => [0, 0]) }, settings);
  const points = [];
  for (const measurement of planned) {
    if (signal?.aborted) break;
    const record = await device.measure(measurement, { mode });
    const point = evaluate(record, settings);
    points.push(point);
    await onPoint(point, points.length, planned.length);
  }
  return { points, stopped: Boolean(signal?.aborted), analysis: settings, parameters: common };
}
