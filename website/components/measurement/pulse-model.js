import {
  pulseSteps,
  evaluatePulse,
  analyzePulseCalibration,
  validateParameters,
  measurementDurationMs,
} from "../../../packages/nmrlink/src/index.js";
import { formatFileTimestamp } from "../../../packages/nmrlink/src/browser.js";

export const initialPulseFields = {
  startCycles: "5",
  endCycles: "80",
  stepCycles: "5",
  frequencyHz: "402000",
  phase1Degrees: "0",
  measurementIntervalMs: "200",
  scans: "64",
  startMs: "1",
  endMs: "5",
  window: "hann",
  minKHz: "-3",
  maxKHz: "3",
};
export const emptyPulseResult = {
  settings: null,
  points: [],
  source: null,
  acquiredAt: null,
  fromFile: false,
  calibration: null,
  calibrationError: null,
  referenceIndex: null,
  phaseDegrees: 0,
};
export function preparePulse(fields) {
  if (Object.values(fields).some((value) => String(value).trim() === ""))
    throw new RangeError("Fill in every scan field.");
  const startCycles = Number(fields.startCycles),
    endCycles = Number(fields.endCycles),
    stepCycles = Number(fields.stepCycles);
  const lengths = pulseSteps(startCycles, endCycles, stepCycles);
  const parameters = validateParameters({
    frequencyHz: Number(fields.frequencyHz),
    pulse1Cycles: startCycles,
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
  evaluatePulse(
    {
      parameters,
      sampleIntervalMs: 0.02,
      raw: Array.from({ length: 2048 }, () => [0, 0]),
    },
    analysis,
  );
  return { startCycles, endCycles, stepCycles, lengths, parameters, analysis };
}
export function pulseSeconds(settings) {
  return Math.ceil(
    settings.lengths.reduce(
      (sum, pulse1Cycles) =>
        sum +
        measurementDurationMs(
          { ...settings.parameters, pulse1Cycles },
          { mode: "single" },
        ),
      0,
    ) / 1000,
  );
}
// Single測定は全点で同じ積算回数・繰り返し間隔を使います。
export function pulsePointSeconds(settings) {
  return Math.ceil(
    measurementDurationMs(settings.parameters, { mode: "single" }) / 1000,
  );
}
export function bestPulse(points) {
  return points.reduce(
    (best, point) => (!best || point.amplitude > best.amplitude ? point : best),
    null,
  );
}
export function fieldsFromPulse(settings) {
  return Object.fromEntries(
    Object.entries({
      startCycles: settings.startCycles,
      endCycles: settings.endCycles,
      stepCycles: settings.stepCycles,
      frequencyHz: settings.parameters.frequencyHz,
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
// ライブラリが全点を同じ位相基準で解析します。点ごとの符号合わせはしません。
export function recalibratePulse(
  result,
  referenceIndex = result.referenceIndex,
  phaseDegrees = result.phaseDegrees,
) {
  try {
    const calibration = analyzePulseCalibration(
      result.points.map((point) => point.record),
      { analysis: result.settings.analysis, referenceIndex, phaseDegrees },
    );
    return {
      ...result,
      calibration,
      calibrationError: null,
      referenceIndex,
      phaseDegrees,
    };
  } catch (error) {
    // 点数不足やゼロ信号でも取得済みの原記録は残します。
    return {
      ...result,
      calibration: null,
      calibrationError: error,
      referenceIndex,
      phaseDegrees,
    };
  }
}
// 90°=21周期の人工的な応答。装置の校正値や物理モデルではありません。
export function pulseDemoDevice(delayMs = 150) {
  return {
    async measure(parameters) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      const amplitude =
        1200 * Math.sin((Math.PI * parameters.pulse1Cycles) / 42);
      return {
        source: "demo",
        acquiredAt: new Date().toISOString(),
        mode: "single",
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
export function pulseArchive(result) {
  const calibration = result.calibration;
  return JSON.stringify(
    {
      kind: "pulse-calibration",
      source: result.source,
      acquiredAt: result.acquiredAt,
      settings: result.settings,
      points: result.points,
      calibration: calibration && {
        reference: calibration.reference,
        fit: calibration.fit,
        magnitudeFit: calibration.magnitudeFit,
        warnings: calibration.warnings,
        measured: calibration.measured && {
          p90: calibration.measured.p90,
          p180: calibration.measured.p180,
          zeroBracket: calibration.measured.zeroBracket,
        },
        signedPoints: calibration.points.map((point) => ({
          length: point.length,
          amplitude: point.amplitude,
          quadrature: point.quadrature,
          magnitude: point.magnitude,
        })),
      },
    },
    null,
    2,
  );
}
export function pulseCsv(result) {
  const ref = result.calibration?.reference;
  return (
    "source,pulse_cycles,signal,magnitude,quadrature,reference_hz,phase_rad\n" +
    result.points
      .map((point, index) => {
        const value = result.calibration?.points[index];
        return [
          result.source,
          point.length,
          value?.amplitude ?? "",
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
export function pulseFilename(result, extension) {
  return `nmrlink-${result.source}-pulse-${formatFileTimestamp(result.acquiredAt)}.${extension}`;
}
