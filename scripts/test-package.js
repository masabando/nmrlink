import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "outputs/npm-package");
const consumer = await mkdtemp(path.join(tmpdir(), "nmrlink-consumer-"));
const cache = path.join(consumer, ".npm-cache");
await mkdir(output, { recursive: true });
function npm(args, cwd = root) {
  return execFileSync("npm", [...args, "--cache", cache], { cwd, encoding: "utf8", maxBuffer: 2 * 1024 * 1024 });
}

// Pack and install actual bytes, never a workspace symlink or a registry package.
const [packed] = JSON.parse(npm(["pack", "--workspace", "nmrlink", "--ignore-scripts", "--json", "--pack-destination", output]));
const files = packed.files.map(file => file.path);
assert(files.includes("LICENSE"));
assert(files.includes("README.md"));
assert(files.includes("package.json"));
assert(files.every(file => file.startsWith("src/") || ["LICENSE", "README.md", "package.json"].includes(file)));
const archive = path.join(output, packed.filename);
await writeFile(path.join(consumer, "package.json"), JSON.stringify({ name: "nmrlink-consumer-check", private: true, type: "module" }, null, 2) + "\n");
npm(["install", "--offline", "--ignore-scripts", "--no-audit", "--no-fund", archive], consumer);
const installed = await realpath(path.join(consumer, "node_modules/nmrlink"));
assert(installed.startsWith(await realpath(consumer) + path.sep));
const manifest = JSON.parse(await readFile(path.join(installed, "package.json"), "utf8"));
assert.equal(manifest.version, packed.version);
assert.equal(await readFile(path.join(installed, "LICENSE"), "utf8"), await readFile(path.join(root, "LICENSE"), "utf8"));

const tests = `import test from "node:test";
import assert from "node:assert/strict";
import { NMRController, analyzeMeasurement, encodeParameters, parseMeasurement, fitPulseCalibration, fitT1, fitT2 } from "nmrlink";
import { createRecordPlots, createFrequencyPlot, createPulsePlot, createT1Plot, createT2Plot } from "nmrlink/graphs";
import { formatFileTimestamp, saveMeasurement, saveGraphPng, readMeasurement } from "nmrlink/browser";
const parameters = { frequencyHz:402000,pulse1Cycles:21,pulse2Cycles:42,phase1Degrees:0,phase2Degrees:90,pulseIntervalMs:5,measurementIntervalMs:200,scans:64 };
const record = { source:"demo",acquiredAt:"2026-10-21T09:00:00.000Z",mode:"single",parameters,points:2048,sampleIntervalMs:.02,
  raw:Array.from({length:2048},(_,i)=>{const t=i*.00002,a=1000*Math.exp(-t/.003);return [Math.round(a*Math.cos(2*Math.PI*1200*t)),Math.round(a*Math.sin(2*Math.PI*1200*t))];}) };
test("installed package parses, analyzes and plots without a DOM",()=>{
  assert.equal(typeof document,"undefined"); assert.equal(encodeParameters(parameters).byteLength,18);
  const copy=JSON.stringify(record),analysis=analyzeMeasurement(record);
  assert(Math.abs(analysis.peak.hz-1200)<200);assert.equal(JSON.stringify(record),copy);
  assert.deepEqual(parseMeasurement(copy),JSON.parse(copy));assert(createRecordPlots(record).fid.startsWith("<svg"));
  assert(createFrequencyPlot([{frequencyHz:402000,amplitude:10}]).includes("<svg"));
});
test("installed optional entry points and curve fits resolve",()=>{
  for(const fn of [saveMeasurement,saveGraphPng,readMeasurement])assert.equal(typeof fn,"function");
  assert.equal(formatFileTimestamp(record.acquiredAt),"2026-10-21_18-00-00-000_JST");
  const pulse=Array.from({length:16},(_,i)=>({length:(i+1)*5,amplitude:1000*Math.sin(Math.PI*(i+1)*5/42)}));
  const pfit=fitPulseCalibration(pulse);assert(Math.abs(pfit.p90-21)<.1);assert(createPulsePlot(pulse,{fit:pfit}).includes("<svg"));
  const recovery=Array.from({length:20},(_,i)=>({tau:(i+1)*5,signal:1000*(1-2*Math.exp(-(i+1)*5/20))}));
  const t1=fitT1(recovery,{fromMs:5,toMs:100});assert(Math.abs(t1.T-20)<.01);assert(createT1Plot(recovery,{fit:t1}).includes("<svg"));
  const decay=Array.from({length:16},(_,i)=>({tau:5+i*2,signal:1000*Math.exp(-2*(5+i*2)/22)}));
  const t2=fitT2(decay,{fromMs:10,toMs:70});assert(Math.abs(t2.T-22)<.01);assert(createT2Plot(decay,{fit:t2}).includes("<svg"));
});
test("installed controller delivers a simulated record without a serial device",async()=>{
  const device={state:"disconnected",async connect(){this.state="connected";},async disconnect(){this.state="disconnected";},async measure(){return record;}};
  const controller=new NMRController({device});let result;
  controller.onResult(value=>{result=value;});
  try{assert((await controller.connect()).ok);assert((await controller.measure(parameters)).ok);assert.equal(result,record);assert((await controller.disconnect()).ok);}finally{controller.dispose();}
});
`;
await writeFile(path.join(consumer, "consumer.test.mjs"), tests);
execFileSync(process.execPath, ["--test", "consumer.test.mjs"], { cwd: consumer, stdio: "inherit" });

