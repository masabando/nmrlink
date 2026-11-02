import { useEffect, useRef } from 'react';
import { createRecordPlots, createFrequencyPlot, createPulsePlot, createT1Plot, createT2Plot } from '../../packages/nmrlink/src/graphs.js';
import { fitPulseCalibration, fitT1, fitT2 } from '../../packages/nmrlink/src/index.js';
import { createAnalysisDemoMeasurements } from '../lib/analysis-demo.js';

// Storybook専用の表示アダプター。グラフ自体は公開APIで描画します。
export function GraphPreview({ kind = 'record', scenario = 'normal', locale = 'ja', width = 720, data1 = '#176caa', data2 = '#b34e25', fft = '#176caa' }) {
  const container = useRef(null);
  const status = useRef(null);
  useEffect(() => {
    const element = container.current;
    const draw = () => {
      status.current.textContent = '';
      const fitOrNull = calculate => {
        try { return calculate(); }
        catch (error) {
          status.current.textContent = locale === 'ja'
            ? `近似条件を満たさないため、測定点だけを表示します（${error.code}）。`
            : `Fit unavailable; showing measured points only (${error.code}).`;
          return null;
        }
      };
      if (scenario === 'zero' && kind !== 'record' && kind !== 'frequency') {
        status.current.textContent = locale === 'ja' ? 'ゼロ信号：近似線は表示しません。' : 'Zero signal: no fitted curve.';
      }
      const plotWidth = Math.max(160, Math.floor(element.clientWidth));
      if (kind === 'record') {
        const records = createAnalysisDemoMeasurements();
        const record = scenario === 'noisy' ? records.noisy : records.ideal;
        if (scenario === 'zero') record.raw = record.raw.map(() => [0, 0]);
        const plots = createRecordPlots(record, { width: plotWidth, locale, colors: { data1, data2, fft } });
        element.innerHTML = plots.fid + plots.fft;
        return;
      }
      const perturb = i => scenario === 'noisy' ? 220 * Math.sin(i * 7.31) : 0;
      const signal = (value, i) => scenario === 'zero' ? 0 : value + perturb(i);
      let points, fit = null, plot;
      if (kind === 'frequency') {
        points = Array.from({ length: 9 }, (_, i) => ({ frequencyHz: 398000 + i * 1000, amplitude: Math.max(0, signal(1000 * Math.exp(-(((i - 4) / 1.8) ** 2)), i)) }));
        plot = createFrequencyPlot;
      } else if (kind === 'pulse') {
        points = Array.from({ length: 16 }, (_, i) => ({ length: 5 + i * 5, amplitude: signal(1000 * Math.sin(Math.PI * (5 + i * 5) / 42), i) }));
        if (scenario !== 'zero') fit = fitOrNull(() => fitPulseCalibration(points));
        plot = createPulsePlot;
      } else if (kind === 't1') {
        points = Array.from({ length: 20 }, (_, i) => ({ tau: 5 + i * 5, signal: signal(1000 * (1 - 2 * Math.exp(-(5 + i * 5) / 20)), i) }));
        if (scenario !== 'zero') fit = fitOrNull(() => fitT1(points, { fromMs: 5, toMs: 100 }));
        plot = createT1Plot;
      } else {
        points = Array.from({ length: 16 }, (_, i) => ({ tau: 5 + i * 2, signal: Math.max(0, signal(1000 * Math.exp(-2 * (5 + i * 2) / 22), i)) }));
        if (scenario !== 'zero') fit = fitOrNull(() => fitT2(points, { fromMs: 10, toMs: 70 }));
        plot = createT2Plot;
      }
      element.innerHTML = plot(points, { width: plotWidth, locale, fit });
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(element);
    return () => { observer.disconnect(); element.replaceChildren(); };
  }, [kind, scenario, locale, width, data1, data2, fft]);
  return <section className="card card-border bg-base-100" style={{ maxWidth: width }}>
    <div className="card-body p-3"><div ref={container} /><p ref={status} role="status" className="text-sm text-base-content/70" /></div>
  </section>;
}
