// The game's own procedural player (index.html as it is, read only) measured around a shot: where its feet are
// against the ball and the ground, tick by tick, as the game draws them. index.html is not changed: a copy is loaded
// into the page with one line of test access put in front of window.__game (as tests/anim_baseline.js does), and
// the player is posed with the game's own applyVisual (applyPose + rigLife) once per 1/60 s tick, as renderVisuals
// does at 60 frames a second.
//   node measure_procedural.js        writes out/procedural/measure.json, prints a summary
// Foot geometry: the boot's sole is the rig's box 0.094 x 0.018 x 0.255 m under the ankle (index.html buildRig);
// the points used are its four bottom corners, its centre line and the boot sphere's centre. Approximate: the boot
// sphere's outer surface is not included.
const path=require('path'),fs=require('fs');
const DIR=__dirname,GL=path.join(DIR,'..','..','..');
const P=require(path.join(GL,'tests','legacy','paths.js'));
const {chromium}=require(P.PLAYWRIGHT);
const three=fs.readFileSync(P.THREE_JS,'utf8');
const OUT=path.join(DIR,'out','procedural');fs.mkdirSync(OUT,{recursive:true});
const SRC=fs.readFileSync(path.join(GL,'index.html'),'utf8');
const INJECT=`window.__meas={applyVisual,A,setVisDt(v){visDt=v;}};\n`;
const k=SRC.indexOf('window.__game={');if(k<0)throw new Error('anchor window.__game not found');
const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+SRC.slice(0,k)+INJECT+SRC.slice(k)+'</body></html>';

