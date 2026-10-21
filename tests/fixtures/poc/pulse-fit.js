export function pulseLengths(start,end,step){
 if(![start,end,step].every(Number.isInteger)||start<1||end>32767||end<start||step<1)throw new Error('パルス長は1〜32767の整数、開始 ≤ 終了、刻みは1以上です。');
 const n=Math.floor((end-start)/step)+1;if(n>201)throw new Error('走査は201点以内にしてください。');return Array.from({length:n},(_,i)=>start+i*step);
}
export function pulseCandidates(points){
 const p=[...points].sort((a,b)=>a.length-b.length);
 if(p.length<5||new Set(p.map(q=>q.length)).size!==p.length||!p.every(q=>Number.isFinite(q.length)&&Number.isFinite(q.amplitude)&&q.length>0&&q.amplitude>=0))throw new Error('校正には異なるパルス長の有効な5点以上が必要です。');
 const lo=Math.min(...p.map(q=>q.amplitude)),hi=Math.max(...p.map(q=>q.amplitude)),range=hi-lo;if(range<=Math.max(hi*1e-6,1e-12))throw new Error('信号が平坦です。');
 const peak=p.findIndex((q,i)=>i>0&&i<p.length-1&&q.amplitude>=p[i-1].amplitude&&q.amplitude>p[i+1].amplitude&&q.amplitude>lo+.5*range);
 if(peak<0)throw new Error('最初の山が見つかりません。走査範囲を広げてください。');
 const valley=p.findIndex((q,i)=>i>peak&&i<p.length-1&&q.amplitude<=p[i-1].amplitude&&q.amplitude<p[i+1].amplitude&&q.amplitude<lo+.4*range);
 if(valley<0)throw new Error('最初の山の後の谷が見つかりません。180°の先まで測定してください。');
 // Seeing a peak and valley is insufficient if the first lobe was skipped.
 if(p[0].length>=p[peak].length*.65)throw new Error('短いパルスの測定点が不足しています。開始長を下げてください。');
 return {p90:p[peak].length,p180:p[valley].length,peakIndex:peak,valleyIndex:valley,points:p};
}
export function rabiFit(points){
 const measured=pulseCandidates(points),p=measured.points,k=measured.peakIndex;
 const lower=p[k-1].length,upper=p[k+1].length;if(lower<=0||upper<=lower)throw new Error('近似範囲が不正です。');
 function evaluate(p90){const g=p.map(q=>Math.abs(Math.sin(Math.PI*q.length/(2*p90)))),n=p.length,sg=g.reduce((a,b)=>a+b,0),sg2=g.reduce((a,b)=>a+b*b,0),sy=p.reduce((a,b)=>a+b.amplitude,0),sgy=p.reduce((a,q,i)=>a+g[i]*q.amplitude,0),den=n*sg2-sg*sg;if(den<1e-12)return {sse:Infinity};let A=(n*sgy-sg*sy)/den,B=(sy-A*sg)/n;if(B<0){B=0;A=sgy/sg2;}if(A<=0)return {sse:Infinity};return {p90,A,B,sse:p.reduce((s,q,i)=>s+(q.amplitude-(A*g[i]+B))**2,0)};}
 let best={sse:Infinity},index=0;const steps=800;for(let i=0;i<=steps;i++){const f=evaluate(lower+(upper-lower)*i/steps);if(f.sse<best.sse){best=f;index=i;}}
 if(index===0||index===steps)throw new Error('近似の最適点が探索範囲の端です。刻みを細かくして確認してください。');
 let l=lower+(upper-lower)*(index-1)/steps,h=lower+(upper-lower)*(index+1)/steps;
 for(let i=0;i<45;i++){const a=l+(h-l)/3,b=h-(h-l)/3;if(evaluate(a).sse<evaluate(b).sse)h=b;else l=a;}best=evaluate((l+h)/2);
 const mean=p.reduce((s,q)=>s+q.amplitude,0)/p.length,sst=p.reduce((s,q)=>s+(q.amplitude-mean)**2,0),r2=1-best.sse/sst;
 const p180=2*best.p90;
 if(!Number.isFinite(r2)||r2<.85)throw new Error('モデルとの一致が不十分です（R² < 0.85）。推定値は採用できません。');
 if(p180<p[0].length||p180>p.at(-1).length)throw new Error('推定180°が測定範囲外です。');
 const valley=measured.valleyIndex;if(p180<p[valley-1].length||p180>p[valley+1].length)throw new Error('推定180°と実測の谷が一致しません。');
 return {p90:best.p90,p180,A:best.A,B:best.B,r2,rmse:Math.sqrt(best.sse/p.length),from:p[0].length,to:p.at(-1).length,n:p.length,measured:{p90:measured.p90,p180:measured.p180},model:'A*abs(sin(pi*length/(2*p90)))+B'};
}

