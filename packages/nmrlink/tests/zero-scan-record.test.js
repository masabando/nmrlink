import test from "node:test";
import assert from "node:assert/strict";
import {parsePulseCalibration,parseT1Measurement,parseT2Measurement,t1Parameters,t2Parameters,analyzeMeasurement} from "../src/index.js";

const conditions={frequencyHz:402000,p90Cycles:21,p180Cycles:42,measurementIntervalMs:200,scans:64};
for(const kind of ["pulse","t1","t2"]){
  test(`${kind}: a saved zero-signal scan opens for waveform inspection`,()=>{
    const parameters=kind==="t2"?t2Parameters(conditions,5):t1Parameters(conditions,5);
    if(kind==="pulse"){parameters.pulse1Cycles=5;parameters.phase2Degrees=90;}
    const record={source:"instrument",acquiredAt:"2026-10-21T09:00:00.000Z",mode:kind==="pulse"?"single":"double",parameters,sampleIntervalMs:.02,points:2048,raw:Array.from({length:2048},()=>[123456,123456])};
    const analysis={startMs:kind==="t2"?-4:1,endMs:kind==="t2"?4:5,tailPoints:100,window:"hann",minHz:-3000,maxHz:3000};
    const settings=kind==="pulse"?{startCycles:5,endCycles:80,stepCycles:5,parameters,analysis}:{startMs:5,endMs:kind==="t2"?35:100,stepMs:5,parameters,analysis};
    const saved={kind:kind==="pulse"?"pulse-calibration":`${kind}-measurement`,source:record.source,acquiredAt:record.acquiredAt,settings,points:[{...(kind==="pulse"?{length:5}:{tau:5}),record}]};
    const parse=kind==="pulse"?parsePulseCalibration:kind==="t1"?parseT1Measurement:parseT2Measurement;
    const restored=parse(JSON.stringify(saved));
    assert.equal(restored.points.length,1);assert.equal(restored[kind==="pulse"?"calibration":"result"],null);
    assert.deepEqual(restored.points[0].record.raw,record.raw);
    assert.equal(analyzeMeasurement(restored.points[0].record).peak.amplitude,0);
    saved[kind==="pulse"?"calibration":"result"]={reference:{referenceIndex:99}};
    assert.throws(()=>parse(JSON.stringify(saved)));
  });
}