(async()=>{
  const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const page=await browser.newPage({viewport:{width:960,height:540}});const errors=[];
  await page.addInitScript(()=>{try{localStorage.setItem('gl-tut-v1','1');}catch(e){}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>{const u=r.request().url();
    if(u.startsWith('http://game.local'))return r.fulfill({body:html,contentType:'text/html'});
    if(u.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'});
    return r.abort();});
  await page.goto('http://game.local/');await page.waitForTimeout(1500);
  const R=await page.evaluate(()=>{
    const g=__game,M=__meas,V=()=>new THREE.Vector3(),BR=0.11;
    g.startMatch({mode:'play',minutes:12,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(1);
    // pose the player as the renderer would and read his feet
    const feet=p=>{M.setVisDt(1/60);M.applyVisual(p,p.pos.x,p.y,p.pos.z,p.face,p.visA,p.visT,p.visPh,p.spd,p.visSide);p.rig.root.updateMatrixWorld(true);
      const o={};for(const [s,an] of [['L',p.rig.ankleL],['R',p.rig.ankleR]]){
        const pts=[[-0.047,-0.073,0.045-0.1275],[0.047,-0.073,0.045-0.1275],[-0.047,-0.073,0.045+0.1275],[0.047,-0.073,0.045+0.1275]].map(q=>an.localToWorld(V().set(...q)));
        const line=[-0.12,-0.06,0,0.06,0.12].map(z=>an.localToWorld(V().set(0,-0.064,0.045+z))),ball=an.localToWorld(V().set(0,-0.03,0.045));
        o[s]={low:Math.min(...pts.map(q=>q.y)),c:an.localToWorld(V().set(0,-0.073,0.045)).toArray(),pts:pts.concat(line,[ball]).map(q=>q.toArray())};}
      o.hips=p.rig.hips.getWorldPosition(V()).toArray();return o;};
    const gapTo=(pts,b)=>Math.min(...pts.map(q=>Math.hypot(q[0]-b.x,q[1]-b.y,q[2]-b.z)))-BR;
    const one=(running,holdTicks,kind,stopAfter)=>{const p=g.give(0,9);const K=g.ctrl[0];p.pos.set(0,0,0);p.face=Math.PI/2;p.vel.set(running?6:0,0,0);p.wantVel.copy(p.vel);g.ball.pos.set(0.5,0.11,0);
      for(const q of g.players)if(q!==p&&!q.isGK){q.pos.set(q.team?-30:-40,0,q.slot*3-15);q.vel.set(0,0,0);}
      g.setCtl(p);p.sk=null;p.cdSkill=0;g.sim(1/60);
      if(kind==='straight'){K.remote=true;K.mv.set(1,0,0);}
      if(kind==='angled')g.actDown('right');
      const b=g.ball.pos,rows=[];
      const rec=()=>{const f=feet(p);rows.push({x:p.pos.x,z:p.pos.z,face:p.face,spd:p.spd,a:p.visA,t:p.visT,side:p.visSide,ball:[b.x,b.y,b.z],owned:g.ball.owner===p,
        L:{low:f.L.low,c:f.L.c,gap:gapTo(f.L.pts,b)},R:{low:f.R.low,c:f.R.c,gap:gapTo(f.R.pts,b)},hips:f.hips,pts:{L:f.L.pts,R:f.R.pts}});};
      if(running)for(let k=0;k<60;k++){g.sim(1/60);rec();}
      const press=rows.length;g.actDown('shoot');for(let k=0;k<holdTicks;k++){g.sim(1/60);rec();}g.actUp('shoot');
      let released=false;
      for(let k=0;k<120;k++){if(stopAfter&&!released&&!rows[rows.length-1].owned){released=true;if(kind==='angled')g.actUp('right');K.mv.set(0,0,0);}g.sim(1/60);rec();}
      if(kind==='angled')g.actUp('right');K.remote=false;K.mv.set(0,0,0);
      return {name:(running?'running '+kind:'standing')+' D '+(holdTicks/60).toFixed(1)+' s'+(stopAfter?' then stop':''),press,rows,kickId:M.A.kick,runId:M.A.run,idleId:M.A.idle};};
    const S=[6,12,18].map(h=>one(false,h,'standing')).concat([6,12,18].map(h=>one(true,h,'straight')),[6,12,18].map(h=>one(true,h,'angled')),[one(true,12,'straight',true)]);
    // measurements per scene
    return S.map(sc=>{const r=sc.rows,press=sc.press,dt=1/60;
      const kLeave=r.findIndex((x,i)=>i>press&&!x.owned),kc=kLeave-1;
      const kickTicks=r.map((x,i)=>x.a===sc.kickId?i:-1).filter(i=>i>=0),k0=kickTicks[0],k1=kickTicks[kickTicks.length-1];
      const side=r[kc].side<0?'L':'R',plant=side==='R'?'L':'R';
      // the ball where it was when struck; the kicking foot's closest approach to that spot (+-0.25 s), and when
      const bAt=r[kc].ball,bv={x:bAt[0],y:bAt[1],z:bAt[2]};let best={gap:1e9,i:-1};
      for(let i=Math.max(0,kc-15);i<=Math.min(r.length-1,kc+15);i++){const gp=Math.min(...r[i].pts[side].map(q=>Math.hypot(q[0]-bv.x,q[1]-bv.y,q[2]-bv.z)))-0.11;if(gp<best.gap)best={gap:gp,i};}
      const cf=i=>r[Math.max(0,Math.min(r.length-1,i))][side].c,fv=[cf(best.i+1)[0]-cf(best.i-1)[0],cf(best.i+1)[2]-cf(best.i-1)[2]];
      const b3=r[Math.min(r.length-1,kLeave+3)].ball,bd=[b3[0]-r[kc].ball[0],b3[2]-r[kc].ball[2]],ang=v=>Math.atan2(v[0],v[1])*180/Math.PI;
      let dir=ang(fv)-ang(bd);while(dir>180)dir-=360;while(dir<-180)dir+=360;
      // feet on the ground (sole <= 2 cm in both ticks): how far the sole centre moves across it, per contact
      const contacts=(s,a,b)=>{const out=[];let cur=null;for(let i=Math.max(1,a);i<=b;i++){const g0=r[i-1][s].low<=0.02&&r[i][s].low<=0.02;
        if(g0){const d=Math.hypot(r[i][s].c[0]-r[i-1][s].c[0],r[i][s].c[2]-r[i-1][s].c[2]);if(!cur)cur={from:i,to:i,slide:0,body:0};cur.to=i;cur.slide+=d;cur.body+=Math.hypot(r[i].x-r[i-1].x,r[i].z-r[i-1].z);}
        else if(cur){out.push(cur);cur=null;}}if(cur)out.push(cur);return out;};
      const runC=press>1?['L','R'].flatMap(s=>contacts(s,1,press-1)):[],kickC=contacts(plant,k0,k1);
      // per tick: the feet and hips relative to the player (jumps at state changes)
      const rel=(i,q)=>[q[0]-r[i].x,q[1],q[2]-r[i].z],step=(i,q1,q0)=>Math.hypot(...[0,1,2].map(c=>rel(i,q1)[c]-rel(i-1,q0)[c]));
      let jumpAt=[],within=0;for(let i=1;i<r.length;i++){const s=Math.max(step(i,r[i].hips,r[i-1].hips),step(i,r[i].L.c,r[i-1].L.c),step(i,r[i].R.c,r[i-1].R.c));
        if(r[i].a!==r[i-1].a)jumpAt.push({i,from:r[i-1].a,to:r[i].a,step:+s.toFixed(4)});else within=Math.max(within,s);}
      const lows=r.map(x=>Math.min(x.L.low,x.R.low));
      return {name:sc.name,press:press/60,kickAnim:[k0/60,k1/60],contactTick:kc/60,ballLeaves:kLeave/60,kickFoot:side,
        footGapAtContact:+r[kc][side].gap.toFixed(4),closest:{gap:+best.gap.toFixed(4),at:+(best.i/60).toFixed(4),ticksAfterContact:best.i-kc},
        footVsBallDirDeg:+dir.toFixed(1),ballFlightDeg:+(ang(bd)-r[kc].face*180/Math.PI*0-0).toFixed(1),faceAtContactDeg:+(r[kc].face*180/Math.PI).toFixed(1),
        ballAhead:+((r[kc].ball[0]-r[kc].x)*Math.sin(r[kc].face)+(r[kc].ball[2]-r[kc].z)*Math.cos(r[kc].face)).toFixed(3),
        speedAtPress:+r[press].spd.toFixed(2),speedAtContact:+r[kc].spd.toFixed(2),
        soleMin:+Math.min(...lows).toFixed(4),soleMinAt:+(lows.indexOf(Math.min(...lows))/60).toFixed(3),
        runUpContacts:runC.map(c=>({foot:undefined,ticks:c.to-c.from+1,slide:+c.slide.toFixed(3),bodyMoved:+c.body.toFixed(3)})),
        plantInKick:kickC.map(c=>({from:+(c.from/60).toFixed(3),to:+(c.to/60).toFixed(3),slide:+c.slide.toFixed(3),bodyMoved:+c.body.toFixed(3)})),
        stateChanges:jumpAt,withinStateMaxStep:+within.toFixed(4),
        perTick:r.map(x=>[+x.L.low.toFixed(3),+x.R.low.toFixed(3),x.a,+x.t.toFixed(3),+x.spd.toFixed(2)])};});   // [left sole low, right sole low, state, state time, speed]
  });
  await browser.close();
  fs.writeFileSync(path.join(OUT,'measure.json'),JSON.stringify({source:'ground-legends/index.html (read only, test access injected in memory)',scenes:R,pageErrors:errors},null,1));
  for(const s of R){console.log(`${s.name.padEnd(34)} foot ${s.kickFoot} gap@contact ${s.footGapAtContact} closest ${s.closest.gap} (${s.closest.ticksAfterContact>=0?'+':''}${s.closest.ticksAfterContact} ticks) dir ${s.footVsBallDirDeg}° ahead ${s.ballAhead} sole ${s.soleMin} v ${s.speedAtPress}->${s.speedAtContact}`);
    if(s.runUpContacts.length)console.log('   run-up contacts: slide/body m',s.runUpContacts.map(c=>c.slide+'/'+c.bodyMoved).join(' '));
    console.log('   plant in kick: slide/body m',s.plantInKick.map(c=>c.slide+'/'+c.bodyMoved+' ['+c.from+'-'+c.to+']').join(' ')||'none on the ground');
    console.log('   state changes: max step',Math.max(0,...s.stateChanges.map(c=>c.step)).toFixed(4),'within states',s.withinStateMaxStep);}
  console.log('page errors',errors.length,errors.slice(0,2));
})();
