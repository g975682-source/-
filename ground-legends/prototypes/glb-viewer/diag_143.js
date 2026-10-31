// CMU 143_24 on the game's standing and straight running shots: the problems reproduced and their causes taken apart
// (prototype only). One condition changed at a time on the in-place 143_24 clip:
//   A original (the sideways offset that puts the foot on the ball, nothing else), B plant lock only, C ground clamp
//   only, D body speed limit only, E = B+C, F = B+C+D; for reference "F+THC" exactly as check_shot.js runs it; and two
//   measurements of what clearing the plant foot from the ball costs: P = F + the plant leg moved by IK (that leg
//   only), W = F + the whole model moved by the same amount (a measurement, not a candidate: it moves the body away
//   from where the game has the player).
// The limits, the game probe, the measurements and the gates are check_shot.js's own code, read from that file and run
// as they are (nothing copied, nothing changed); the simulation is diag_lab.js (GLShot.sim plus the switches above),
// checked against GLShot.sim on the same shot before anything is reported.
// Usage (from this folder): node diag_143.js [model.glb ...]   (default Xbot.glb Soldier.glb)
// Outputs: out/diag143_* (report, gates, per-tick frames as CSV and JSON, screenshots out/diag143_<...>.png).
// Exit 0 only when every check ran and the variants were measured; the gate verdicts are in the report (failures are
// expected: they are what is being diagnosed). Exit 2 when the checks of the harness itself fail.
const path=require('path'),fs=require('fs');
const P=require('../../tests/legacy/paths.js');
const {chromium}=require(P.PLAYWRIGHT);
const DIR=__dirname,three=fs.readFileSync(P.THREE_JS,'utf8'),TAKE='143_24';
const MODELS=process.argv.slice(2).filter(a=>/\.glb$/i.test(a));if(!MODELS.length)MODELS.push('Xbot.glb','Soldier.glb');
const out=(...a)=>path.join(DIR,'out',...a);
// check_shot.js's own blocks: the limits, the game probe, the measurements and the gates
const CS=fs.readFileSync(path.join(DIR,'check_shot.js'),'utf8').split('\n');
const block=(from,to)=>{const a=CS.findIndex(l=>l.startsWith(from)),b=CS.findIndex((l,k)=>k>a&&l.startsWith(to));if(a<0||b<0)throw new Error('check_shot.js block not found: '+from);return CS.slice(a,b).join('\n');};
const SRC=[block('const LIM={','const sleep='),block('// ---- the game, read only','// ---- in the page'),block('// ---- measurements from the ticks','// ---- screenshots of the shot')].join('\n');
const CSF=new Function('require','path','fs','P',SRC+'\nreturn {LIM,probeGame,measure,gatesFor,gates,gate};')(require,path,fs,P);
const {LIM,probeGame,measure,gatesFor,gates}=CSF;
const VARS=['A','B','C','D','E','F','F+THC','P','W'];
const LABEL={A:'원래 143_24 (공 맞춤 오프셋만)',B:'지지발 고정만',C:'접지 보정만',D:'몸 이동 보정만',E:'B+C',F:'B+C+D','F+THC':'참고: 이전 F+THC (check_shot.js와 같음)',P:'F + 지지발 다리 IK로 공과 분리 (측정)',W:'F + 몸 전체 이동으로 분리 (측정, 후보 아님)'};
const BASE={B:'A',C:'A',D:'A',E:'A',F:'A',P:'F',W:'F'};   // the knee/ankle gate compares with this variant
const checks=[];const check=(model,name,ok,value,limit)=>checks.push({model,name,ok:!!ok,value,limit});

