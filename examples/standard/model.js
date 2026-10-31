import { analyzeMeasurement } from "./vendor/nmrlink-0.1.4/src/index.js";

/** Validate display limits separately from analysis; never modify the record. */
export function prepareAnalysis(record, settings) {
  const durationMs = record.raw.length * record.sampleIntervalMs;
  const startMs = Number(settings.startMs);
  const endMs = Number(settings.endMs);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs < 0 || endMs <= startMs || endMs > durationMs) {
    throw new RangeError(`FFT範囲は0〜${durationMs} ms内で、開始より終了を大きく指定してください。`);
  }
  if (Math.ceil(endMs / record.sampleIntervalMs - 1e-9) - Math.ceil(startMs / record.sampleIntervalMs - 1e-9) < 4) {
    throw new RangeError("FFT範囲には4点以上のデータを含めてください。");
  }
  const displayEndMs = Number(settings.displayEndMs);
  const frequencyLimitHz = Number(settings.frequencyLimitKHz) * 1000;
  if (!Number.isFinite(displayEndMs) || displayEndMs <= 0 || displayEndMs > durationMs) {
    throw new RangeError(`FID表示終了は0より大きく${durationMs} ms以下で指定してください。`);
  }
  if (!Number.isFinite(frequencyLimitHz) || frequencyLimitHz <= 0 || frequencyLimitHz > 500 / record.sampleIntervalMs) {
    throw new RangeError("FFT表示範囲は0より大きくNyquist周波数以下で指定してください。");
  }
  const analysis = analyzeMeasurement(record, {
    startMs, endMs,
    tailPoints: Number(settings.tailPoints), window: settings.window,
  });
  return { analysis, displayEndMs, frequencyLimitHz };
}

export function createDemoRecord() {
  return {
    source: "demo", acquiredAt: new Date().toISOString(), mode: "single",
    parameters: null, sampleIntervalMs: 0.02, points: 2048,
    raw: Array.from({ length: 2048 }, (_, index) => {
      const time = index * 0.00002;
      const amplitude = 1200 * Math.exp(-time / 0.003);
      const angle = 2 * Math.PI * 2500 * time;
      const transient = 200000 * Math.exp(-time / 0.00008);
      return [Math.round(70 + amplitude * Math.cos(angle) + transient), Math.round(-20 + amplitude * Math.sin(angle) + transient / 2)];
    }),
  };
}

export function fidCsv(record, analysis) {
  const rows = record.raw.map((raw, index) => [
    record.source, index * record.sampleIntervalMs,
    ...raw, ...analysis.data[index],
  ].join(","));
  return "source,time_ms,raw_ch1,raw_ch2,corrected_ch1,corrected_ch2\n" + rows.join("\n") + "\n";
}

export function fftCsv(record, analysis) {
  const spectrum = analysis.spectrum;
  const rows = spectrum.bins.map(bin => [
    record.source, spectrum.actualStartMs, spectrum.actualEndExclusiveMs,
    spectrum.window, bin.hz, bin.real, bin.imaginary, bin.amplitude, bin.phaseRadians,
  ].join(","));
  return "source,start_ms,end_exclusive_ms,window,frequency_hz,real,imaginary,amplitude,phase_radians\n" + rows.join("\n") + "\n";
}