export function signedCandidates(points){
 const p=[...points].sort((a,b)=>a.length-b.length);if(p.length<5||new Set(p.map(q=>q.length)).size!==p.length||!p.every(q=>Number.isFinite(q.amplitude)&&Number.isFinite(q.length)&&q.length>0))throw new Error('符号付きの有効な5点以上が必要です。');
 const scale=Math.max(...p.map(q=>Math.abs(q.amplitude)));if(scale<1e-9)throw new Error('信号がゼロです。');
 const peak=p.findIndex((q,i)=>i>0&&i<p.length-1&&q.amplitude>=p[i-1].amplitude&&q.amplitude>p[i+1].amplitude&&q.amplitude>.35*scale);
 if(peak<0)throw new Error('最初の正の山が見つかりません。基準位相・走査範囲を確認してください。');
 if(p[0].length>=p[peak].length*.65)throw new Error('短いパルスの点が不足しています。');
 let crossing=-1;for(let i=peak;i<p.length-1;i++)if(p[i].amplitude>=0&&p[i+1].amplitude<0){crossing=i;break;}
 if(crossing<0)throw new Error('正から負へのゼロ交差が未測定です。180°の先まで測定してください。');
 const a=p[crossing],b=p[crossing+1],p180=a.length+(b.length-a.length)*a.amplitude/(a.amplitude-b.amplitude);
 return {p90:p[peak].length,p180,peakIndex:peak,crossingIndex:crossing,points:p,zeroBracket:[a.length,b.length]};
}
export function signedRabiFit(points){
 const measured=signedCandidates(points),p=measured.points,k=measured.peakIndex,lower=p[k-1].length,upper=p[k+1].length;
 function evaluate(p90){const g=p.map(q=>Math.sin(Math.PI*q.length/(2*p90))),n=p.length,sg=g.reduce((a,b)=>a+b,0),sg2=g.reduce((a,b)=>a+b*b,0),sy=p.reduce((a,b)=>a+b.amplitude,0),sgy=p.reduce((a,q,i)=>a+g[i]*q.amplitude,0),den=n*sg2-sg*sg;if(den<1e-12)return {sse:Infinity};const A=(n*sgy-sg*sy)/den,B=(sy-A*sg)/n;if(A<=0)return {sse:Infinity};return {p90,A,B,sse:p.reduce((s,q,i)=>s+(q.amplitude-A*g[i]-B)**2,0)};}
 let best={sse:Infinity},index=0;const steps=800;for(let i=0;i<=steps;i++){const f=evaluate(lower+(upper-lower)*i/steps);if(f.sse<best.sse){best=f;index=i;}}
 if(index===0||index===steps)throw new Error('近似の最適点が探索範囲の端です。');
 let l=lower+(upper-lower)*(index-1)/steps,h=lower+(upper-lower)*(index+1)/steps;for(let i=0;i<45;i++){const a=l+(h-l)/3,b=h-(h-l)/3;if(evaluate(a).sse<evaluate(b).sse)h=b;else l=a;}best=evaluate((l+h)/2);
 const mean=p.reduce((s,q)=>s+q.amplitude,0)/p.length,sst=p.reduce((s,q)=>s+(q.amplitude-mean)**2,0),r2=1-best.sse/sst,p180=2*best.p90;
 if(!Number.isFinite(r2)||r2<.85)throw new Error('符号付きモデルとの一致が不十分です（R² < 0.85）。');
 if(Math.abs(best.B)>.2*best.A)throw new Error('背景成分が大きすぎます。基準位相や解析範囲を確認してください。');
 const [a,b]=measured.zeroBracket,margin=Math.max(b-a,1);if(p180<p[0].length||p180>p.at(-1).length||p180<a-margin||p180>b+margin)throw new Error('推定180°が範囲外またはゼロ交差と不一致です。');
 return {p90:best.p90,p180,A:best.A,B:best.B,r2,rmse:Math.sqrt(best.sse/p.length),from:p[0].length,to:p.at(-1).length,n:p.length,measured:{p90:measured.p90,p180:measured.p180},model:'A*sin(pi*length/(2*p90))+B'};
}

