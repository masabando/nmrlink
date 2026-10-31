// 表示例用の決定的な模擬FID。実機とは通信しません。
export function createDemoMeasurement(parameters = null, mode = "single") {
  return {
    source: "demo", acquiredAt: new Date().toISOString(), mode, parameters,
    points: 2048, sampleIntervalMs: 0.02,
    raw: Array.from({ length: 2048 }, (_, index) => {
      const time = index * 0.00002;
      const amplitude = 1000 * Math.exp(-time / 0.003);
      const phase = 2 * Math.PI * 2500 * time;
      return [Math.round(amplitude * Math.cos(phase)), Math.round(amplitude * Math.sin(phase))];
    }),
  };
}
