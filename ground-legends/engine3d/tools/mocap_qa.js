// Motion-capture takes checked on the engine's model: each BVH in a folder is retargeted onto models/mh_player.glb with
// the prototype's code (lab.js makeClip, retarget.js; the same path bake_mm.js and bake_clips.js take) and measured at
// 60 a second: the root's speed (mean, 90th percentile, top), how fast the travel turns (deg/s, 90th percentile and
// top), the most the travel turns within 1 s while moving over 1 m/s (deg), the feet on the ground (the lower foot
// within 3 cm of its lowest: its sliding speed, mean and 90th percentile) and through it (the lowest the soles go, m:
// below 0 is into the ground). Development tool.
//   node ground-legends/engine3d/tools/mocap_qa.js <folder of .bvh> <out.json>
const path=require('path'),fs=require('fs');
const GL=path.join(__dirname,'..','..'),PA=path.join(GL,'prototypes','glb-viewer');
const P=require(path.join(GL,'tests','legacy','paths.js'));const {chromium}=require(P.PLAYWRIGHT);
const three=fs.readFileSync(P.THREE_JS,'utf8'),model=fs.readFileSync(path.join(GL,'engine3d','models','mh_player.glb'));
const DIR=path.resolve(process.argv[2]),OUT=process.argv[3]||'mocap_qa.json';
const takes=fs.readdirSync(DIR).filter(f=>f.endsWith('.bvh')).sort();
(async()=>{
  const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>{const u=r.request().url();
    if(u.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'});
    if(u==='http://viewer.local/engine_model.glb')return r.fulfill({body:model,contentType:'model/gltf-binary'});
    if(u.startsWith('http://viewer.local/take/')){const f=path.join(DIR,path.basename(decodeURIComponent(u.split('?')[0])));return fs.existsSync(f)?r.fulfill({body:fs.readFileSync(f),contentType:'text/plain'}):r.fulfill({status:404});}
    if(u.startsWith('http://viewer.local/')){const f=path.join(PA,decodeURIComponent(u.slice(20).split('?')[0]));
      if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.html')?'text/html':'text/plain'});
      return r.fulfill({status:404,body:'not found'});}
    return r.abort();});
  await page.goto('http://viewer.local/player-animation/index.html?autoload=0');
  await page.waitForFunction(()=>window.PALab&&window.GLRetarget);
  await page.evaluate(async()=>{window.__M=await PALab.loadModel('http://viewer.local/engine_model.glb');});
  const out=[];
  for(const take of takes){
    const r=await page.evaluate(async take=>{try{
      const L=PALab,M=window.__M,bv=await L.loadTake('http://viewer.local/take/'+take),dur=bv.clip.duration;
      const c=L.makeClip(M,bv,{name:take,from:0.02,to:dur-0.02,pad:0}),hz=60,T=[];for(let t=0;t<=c.duration;t+=1/hz)T.push(t);
      const toes=['LeftToeBase','RightToeBase'].map(n=>M.by[n]),heels=['LeftFoot','RightFoot'].map(n=>M.by[n]),hips=M.by.Hips,V=()=>new THREE.Vector3();
      const fr=L.sampleClip(M,c,T,t=>{const pa=L.pathAt(c,t),a=V(),b=V(),h=V();toes[0].getWorldPosition(a);toes[1].getWorldPosition(b);hips.getWorldPosition(h);
        const fa=V(),fb=V();heels[0].getWorldPosition(fa);heels[1].getWorldPosition(fb);
        return {r:[pa[0],pa[1]],h:[h.x+pa[0],h.z+pa[1]],t:[[a.x+pa[0],a.y,a.z+pa[1]],[b.x+pa[0],b.y,b.z+pa[1]]],f:[fa.y,fb.y]};});
      const n=fr.length,dt=1/hz,sp=[],tr=[];
      for(let i=2;i<n-2;i++){const a=fr[i-2].r,b=fr[i+2].r,vx=(b[0]-a[0])/(4*dt),vz=(b[1]-a[1])/(4*dt);sp.push(Math.hypot(vx,vz));}
      for(let i=6;i<n-6;i++){const a=fr[i-6].r,b=fr[i].r,c2=fr[i+6].r,h1=Math.atan2(b[0]-a[0],b[1]-a[1]),h2=Math.atan2(c2[0]-b[0],c2[1]-b[1]),s=Math.hypot(c2[0]-b[0],c2[1]-b[1])/(6*dt);
        if(s>0.8){let d=h2-h1;d=Math.atan2(Math.sin(d),Math.cos(d));tr.push(Math.abs(d)/(6*dt)*180/Math.PI);}}
      const hd=[];for(let i=6;i<n-6;i++){const a=fr[i-6].r,b=fr[i+6].r,s=Math.hypot(b[0]-a[0],b[1]-a[1])/(12*dt);hd.push(s>1.0?Math.atan2(b[0]-a[0],b[1]-a[1]):null);}
      let turn1s=0;for(let i=0;i<hd.length;i++){if(hd[i]===null)continue;let acc=0,prev=hd[i];
        for(let j=i+1;j<Math.min(hd.length,i+hz+1);j++){if(hd[j]===null)break;let d=hd[j]-prev;d=Math.atan2(Math.sin(d),Math.cos(d));acc+=d;prev=hd[j];turn1s=Math.max(turn1s,Math.abs(acc));}}
      const lo=[0,1].map(k=>Math.min(...fr.map(f=>f.t[k][1]))),slide=[];
      for(let i=1;i<n;i++)for(const k of [0,1]){const o=1-k;if(fr[i].t[k][1]<=fr[i].t[o][1]&&fr[i].t[k][1]<lo[k]+0.03&&fr[i-1].t[k][1]<lo[k]+0.03)slide.push(Math.hypot(fr[i].t[k][0]-fr[i-1].t[k][0],fr[i].t[k][2]-fr[i-1].t[k][2])/dt);}
      const q=(a,p)=>{if(!a.length)return 0;const s=a.slice().sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.floor(s.length*p))];},mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
      const sole=Math.min(...fr.map(f=>Math.min(f.t[0][1],f.t[1][1])));
      return {take,dur:+c.duration.toFixed(2),speedMean:+mean(sp).toFixed(2),speedP90:+q(sp,0.9).toFixed(2),speedMax:+Math.max(0,...sp).toFixed(2),
        turnP90:Math.round(q(tr,0.9)),turn1s:Math.round(turn1s*180/Math.PI),turnMax:Math.round(Math.max(0,...tr)),slideMean:+mean(slide).toFixed(3),slideP90:+q(slide,0.9).toFixed(3),toeLow:+sole.toFixed(3),
        toeHighOfLowest:+Math.max(...lo).toFixed(3)};}catch(e){return {take,error:String(e&&e.message||e)};}},take);
    out.push(r);console.log(JSON.stringify(r));}
  await browser.close();if(errors.length)console.log('page errors',errors.slice(0,3));
  fs.writeFileSync(OUT,JSON.stringify(out,null,1));
})().catch(e=>{console.error(e);process.exit(1);});
