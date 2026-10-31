import {
  t2Delays,
  t2Parameters,
  evaluateT2,
  t2Window,
  analyzeT2,
  analyzeMeasurement,
  measurementDurationMs,
} from "../../../packages/nmrlink/src/index.js";
import { formatFileTimestamp } from "../../../packages/nmrlink/src/browser.js";

export const initialT2Fields = {
  startMs: "5",
  endMs: "35",
  stepMs: "2",
  frequencyHz: "402000",
  p90Cycles: "21",
  p180Cycles: "42",
  measurementIntervalMs: "200",
  scans: "64",
  fftStartMs: "-4",
  fftEndMs: "4",
  window: "hann",
  minKHz: "-3",
  maxKHz: "3",
};
export const initialT2Fit = { fromMs: "10", toMs: "70" };
export const emptyT2Result = {
  settings: null,
  points: [],
  source: null,
  acquiredAt: null,
  fromFile: false,
  decay: null,
  analysisError: null,
  referenceIndex: null,
  fromMs: 10,
  toMs: 70,
};

export function prepareT2(fields) {
  if (Object.values(fields).some((value) => String(value).trim() === ""))
    throw new RangeError("Fill in every scan field.");
  const startMs = Number(fields.startMs),
    endMs = Number(fields.endMs),
    stepMs = Number(fields.stepMs);
  const delays = t2Delays(startMs, endMs, stepMs);
  const conditions = {
    frequencyHz: Number(fields.frequencyHz),
    p90Cycles: Number(fields.p90Cycles),
    p180Cycles: Number(fields.p180Cycles),
    measurementIntervalMs: Number(fields.measurementIntervalMs),
    scans: Number(fields.scans),
  };
  // 最大τまで、Double測定の繰り返し間隔を含めてライブラリで事前検証します。
  delays.forEach((tau) => t2Parameters(conditions, tau));
  const parameters = t2Parameters(conditions, startMs);
  const analysis = {
    startMs: Number(fields.fftStartMs),
    endMs: Number(fields.fftEndMs),
    tailPoints: 100,
    window: fields.window,
    minHz: Number(fields.minKHz) * 1000,
    maxHz: Number(fields.maxKHz) * 1000,
  };
  // 移動する全てのエコー窓を、装置に命令を送る前に検証します。
  const raw = Array.from({ length: 2048 }, () => [0, 0]);
  for (const tau of delays)
    evaluateT2(
      {
        parameters: { ...parameters, pulseIntervalMs: tau },
        sampleIntervalMs: 0.02,
        raw,
      },
      analysis,
    );
  return { startMs, endMs, stepMs, delays, parameters, analysis };
}
export function prepareT2FitRange(fields) {
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
    error.code = "UI_T2_FIT_RANGE";
    throw error;
  }
  return { fromMs, toMs };
}
export function t2Seconds(settings) {
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
export function t2PointSeconds(settings) {
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
export function bestT2(points) {
  return points.reduce(
    (best, point) => (!best || point.amplitude > best.amplitude ? point : best),
    null,
  );
}
export function fieldsFromT2(settings) {
  return Object.fromEntries(
    Object.entries({
      startMs: settings.startMs,
      endMs: settings.endMs,
      stepMs: settings.stepMs,
      frequencyHz: settings.parameters.frequencyHz,
      p90Cycles: settings.parameters.pulse1Cycles,
      p180Cycles: settings.parameters.pulse2Cycles,
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
export function reanalyzeT2(
  result,
  referenceIndex = result.referenceIndex,
  range = { fromMs: result.fromMs, toMs: result.toMs },
) {
  try {
    const decay = analyzeT2(
      result.points.map((point) => point.record),
      {
        analysis: result.settings.analysis,
        referenceIndex,
        ...range,
      },
    );
    return {
      ...result,
      decay,
      analysisError: null,
      referenceIndex,
      ...range,
    };
  } catch (error) {
    // 点数不足やゼロ信号でも、取得済みの原記録を表示・保存できます。
    return {
      ...result,
      decay: null,
      analysisError: error,
      referenceIndex,
      ...range,
    };
  }
}
// T2=22 msの人工エコー。実機の物理モデルや校正値ではありません。
export function t2DemoDevice(delayMs = 150) {
  return {
    async measure(parameters) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      const amplitude = 1200 * Math.exp((-2 * parameters.pulseIntervalMs) / 22);
      return {
        source: "demo",
        acquiredAt: new Date().toISOString(),
        mode: "double",
        parameters: { ...parameters },
        points: 2048,
        sampleIntervalMs: 0.02,
        raw: Array.from({ length: 2048 }, (_, index) => {
          const t = index * 0.00002,
            envelope =
              amplitude *
              Math.exp(-(((t * 1000 - parameters.pulseIntervalMs) / 2) ** 2)),
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
export function t2Archive(value) {
  const result = value.decay;
  return JSON.stringify(
    {
      kind: "t2-measurement",
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
export function t2Csv(result) {
  const ref = result.decay?.reference;
  return (
    "source,tau_ms,two_tau_ms,echo_amplitude,reference_hz,window_start_ms,window_end_ms\n" +
    result.points
      .map((point, index) => {
        const value = result.decay?.points[index];
        return [
          result.source,
          point.tau,
          2 * point.tau,
          value?.signal ?? "",
          ref?.hz ?? "",
          value?.window.startMs ?? "",
          value?.window.endMs ?? "",
        ].join(",");
      })
      .join("\n") +
    "\n"
  );
}
// FFTは各測定のエコー中心に追従します。FIDは取得した全時間を表示します。
export function prepareT2Point(point, settings) {
  return {
    record: point.record,
    analysis: analyzeMeasurement(
      point.record,
      t2Window(point.tau, settings.analysis),
    ),
    displayEndMs: 40.96,
    frequencyLimitHz: 10000,
  };
}
export function t2Filename(result, extension) {
  return `nmrlink-${result.source}-t2-${formatFileTimestamp(result.acquiredAt)}.${extension}`;
}
