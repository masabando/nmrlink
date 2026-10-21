export const POINTS = 2048;
export const SAMPLE_MS = 0.02;
export function validateParams(p) {
  const bounds = {frequency:[1,2147483647],width1:[0,32767],width2:[0,32767],pulseInterval:[0,32767],measureInterval:[1,32767],count:[1,32767]};
  for (const [key,[min,max]] of Object.entries(bounds)) {
    if (!Number.isInteger(p[key]) || p[key]<min || p[key]>max) throw new Error(`${key}: ${min}〜${max} の整数を入力してください。`);
  }
  for (const key of ['phase1','phase2']) if (![0,90,180,270].includes(p[key])) throw new Error('位相は 0 / 90 / 180 / 270° です。');
  return {...p};
}
// Estimate device runtime; the configured interval is an additional wait.
// Double adds the inter-pulse delay on every acquisition, not just once.
export function measurementDurationMs(params,mode='s') {
  const p=validateParams(params);
  if(!['s','d'].includes(mode))throw new Error('測定モードが不正です。');
  return Math.ceil(p.count*(p.measureInterval+POINTS*SAMPLE_MS+(mode==='d'?p.pulseInterval:0)));
}
export function packParams(params) {
  const p=validateParams(params), bytes=new Uint8Array(18), view=new DataView(bytes.buffer);
  view.setInt32(0,p.frequency,true);
  [p.width1,p.phase1/45,p.width2,p.phase2/45,p.pulseInterval,p.measureInterval,p.count].forEach((v,i)=>view.setInt16(4+i*2,v,true));
  return bytes;
}
export function parsePair(line) {
  if (!/^-?\d+,-?\d+$/.test(line.trim())) throw new Error(`受信データの形式が不正です: ${line.slice(0,80)}`);
  const pair=line.trim().split(',').map(Number);
  if (!pair.every(Number.isSafeInteger)) throw new Error('受信値が範囲外です。');
  return pair;
}
export function correctBaseline(raw) {
  if (raw.length!==POINTS) throw new Error(`データが不完全です (${raw.length}/${POINTS})。`);
  const base=[0,1].map(ch=>raw.slice(-100).reduce((s,row)=>s+row[ch],0)/100);
  return {base, data:raw.map(row=>row.map((v,ch)=>Math.trunc(v-base[ch])))};
}
export class LineQueue {
  constructor(){this.lines=[];this.partial='';this.waiter=null;this.error=null;}
  feed(text){
    if (this.error) return;
    this.partial+=text;
    const parts=this.partial.split('\n');this.partial=parts.pop();
    if(this.partial.length>65536) {this.fail(new Error('受信行が長すぎます。'));return;}
    for(const line of parts){
      const clean=line.replace(/\r$/,'');
      if(this.waiter){const w=this.waiter;this.waiter=null;clearTimeout(w.timer);w.resolve(clean);}
      else this.lines.push(clean);
    }
    if(this.lines.length>10000)this.fail(new Error('受信バッファが溢れました。'));
  }
  clear(){this.lines=[];this.partial='';}
  fail(error){this.error=error;if(this.waiter){clearTimeout(this.waiter.timer);this.waiter.reject(error);this.waiter=null;}}
  next(timeout=5000){
    if(this.error)return Promise.reject(this.error);
    if(this.lines.length)return Promise.resolve(this.lines.shift());
    if(this.waiter)return Promise.reject(new Error('受信処理が重複しています。'));
    return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.waiter=null;reject(new Error('装置からの応答がタイムアウトしました。再接続してください。'));},timeout);this.waiter={resolve,reject,timer};});
  }
}

// pySerial's default control-line states. Do not toggle/reset the device.
export async function prepareSerialPort(port, wait = ms => new Promise(resolve => setTimeout(resolve, ms))) {
  await port.setSignals({dataTerminalReady:true, requestToSend:true});
  await wait(1000);
}
