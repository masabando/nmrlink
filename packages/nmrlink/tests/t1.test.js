import test from "node:test";
import assert from "node:assert/strict";
import { t1Delays, t1Parameters, runT1Sweep, analyzeT1, fitT1, parseT1Measurement, NMRController } from "../src/index.js";
import { createT1Plot } from "../src/graphs.js";
import { fitRelaxation } from "../../../tests/fixtures/poc/relaxation-fit.js";

const conditions = {frequencyHz:402000, p90Cycles:21, p180Cycles:42, measurementIntervalMs:1000, scans:16};
const analysis = {startMs:1, endMs:5, tailPoints:100, window:"hann", minHz:-3000, maxHz:3000};
function record(tau, phase = 0) {
  const amplitude = 1200 * (1 - 2 * Math.exp(-tau / 20));
  return { source:"demo", acquiredAt:"2026-10-21T08:00:00.000Z", mode:"double", parameters:t1Parameters(conditions,tau), sampleIntervalMs:.02, points:2048,
    raw:Array.from({length:2048},(_,i)=>{const t=i*.00002, a=2*Math.PI*1200*t+phase, v=amplitude*Math.exp(-t/.003);return [Math.round(70+v*Math.cos(a)),Math.round(-20+v*Math.sin(a))];}) };
}
const records = () => t1Delays(5,100,5).map(tau=>record(tau));
test("T1 reproduces the PoC fit and preserves raw signs and units", () => {
  const raw=records(), before=JSON.stringify(raw), result=analyzeT1(raw,{analysis,fromMs:5,toMs:100});
  assert.equal(JSON.stringify(raw),before);
  assert(result.points[0].signal<0); assert(result.points.at(-1).signal>0);
  assert(Math.abs(result.fit.T-20)<.1); assert(result.reference.coherence>.99);
  assert.deepEqual(fitT1(result.points,{fromMs:5,toMs:100}),fitRelaxation("t1",result.points,5,100));
  for(const mode of ["signed","magnitude","quadrature"]) assert(createT1Plot(result.points,{fit:result.fit,mode}).includes("τ [ms]"));
  const flipped=analyzeT1(raw,{analysis,phaseDegrees:180,fromMs:5,toMs:100});
  assert.equal(flipped.fit,null); assert(Math.abs(flipped.points[0].signal+result.points[0].signal)<1e-8);
});
test("T1 estimates incomplete recovery with a warning; rejects wrong conditions and incoherent fits", () => {
  const short = analyzeT1(records().slice(0,7),{analysis,fromMs:5,toMs:35});
  assert(Math.abs(short.fit.T - 20) < .1);
  assert(short.warnings.some(warning => warning.includes("3倍未満")));
  const mixed=records();mixed[1].parameters.scans++;assert.throws(()=>analyzeT1(mixed,{analysis}));
  const incoherent=records().map((r,i)=>record(r.parameters.pulseIntervalMs,i*Math.PI/4));
  const result=analyzeT1(incoherent,{analysis});assert.equal(result.fit,null);assert(result.reference.coherence<.85);
  assert.throws(()=>analyzeT1([]));
  assert.throws(()=>analyzeT1(records(),{analysis,referenceIndex:99}));
});
test("T1 validates all delays before I/O and stops after the current Double measurement", async () => {
  assert.deepEqual(t1Delays(5,17,5),[5,10,15]);assert.throws(()=>t1Delays(1,32767,1));
  assert.throws(()=>t1Parameters({...conditions,p180Cycles:20},5));
  const calls=[];const abort=new AbortController();
  const device={state:"connected",async measure(p,o){calls.push({p,o});return record(p.pulseIntervalMs);}};
  const controller=new NMRController({device});
  let conflict;
  const result=await controller.t1Sweep(t1Parameters(conditions,5),{startMs:5,endMs:100,stepMs:5,analysis,signal:abort.signal,onPoint:async(_,n)=>{
    if(n===1) conflict=await controller.measure(t1Parameters(conditions,5),{mode:"double"});
    if(n===2) abort.abort();
  }});
  assert.equal(result.ok,true);assert.equal(conflict.ok,false);assert(result.value.stopped);assert.equal(calls.length,2);
  assert(calls.every(c=>c.o.mode==="double"&&c.p.pulse1Cycles===42&&c.p.pulse2Cycles===21&&c.p.phase2Degrees===0));
  assert.equal(controller.result.parameters.pulseIntervalMs,10);controller.dispose();
  await assert.rejects(runT1Sweep(device,{...t1Parameters(conditions,5),measurementIntervalMs:100},{startMs:5,endMs:100,stepMs:5,analysis}));
  await assert.rejects(runT1Sweep(device,t1Parameters(conditions,5),{startMs:5,endMs:100,stepMs:5,analysis:{...analysis,endMs:50}}));
  assert.equal(calls.length,2);
});
test("T1 archives restore raw records, manual phase and fit range; reject corruption", () => {
  const input=records(), result=analyzeT1(input,{analysis,referenceIndex:19,phaseDegrees:5,fromMs:5,toMs:100});
  const saved={kind:"t1-measurement",source:"demo",acquiredAt:input[0].acquiredAt,settings:{startMs:5,endMs:100,stepMs:5,parameters:input[0].parameters,analysis},points:input.map(r=>({tau:r.parameters.pulseIntervalMs,record:r})),result};
  const restored=parseT1Measurement(JSON.stringify(saved));
  assert.equal(restored.referenceIndex,19);assert.equal(restored.phaseDegrees,5);assert.equal(restored.fromMs,5);
  assert.deepEqual(restored.points[0].record.raw,JSON.parse(JSON.stringify(input[0].raw)));assert.deepEqual(restored.result.fit,result.fit);
  saved.points=saved.points.slice(0,2);saved.result=null;assert.equal(parseT1Measurement(JSON.stringify(saved)).points.length,2);
  saved.points[0].record.raw[0][0]="0";assert.throws(()=>parseT1Measurement(JSON.stringify(saved)));
  assert.throws(()=>parseT1Measurement('{"kind":"frequency-sweep"}'));
});
