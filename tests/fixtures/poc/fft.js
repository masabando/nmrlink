// Complex forward FFT, zero padded to a power of two. Frequency is relative to the receiver reference.
export function spectrum(data, dtMs, startMs, endMs, window='hann') {
  if(![dtMs,startMs,endMs].every(Number.isFinite)||dtMs<=0||startMs<0||startMs>=endMs||endMs>data.length*dtMs+1e-9) throw new Error('FFT範囲は 0 ≤ 開始 < 終了 ≤ 取得時間にしてください。');
  if(!['hann','rect'].includes(window))throw new Error('窓関数が不正です。');
  const first=Math.ceil(startMs/dtMs-1e-9),last=Math.min(data.length,Math.ceil(endMs/dtMs-1e-9)),count=last-first;
  if(count<4)throw new Error('FFTには4点以上の範囲を指定してください。');
  const size=2**Math.ceil(Math.log2(count)),re=new Float64Array(size),im=new Float64Array(size);let weight=0;
  for(let i=0;i<count;i++){const w=window==='hann'?.5*(1-Math.cos(2*Math.PI*i/(count-1))):1;re[i]=data[first+i][0]*w;im[i]=data[first+i][1]*w;weight+=w;}
  for(let i=1,j=0;i<size;i++){let bit=size>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}
  for(let len=2;len<=size;len*=2){const a=-2*Math.PI/len;for(let offset=0;offset<size;offset+=len){for(let j=0;j<len/2;j++){const c=Math.cos(a*j),s=Math.sin(a*j),u=offset+j,v=u+len/2,tr=re[v]*c-im[v]*s,ti=re[v]*s+im[v]*c;re[v]=re[u]-tr;im[v]=im[u]-ti;re[u]+=tr;im[u]+=ti;}}}
  const bins=Array.from({length:size},(_,i)=>{const k=(i+size/2)%size;return {hz:(i-size/2)*1000/(size*dtMs),amplitude:Math.hypot(re[k],im[k])/weight};});
  return {startMs,endMs,first,last,count,size,window,actualStartMs:first*dtMs,actualEndExclusiveMs:last*dtMs,durationMs:count*dtMs,spacingHz:1000/(size*dtMs),resolutionHz:1000/(count*dtMs),convention:'Data 1 + i Data 2',bins};
}