const readme = await readFile(path.join(installed, "README.md"), "utf8");
const snippets = [...readme.matchAll(/```js\n([\s\S]*?)\n```/g)].map(match => match[1]);
const analysisExample = snippets.find(code => code.includes("const record =") && code.includes("createRecordPlots"));
assert(analysisExample, "README analysis example is missing.");
await writeFile(path.join(consumer, "readme-analysis.mjs"), analysisExample);
execFileSync(process.execPath, ["readme-analysis.mjs"], { cwd: consumer, stdio: "pipe" });

// This page imports only the installed archive, using native browser import maps.
const html = `<!doctype html>
<html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>npm配布物の独立プロジェクト検証</title>
<style>body{font:16px/1.6 system-ui;margin:24px;max-width:900px}button{padding:8px 16px}#fid,#fft{min-width:0}svg{max-width:100%}</style>
<h1>npm配布物の独立プロジェクト検証</h1><p>インストールしたnmrlinkを使用。実機への接続は行いません。</p>
<button id="demo">模擬FIDを表示</button><button id="save" disabled>JSONを保存</button><p id="status" role="status">未表示</p><div id="fid"></div><div id="fft"></div>
<script type="importmap">{"imports":{"nmrlink":"./node_modules/nmrlink/src/index.js","nmrlink/graphs":"./node_modules/nmrlink/src/graphs.js","nmrlink/browser":"./node_modules/nmrlink/src/browser.js"}}</script>
<script type="module">
import {analyzeMeasurement} from "nmrlink";
import {NMRGraphs} from "nmrlink/graphs";
import {saveMeasurement} from "nmrlink/browser";
const graphs=new NMRGraphs({fid:document.querySelector("#fid"),fft:document.querySelector("#fft")});
let record;
document.querySelector("#demo").onclick=()=>{
 record={source:"demo",acquiredAt:new Date().toISOString(),mode:"single",parameters:null,points:2048,sampleIntervalMs:.02,
 raw:Array.from({length:2048},(_,i)=>{const t=i*.00002,a=1000*Math.exp(-t/.003);return [a*Math.cos(2*Math.PI*1200*t),a*Math.sin(2*Math.PI*1200*t)];})};
 const analysis=analyzeMeasurement(record);graphs.show(record,analysis);
 document.querySelector("#status").textContent="配布物で2048点のFID・FFTを表示しました。ピーク："+analysis.peak.hz.toFixed(1)+" Hz";
 document.querySelector("#save").disabled=false;
};
document.querySelector("#save").onclick=()=>{if(record)saveMeasurement(record);};
</script></html>`;
await writeFile(path.join(consumer, "index.html"), html);
const readmeHtml = readme.match(/```html\n([\s\S]*?)\n```/)[1];
const browserExample = snippets.find(code => code.includes("const controller = new NMRController()"));
assert(browserExample, "README controller example is missing.");
const mockDevice = `const device = {
  state:"disconnected",
  async connect(){this.state="connected";},
  async disconnect(){this.state="disconnected";},
  async measure(parameters,{mode}){
    return {source:"demo",acquiredAt:new Date().toISOString(),mode,parameters,points:2048,sampleIntervalMs:.02,
      raw:Array.from({length:2048},(_,i)=>{const t=i*.00002,a=1000*Math.exp(-t/.003);return [a*Math.cos(2*Math.PI*1200*t),a*Math.sin(2*Math.PI*1200*t)];})};
  }
};`;
const readmePage = `<!doctype html><html lang="ja"><meta charset="utf-8"><title>READMEの動作確認</title>
<h1>READMEの動作確認</h1><p>READMEのコードを使用。接続先だけを模擬装置へ置き換えています。</p>
${readmeHtml}
<script type="importmap">{"imports":{"nmrlink":"./node_modules/nmrlink/src/index.js","nmrlink/graphs":"./node_modules/nmrlink/src/graphs.js","nmrlink/browser":"./node_modules/nmrlink/src/browser.js"}}</script>
<script type="module">${mockDevice}\n${browserExample.replace("new NMRController()", "new NMRController({ device })")}</script></html>`;
await writeFile(path.join(consumer, "readme.html"), readmePage);
const report = { version: packed.version, private: manifest.private === true, archive, consumer, installed, files, compressedBytes: packed.size, unpackedBytes: packed.unpackedSize, checks: ["isolated tarball installation", "package entry points", "controller", "FFT and SVG", "pulse/T1/T2 fits", "README Node example", "license"], published: false };
await writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
