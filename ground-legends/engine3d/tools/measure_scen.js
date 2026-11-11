// Locomotion scenarios for comparing the gait clips with GL-Motion (motion matching), in the real game page, as
// measure_loco.js (frozen game, time stepped at 60 a second, one player moved along a path, posed with the game's own
// applyVisual and P3D.frame). Development tool.
//   [MM=0|1] [MMFULL=1|MMHYB=1] [MMDB=<mm.json>] [SCEN=sprint,...] [DUMP=<file prefix>] node ground-legends/engine3d/tools/measure_scen.js [out.json]
// Scenarios: straight sprint (0 to 8.5 m/s in 2 s, held), zigzag at 1.5 m/s and at 5 m/s, stop and restart (0 and
// 6 m/s), a full circle at 4 m/s (360 deg in 2.4 s), walking backwards and sideways at 1.4 m/s. Per scenario:
//   slide   the standing foot's speed over the ground (the lower toe within 3 cm of its 10th percentile height), mean
//           and 90th percentile;
//   sink    the lowest the toes go (m; below 0 is into the ground); float: share of frames with no toe within 5 cm of
//           the grass; stance: how many standing-foot samples the slide is over;
//   jerk    joint velocity breaks: each joint's acceleration against the hips (m/s2), 99th percentile and top;
//   lean    trunk lean forward (deg) against the game's acceleration (m/s2): the fitted slope and correlation;
//   switch  GL-Motion jumps to another frame or system changes, a second.
const fs=require('fs'),path=require('path');
const GL=path.join(__dirname,'..','..');
const P=require(path.join(GL,'tests','legacy','paths.js'));const {chromium}=require(P.PLAYWRIGHT);
const three=fs.readFileSync(P.THREE_JS,'utf8'),game=fs.readFileSync(path.join(GL,'index.html'),'utf8');
const k=game.indexOf('window.__game={');if(k<0)throw new Error('anchor');
const INJECT='window.__vis={applyVisual,strideAt,ballMesh,scene,get players(){return players;},get teams(){return teams;},setVisDt(v){visDt=v;}};\n';
const html='<!doctype html><html><head><meta charset="utf-8"></head><body>'+game.slice(0,k)+INJECT+game.slice(k)+'</body></html>';
const MMDB=process.env.MMDB?path.resolve(process.env.MMDB):null;
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const page=await b.newPage({viewport:{width:800,height:480}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(([mm,full,hyb])=>{try{localStorage.setItem('gl-tut-v1','1');if(mm)localStorage.setItem('gl-mm',mm);localStorage.setItem('gl-mm-full',full||'0');localStorage.setItem('gl-mm-hyb',hyb||'0');}catch(e){}},[process.env.MM||'',process.env.MMFULL||'',process.env.MMHYB||'']);
  await page.addInitScript(()=>{const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(t=>{if(window.__rafPause){window.requestAnimationFrame(cb);return;}cb(t);});});
  await page.route('**/*',r=>{const u=new URL(r.request().url());
    if(u.host==='game.local'&&u.pathname==='/')return r.fulfill({body:html,contentType:'text/html'});
    if(u.href.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'});
    if(MMDB&&u.pathname==='/engine3d/anim/mm.json')return r.fulfill({body:fs.readFileSync(MMDB),contentType:'application/json'});
    if(u.pathname.startsWith('/engine3d/')){const f=path.join(GL,u.pathname);if(fs.existsSync(f))return r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.json')?'application/json':'model/gltf-binary'});return r.fulfill({status:404,body:''});}
    return r.abort();});
  await page.goto('http://game.local/?p3d=one');await page.waitForFunction(()=>window.P3D&&P3D.status.ready,null,{timeout:60000});
  await page.evaluate(()=>{__game.startMatch({mode:'play',minutes:12,home:0,away:2,firstKick:0});});
  const ST=`(()=>{const T=__game.teams.find(t=>t.human)||__game.teams[0];return T.players.find(q=>q.label==='ST');})()`;
  await page.waitForFunction('!!P3D.measure('+ST+')',null,{timeout:30000});
  await page.evaluate('window.__freeze=true;window.__st='+ST);
  await page.evaluate(()=>{window.__rafPause=true;P3D.clock(1/60);__game.ball.owner=null;window.__mmLive=true;});
  const status=await page.evaluate(()=>P3D.mm());
  // kind: the path; each step sets the speed, the travel heading, the facing (relative to the travel) and where the
  // game is steering him (wantVel)
  const go=(kind,secs)=>page.evaluate(([kind,secs])=>{const V=window.__vis,p=window.__st,rows=[],dt=1/60;
    p.pos.set(0,0,-20);p.face=0;p.vel.set(0,0,0);V.setVisDt(dt);let spd=0,hd=0,off=0;
    for(let i=0;i*dt<secs;i++){const t=i*dt;let ws=0,wh=hd;
      if(kind==='sprint'){ws=8.5;spd=Math.min(8.5,spd+dt*8.5/2);}
      else if(kind==='zig15'||kind==='zig5'){ws=kind==='zig5'?5:1.5;spd=ws;const tg=(Math.floor(t/1.2)%2?1:-1)*(kind==='zig5'?0.6:Math.PI/4);hd+=(tg-hd)*Math.min(1,dt/0.3*3);wh=tg;}
      else if(kind==='stopgo'){const on=Math.floor(t/2)%2===0;ws=on?6:0;spd+=(ws-spd)*Math.min(1,dt*2.2);}
      else if(kind==='circle'){ws=4;spd=Math.min(4,spd+dt*4);if(t>1)hd+=dt*2*Math.PI/2.4;wh=hd+0.3;}
      else if(kind==='back'){ws=1.4;spd=1.4;off=Math.PI;}
      else if(kind==='side'){ws=1.4;spd=1.4;off=Math.PI/2;}
      p.wantVel.set(Math.sin(wh)*ws,0,Math.cos(wh)*ws);p.vel.set(Math.sin(hd)*spd,0,Math.cos(hd)*spd);
      p.face=hd-off;p.pos.x+=Math.sin(hd)*spd*dt;p.pos.z+=Math.cos(hd)*spd*dt;p.spd=spd;p.visA=spd>0.05?1:0;p.visT=12+t;p.visPh=(p.visPh||0)+dt*(spd*1.2+(spd>0.3?1.5:0));
      V.applyVisual(p,p.pos.x,p.y,p.pos.z,p.face,p.visA,p.visT,p.visPh,p.spd,0);V.ballMesh.position.set(0,0.14,60);P3D.frame(V.players,V.scene,V.teams,null,V.ballMesh.position);
      const m=P3D.measure(p);rows.push({t,dt,spd,face:p.face,feet:P3D.feet(p),j:P3D.joints(p),mm:m.mm});}
    return rows;},[kind,secs]);
  // (the standing band: each toe's 10th percentile height + 3 cm, so that one dip does not leave too few samples)
  const pct=(a,q)=>{const b=a.slice().sort((x,y)=>x-y);return b[Math.floor(b.length*q)];};
  const slideOf=rows=>{const lowL=pct(rows.map(r=>r.feet.LeftToeBase[1]),0.1),lowR=pct(rows.map(r=>r.feet.RightToeBase[1]),0.1),s=[];
    for(let i=1;i<rows.length;i++){const a=rows[i-1],c=rows[i];
      for(const [k,lo] of [['LeftToeBase',lowL],['RightToeBase',lowR]]){const o=k==='LeftToeBase'?'RightToeBase':'LeftToeBase';
        if(c.feet[k][1]<=c.feet[o][1]&&c.feet[k][1]<lo+0.03&&a.feet[k][1]<lo+0.03)s.push(Math.hypot(c.feet[k][0]-a.feet[k][0],c.feet[k][2]-a.feet[k][2])/c.dt);}}
    // float: the share of frames with neither toe within 5 cm of the grass (feet in the air; a sprint has some)
    const fl=rows.filter(r=>Math.min(r.feet.LeftToeBase[1],r.feet.RightToeBase[1])>0.05).length/rows.length;
    s.sort((x,y)=>x-y);return {mean:s.reduce((a,x)=>a+x,0)/(s.length||1),p90:s[Math.floor(s.length*0.9)]||0,lo:Math.min(...rows.map(r=>Math.min(r.feet.LeftToeBase[1],r.feet.RightToeBase[1]))),fl,n:s.length};};
  const JN=['lKnee','rKnee','lAnkle','rAnkle','lBigToe','rBigToe','lWrist','rWrist','nose','lElbow','rElbow'];
  const jerkOf=rows=>{const acc=[];for(let i=2;i<rows.length;i++){const [a,b,c]=[rows[i-2],rows[i-1],rows[i]],dt=c.dt;
      for(const n of JN){let s=0;for(let d=0;d<3;d++){const r=x=>x.j[n][d]-x.j.midHip[d];const v=(r(c)-2*r(b)+r(a))/(dt*dt);s+=v*v;}acc.push(Math.sqrt(s));}}
    acc.sort((x,y)=>x-y);return {p99:acc[Math.floor(acc.length*0.99)]||0,max:acc[acc.length-1]||0};};
  const leanOf=rows=>{const L=[],A=[];for(let i=6;i<rows.length-6;i++){const r=rows[i],f=r.face,fx=Math.sin(f),fz=Math.cos(f),n=r.j.neck,h=r.j.midHip;
      const fw=(n[0]-h[0])*fx+(n[2]-h[2])*fz,up=n[1]-h[1];L.push(Math.atan2(fw,up)*180/Math.PI);A.push((rows[i+6].spd-rows[i-6].spd)/(12/60));}
    const n=L.length,ma=A.reduce((s,x)=>s+x,0)/n,ml=L.reduce((s,x)=>s+x,0)/n;let sxy=0,sxx=0,syy=0;for(let i=0;i<n;i++){sxy+=(A[i]-ma)*(L[i]-ml);sxx+=(A[i]-ma)**2;syy+=(L[i]-ml)**2;}
    return {slope:sxx>1e-6?sxy/sxx:0,r:sxx>1e-6&&syy>1e-6?sxy/Math.sqrt(sxx*syy):0,mean:ml};};
  const switchOf=rows=>{let n=0;for(let i=1;i<rows.length;i++){const a=rows[i-1].mm,c=rows[i].mm;if(!!a!==!!c)n++;else if(a&&c&&(c.frame<a.frame||c.frame-a.frame>3))n++;}
    const mmShare=rows.filter(r=>r.mm).length/rows.length;return {perSec:n/(rows.length/60),mmShare};};
  const out={mm:status,scenarios:[]};
  const ONLY=process.env.SCEN?process.env.SCEN.split(','):null;   // SCEN=sprint,zig5: only those; DUMP=<file>: their frames
  for(const [kind,secs] of [['sprint',4.5],['zig15',6],['zig5',6],['stopgo',8],['circle',3.6],['back',4],['side',4]]){if(ONLY&&!ONLY.includes(kind))continue;
    await go(kind,0.6);const rows=(await go(kind,secs)).filter(r=>r.dt>0).slice(30);if(process.env.DUMP)fs.writeFileSync(process.env.DUMP+'.'+kind+'.json',JSON.stringify(rows));
    const sl=slideOf(rows),j=jerkOf(rows),le=leanOf(rows),sw=switchOf(rows);
    const o={kind,slideMean:+sl.mean.toFixed(3),slideP90:+sl.p90.toFixed(3),sink:+sl.lo.toFixed(3),float:+sl.fl.toFixed(2),stance:sl.n,jerkP99:+j.p99.toFixed(1),jerkMax:+j.max.toFixed(1),
      leanSlope:+le.slope.toFixed(2),leanR:+le.r.toFixed(2),leanMean:+le.mean.toFixed(1),switchPerSec:+sw.perSec.toFixed(2),mmShare:+sw.mmShare.toFixed(2)};
    out.scenarios.push(o);console.log(JSON.stringify(o));}
  out.errors=errors;console.log('page errors',errors.length);
  await b.close();if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(out,null,1));
})().catch(e=>{console.error(e);process.exit(1);});
