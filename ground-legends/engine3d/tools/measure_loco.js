// Foot sliding and blending of the 3D models' standing, walking and running, in the real game page. Development tool.
//   node ground-legends/engine3d/tools/measure_loco.js [out.json]
// The game is frozen (window.__freeze: no physics, no AI) and its drawing loop paused; this script steps time itself at
// 60 frames a second: it moves one player in a straight line at a fixed speed (game state run, or idle at 0), facing
// his way, poses him with the game's own applyVisual (test access injected in memory, as the other tools do), and calls
// P3D.frame with a fixed 1/60 s step (P3D.clock). Per step the copy's toes are read (P3D.feet). The standing foot is the lower toe while it is within 3 cm of that
// toe's lowest height in the run; its horizontal speed over the ground is the slide (0 = planted). Reported per speed:
// the mean and 90th percentile slide in m/s, and the clip weights. Also one turn at 6 m/s to see the lean.
const fs=require('fs'),path=require('path');
const GL=path.join(__dirname,'..','..');
const P=require(path.join(GL,'tests','legacy','paths.js'));const {chromium}=require(P.PLAYWRIGHT);
const three=fs.readFileSync(P.THREE_JS,'utf8'),game=fs.readFileSync(path.join(GL,'index.html'),'utf8');
const k=game.indexOf('window.__game={');if(k<0)throw new Error('anchor');
const INJECT='window.__vis={applyVisual,scene,get players(){return players;},get teams(){return teams;},setVisDt(v){visDt=v;}};\n';
const html='<!doctype html><html><head><meta charset="utf-8"></head><body>'+game.slice(0,k)+INJECT+game.slice(k)+'</body></html>';
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const page=await b.newPage({viewport:{width:800,height:480}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{try{localStorage.setItem('gl-tut-v1','1');}catch(e){}});
  // a pausable drawing loop: while __rafPause is set the game's frame callbacks wait
  await page.addInitScript(()=>{const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(t=>{if(window.__rafPause){window.requestAnimationFrame(cb);return;}cb(t);});});
  await page.route('**/*',r=>{const u=new URL(r.request().url());
    if(u.host==='game.local'&&u.pathname==='/')return r.fulfill({body:html,contentType:'text/html'});
    if(u.href.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'});
    if(u.pathname.startsWith('/engine3d/')){const f=path.join(GL,u.pathname);if(fs.existsSync(f))return r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.json')?'application/json':'model/gltf-binary'});return r.fulfill({status:404,body:''});}
    return r.abort();});
  await page.goto('http://game.local/?p3d=one');await page.waitForFunction(()=>window.P3D&&P3D.status.ready,null,{timeout:60000});
  await page.evaluate(()=>{__game.startMatch({mode:'play',minutes:12,home:0,away:2,firstKick:0});});
  const ST=`(()=>{const T=__game.teams.find(t=>t.human)||__game.teams[0];return T.players.find(q=>q.label==='ST');})()`;
  await page.waitForFunction('!!P3D.measure('+ST+')',null,{timeout:30000});
  await page.evaluate('window.__freeze=true;window.__st='+ST);
  // move him each drawn frame (before the game draws: a requestAnimationFrame registered now runs ahead of the game's next one)
  await page.evaluate(()=>{window.__rafPause=true;P3D.clock(1/60);});
  const run=(spd,secs,turn)=>page.evaluate(([spd,secs,turn])=>{const V=window.__vis,p=window.__st,rows=[],dt=1/60;
    p.pos.set(0,0,-20);p.face=0;p.vel.set(0,0,0);V.setVisDt(dt);
    for(let i=0;i*dt<secs;i++){if(turn)p.face+=turn*dt;
      p.pos.x+=Math.sin(p.face)*spd*dt;p.pos.z+=Math.cos(p.face)*spd*dt;p.spd=spd;p.visA=spd>0.05?1:0;p.visT=12+i*dt;p.visPh=(p.visPh||0)+dt*(spd*1.2+(spd>0.3?1.5:0));
      V.applyVisual(p,p.pos.x,p.y,p.pos.z,p.face,p.visA,p.visT,p.visPh,p.spd,0);P3D.frame(V.players,V.scene,V.teams,null);
      const f=P3D.feet(p),m=P3D.measure(p);rows.push({t:i*dt,dt,feet:f,w:m.weights,lean:m.lean,transfer:m.transfer});}
    return rows;},[spd,secs,turn||0]);
  const out={speeds:[]};
  for(const spd of [0,1.4,2.1,2.8,4.2,4.9,5.5,7,8.5]){
    await run(spd,0.8);const rows=(await run(spd,4)).filter(r=>r.dt>0);
    const lowL=Math.min(...rows.map(r=>r.feet.LeftToeBase[1])),lowR=Math.min(...rows.map(r=>r.feet.RightToeBase[1]));
    const slides=[];
    for(let i=1;i<rows.length;i++){const a=rows[i-1],c=rows[i];
      for(const [k,lo] of [['LeftToeBase',lowL],['RightToeBase',lowR]]){const other=k==='LeftToeBase'?'RightToeBase':'LeftToeBase';
        if(c.feet[k][1]<=c.feet[other][1]&&c.feet[k][1]<lo+0.03&&a.feet[k][1]<lo+0.03)slides.push(Math.hypot(c.feet[k][0]-a.feet[k][0],c.feet[k][2]-a.feet[k][2])/c.dt);}}
    slides.sort((x,y)=>x-y);const mean=slides.reduce((s,x)=>s+x,0)/(slides.length||1),p90=slides[Math.floor(slides.length*0.9)]||0;
    const w=rows[rows.length-1].w,fps=rows.length/rows.reduce((s,r)=>s+r.dt,0);
    out.speeds.push({spd,frames:rows.length,fps:+fps.toFixed(1),stanceSamples:slides.length,slideMean:+mean.toFixed(3),slideP90:+p90.toFixed(3),weights:w,lowToe:[+lowL.toFixed(3),+lowR.toFixed(3)]});
    console.log(`speed ${String(spd).padStart(4)} m/s | ${rows.length} frames at ${fps.toFixed(0)} fps | standing-foot slide mean ${mean.toFixed(3)} m/s, 90% ${p90.toFixed(3)} m/s (${slides.length} samples) | weights ${Object.entries(w).filter(([k,v])=>v>0).map(([k,v])=>k+' '+v).join(', ')} | lowest toes ${lowL.toFixed(3)} / ${lowR.toFixed(3)} m`);}
  const turn=await run(6,2.5,1.2);const leans=turn.map(r=>r.lean);out.turn={spd:6,yawRate:1.2,leanMax:Math.max(...leans.map(Math.abs))};
  console.log(`turn at 6 m/s, 1.2 rad/s: lean up to ${out.turn.leanMax.toFixed(3)} rad`);
  out.errors=errors;console.log('page errors',errors.length);
  await page.evaluate(()=>{window.__rafPause=false;P3D.clock(null);});await page.waitForTimeout(500);
  await page.screenshot({path:path.join(GL,'tests','legacy','out','p3d','loco_turn.png')});
  await b.close();if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(out,null,1));
})().catch(e=>{console.error(e);process.exit(1);});
