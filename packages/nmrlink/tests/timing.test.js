import test from "node:test";
import assert from "node:assert/strict";
import { measurementDurationMs } from "../src/index.js";
import { measurementDurationMs as pocDuration } from "../../../tests/fixtures/poc/protocol.js";
import { timeSummary } from "../../../examples/standard/timing.js";
const p = {frequencyHz:402000,pulse1Cycles:21,pulse2Cycles:42,phase1Degrees:0,phase2Degrees:90,pulseIntervalMs:5,measurementIntervalMs:200,scans:128};
test("runtime estimate matches PoC and counts Double delay on every scan", () => {
  const old = {frequency:p.frequencyHz,width1:21,width2:42,phase1:0,phase2:90,pulseInterval:5,measureInterval:200,count:128};
  for(const [mode,code] of [["single","s"],["double","d"]]) assert.equal(measurementDurationMs(p,{mode}),pocDuration(old,code));
  assert.equal(measurementDurationMs(p),30843);
  assert.equal(measurementDurationMs(p,{mode:"double"}),31483);
  assert.throws(()=>measurementDurationMs({...p,scans:0}));
  assert.throws(()=>measurementDurationMs(p,{mode:"wrong"}));
});
test("time summary totals variable T1 delays and formats longer runs", () => {
  const list=[5,10,15].map(pulseIntervalMs=>({...p,pulseIntervalMs}));
  assert.match(timeSummary(list,"double"),/1分37秒/);
  assert.match(timeSummary(list,"double"),/1点 32秒〜33秒/);
  assert.match(timeSummary([{...p,scans:32767,measurementIntervalMs:32767}]),/時間/);
});