// Equal weighting by pulse length; individual acquisitions remain in the UI/export.
export function meanPulsePoints(points){
 const groups=new Map();for(const p of points){let g=groups.get(p.length);if(!g){g={length:p.length,amplitude:0,magnitude:0,count:0};groups.set(p.length,g);}g.amplitude+=p.amplitude;g.magnitude+=p.peakMagnitude??p.magnitude;g.count++;}
 return [...groups.values()].map(g=>({...g,amplitude:g.amplitude/g.count,magnitude:g.magnitude/g.count})).sort((a,b)=>a.length-b.length);
}
export function automaticReferencePoint(points){
 const p=meanPulsePoints(points),scale=Math.max(...p.map(q=>q.magnitude));
 const k=p.findIndex((q,i)=>i>0&&i<p.length-1&&q.magnitude>=p[i-1].magnitude&&q.magnitude>p[i+1].magnitude&&q.magnitude>.35*scale);
 if(k<0||p[0].length>=p[k].length*.65)throw new Error('自動位相基準を選べません。短いパルスから最初の山の先まで走査してください。');
 // Select the acquisition nearest the typical strength, avoiding a noisy outlier.
 return points.filter(q=>q.length===p[k].length).reduce((best,q)=>Math.abs((q.peakMagnitude??q.magnitude)-p[k].magnitude)<Math.abs((best.peakMagnitude??best.magnitude)-p[k].magnitude)?q:best);
}

// Broad sine fit for the pulse page. Measurement geometry is a warning, not a gate.
export function previewSineFit(points){
 const p=[...points].sort((a,b)=>a.length-b.length);
 if(p.length<4||!p.every(q=>Number.isFinite(q.length)&&Number.isFinite(q.amplitude))||new Set(p.map(q=>q.length)).size!==p.length)throw new Error('サイン近似には異なるパルス長の4点以上が必要です。');
 const scale=Math.max(...p.map(q=>Math.abs(q.amplitude)));
 const mean=p.reduce((s,q)=>s+q.amplitude,0)/p.length;
 const sst=p.reduce((s,q)=>s+((q.amplitude-mean)/Math.max(scale,1e-30))**2,0);
 if(scale<1e-9||sst<1e-12)throw new Error('信号がゼロまたは平坦です。測定点はそのまま表示します。');
 const step=Math.min(...p.slice(1).map((q,i)=>q.length-p[i].length));
 const low=Math.PI/(8*Math.max(p.at(-1).length,step)),high=Math.PI/step;
 function solve(k){const g=p.map(q=>Math.sin(k*q.length)),n=p.length,sg=g.reduce((s,v)=>s+v,0),sgg=g.reduce((s,v)=>s+v*v,0),sy=p.reduce((s,q)=>s+q.amplitude/scale,0),sgy=g.reduce((s,v,i)=>s+v*p[i].amplitude/scale,0),den=n*sgg-sg*sg;
  if(den<1e-12)return {sse:Infinity};const A=(n*sgy-sg*sy)/den,B=(sy-A*sg)/n;
  if(A<=0)return {sse:Infinity};return {k,A:A*scale,B:B*scale,sse:p.reduce((s,q,i)=>s+(q.amplitude/scale-A*g[i]-B)**2,0)};
 }
 const steps=2400;let best={sse:Infinity},index=-1;
 for(let i=0;i<=steps;i++){const f=solve(low+(high-low)*i/steps);if(f.sse<best.sse){best=f;index=i;}}
 if(index<0)throw new Error('有効なサイン近似を求められません。位相基準を確認してください。');
 let l=low+(high-low)*Math.max(0,index-1)/steps,h=low+(high-low)*Math.min(steps,index+1)/steps;
 for(let i=0;i<40;i++){const a=l+(h-l)/3,b=h-(h-l)/3;if(solve(a).sse<solve(b).sse)h=b;else l=a;}
 const refined=solve((l+h)/2);if(refined.sse<best.sse)best=refined;
 const p90=Math.PI/(2*best.k),p180=2*p90,r2=1-best.sse/sst,warnings=[];
 if(index===0||index===steps)warnings.push('探索範囲の端');
 if(r2<.85)warnings.push('一致度が低い');
 if(Math.abs(best.B)>.2*best.A)warnings.push('背景成分が大きい');
 if(p90<p[0].length||p180>p.at(-1).length)warnings.push('校正値が測定範囲外');
 if(!p.some(q=>q.amplitude<0)||!p.some(q=>q.amplitude>0))warnings.push('符号反転が未観測');
 return {p90,p180,A:best.A,B:best.B,r2,rmse:Math.sqrt(best.sse/p.length)*scale,from:p[0].length,to:p.at(-1).length,n:p.length,warnings,model:'A*sin(pi*length/(2*p90))+B'};
}
