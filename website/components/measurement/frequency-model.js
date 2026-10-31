import {
  frequencySteps,
  evaluateFrequency,
  validateParameters,
  measurementDurationMs,
} from "../../../packages/nmrlink/src/index.js";
import { formatFileTimestamp } from "../../../packages/nmrlink/src/browser.js";

export const initialFrequencyFields = {
  startHz: "400000",
  endHz: "404000",
  stepHz: "1000",
  pulse1Cycles: "21",
  phase1Degrees: "0",
  measurementIntervalMs: "200",
  scans: "64",
  startMs: "1",
  endMs: "5",
  window: "hann",
  minKHz: "-3",
  maxKHz: "3",
};
export const emptyFrequencyResult = {
  settings: null,
  points: [],
  source: null,
  acquiredAt: null,
  fromFile: false,
};

// ライブラリの事前検証を通してから前回の走査を置き換えます。
export function prepareFrequency(fields) {
  if (Object.values(fields).some((value) => String(value).trim() === ""))
    throw new RangeError("Fill in every scan field.");
  const startHz = Number(fields.startHz),
    endHz = Number(fields.endHz),
    stepHz = Number(fields.stepHz);
  const frequencies = frequencySteps(startHz, endHz, stepHz);
  const parameters = validateParameters({
    frequencyHz: startHz,
    pulse1Cycles: Number(fields.pulse1Cycles),
    phase1Degrees: Number(fields.phase1Degrees),
    pulse2Cycles: 42,
    phase2Degrees: 90,
    pulseIntervalMs: 5,
    measurementIntervalMs: Number(fields.measurementIntervalMs),
    scans: Number(fields.scans),
  });
  const analysis = {
    startMs: Number(fields.startMs),
    endMs: Number(fields.endMs),
    window: fields.window,
    tailPoints: 100,
    minHz: Number(fields.minKHz) * 1000,
    maxHz: Number(fields.maxKHz) * 1000,
  };
  evaluateFrequency(
    {
      parameters,
      sampleIntervalMs: 0.02,
      raw: Array.from({ length: 2048 }, () => [0, 0]),
    },
    analysis,
  );
  return { startHz, endHz, stepHz, frequencies, parameters, analysis };
}
export function frequencySeconds(settings) {
  return Math.ceil(
    settings.frequencies.reduce(
      (sum, frequencyHz) =>
        sum +
        measurementDurationMs(
          { ...settings.parameters, frequencyHz },
          { mode: "single" },
        ),
      0,
    ) / 1000,
  );
}
// Single測定は全点で同じ積算回数・繰り返し間隔を使います。
export function frequencyPointSeconds(settings) {
  return Math.ceil(
    measurementDurationMs(settings.parameters, { mode: "single" }) / 1000,
  );
}
export function bestFrequency(points) {
  return points.reduce(
    (best, point) => (!best || point.amplitude > best.amplitude ? point : best),
    null,
  );
}
export function fieldsFromFrequency(settings) {
  return Object.fromEntries(
    Object.entries({
      startHz: settings.startHz,
      endHz: settings.endHz,
      stepHz: settings.stepHz,
      pulse1Cycles: settings.parameters.pulse1Cycles,
      phase1Degrees: settings.parameters.phase1Degrees,
      measurementIntervalMs: settings.parameters.measurementIntervalMs,
      scans: settings.parameters.scans,
      startMs: settings.analysis.startMs,
      endMs: settings.analysis.endMs,
      window: settings.analysis.window,
      minKHz: settings.analysis.minHz / 1000,
      maxKHz: settings.analysis.maxHz / 1000,
    }).map(([key, value]) => [key, String(value)]),
  );
}
// 校正済みの物理モデルではなく、既存デモと同じ人工的な周波数応答です。
export function frequencyDemoDevice(settings, delayMs = 150) {
  const center =
    (settings.startHz + settings.endHz) / 2 + settings.stepHz * 0.23;
  return {
    async measure(parameters) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      const amplitude =
        1200 *
        Math.exp(
          -(
            ((parameters.frequencyHz - center) /
              Math.max(settings.stepHz * 4, 1)) **
            2
          ),
        );
      const offsetHz = center - parameters.frequencyHz;
      return {
        source: "demo",
        acquiredAt: new Date().toISOString(),
        mode: "single",
        parameters: { ...parameters },
        points: 2048,
        sampleIntervalMs: 0.02,
        raw: Array.from({ length: 2048 }, (_, index) => {
          const t = index * 0.00002,
            envelope = amplitude * Math.exp(-t / 0.003);
          return [
            Math.round(70 + envelope * Math.cos(2 * Math.PI * offsetHz * t)),
            Math.round(-20 + envelope * Math.sin(2 * Math.PI * offsetHz * t)),
          ];
        }),
      };
    },
  };
}
export function frequencyArchive(result) {
  return JSON.stringify(
    {
      kind: "frequency-sweep",
      source: result.source,
      acquiredAt: result.acquiredAt,
      settings: result.settings,
      points: result.points,
    },
    null,
    2,
  );
}
export function frequencyCsv(result) {
  return (
    "source,frequency_hz,peak_amplitude,peak_hz\n" +
    result.points
      .map((point) =>
        [result.source, point.frequencyHz, point.amplitude, point.peakHz].join(
          ",",
        ),
      )
      .join("\n") +
    "\n"
  );
}
export function frequencyFilename(result, extension) {
  return `nmrlink-${result.source}-sweep-${formatFileTimestamp(result.acquiredAt)}.${extension}`;
}