async function runModel(browser,m,GP){
  const page=await browser.newPage({viewport:{width:1000,height:640}});const errors=[];
  page.on('console',x=>{if(x.type()==='error')errors.push(x.text());});page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  await page.route('**/*',r=>{const u=r.request().url();
    if(u.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'});
    if(u.startsWith('http://viewer.local/')){const f=path.join(DIR,decodeURIComponent(u.slice(20).split('?')[0])||'index.html');
      if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.html')?'text/html':'application/octet-stream'});
      return r.fulfill({status:404,body:'not found'});}
    return r.abort();});
  await page.goto('http://viewer.local/index.html?autoload=0');
  await page.addScriptTag({url:'http://viewer.local/shot_lab.js'});await page.addScriptTag({url:'http://viewer.local/diag_lab.js'});
  const R=await page.evaluate(async({m,TAKE,SCEN,VARS})=>{
    const Vw=window.__viewer,out={scen:{}};
    if(!(await Vw.load('models/'+m)))return {failed:'model: '+document.querySelector('#status').textContent};
    const inf=await Vw.addBVH(`models/cmu_extra/${TAKE}.bvh`,{trim:true,before:0.6,after:0.5,name:TAKE+' 킥 (슛 실험)'});if(!inf)return {failed:'retarget: '+document.querySelector('#status').textContent};
    const i=Vw.inst[0],V=()=>new THREE.Vector3();
    const idle=Vw.animations.find(c=>/^idle$/i.test(c.name))||Vw.animations[0],run=Vw.animations.find(c=>/^run$/i.test(c.name))||idle;
    const times=d=>{const t=[];for(let k=0;k<=Math.round(d*60);k++)t.push(Math.min(d,k/60));return t;};
    // the references, computed as check_shot.js computes them (diag_143.js checks them against its last output)
    const own={};for(const c of Vw.animations.filter(c=>!c.inPlaceVersion&&!/슛 실험|킥/.test(c.name)&&c.duration>0.2)){const s=GLKick.series(i,c,times(Math.min(c.duration,3)).filter((_,k)=>k%2===0),null,0.5);own[c.name]=+Math.min(...s.map(f=>Math.min(f.R.low,f.L.low))).toFixed(4);}
    const ownMin=Math.min(...Object.values(own));
    const ci=Vw.clipsIn.findIndex(c=>c.retarget===inf),ip=Vw.clipsPlay[ci],raw=Vw.animations[ci],strike=Vw.clipsIn[ci].strikeAt;
    const arc=GLKick.series(i,ip,Array.from({length:43},(_,k)=>strike-0.03+k/240),null,0.5);let lowT=arc[0];for(const f of arc)if(f.rToe[1]<lowT.rToe[1])lowT=f;const tc=lowT.t;
    const T=times(ip.duration),base=GLKick.series(i,ip,T,null,0.5),rawS=GLKick.series(i,raw,T,null,0.5);
    let plant=null;for(let j=1;j<base.length;j++){const f=base[j];if(f.t>=tc)break;if(f.L.low<0.02&&base[j-1].L.low>=0.02)plant=f.t;}
    let plantFallback=false;if(plant==null){plant=Math.max(0,tc-0.13);plantFallback=true;}
    const d2=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]),d3=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
    const capHipsStep=Math.max(...rawS.slice(1).map((f,j)=>d3(f.hips,rawS[j].hips)));
    const kickToeStep=Math.max(...base.slice(1).map((f,j)=>d3(f.rToe,base[j].rToe)));
    const ipBodyStep=Math.max(...base.slice(1).map((f,j)=>Math.max(d3(f.hips,base[j].hips),d3(f.chest,base[j].chest))));
    const win=rawS.filter(f=>f.t>=tc-0.1-1e-6&&f.t<=tc+0.1+1e-6),ownDrift=Math.max(...win.map(f=>d2(f.lAnkle,win[0].lAnkle)));
    const srcDip=Math.min(0,...inf.sourceFootLow),sinkLimit=+(Math.min(ownMin,0)+srcDip).toFixed(4);
    const ref={tc,strike,plant,plantFallback,capHipsStep:+capHipsStep.toFixed(4),ipBodyStep:+ipBodyStep.toFixed(4),kickToeStep:+kickToeStep.toFixed(4),ownDrift:+ownDrift.toFixed(4),sinkLimit,ownMin,srcDip:+srcDip.toFixed(4),
      soleInPlace:+Math.min(...base.map(f=>Math.min(f.L.low,f.R.low))).toFixed(4),hipScale:inf.hipScale};
    // the clip's own hips step, tick by tick (model still, in place): where the clip itself moves fast
    const hs=base.slice(1).map((f,j)=>({t:f.t,step:Math.max(d3(f.hips,base[j].hips),d3(f.chest,base[j].chest))}));const hm=hs.reduce((a,b)=>b.step>a.step?b:a);
    ref.ipBodyStepAt={t:+hm.t.toFixed(4),sinceContact:+(hm.t-tc).toFixed(4)};
    const hsR=rawS.slice(1).map((f,j)=>({t:f.t,step:d3(f.hips,rawS[j].hips)}));const hr=hsR.reduce((a,b)=>b.step>a.step?b:a);ref.capHipsStepAt={t:+hr.t.toFixed(4),sinceContact:+(hr.t-tc).toFixed(4)};
    const toeLift=GLKick.liftHips(i,GLKick.fixToes(i,ip).clip).clip;
    {const pa=(f,a,b,c)=>{const p=(u,v)=>{const d=[v[0]-u[0],v[1]-u[1],v[2]-u[2]];return Math.atan2(d[1],Math.hypot(d[0],d[2]));};return (p(b,c)-p(a,b))*180/Math.PI;};
      const own2=[];i.mixer.stopAllAction();const g=GLShot.rig(i);const at=t=>{const mx=i.mixer;mx.stopAllAction();const a=mx.clipAction(raw);a.reset();a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.play();a.time=t;mx.update(0);i.root.updateWorldMatrix(true,false);i.root.updateMatrixWorld(true);
        const J=n=>GLShot.joint(g,n).toArray();return {L:pa(0,J('LeftFoot'),J('LeftToeBase'),J('LeftToe_End')),R:pa(0,J('RightFoot'),J('RightToeBase'),J('RightToe_End'))};};
      for(const t of T)own2.push(at(t));i.mixer.stopAllAction();
      const st=s=>Math.max(...own2.slice(1).map((o,j)=>Math.abs(o[s]-own2[j][s])));
      ref.toeOwn={L:[+Math.min(...own2.map(o=>o.L)).toFixed(1),+Math.max(...own2.map(o=>o.L)).toFixed(1)],R:[+Math.min(...own2.map(o=>o.R)).toFixed(1),+Math.max(...own2.map(o=>o.R)).toFixed(1)],stepL:+st('L').toFixed(2),stepR:+st('R').toFixed(2)};}
    out.ref=ref;window.__diag={};
    const ramp=(t,a,b)=>{const x=(t-a)/Math.max(1e-6,b-a);return x<=0?0:x>=1?1:x*x*(3-2*x);};
    const fit=(clip,ballZ)=>GLKick.contact(i,clip,tc,'Right',ballZ);
    for(const sc of SCEN){
      const tC=sc.lastOwned,tPl=tC-(tc-plant),backAt=sc.followEnd!=null?sc.followEnd:tC+0.3,game=sc.rows.map(r=>({x:r.x,z:r.z,yaw:r.yaw,ball:r.ball}));
      const bz=sc.ballAtContact,bx=sc.ballLatAtContact,fitX=c=>({offset:[c.offset[0]+bx,c.offset[1]],touch:c.touchFound});
      const common={prev:sc.running?run:idle,back:idle,xfIn:0.15,xfOut:0.25,backAt,tEnd:backAt+0.25+0.3,game,sub:{from:tC-0.1,to:tC+0.1}};
      // D's limit: the gate's own per-tick limit (captured hips step, or the player's step + the in-place body's), 3 % under it
      const pStep=k=>{const a=game[Math.max(0,k-1)],b=game[Math.min(game.length-1,k)];return Math.hypot(b.x-a.x,b.z-a.z);};
      const bodyLimit=k=>0.97*Math.max(ref.capHipsStep,pStep(k)+ref.ipBodyStep);
      const mkOff=f0=>(t,kt,wk)=>{const s=ramp(t,0,tPl);return [wk*s*f0.offset[0],wk*s*f0.offset[1]];};
      const lockPost=(mk)=>{const p1=GLDiag.sim(i,mk([0,0])),rc=p1.rows.find(r=>Math.abs(r.t-tC)<1e-6)||p1.rows[Math.round(tC*60)];const cfg=mk([-rc.lock[0],-rc.lock[1]]);cfg.pass1Lock=rc.lock;return cfg;};
      const f0=fitX(fit(ip,bz));
      const mk=(opts)=>post=>Object.assign({},common,{kick:opts.clip||ip,kickStart:0,t0:tc-tC,off:mkOff(opts.fit||f0),
        lock:opts.lock?{from:tPl,to:backAt}:null,groundClamp:!!opts.clamp,bodyLimit:opts.body?bodyLimit:null,
        post:opts.lock?(t,kt,wk)=>{const s=ramp(t,0,tPl);return [wk*s*post[0],wk*s*post[1]];}:null});
      const cfgs={};
      cfgs.A=mk({})([0,0]);cfgs.C=mk({clamp:true})([0,0]);cfgs.D=mk({body:true})([0,0]);
      cfgs.B=lockPost(mk({lock:true}));cfgs.E=lockPost(mk({lock:true,clamp:true}));cfgs.F=lockPost(mk({lock:true,clamp:true,body:true}));
      const fT=fitX(fit(toeLift,bz));cfgs['F+THC']=lockPost(mk({clip:toeLift,fit:fT,lock:true,clamp:true}));
      out.scen[sc.name]={tC,tPl,backAt,ballLeaves:sc.ballLeaves,variants:{}};window.__diag[sc.name]=cfgs;
      // the reference shot through GLShot.sim (shot_lab.js) twice and GLDiag.sim once: GLDiag.sim may differ from
      // GLShot.sim no more than GLShot.sim differs from itself (the rows are rounded to 0.1 mm; the mixer's running
      // clock can move a value across a rounding step)
      {const a=GLShot.sim(i,cfgs['F+THC']),b=GLDiag.sim(i,cfgs['F+THC']),a2=GLShot.sim(i,cfgs['F+THC']);
        const cmp=(A,B)=>{let worst=0;for(let j=0;j<Math.max(A.rows.length,B.rows.length);j++){const x=A.rows[j],y=B.rows[j];if(!x||!y)return Infinity;
          for(const key of ['root','hips','chest','lAnk','rToe'])for(let c=0;c<3;c++)worst=Math.max(worst,Math.abs(x[key][c]-y[key][c]));worst=Math.max(worst,Math.abs(x.L.gap-y.L.gap),Math.abs(x.R.gap-y.R.gap),Math.abs(x.L.low-y.L.low));}return worst;};
        out.scen[sc.name].simCheck={worst:cmp(a,b),shotVsShot:cmp(a,a2),rows:[a.rows.length,b.rows.length],subs:[a.subs.length,b.subs.length]};}
      const run1=(v,cfg)=>{const r=GLDiag.sim(i,cfg);out.scen[sc.name].variants[v]={kickStart:0,rows:r.rows,subs:r.subs,ikMissMax:r.ikMissMax,pass1Lock:cfg.pass1Lock||null};return r;};
      let rF=null;for(const v of ['A','B','C','D','E','F','F+THC']){const r=run1(v,cfgs[v]);if(v==='F')rF=r;}
      // P and W: how far the plant foot has to go to clear the ball, from F's ticks with the kick in (weight >= 0.5)
      // before the contact: the closest tick, the plant ankle's direction from the ball centre (player frame)
      const pre=rF.rows.filter(r=>r.kickWeight>=0.5&&r.t<=tC+1e-6);const worst=pre.reduce((a,b)=>b.L.gap<a.L.gap?b:a,pre[0]);
      const want=0.01,need=Math.max(0,want-worst.L.gap)*1.1,cy=Math.cos(-worst.yaw),sy=Math.sin(-worst.yaw);
      let dx=worst.lAnk[0]-worst.ball[0],dz=worst.lAnk[2]-worst.ball[2];const dl=Math.hypot(dx,dz)||1;dx/=dl;dz/=dl;
      const S=[(dx*cy+dz*sy)*need,(-dx*sy+dz*cy)*need];
      const wS=t=>t<=0.15?ramp(t,0,0.15):t<=backAt?1:1-ramp(t,backAt,backAt+0.25);
      cfgs.P=Object.assign({},cfgs.F,{plantIK:{S,w:wS}});cfgs.W=Object.assign({},cfgs.F,{shiftAll:t=>[S[0]*wS(t),S[1]*wS(t)]});
      out.scen[sc.name].clearance={worstTick:worst.t,worstGap:worst.L.gap,kickWeight:worst.kickWeight,shift:S.map(x=>+x.toFixed(4)),shiftLen:+need.toFixed(4),beforePlant:worst.t<tPl};
      run1('P',cfgs.P);run1('W',cfgs.W);}
    return out;},{m,TAKE,SCEN:GP.scenarios.filter(s=>!/angled/.test(s.name)),VARS});
  return {page,R,errors};
}

