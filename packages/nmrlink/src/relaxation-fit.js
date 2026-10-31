import { createError } from "./errors.js";
function meanRelaxationPoints(points) {
  const groups = /* @__PURE__ */ new Map();
  for (const p of points) {
    if (!Number.isFinite(p.tau) || !Number.isFinite(p.signal)) throw createError(Error, "INVALID_RELAXATION_SIGNAL");
    const g = groups.get(p.tau) || { tau: p.tau, signal: 0, count: 0 };
    g.signal += p.signal;
    g.count++;
    groups.set(p.tau, g);
  }
  return [...groups.values()].map((p) => ({ ...p, signal: p.signal / p.count })).sort((a, b) => a.tau - b.tau);
}
function relaxationValue(kind, fit, x) {
  return kind === "t1" ? fit.A - fit.B * Math.exp(-x / fit.T) : fit.A * Math.exp(-x / fit.T);
}
function fitRelaxation(kind, points, from, to, { relaxed = false } = {}) {
  if (!["t1", "t2"].includes(kind) || ![from, to].every(Number.isFinite) || from >= to) throw createError(Error, "INVALID_FIT_RANGE");
  const p = meanRelaxationPoints(points).map((q) => ({ ...q, x: kind === "t1" ? q.tau : 2 * q.tau })).filter((q) => q.x >= from && q.x <= to);
  if (p.length < (relaxed ? 3 : 5)) throw createError(Error, "INSUFFICIENT_RELAXATION_POINTS");
  const scale = Math.max(...p.map((q) => Math.abs(q.signal))), low = Math.min(...p.map((q) => q.signal)), high = Math.max(...p.map((q) => q.signal));
  if (scale < 1e-9 || high - low < scale * 1e-4) throw createError(Error, "FLAT_RELAXATION_SIGNAL");
  if (kind === "t1" && !(low < 0 && high > 0)) throw createError(Error, "T1_SIGN_CHANGE_REQUIRED");
  if (kind === "t2" && low < 0) throw createError(Error, "NEGATIVE_ECHO_SIGNAL");
  const n = p.length, sy = p.reduce((s, q) => s + q.signal / scale, 0);
  function solve(logT) {
    const T = Math.exp(logT), g = p.map((q) => Math.exp(-q.x / T)), sg = g.reduce((s, q) => s + q, 0), sgg = g.reduce((s, q) => s + q * q, 0), sgy = g.reduce((s, q, i) => s + q * p[i].signal / scale, 0), den = n * sgg - sg * sg;
    if (kind === "t2") {
      if (sgg < 1e-30) return { sse: Infinity };
      const A = sgy / sgg;
      if (A <= 0) return { sse: Infinity };
      return { T, A: A * scale, B: null, C: 0, sse: p.reduce((s, q, i) => s + (q.signal / scale - A * g[i]) ** 2, 0) };
    }
    if (den < 1e-14) return { sse: Infinity };
    const slope = (n * sgy - sg * sy) / den, offset = (sy - slope * sg) / n;
    if (kind === "t1" ? offset <= 0 || slope >= 0 : slope <= 0) return { sse: Infinity };
    return { T, A: (kind === "t1" ? offset : slope) * scale, B: kind === "t1" ? -slope * scale : null, C: kind === "t2" ? offset * scale : null, sse: p.reduce((s, q, i) => s + (q.signal / scale - offset - slope * g[i]) ** 2, 0) };
  }
  const span = p.at(-1).x - p[0].x, minStep = Math.min(...p.slice(1).map((q, i) => q.x - p[i].x)), lo = Math.log(minStep * 0.02), hi = Math.log(Math.max(p.at(-1).x, span) * 100), steps = 700;
  let best = { sse: Infinity }, index = -1;
  for (let i = 0; i <= steps; i++) {
    const f = solve(lo + (hi - lo) * i / steps);
    if (f.sse < best.sse) {
      best = f;
      index = i;
    }
  }
  if (index <= 0 || index >= steps) throw createError(Error, "RELAXATION_FIT_BOUNDARY");
  let l = lo + (hi - lo) * (index - 1) / steps, h = lo + (hi - lo) * (index + 1) / steps;
  for (let i = 0; i < 40; i++) {
    const a = l + (h - l) / 3, b = h - (h - l) / 3;
    if (solve(a).sse < solve(b).sse) h = b;
    else l = a;
  }
  best = solve((l + h) / 2);
  const mean = sy / n, sst = p.reduce((s, q) => s + (q.signal / scale - mean) ** 2, 0), r2 = 1 - best.sse / sst;
  if (!Number.isFinite(r2) || (!relaxed && r2 < 0.95)) throw createError(Error, "RELAXATION_FIT_LOW_R2");
  if (!relaxed && span / best.T < 0.8) throw createError(Error, "RELAXATION_RANGE_TOO_SHORT");
  return { ...best, sse: best.sse * scale * scale, r2, rmse: Math.sqrt(best.sse / n) * scale, n, from: p[0].x, to: p.at(-1).x, model: kind === "t1" ? "A-B*exp(-tau/T1)" : "A*exp(-2*tau/T2)" };
}
function fitT1(points, { fromMs, toMs }) {
  return fitRelaxation("t1", points, fromMs, toMs);
}
export {
  fitRelaxation,
  fitT1,
  meanRelaxationPoints,
  relaxationValue
};

export function fitT2(points, {fromMs, toMs}) { return fitRelaxation("t2", points, fromMs, toMs, {relaxed:true}); }
