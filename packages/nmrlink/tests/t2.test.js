import test from "node:test";
import assert from "node:assert/strict";
import { t2Delays, t2Parameters, t2Window, evaluateT2, runT2Sweep, analyzeT2, fitT2, parseT2Measurement, NMRController } from "../src/index.js";
import { createT2Plot } from "../src/graphs.js";
import { fitRelaxation as pocFit } from "../../../tests/fixtures/poc/relaxation-fit.js";

const conditions={frequencyHz:402000,p90Cycles:21,p180Cycles:42,measurementIntervalMs:1000,scans:16};
const analysis={startMs:-4,endMs:4,tailPoints:100,window:"hann",minHz:-3000,maxHz:3000};
function record(tau,phase=0){
  const amplitude=1200*Math.exp(-2*tau/22);
  return {source:"demo",acquiredAt:"2026-10-21T09:00:00.000Z",mode:"double",parameters:t2Parameters(conditions,tau),sampleIntervalMs:.02,points:2048,
    raw:Array.from({length:2048},(_,i)=>{const ms=i*.02,v=amplitude*Math.exp(-(((ms-tau)/2)**2)),a=2*Math.PI*1200*ms/1000+phase;return [Math.round(70+v*Math.cos(a)),Math.round(-20+v*Math.sin(a))];})};
}
const records=()=>t2Delays(5,35,2).map(tau=>record(tau));
test("T2 tracks the echo window and fits 2*tau in ms with the PoC model",()=>{
  const raw=records(),before=JSON.stringify(raw),result=analyzeT2(raw,{analysis,fromMs:10,toMs:70});
  assert.equal(JSON.stringify(raw),before);assert(Math.abs(result.fit.T-22)<.1);assert.equal(result.fit.C,0);
  assert.deepEqual(result.fit,pocFit("t2",result.points,10,70));
  assert.equal(result.points[0].window.startMs,1);assert.equal(result.points.at(-1).window.endMs,39);
  assert.equal(result.points.at(-1).tau,35);assert(result.points.every(p=>p.signal>=0));
  const svg=createT2Plot(result.points,{fit:result.fit});assert(svg.includes("2τ [ms]"));assert(svg.includes("T2・エコー減衰曲線"));
  const phase=analyzeT2(raw.map(r=>record(r.parameters.pulseIntervalMs,1.3)),{analysis});assert(Math.abs(phase.fit.T-result.fit.T)<.1);
});
test("T2 validates all echo windows before I/O, locks the scan, and stops after current point",async()=>{
  const calls=[],stop=new AbortController();const device={state:"connected",async measure(p,o){calls.push({p,o});return record(p.pulseIntervalMs);}};
  const controller=new NMRController({device});let conflict;
  const result=await controller.t2Sweep(t2Parameters(conditions,5),{startMs:5,endMs:35,stepMs:2,analysis,signal:stop.signal,onPoint:async(_,n)=>{if(n===1)conflict=await controller.t1Sweep(t2Parameters(conditions,5),{});if(n===2)stop.abort();}});
  assert(result.ok);assert(result.value.stopped);assert.equal(calls.length,2);assert.equal(conflict.ok,false);
  assert(calls.every(c=>c.o.mode==="double"&&c.p.pulse1Cycles===21&&c.p.pulse2Cycles===42&&c.p.phase2Degrees===90));controller.dispose();
  await assert.rejects(runT2Sweep(device,t2Parameters(conditions,5),{startMs:5,endMs:39,stepMs:2,analysis}));assert.equal(calls.length,2);
  assert.throws(()=>t2Window(3,analysis));assert.throws(()=>t2Window(35,{...analysis,endMs:7}));assert.throws(()=>t2Parameters({...conditions,p180Cycles:21},5));
});
test("T2 restores saved scans and ignores stale derived values; rejects corrupt or wrong files",()=>{
  const raw=records(),result=analyzeT2(raw,{analysis,referenceIndex:2,fromMs:10,toMs:70});
  const saved={kind:"t2-measurement",source:"demo",acquiredAt:raw[0].acquiredAt,settings:{startMs:5,endMs:35,stepMs:2,parameters:raw[0].parameters,analysis},points:raw.map(record=>({tau:record.parameters.pulseIntervalMs,record})),result:{...result,fit:{T:999}}};
  const restored=parseT2Measurement(JSON.stringify(saved));assert.equal(restored.referenceIndex,2);assert.deepEqual(restored.result.fit,result.fit);assert.equal(restored.points.length,16);assert.equal(restored.toMs,70);
  assert.deepEqual(restored.points[0].record.raw,JSON.parse(JSON.stringify(raw[0].raw)));
  saved.points=saved.points.slice(0,2);saved.result=null;assert.equal(parseT2Measurement(JSON.stringify(saved)).points.length,2);
  saved.points[0].record.raw[0][0]="0";assert.throws(()=>parseT2Measurement(JSON.stringify(saved)));assert.throws(()=>parseT2Measurement('{"kind":"t1-measurement"}'));
});
test("T2 estimates short/noisy data with warnings rather than requiring a long decay",()=>{
  const points=[5,7,9,11,13].map((tau,i)=>({tau,signal:1000*Math.exp(-2*tau/200)*(1+(i%2?.02:-.02))}));
  const fit=fitT2(points,{fromMs:10,toMs:26});assert(Number.isFinite(fit.T));
  const shifted=records();shifted[1].parameters.scans++;assert.throws(()=>analyzeT2(shifted,{analysis}));
  assert.throws(()=>evaluateT2(record(5),{...analysis,startMs:1}));
});