// screenshots: D press, plant down, the estimated contact, follow-through, back (end of the fade back); front and side
async function shots(page,m,R,list){
  const tag=m.replace(/\W/g,'_'),done=[];
  for(const [sn,v] of list){const S=R.scen[sn];if(!S)continue;
    for(const [scn,t] of [['1_press',0],['2_plant',S.tPl],['3_contact',S.tC],['4_follow',S.tC+0.2],['5_back',S.backAt+0.25]])for(const view of ['front','side']){
      await page.evaluate(({sn,v,t,view,tC})=>{const Vw=window.__viewer,i=Vw.inst[0];Vw.setPaused(true);Vw.stopAll();
        let ball=Vw.scene.getObjectByName('dgBall');if(!ball){ball=new THREE.Mesh(new THREE.SphereGeometry(0.11,20,14),new THREE.MeshLambertMaterial({color:0xffffff}));ball.name='dgBall';Vw.scene.add(ball);
          const mark=new THREE.Mesh(new THREE.RingGeometry(0.16,0.22,32),new THREE.MeshBasicMaterial({color:0xf5c542,side:THREE.DoubleSide}));mark.rotation.x=-Math.PI/2;mark.name='dgMark';Vw.scene.add(mark);
          const lab=document.createElement('div');lab.id='dgLab';Object.assign(lab.style,{position:'absolute',right:'10px',top:'10px',background:'rgba(7,16,31,.85)',padding:'6px 8px',border:'1px solid #f5c542',font:'13px system-ui',color:'#fff',maxWidth:'64%'});document.querySelector('#view').appendChild(lab);}
        const cfg=window.__diag[sn][v],res=GLDiag.sim(i,Object.assign({},cfg,{stopAt:t,sub:null})),r=res.rows[res.rows.length-1];
        ball.position.fromArray(r.ball);Vw.scene.getObjectByName('dgMark').position.set(r.player[0],0.012,r.player[1]);
        const dev=Math.hypot(r.hips[0]-r.player[0],r.hips[2]-r.player[1]);
        document.querySelector('#dgLab').textContent=`143_24 ${v} · ${sn} · t=${t.toFixed(3)} s (D 누름 0, 접촉 추정 ${tC.toFixed(3)}) · 지지발-공 ${r.L.gap.toFixed(3)} m · 지지발 높이 ${r.L.low.toFixed(3)} m · 차는발-공 ${r.R.gap.toFixed(3)} m · 골반-선수 ${dev.toFixed(2)} m`;
        Vw.orbit.target.set(r.player[0]+0.2,0.6,r.player[1]+0.35);if(view==='front'){Vw.orbit.yaw=0.25;Vw.orbit.pitch=0.18;}else{Vw.orbit.yaw=Math.PI/2;Vw.orbit.pitch=0.08;}Vw.orbit.dist=3.4;},{sn,v,t,view,tC:S.tC});
      await page.waitForTimeout(250);
      const f=out(`diag143_${tag}_${sn.replace(/\W+/g,'_')}_${v.replace(/\W/g,'')}_${scn}_${view}.png`);
      await page.locator('#view').screenshot({path:f,timeout:90000}).then(()=>done.push(path.basename(f)),e=>checks.push({model:m,name:'screenshot '+path.basename(f),ok:false,value:e.message.split('\n')[0],limit:'saved'}));}}
  return done;
}

