import { analyzeMeasurement } from "./analysis.js";

/** Complex projection at one common frequency, with the selected window's time origin. */
export function complexAt(data, spectrum, intervalMs, hz) {
  let real = 0, imaginary = 0, weight = 0;
  for (let index = spectrum.first; index < spectrum.last; index++) {
    const j = index - spectrum.first;
    const w = spectrum.window === "hann" ? 0.5 * (1 - Math.cos(2 * Math.PI * j / (spectrum.count - 1))) : 1;
    const angle = -2 * Math.PI * hz * j * intervalMs / 1000;
    const c = Math.cos(angle), s = Math.sin(angle);
    real += w * (data[index][0] * c - data[index][1] * s);
    imaginary += w * (data[index][0] * s + data[index][1] * c);
    weight += w;
  }
  return { real: real / weight, imaginary: imaginary / weight };
}

/** One common frequency and phase; preserve sign reversals between records. */
export function analyzeSignedRecords(records, {
  analysis = {}, referenceIndex = null, phaseDegrees = 0, field = "pulse1Cycles", mode = "single",
} = {}) {
  if (!Array.isArray(records) || !records.length) throw new Error("先にパルス走査を行ってください。");
  if (!Number.isFinite(phaseDegrees)) throw new Error("位相補正は有限数値で指定してください。");
  const first = records[0];
  for (const record of records) {
    if (record.mode !== mode || record.source !== first.source || record.sampleIntervalMs !== first.sampleIntervalMs ||
      Object.keys(first.parameters).some(key => key !== field && record.parameters[key] !== first.parameters[key])) {
      throw new Error("周波数・位相・積算などの共通測定条件とデータ種別を揃えてください。");
    }
  }
  const minHz = analysis.minHz ?? -3000, maxHz = analysis.maxHz ?? 3000;
  if (![minHz, maxHz].every(Number.isFinite) || minHz >= maxHz) throw new Error("ピーク探索帯域が不正です。");
  const prepared = records.map(record => ({ record, ...analyzeMeasurement(record, analysis) }));
  const grid = prepared[0].spectrum.bins.filter(bin => bin.hz >= minHz && bin.hz <= maxHz).map(bin => bin.hz);
  if (!grid.length) throw new Error("探索帯域にFFTビンがありません。");
  const counts = new Map();
  for (const record of records) counts.set(record.parameters[field], (counts.get(record.parameters[field]) ?? 0) + 1);
  const power = new Float64Array(grid.length);
  for (const item of prepared) {
    const bins = item.spectrum.bins.filter(bin => bin.hz >= minHz && bin.hz <= maxHz);
    if (bins.length !== grid.length || bins.some((bin, index) => bin.hz !== grid[index])) throw new Error("FFTの周波数軸が一致しません。");
    bins.forEach((bin, index) => { power[index] += bin.amplitude ** 2 / counts.get(item.record.parameters[field]); });
  }
  const strongestBin = power.reduce((best, value, index) => value > power[best] ? index : best, 0);
  const hz = grid[strongestBin];
  const values = prepared.map(item => ({ ...complexAt(item.data, item.spectrum, item.record.sampleIntervalMs, hz), record: item.record }));
  const maximum = Math.max(...values.map(value => Math.hypot(value.real, value.imaginary)));
  if (maximum < 1e-9) throw Object.assign(new Error("共通位相基準に使える信号がありません。"), { code: "NO_REFERENCE_SIGNAL" });
  const strong = values.filter(value => Math.hypot(value.real, value.imaginary) >= maximum * 0.25);
  let c = 0, s = 0, total = 0;
  for (const value of strong) {
    const count = counts.get(value.record.parameters[field]);
    c += (value.real ** 2 - value.imaginary ** 2) / count;
    s += 2 * value.real * value.imaginary / count;
    total += (value.real ** 2 + value.imaginary ** 2) / count;
  }
  let phaseRad = 0.5 * Math.atan2(s, c);
  if (referenceIndex !== null) {
    if (!Number.isInteger(referenceIndex) || !values[referenceIndex]) throw new Error("位相基準の測定点が不正です。");
    const ref = values[referenceIndex];
    if (Math.hypot(ref.real, ref.imaginary) < 1e-9) throw new Error("選択点の信号がゼロです。");
    phaseRad = Math.atan2(ref.imaginary, ref.real);
  } else {
    const earliest = strong.reduce((best, value) => value.record.parameters[field] < best.record.parameters[field] ? value : best);
    let direction = earliest.real * Math.cos(phaseRad) + earliest.imaginary * Math.sin(phaseRad);
    if (field === "pulseIntervalMs") {
      const mean = strong.reduce((sum, value) => sum + value.record.parameters[field], 0) / strong.length;
      direction = strong.reduce((sum, value) => sum + (value.record.parameters[field] - mean) *
        (value.real * Math.cos(phaseRad) + value.imaginary * Math.sin(phaseRad)), 0);
    }
    if (direction < 0 || (field === "pulseIntervalMs" && Math.abs(direction) < 1e-9 &&
      (earliest.real * Math.cos(phaseRad) + earliest.imaginary * Math.sin(phaseRad)) < 0)) phaseRad += Math.PI;
  }
  phaseRad += phaseDegrees * Math.PI / 180;
  const points = values.map(value => ({
    length: value.record.parameters[field],
    amplitude: value.real * Math.cos(phaseRad) + value.imaginary * Math.sin(phaseRad),
    quadrature: -value.real * Math.sin(phaseRad) + value.imaginary * Math.cos(phaseRad),
    magnitude: Math.hypot(value.real, value.imaginary), record: value.record,
  }));
  const coherence = Math.hypot(c, s) / Math.max(total, 1e-30);
  return { points, reference: { hz, phaseRad, phaseDegrees, referenceIndex, coherence } };
}
