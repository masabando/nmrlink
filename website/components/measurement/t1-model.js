import {
  t1Delays,
  t1Parameters,
  evaluateT1,
  analyzeT1,
  measurementDurationMs,
} from "../../../packages/nmrlink/src/index.js";
import { formatFileTimestamp } from "../../../packages/nmrlink/src/browser.js";

export const initialT1Fields = {
  startMs: "5",
  endMs: "100",
  stepMs: "5",
  frequencyHz: "402000",
  p90Cycles: "21",
  p180Cycles: "42",
  measurementIntervalMs: "200",
  scans: "64",
  fftStartMs: "1",
  fftEndMs: "5",
  window: "hann",
  minKHz: "-3",
  maxKHz: "3",
};
export const initialT1Fit = { fromMs: "5", toMs: "100" };
export const emptyT1Result = {
  settings: null,
  points: [],
  source: null,
  acquiredAt: null,
  fromFile: false,
  recovery: null,
  analysisError: null,
  referenceIndex: null,
  phaseDegrees: 0,
  fromMs: 5,
  toMs: 100,
};

export function prepareT1(fields) {
  if (Object.values(fields).some((value) => String(value).trim() === ""))
    throw new RangeError("Fill in every scan field.");
  const startMs = Number(fields.startMs),
    endMs = Number(fields.endMs),
    stepMs = Number(fields.stepMs);
  const delays = t1Delays(startMs, endMs, stepMs);
  const conditions = {
    frequencyHz: Number(fields.frequencyHz),
    p90Cycles: Number(fields.p90Cycles),
    p180Cycles: Number(fields.p180Cycles),
    measurementIntervalMs: Number(fields.measurementIntervalMs),
    scans: Number(fields.scans),
  };
  // 最大τまで、Double測定の繰り返し間隔を含めてライブラリで事前検証します。
  delays.forEach((tau) => t1Parameters(conditions, tau));
  const parameters = t1Parameters(conditions, startMs);
  const analysis = {
    startMs: Number(fields.fftStartMs),
    endMs: Number(fields.fftEndMs),
    tailPoints: 100,
    window: fields.window,
    minHz: Number(fields.minKHz) * 1000,
    maxHz: Number(fields.maxKHz) * 1000,
  };
  evaluateT1(
    {
      parameters,
      sampleIntervalMs: 0.02,
      raw: Array.from({ length: 2048 }, () => [0, 0]),
    },
    analysis,
  );
  return { startMs, endMs, stepMs, delays, parameters, analysis };
}
export function prepareT1FitRange(fields) {
  const fromMs = Number(fields.fromMs),
    toMs = Number(fields.toMs);
  if (
    Object.values(fields).some((value) => String(value).trim() === "") ||
    ![fromMs, toMs].every(Number.isFinite) ||
    fromMs < 1 ||
    fromMs >= toMs
  ) {
    const error = new RangeError(
      "Use a positive fit start smaller than the fit end.",
    );
    error.code = "UI_T1_FIT_RANGE";
    throw error;
  }
  return { fromMs, toMs };
}
export function t1Seconds(settings) {
  return Math.ceil(
    settings.delays.reduce(
      (sum, pulseIntervalMs) =>
        sum +
        measurementDurationMs(
          { ...settings.parameters, pulseIntervalMs },
          { mode: "double" },
        ),
      0,
    ) / 1000,
  );
}
export function t1PointSeconds(settings) {
  const values = settings.delays.map((pulseIntervalMs) =>
    measurementDurationMs(
      { ...settings.parameters, pulseIntervalMs },
      { mode: "double" },
    ),
  );
  return {
    min: Math.ceil(Math.min(...values) / 1000),
    max: Math.ceil(Math.max(...values) / 1000),
  };
}
export function bestT1(points) {
  return points.reduce(
    (best, point) => (!best || point.amplitude > best.amplitude ? point : best),
    null,
  );
}
export function fieldsFromT1(settings) {
  return Object.fromEntries(
    Object.entries({
      startMs: settings.startMs,
      endMs: settings.endMs,
      stepMs: settings.stepMs,
      frequencyHz: settings.parameters.frequencyHz,
      p90Cycles: settings.parameters.pulse2Cycles,
      p180Cycles: settings.parameters.pulse1Cycles,
      measurementIntervalMs: settings.parameters.measurementIntervalMs,
      scans: settings.parameters.scans,
      fftStartMs: settings.analysis.startMs,
      fftEndMs: settings.analysis.endMs,
      window: settings.analysis.window,
      minKHz: settings.analysis.minHz / 1000,
      maxKHz: settings.analysis.maxHz / 1000,
    }).map(([key, value]) => [key, String(value)]),
  );
}
export function reanalyzeT1(
  result,
  referenceIndex = result.referenceIndex,
  phaseDegrees = result.phaseDegrees,
  range = { fromMs: result.fromMs, toMs: result.toMs },
) {
  try {
    const recovery = analyzeT1(
      result.points.map((point) => point.record),
      {
        analysis: result.settings.analysis,
        referenceIndex,
        phaseDegrees,
        ...range,
      },
    );
    return {
      ...result,
      recovery,
      analysisError: null,
      referenceIndex,
      phaseDegrees,
      ...range,
    };
  } catch (error) {
    // 点数不足やゼロ信号でも、取得済みの原記録を表示・保存できます。
    return {
      ...result,
      recovery: null,
      analysisError: error,
      referenceIndex,
      phaseDegrees,
      ...range,
    };
  }
}
// T1=20 msの人工的な回復信号。実機の物理モデルや校正値ではありません。
export function t1DemoDevice(delayMs = 150) {
  return {
    async measure(parameters) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      const amplitude =
        1200 * (1 - 2 * Math.exp(-parameters.pulseIntervalMs / 20));
      return {
        source: "demo",
        acquiredAt: new Date().toISOString(),
        mode: "double",
        parameters: { ...parameters },
        points: 2048,
        sampleIntervalMs: 0.02,
        raw: Array.from({ length: 2048 }, (_, index) => {
          const t = index * 0.00002,
            envelope = amplitude * Math.exp(-t / 0.003),
            angle = 2 * Math.PI * 1200 * t;
          return [
            Math.round(70 + envelope * Math.cos(angle)),
            Math.round(-20 + envelope * Math.sin(angle)),
          ];
        }),
      };
    },
  };
}
export function t1Archive(value) {
  const result = value.recovery;
  return JSON.stringify(
    {
      kind: "t1-measurement",
      source: value.source,
      acquiredAt: value.acquiredAt,
      settings: value.settings,
      points: value.points,
      result: result && {
        reference: result.reference,
        fit: result.fit,
        warnings: result.warnings,
        fromMs: result.fromMs,
        toMs: result.toMs,
      },
    },
    null,
    2,
  );
}
export function t1Csv(result) {
  const ref = result.recovery?.reference;
  return (
    "source,tau_ms,signal,magnitude,quadrature,reference_hz,phase_rad\n" +
    result.points
      .map((point, index) => {
        const value = result.recovery?.points[index];
        return [
          result.source,
          point.tau,
          value?.signal ?? "",
          value?.magnitude ?? "",
          value?.quadrature ?? "",
          ref?.hz ?? "",
          ref?.phaseRad ?? "",
        ].join(",");
      })
      .join("\n") +
    "\n"
  );
}
export function t1Filename(result, extension) {
  return `nmrlink-${result.source}-t1-${formatFileTimestamp(result.acquiredAt)}.${extension}`;
}