// per tick, for the CSV: what the brief asks for, derived from the rows
function frames(m,sn,v,S,Vv){
  const f=Vv.rows,d3=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]),d2=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);
  return f.map((r,j)=>{const p=f[j-1];const ph=r.t<0.15-1e-6?'fadeIn':r.t<S.backAt-1e-6?(r.t<S.tPl-1e-6?'kick:before plant':r.t<=S.tC+1e-6?'kick:planted':'kick:follow'):r.t<S.backAt+0.25-1e-6?'fadeBack':'after';
    return {model:m,scenario:sn,variant:v,t:r.t,phase:ph,playerX:r.player[0],playerZ:r.player[1],playerYawDeg:+(r.yaw*180/Math.PI).toFixed(2),
      hipsX:r.hips[0],hipsY:r.hips[1],hipsZ:r.hips[2],pelvisYawDeg:+(r.pelvisYaw*180/Math.PI).toFixed(2),hipsFromPlayer:+Math.hypot(r.hips[0]-r.player[0],r.hips[2]-r.player[1]).toFixed(4),
      kickAnkleX:r.rAnk[0],kickAnkleY:r.rAnk[1],kickAnkleZ:r.rAnk[2],kickToeX:r.rToe[0],kickToeY:r.rToe[1],kickToeZ:r.rToe[2],
      plantAnkleX:r.lAnk[0],plantAnkleY:r.lAnk[1],plantAnkleZ:r.lAnk[2],plantToeX:r.lToe[0],plantToeY:r.lToe[1],plantToeZ:r.lToe[2],
      ballX:r.ball[0],ballY:r.ball[1],ballZ:r.ball[2],ballRadius:0.11,plantToBall:r.L.gap,kickToBall:r.R.gap,plantSoleHeight:r.L.low,kickSoleHeight:r.R.low,
      plantSlideMps:p?+(d2(r.lAnk,p.lAnk)*60).toFixed(3):0,bodyStep:p?+Math.max(d3(r.hips,p.hips),d3(r.chest,p.chest)).toFixed(4):0,feetStep:p?+Math.max(d3(r.lAnk,p.lAnk),d3(r.rAnk,p.rAnk),d3(r.lToe,p.lToe),d3(r.rToe,p.rToe)).toFixed(4):0,
      kickWeight:r.kickWeight,lift:r.lift,lockShiftX:r.lock[0],lockShiftZ:r.lock[1],dShiftX:r.dShift[0],dShiftZ:r.dShift[1],ikMiss:r.ikMiss};});
}

