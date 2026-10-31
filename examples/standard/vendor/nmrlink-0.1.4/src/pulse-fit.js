// The original PoC fit is retained as the first choice for well-resolved signed data.
function signedPulseCandidates(points) {
  const p = [...points].sort((a2, b2) => a2.length - b2.length);
  if (p.length < 5 || new Set(p.map((q) => q.length)).size !== p.length || !p.every((q) => Number.isFinite(q.amplitude) && Number.isFinite(q.length) && q.length > 0)) throw new Error("符号付きの有効な5点以上が必要です。");
  const scale = Math.max(...p.map((q) => Math.abs(q.amplitude)));
  if (scale < 1e-9) throw new Error("信号がゼロです。");
  const peak = p.findIndex((q, i) => i > 0 && i < p.length - 1 && q.amplitude >= p[i - 1].amplitude && q.amplitude > p[i + 1].amplitude && q.amplitude > 0.35 * scale);
  if (peak < 0) throw new Error("最初の正の山が見つかりません。基準位相・走査範囲を確認してください。");
  if (p[0].length >= p[peak].length * 0.65) throw new Error("短いパルスの点が不足しています。");
  let crossing = -1;
  for (let i = peak; i < p.length - 1; i++) if (p[i].amplitude >= 0 && p[i + 1].amplitude < 0) {
    crossing = i;
    break;
  }
  if (crossing < 0) throw new Error("正から負へのゼロ交差が未測定です。180\xB0の先まで測定してください。");
  const a = p[crossing], b = p[crossing + 1], p180 = a.length + (b.length - a.length) * a.amplitude / (a.amplitude - b.amplitude);
  return { p90: p[peak].length, p180, peakIndex: peak, crossingIndex: crossing, points: p, zeroBracket: [a.length, b.length] };
}
function strictPulseFit(points) {
  const measured = signedPulseCandidates(points), p = measured.points, k = measured.peakIndex, lower = p[k - 1].length, upper = p[k + 1].length;
  function evaluate(p90) {
    const g = p.map((q) => Math.sin(Math.PI * q.length / (2 * p90))), n = p.length, sg = g.reduce((a2, b2) => a2 + b2, 0), sg2 = g.reduce((a2, b2) => a2 + b2 * b2, 0), sy = p.reduce((a2, b2) => a2 + b2.amplitude, 0), sgy = p.reduce((a2, q, i) => a2 + g[i] * q.amplitude, 0), den = n * sg2 - sg * sg;
    if (den < 1e-12) return { sse: Infinity };
    const A = (n * sgy - sg * sy) / den, B = (sy - A * sg) / n;
    if (A <= 0) return { sse: Infinity };
    return { p90, A, B, sse: p.reduce((s, q, i) => s + (q.amplitude - A * g[i] - B) ** 2, 0) };
  }
  let best = { sse: Infinity }, index = 0;
  const steps = 800;
  for (let i = 0; i <= steps; i++) {
    const f = evaluate(lower + (upper - lower) * i / steps);
    if (f.sse < best.sse) {
      best = f;
      index = i;
    }
  }
  if (index === 0 || index === steps) throw new Error("近似の最適点が探索範囲の端です。");
  let l = lower + (upper - lower) * (index - 1) / steps, h = lower + (upper - lower) * (index + 1) / steps;
  for (let i = 0; i < 45; i++) {
    const a2 = l + (h - l) / 3, b2 = h - (h - l) / 3;
    if (evaluate(a2).sse < evaluate(b2).sse) h = b2;
    else l = a2;
  }
  best = evaluate((l + h) / 2);
  const mean = p.reduce((s, q) => s + q.amplitude, 0) / p.length, sst = p.reduce((s, q) => s + (q.amplitude - mean) ** 2, 0), r2 = 1 - best.sse / sst, p180 = 2 * best.p90;
  if (!Number.isFinite(r2) || r2 < 0.85) throw new Error("符号付きモデルとの一致が不十分です（R\xB2 < 0.85）。");
  if (Math.abs(best.B) > 0.2 * best.A) throw new Error("背景成分が大きすぎます。基準位相や解析範囲を確認してください。");
  const [a, b] = measured.zeroBracket, margin = Math.max(b - a, 1);
  if (p180 < p[0].length || p180 > p.at(-1).length || p180 < a - margin || p180 > b + margin) throw new Error("推定180\xB0が範囲外またはゼロ交差と不一致です。");
  return { p90: best.p90, p180, A: best.A, B: best.B, r2, rmse: Math.sqrt(best.sse / p.length), from: p[0].length, to: p.at(-1).length, n: p.length, measured: { p90: measured.p90, p180: measured.p180 }, model: "A*sin(pi*length/(2*p90))+B" };
}
/** Least-squares sine estimate even when a peak or zero crossing was not measured. */
function fitPulseCalibration(points, { magnitude = false } = {}) {
  if (!magnitude) {
    try { return strictPulseFit(points); } catch { /* Continue with a wider search. */ }
  }
  const p = [...points].sort((a, b) => a.length - b.length);
  if (p.length < 3 || !p.every(q => Number.isFinite(q.length) && q.length > 0 && Number.isFinite(q.amplitude)) || new Set(p.map(q => q.length)).size !== p.length) {
    throw new Error("サイン近似には異なる周期数の有限な3点以上が必要です。");
  }
  const scale = Math.max(...p.map(q => Math.abs(q.amplitude)));
  if (scale < 1e-9) throw new Error("信号がゼロのためサイン近似を求められません。");
  const y = p.map(q => q.amplitude / scale), n = p.length, sy = y.reduce((s,v) => s+v,0);
  const mean = sy / n, sst = y.reduce((s,v) => s+(v-mean)**2,0);
  function solve(logLength) {
    const p90 = Math.exp(logLength);
    const g = p.map(q => { const v = Math.sin(Math.PI*q.length/(2*p90)); return magnitude ? Math.abs(v) : v; });
    const sg = g.reduce((s,v)=>s+v,0), sg2 = g.reduce((s,v)=>s+v*v,0), sgy = g.reduce((s,v,i)=>s+v*y[i],0);
    const den = n*sg2-sg*sg;
    if (den < 1e-12) return {sse:Infinity};
    const A = (n*sgy-sg*sy)/den, B = (sy-A*sg)/n;
    if (A <= 0) return {sse:Infinity};
    return {p90,A:A*scale,B:B*scale,sse:y.reduce((s,v,i)=>s+(v-A*g[i]-B)**2,0)};
  }
  const step = Math.min(...p.slice(1).map((q,i)=>q.length-p[i].length));
  const lo = Math.log(step/2), hi = Math.log(p.at(-1).length*10), steps = 4000;
  let best = {sse:Infinity}, index = 0;
  for (let i=0;i<=steps;i++) { const value=solve(lo+(hi-lo)*i/steps); if(value.sse<best.sse){best=value;index=i;} }
  if (!Number.isFinite(best.sse)) throw new Error("サイン近似を計算できませんでした。");
  let l=lo+(hi-lo)*Math.max(0,index-1)/steps, h=lo+(hi-lo)*Math.min(steps,index+1)/steps;
  for(let i=0;i<45;i++){const a=l+(h-l)/3,b=h-(h-l)/3;if(solve(a).sse<solve(b).sse)h=b;else l=a;}
  best=solve((l+h)/2);
  return {p90:best.p90,p180:2*best.p90,A:best.A,B:best.B,r2:sst>1e-20?1-best.sse/sst:0,rmse:Math.sqrt(best.sse/n)*scale,
    from:p[0].length,to:p.at(-1).length,n,magnitude,model:magnitude?"A*abs(sin(pi*length/(2*p90)))+B":"A*sin(pi*length/(2*p90))+B"};
}
export { fitPulseCalibration, signedPulseCandidates };
