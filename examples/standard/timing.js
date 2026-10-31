import { measurementDurationMs } from "./vendor/nmrlink-0.1.4/src/index.js";

function duration(milliseconds) {
  const seconds = Math.ceil(milliseconds / 1000);
  const hours = Math.floor(seconds / 3600), minutes = Math.floor(seconds % 3600 / 60);
  return `${hours ? `${hours}時間` : ""}${minutes ? `${minutes}分` : ""}${seconds % 60 || (!hours && !minutes) ? `${seconds % 60}秒` : ""}`;
}

/** Show the runtime of the current hardware settings, including every scan point. */
export function timeSummary(parameters, mode = "single") {
  const times = parameters.map(p => measurementDurationMs(p, { mode }));
  const total = times.reduce((sum, time) => sum + time, 0);
  const perPoint = times.length > 1 ? `（1点 ${duration(Math.min(...times))}${Math.max(...times) !== Math.min(...times) ? `〜${duration(Math.max(...times))}` : ""}）` : "";
  return `測定の見込み：約${duration(total)}${perPoint} ＋ 通信時間`;
}