(async()=>{
  const GP=await probeGame();
  if(GP.errors.length)checks.push({model:'game',name:'probe ran without page errors',ok:false,value:GP.errors.slice(0,3),limit:'none'});
  const scen=GP.scenarios.filter(s=>!/angled/.test(s.name));
  check('game','six scenarios (standing, straight running x D 0.1/0.2/0.3 s) with their shot moments',scen.length===6&&scen.every(s=>s.lastOwned>0&&s.followEnd!=null),scen.map(s=>s.name),6);
  // the last check_shot.js output for this take, to check the references and the standing reference variant against
  const prior=fs.existsSync(out('shot_lab_cmp4_summary.json'))?JSON.parse(fs.readFileSync(out('shot_lab_cmp4_summary.json'),'utf8')):null;
  const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const rep={scenarios:scen.map(s=>({name:s.name,lastOwned:s.lastOwned,ballLeaves:s.ballLeaves,followEnd:s.followEnd,ballAtContact:s.ballAtContact})),models:{}},csv=[];
  for(const m of MODELS){
    let page,R,errors;try{({page,R,errors}=await runModel(browser,m,GP));}catch(e){check(m,'page run',false,e.message.split('\n').slice(0,3).join(' | '),'ran');continue;}
    if(R.failed){check(m,'model and take load',false,R.failed,'loaded');await page.close();continue;}
    check(m,'no page errors',!errors.length,errors.slice(0,3),'none');
    // the references are check_shot.js's
    const pr=prior&&prior.models[m]&&prior.models[m].takes[TAKE]&&prior.models[m].takes[TAKE].ref;
    if(!pr)check(m,'references against check_shot.js (cmp4)',false,'no earlier output','present');
    else for(const k of ['tc','plant','capHipsStep','ipBodyStep','kickToeStep','ownDrift','sinkLimit'])check(m,`reference ${k} = check_shot.js`,Math.abs(R.ref[k]-pr[k])<=1e-4,{here:R.ref[k],checkShot:pr[k]},'|diff| <= 0.0001');
    const M=rep.models[m]={ref:R.ref,scen:{}};
    for(const [sn,S] of Object.entries(R.scen)){
      check(m,`${sn}: GLDiag.sim = GLShot.sim (F+THC)`,S.simCheck.worst<=Math.max(1e-9,S.simCheck.shotVsShot)+1e-12&&S.simCheck.rows[0]===S.simCheck.rows[1]&&S.simCheck.subs[0]===S.simCheck.subs[1],S.simCheck,'no more than GLShot.sim against itself');
      const Ms={};for(const v of VARS){const Vv=S.variants[v];if(!Vv){check(m,`${sn} ${v}: ran`,false,'missing','ran');continue;}
        try{Ms[v]=measure(S,Vv,R.ref);}catch(e){check(m,`${sn} ${v}: measured`,false,e.message,'measured');continue;}
        for(const fr of frames(m,sn,v,S,Vv))csv.push(fr);}
      // standing shots do not depend on the game's dribble: F+THC must give what check_shot.js gave
      const pv=prior&&/standing/.test(sn)&&prior.models[m]&&prior.models[m].takes[TAKE].scen[sn]&&prior.models[m].takes[TAKE].scen[sn].variants['F+THC'];
      // (the animation's side: the foot's direction; the ball's flight comes from the game and varies between runs,
      // so it is reported, not compared)
      if(pv&&Ms['F+THC']){const x=Ms['F+THC'];const diffs={hipsDev:Math.abs(x.hipsDev.max-pv.hipsDev.max),gap:Math.abs(x.gapAtContact-pv.gapAtContact),footDir:Math.abs(x.footDeg-pv.footDeg),sole:Math.abs(x.sole.all-pv.sole.all),drift:Math.abs(x.plantDrift-pv.plantDrift),gameBallDirDiff:+Math.abs(x.ballDeg-pv.ballDeg).toFixed(1)};
        check(m,`${sn}: F+THC reproduces check_shot.js`,diffs.hipsDev<=0.002&&diffs.gap<=0.002&&diffs.footDir<=0.5&&diffs.sole<=0.002&&diffs.drift<=0.002,diffs,'<= 2 mm, foot direction <= 0.5°');}
      const baseOf={};for(const [v,b] of Object.entries(BASE))if(Ms[b])baseOf[v]=Object.assign({name:b},Ms[b]);
      M.scen[sn]={tC:S.tC,tPl:S.tPl,backAt:S.backAt,clearance:S.clearance,variants:{}};
      for(const [v,X] of Object.entries(Ms)){gatesFor(m,TAKE,sn,v,X,R.ref,baseOf);const c=Object.assign({},X);delete c.angles;
        // the plant foot against the ball with the kick in only (the earlier clip's pose at the D press left out), and the
        // closest tick: a diagnosis beside the gate, not a gate
        const f=S.variants[v].rows,kin=f.filter(r=>r.kickWeight>0&&r.t<=S.tC+1e-6),w=kin.reduce((a,b)=>b.L.gap<a.L.gap?b:a,kin[0]);
        const all=f.filter(r=>r.t<=S.tC+1e-6).reduce((a,b)=>b.L.gap<a.L.gap?b:a);
        c.plantBall={min:all.L.gap,at:all.t,kickWeight:all.kickWeight,kickInMin:w.L.gap,kickInAt:w.t,beforePlant:w.t<S.tPl,ballAhead:+(w.ball[2]-w.player[1]).toFixed(4),
          plantVsBall:{forward:+(w.lAnk[2]-w.ball[2]).toFixed(4),side:+(w.lAnk[0]-w.ball[0]).toFixed(4)}};
        // where the plant foot slides fastest on the ground (same window as the measurement), and where the body is fastest
        let sl={v:0};for(let j=1;j<f.length;j++){const a=f[j],b=f[j-1];if(a.t<0.15-1e-6||a.t>S.backAt+1e-6)continue;if(a.L.low<LIM.grounded&&b.L.low<LIM.grounded){const s=Math.hypot(a.lAnk[0]-b.lAnk[0],a.lAnk[2]-b.lAnk[2])*60;if(s>sl.v)sl={v:+s.toFixed(3),t:a.t,beforePlant:a.t<S.tPl,locked:a.t>=S.tPl-1e-6&&a.t<=S.backAt+1e-6,kickWeight:a.kickWeight,lockShift:a.lock,dShift:a.dShift};}}
        c.slideAt=sl;c.ikMissMax=S.variants[v].ikMissMax;
        M.scen[sn].variants[v]=c;}}
    M.shots=await shots(page,m,R,Object.keys(R.scen).flatMap(sn=>[[sn,'A'],[sn,'F'],[sn,'P']]));
    fs.writeFileSync(out(`diag143_${m.replace(/\W/g,'_')}.json`),JSON.stringify({R,report:M}));
    await page.close();}
  await browser.close();
  // ---- the report ----
  const L=[];const p=s=>{L.push(s);console.log(s);};
  const bad=checks.filter(c=>!c.ok);
  p('=== 검사 도구 자체 확인 ===');for(const c of checks)p(`${c.ok?'ok  ':'FAIL'} ${c.model} ${c.name}: ${JSON.stringify(c.value)} (${JSON.stringify(c.limit)})`);
  // independent verdicts per problem, from check_shot.js's gates (the combined "no foot inside the ball" split by foot here)
  const G=gates.filter(g=>g.sec==='new'&&g.take===TAKE);
  const cat={'지지발-공 겹침':g=>g.name==='no foot inside the ball'?(g.value.plant>=LIM.inBall):undefined,'차는 발-공 겹침(접촉 전)':g=>g.name==='no foot inside the ball'?(g.value.kick>=LIM.inBall):undefined,
    '지면 침투':g=>g.name==='ground'?g.ok:undefined,'지지발 미끄러짐':g=>g.name==='plant drift'?g.ok:undefined,'지지발 접지':g=>g.name==='plant on the ground at contact'?g.ok:undefined,
    '몸 이동량(전환)':g=>g.name==='fade jump body'?g.ok:undefined,'몸 이동량(킥 중)':g=>g.name==='kick body speed'?g.ok:undefined,'발 이동량(전환)':g=>g.name==='fade jump feet'?g.ok:undefined,
    '접촉 위치':g=>g.name==='contact gap'?g.ok:undefined,'접촉 시점':g=>g.name==='timing'?g.ok:undefined,'킥 방향':g=>g.name==='direction'?g.ok:undefined,'골반-선수 거리':g=>g.name==='body near player'?g.ok:undefined,
    '무릎·발목 보존':g=>g.name==='knee and ankle unchanged by the repair'?g.ok:undefined};
  const table={};
  for(const m of MODELS){table[m]={};for(const kind of ['standing','running straight']){table[m][kind]={};
    for(const v of VARS){const gs=G.filter(g=>g.model===m&&g.variant===v&&g.scen.startsWith(kind+' D'));const row={failedGates:gs.filter(g=>!g.ok).length,gates:gs.length};
      for(const [c,fn] of Object.entries(cat)){const vs=gs.map(fn).filter(x=>x!==undefined);row[c]=vs.length?(vs.every(Boolean)?'ok':`FAIL ${vs.filter(x=>!x).length}/${vs.length}`):'-';}
      table[m][kind][v]=row;}}}
  p('=== 변형별 독립 판정 (D 0.1/0.2/0.3 s 세 경우 합; check_shot.js 기준 그대로) ===');
  for(const m of MODELS)for(const kind of ['standing','running straight']){p(`-- ${m} ${kind==='standing'?'정지':'곧은 달리기'}`);const cats=Object.keys(cat);p(['변형','실패/게이트',...cats].join(' | '));
    for(const v of VARS){const r=table[m][kind][v];p([`${v} ${LABEL[v]}`,`${r.failedGates}/${r.gates}`,...cats.map(c=>r[c])].join(' | '));}}
  p('=== 실패한 게이트 (측정값 / 기준) ===');for(const g of G.filter(g=>!g.ok))p(`FAIL ${g.model} ${g.scen} ${g.variant} · ${g.name}: ${JSON.stringify(g.value)} / ${JSON.stringify(g.limit)}`);
  fs.writeFileSync(out('diag143_gates.log'),gates.map(g=>`${g.ok?'ok  ':'FAIL'} [${g.sec}] ${g.model} ${g.take} ${g.scen} ${g.variant} · ${g.name}: 측정 ${JSON.stringify(g.value)} / 기준 ${JSON.stringify(g.limit)} / 이유: ${g.why}`).join('\n')+'\n');
  const keys=Object.keys(csv[0]||{});fs.writeFileSync(out('diag143_frames.csv'),keys.join(',')+'\n'+csv.map(r=>keys.map(k=>typeof r[k]==='string'?`"${r[k]}"`:r[k]).join(',')).join('\n')+'\n');
  rep.checks=checks;rep.table=table;fs.writeFileSync(out('diag143_report.json'),JSON.stringify(rep,null,1));fs.writeFileSync(out('diag143_report.txt'),L.join('\n')+'\n');
  p(bad.length?`DIAG INCOMPLETE: 검사 도구 확인 ${bad.length}건 실패 — 위 판정을 결과로 쓰지 말 것`:`DIAG COMPLETE: 도구 확인 ${checks.length}건 통과, 게이트 ${G.length}개 (실패 ${G.filter(g=>!g.ok).length})`);
  process.exitCode=bad.length?2:0;
})();
