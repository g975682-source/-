// 11_01 right-foot kick against the game's ball and shot timing (Playwright + SwiftShader, as check.js).
// Compares ways of lining the foot up with the ball, frame by frame in the holder's frame (the game's p.pos, +z
// forward), the shot timing windows, foot height against the source, and the jumps when fading in and out.
// Usage (from this folder): node check_kick.js [model.glb ...]   (default: Xbot.glb Soldier.glb)
// Writes out/kick_align_<model>.json (every frame of every method) and screenshots out/kick_<method>_<scene>_<view>.png.
// Exit 1 on any failed gate (listed at the end with the measured value and where its limit comes from).
const path=require('path'),fs=require('fs');
const P=require('../../tests/legacy/paths.js');
const {chromium}=require(P.PLAYWRIGHT);
const DIR=__dirname,three=fs.readFileSync(P.THREE_JS,'utf8');
const models=process.argv.slice(2).length?process.argv.slice(2):['Xbot.glb','Soldier.glb'];
const TAKE='11_01',BALL_Z=0.5;   // the game keeps a carried ball 0.5 m ahead of a standing player (index.html, the dribble offset)
// the game's human shot (index.html 3865, 3768-3769, 2409): D released -> K.pend.ttl 0.24, taken off once per 1/60 s
// tick from the tick the key is handled in (humanUpdate, STEP=1/60 at 766) -> the ball leaves 14 ticks (0.2333 s)
// later; the kick pose then runs from oT 0.15 to oDur 0.45: 0.30 s (18 ticks)
const GAME={beforeRelease:14/60,afterRelease:18/60};
// the game itself, read only (tests/legacy/harness.js loads index.html as it is): where the player and the ball are on
// every 1/60 s tick from D pressed, standing and running, for D held 0.1, 0.2 and 0.3 s
async function probeGame(){
  const open=require('../../tests/legacy/harness.js');const {browser,page,errors}=await open();
  const sc=await page.evaluate(()=>{const g=__game;g.startMatch({mode:'play',minutes:12,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(1);
    const one=(running,holdTicks)=>{const p=g.give(0,9);p.pos.set(0,0,0);p.face=Math.PI/2;p.vel.set(running?6:0,0,0);p.wantVel.copy(p.vel);g.ball.pos.set(0.5,0.11,0);
      for(const q of g.players)if(q!==p&&!q.isGK){q.pos.set(q.team?-30:-40,0,q.slot*3-15);q.vel.set(0,0,0);}
      g.setCtl(p);p.sk=null;p.cdSkill=0;g.sim(1/60);
      if(running){g.actDown('right');for(let k=0;k<60;k++)g.sim(1/60);}
      const x0=p.pos.x,rows=[],rec=()=>{const b=g.ball.pos;rows.push({t:+(rows.length/60).toFixed(4),z:+(p.pos.x-x0).toFixed(4),ballAhead:+(b.x-p.pos.x).toFixed(4),owned:g.ball.owner===p,kickPose:p.oAnim==='kick'});};
      rec();g.actDown('shoot');for(let k=0;k<holdTicks;k++){g.sim(1/60);rec();}g.actUp('shoot');if(running)g.actUp('right');
      for(let k=0;k<60;k++){g.sim(1/60);rec();}
      const kRel=rows.findIndex(r=>!r.owned),kKey=rows.findIndex(r=>r.kickPose);
      return {name:(running?'running':'standing')+' D '+(holdTicks/60).toFixed(1)+' s',running,hold:holdTicks/60,rows,releaseKey:kKey/60,contact:(kRel-1)/60,   // exact tick times (rounded seconds made a kick start a tick late)
        ballAtContact:rows[kRel-1].ballAhead,
        movedPressToContact:rows[kRel-1].z,movedContactPlus03:+(rows[Math.min(rows.length-1,kRel-1+18)].z-rows[kRel-1].z).toFixed(4)};};
    return [one(false,6),one(false,12),one(false,18),one(true,6),one(true,12),one(true,18)];});
  await browser.close();
  return {scenarios:sc,errors:errors.filter(e=>!e.includes('ERR_FAILED'))};
}
(async()=>{
  const GP=await probeGame();
  for(const s of GP.scenarios)console.log(JSON.stringify({game:s.name,releaseKey:s.releaseKey,contact:s.contact,ballAtContact:s.ballAtContact,movedPressToContact:s.movedPressToContact,movedAfterContact03:s.movedContactPlus03}));
  const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const gates=[],gate=(model,name,ok,value,limit,why)=>gates.push({model,name,ok:!!ok,value,limit,why});
  gate('game','probe ran without page errors',!GP.errors.length,GP.errors.slice(0,3),'none','the game page must load and play');
  gate('game','ball leaves 14 ticks after the key tick in every scenario',GP.scenarios.every(s=>Math.round((s.contact+1/60-s.releaseKey)*60)===14),GP.scenarios.map(s=>Math.round((s.contact+1/60-s.releaseKey)*60)),14,'index.html 3768: ttl 0.24 at 1/60 s');
  for(const m of models){
    const page=await browser.newPage({viewport:{width:1000,height:640}});
    const errors=[];
    page.on('console',x=>{if(x.type()==='error')errors.push(x.text());});
    page.on('pageerror',e=>errors.push('pageerror: '+e.message));
    await page.route('**/*',r=>{const u=r.request().url();
      if(u.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'});
      if(u.startsWith('http://viewer.local/')){const f=path.join(DIR,decodeURIComponent(u.slice(20).split('?')[0])||'index.html');
        if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.html')?'text/html':'application/octet-stream'});
        return r.fulfill({status:404,body:'not found'});}
      return r.abort();});
    await page.goto('http://viewer.local/index.html?autoload=0');
    const R=await page.evaluate(async({m,TAKE,BALL_Z,GAME,SCEN})=>{
      const V=window.__viewer,out={};
      if(!(await V.load('models/'+m)))return {failed:'model: '+document.querySelector('#status').textContent};
      const add=async(before,after,name)=>{const info=await V.addBVH(`models/cmu/${TAKE}.bvh`,{trim:true,before,after,name});if(!info)return null;
        const ci=V.clipsIn.findIndex(c=>c.retarget===info);return {info,c:V.clipsIn[ci],ip:V.clipsPlay[ci],raw:V.animations[ci]};};
      const full=await add(0.6,0.5);if(!full)return {failed:'retarget: '+document.querySelector('#status').textContent};
      const finite=c=>c.tracks.every(t=>Array.prototype.every.call(t.values,Number.isFinite));
      let i=V.inst[0];const idle=V.animations.find(c=>/^idle$/i.test(c.name))||V.animations[0];
      const times=d=>{const t=[];for(let k=0;k<=Math.round(d*60);k++)t.push(Math.min(d,k/60));return t;};
      // the contact: the bottom of the kicking toe's arc near the fastest frame (the source has no ball; there the toe is
      // lowest and slows sharply right after, see README). Sampled at 240 Hz around the fastest frame.
      const arc=(clip,strike)=>{const s=GLKick.series(i,clip,Array.from({length:43},(_,k)=>strike-0.03+k/240),null,BALL_Z);
        let b=s[0];for(const f of s)if(f.rToe[1]<b.rToe[1])b=f;return b.t;};
      const tc=arc(full.ip,full.c.strikeAt);
      out.take={strikeFastest:full.c.strikeAt,contact:tc,duration:full.ip.duration,foot:full.c.strikeFoot,window:[full.info.from,full.info.to],finite:{inPlace:finite(full.ip),raw:finite(full.raw)},
        sourceFootLow:full.info.sourceFootLow,kick:full.info.kick,hipScale:full.info.hipScale};
      // offsets per method (holder frame, metres, against clip time)
      const T=times(full.ip.duration),base=GLKick.series(i,full.ip,T,null,BALL_Z);
      const cA=GLKick.contact(i,full.ip,tc,'Right',BALL_Z),cR=GLKick.contact(i,full.raw,tc,'Right',BALL_Z);
      const at=(s,t)=>s.reduce((a,b)=>Math.abs(b.t-t)<Math.abs(a.t-t)?b:a);
      const hc=at(base,tc).hips;
      // the source's flight before the plant: both feet off the ground (lowest skinned point over 2 cm) - the offset
      // may grow there without a foot sliding on the ground
      // the plant: the first frame before the contact where the plant (left) foot is down after being up
      let plant=null;for(let j=1;j<base.length;j++){const f=base[j];if(f.t>=tc)break;if(f.L.low<0.02&&base[j-1].L.low>=0.02)plant=f.t;}
      const fly=plant!=null?[0,plant]:null;   // D: the offset grows from the clip's start until the plant foot lands
      const smooth=x=>x<=0?0:x>=1?1:x*x*(3-2*x);
      const methods={
        base:{clip:full.ip,off:null,note:'제자리판 그대로 (지금 뷰어)'},
        A:{clip:full.ip,off:{times:[0,full.ip.duration],xz:[cA.offset,cA.offset]},note:'제자리판 + 고정 오프셋'},
        B:{clip:full.ip,off:{times:base.map(f=>f.t),xz:base.map(f=>[cA.offset[0]-(f.hips[0]-hc[0]),cA.offset[1]-(f.hips[2]-hc[2])])},note:'골반을 타격 순간 위치에 고정'},
        R:{clip:full.raw,off:{times:[0,full.ip.duration],xz:[cR.offset,cR.offset]},note:'원래판(도움닫기 이동 유지) + 고정 오프셋'},
        D:{clip:full.ip,off:fly?{times:base.map(f=>f.t),xz:base.map(f=>{const s=smooth((f.t-fly[0])/Math.max(1/60,fly[1]-fly[0]));return [cA.offset[0]*s,cA.offset[1]*s];})}:null,note:'제자리판 + 도움닫기(시작~디딤발 착지) 동안 오프셋을 키운 뒤 유지'},
        D2:{clip:full.ip,off:fly?{times:base.map(f=>f.t),xz:base.map(f=>{const up=smooth((f.t-fly[0])/Math.max(1/60,fly[1]-fly[0])),down=f.t<=tc+0.05?1:1-smooth((f.t-tc-0.05)/Math.max(1/60,full.ip.duration-tc-0.05));const s=up*down;return [cA.offset[0]*s,cA.offset[1]*s];})}:null,note:'D + 타격 0.05 s 뒤부터 끝까지 오프셋을 다시 0으로'}};
      out.contactFit={inPlace:cA,raw:cR};out.plantLanding=plant;
      // the game's window: the ball leaves 0.24 s after the clip starts, the clip ends 0.30 s later
      const shift=tc-full.c.strikeAt,win=await add(GAME.beforeRelease-shift,GAME.afterRelease+shift,`${TAKE} 킥 (게임 슛 구간)`);
      i=V.inst[0];   // adding a clip rebuilds the instances: the old one no longer holds the model
      if(win){const tcW=arc(win.ip,win.c.strikeAt),cW=GLKick.contact(i,win.ip,tcW,'Right',BALL_Z),cWR=GLKick.contact(i,win.raw,tcW,'Right',BALL_Z);
        out.window={contact:tcW,duration:win.ip.duration,finite:{inPlace:finite(win.ip),raw:finite(win.raw)},fit:{inPlace:cW,raw:cWR},sourceFootLow:win.info.sourceFootLow};
        methods.CA={clip:win.ip,off:{times:[0,win.ip.duration],xz:[cW.offset,cW.offset]},tc:tcW,note:'게임 슛 구간(공 출발 14틱=0.233 s 전 ~ 0.30 s 후) + 고정 오프셋'};
        methods.CR={clip:win.raw,off:{times:[0,win.ip.duration],xz:[cWR.offset,cWR.offset]},tc:tcW,note:'게임 슛 구간 + 원래판 + 고정 오프셋'};}
      window.__kickMeta=Object.fromEntries(Object.entries(methods).map(([k,M])=>[k,{clip:M.clip,off:M.off,label:k+': '+M.note}]));
      out.methods={};
      // every 1/60 s, and the contact itself (it falls between frames)
      const timesC=(d,t)=>times(d).concat([t]).sort((a,b)=>a-b);
      for(const [k,M] of Object.entries(methods)){if(!M.clip)continue;const tcm=M.tc??tc,s=GLKick.series(i,M.clip,timesC(M.clip.duration,tcm),M.off,BALL_Z);
        const tr={x0:GLKick.transition(i,idle,M.clip,M.off,0,tcm,BALL_Z),x15:GLKick.transition(i,idle,M.clip,M.off,0.15,tcm,BALL_Z),x25:GLKick.transition(i,idle,M.clip,M.off,0.25,tcm,BALL_Z)};
        out.methods[k]={note:M.note,contact:tcm,offset:M.off,frames:s,transition:tr};}
      // the model's own clips: how low its feet go there (the ground limit below comes from these)
      out.own={};for(const c of V.animations.filter(c=>!c.inPlaceVersion&&c.duration>0.2)){const s=GLKick.series(i,c,times(Math.min(c.duration,3)).filter((_,k)=>k%2===0),null,BALL_Z);
        out.own[c.name]=+Math.min(...s.map(f=>Math.min(f.R.low,f.L.low))).toFixed(4);}
      // ---- ground repairs on the full in-place clip: toes bent up, or hips lifted ----
      {const toe=GLKick.fixToes(i,full.ip),lift=GLKick.liftHips(i,full.ip),toeLift=GLKick.liftHips(i,toe.clip),T2=times(full.ip.duration);
        const bonesOf=()=>{const o={};i.root.traverse(b=>{if(b.isBone)o[b.name]=b.getWorldPosition(new THREE.Vector3());});return o;};
        // the toe repair must leave every bone but the toes where it was
        let worst=0,worstBone='';const pa=(c,t)=>{const mx=i.mixer;mx.stopAllAction();const a=mx.clipAction(c);a.reset();a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.play();a.time=t;mx.update(0);i.root.updateWorldMatrix(true,false);i.root.updateMatrixWorld(true);return bonesOf();};
        for(const t of T2.filter((_,k)=>k%2===0)){const A=pa(full.ip,t),B=pa(toe.clip,t);for(const n in A){if(/Toe/.test(n))continue;const d=A[n].distanceTo(B[n]);if(d>worst){worst=d;worstBone=n;}}}
        i.mixer.stopAllAction();
        out.ground2={toe:{info:toe.info,otherBonesMoved:+worst.toFixed(6),worstBone,frames:GLKick.series(i,toe.clip,T2,null,BALL_Z)},lift:{info:lift.info,frames:GLKick.series(i,lift.clip,T2,null,BALL_Z)},
          toeLift:{info:{toe:toe.info,lift:toeLift.info},frames:GLKick.series(i,toeLift.clip,T2,null,BALL_Z)}};
        const tr=GLKick.fixToes(i,full.raw);window.__toeRaw={clip:GLKick.liftHips(i,tr.clip).clip};}   // E2: the raw clip with the same repair (toes, then the hips)
      // ---- shots in the game's own timeline (D pressed at t=0), from the game probe ----
      {const runClip=V.animations.find(c=>/^run$/i.test(c.name))||idle,sm=x=>x<=0?0:x>=1?1:x*x*(3-2*x),ramp=(t,a,b)=>sm((t-a)/Math.max(1e-6,b-a));
        const rawToe=window.__toeRaw.clip;out.shots={};window.__shotCfg={};
        // the raw clip's smoothed travel: raw hips minus in-place hips, in the holder's frame, against clip time
        const T3=times(full.ip.duration),sr=GLKick.series(i,full.raw,T3,null,BALL_Z),si=GLKick.series(i,full.ip,T3,null,BALL_Z);
        const travel={times:T3,xz:sr.map((f,k)=>[f.hips[0]-si[k].hips[0],f.hips[2]-si[k].hips[2]])};
        for(const sc of SCEN){const rows=sc.rows,zAt=t=>rows[Math.min(rows.length-1,Math.max(0,Math.round(t*60)))].z;   // by tick index
          const tC=sc.contact,tRel=sc.releaseKey,zc=zAt(tC),tPl=tC-(tc-plant);
          const cI=GLKick.contact(i,full.ip,tc,'Right',sc.ballAtContact),cR=GLKick.contact(i,full.raw,tc,'Right',sc.ballAtContact),cT=GLKick.contact(i,rawToe,tc,'Right',sc.ballAtContact);
          const common={prev:sc.running?runClip:idle,back:idle,xfIn:0.15,xfOut:0.25,backAt:tC+GAME.afterRelease,tEnd:tC+GAME.afterRelease+0.35,game:rows};
          // E: the raw clip, first looking like the in-place one (its smoothed travel taken off: hips over the player), then,
          // from the plant on, still in the world with the foot on the ball at the contact (the game's own movement taken off)
          const anchored=c=>(t,kt,wk)=>{const s=ramp(t,0,tPl),dz=zAt(t)-zc,p=GLKick.offsetAt(travel,kt);return [wk*((1-s)*-p[0]+s*c.offset[0]),wk*((1-s)*-p[1]+s*(c.offset[1]-dz))];};
          const lin=(c,a,b)=>(t,kt,wk)=>{const s=ramp(t,a,b);return [wk*s*c.offset[0],wk*s*c.offset[1]];};
          const M={A:{kick:full.ip,kickStart:0,off:lin(cI,0,tPl),note:'제자리판, 킥 시작(D 누름)~디딤 착지 동안 오프셋 증가 (지금의 D)'},
            B:{kick:full.ip,kickStart:0,off:lin(cI,0,tC),note:'제자리판, D 누름~접촉 동안 오프셋 증가'},
            C:{kick:full.ip,kickStart:tRel,off:lin(cI,tRel,tC),note:'제자리판, 킥 클립을 D 뗄 때 시작, 그때부터 접촉까지 오프셋 증가'},
            D:{kick:full.raw,kickStart:0,off:()=>[0,0],note:'원래판(원본 이동), 오프셋 없음 (비교 기준)'},
            E:{kick:full.raw,kickStart:0,off:anchored(cR),note:'원래판, D 누름~디딤 착지 동안 오프셋 증가, 그 뒤 모델을 월드에 고정 (게임 이동 상쇄)'},
            E2:{kick:rawToe,kickStart:0,off:anchored(cT),note:'E + 접지 보정 (발가락 굽힘, 남는 만큼 골반 높이)'},
            E3:{kick:rawToe,kickStart:0,off:anchored(cT),groundClamp:true,note:'E2 + 전환 중 발이 묻히면 모델 전체를 그만큼 올림'}};
          out.shots[sc.name]={contact:tC,releaseKey:tRel,plant:tPl,fits:{inPlace:cI,raw:cR,rawToe:cT},methods:{}};window.__shotCfg[sc.name]={};
          for(const [k,mm] of Object.entries(M)){const cfg=Object.assign({},common,mm,{t0:tc-(tC-mm.kickStart)});window.__shotCfg[sc.name][k]=cfg;
            out.shots[sc.name].methods[k]={note:mm.note,kickStart:mm.kickStart,t0:+cfg.t0.toFixed(4),frames:GLKick.shotSim(i,cfg)};}}}
      return out;},{m,TAKE,BALL_Z,GAME,SCEN:GP.scenarios});
    if(R.failed){gate(m,'load and retarget',false,R.failed,'-','the clip must load');await page.close();continue;}
    gate(m,'load and retarget',true,R.take.duration,'loaded','the clip must load');
    fs.writeFileSync(path.join(DIR,'out',`kick_align_${m.replace(/\W/g,'_')}.json`),JSON.stringify(R));
    if(errors.length)gate(m,'console errors',false,errors.slice(0,3).join(' | '),0,'the page must not log errors');
    console.log(JSON.stringify({model:m,take:Object.assign({},R.take,{sourceFootLow:undefined}),plantLanding:R.plantLanding,contactFit:R.contactFit,window:R.window&&Object.assign({},R.window,{sourceFootLow:undefined})}));
    R.model=m;await summarise(R,gate);
    summariseShots(R,gate);
    fs.writeFileSync(path.join(DIR,'out',`kick_align_${m.replace(/\W/g,'_')}.json`),JSON.stringify(R));
    await screenshots(page,m,R);
    await shotShots(page,m,R);
    // the viewer's own ball readout, paused at the contact on the plain in-place clip, against the measured base gap
    const ui=await page.evaluate(({tc})=>{const V=window.__viewer,i=V.inst[0];const b=V.scene.getObjectByName('kickBall');if(b)b.visible=false;const l=V.scene.getObjectByName('kickLine');if(l)l.visible=false;
      const lab=document.querySelector('#kickLab');if(lab)lab.remove();i.root.position.copy(i.root.userData.calib||i.root.position);
      document.querySelector('#showBall').checked=true;document.querySelector('#xfade').value='0';V.stopAll();V.play(window.__kickMeta.base.clip.name);V.setPaused(true);
      const a=V.inst[0].cur;a.time=tc;V.inst[0].mixer.update(0);return true;},{tc:R.methods.base.contact});
    await page.waitForTimeout(600);
    const hud=await page.$eval('#hud',e=>e.textContent),mm=hud.match(/오른발-공 (-?[\d.]+)m/);
    await page.locator('#view').screenshot({path:path.join(DIR,'out',`kick_${m.replace(/\W/g,'_')}_viewer_ball.png`)}).catch(()=>{});
    const want=R.methods.base.frames.find(f=>Math.abs(f.t-R.methods.base.contact)<1e-6).R.gap;
    gate(m,'viewer ball readout matches the measurement',mm&&Math.abs(+mm[1]-want)<=0.01,{hud:mm?+mm[1]:hud,measured:want},'within 0.01 m','same foot points, same ball; the viewer samples 1500 vertices less often');
    await page.close();
  }
  await browser.close();
  console.log('--- gates');for(const g of gates)console.log(`${g.ok?'ok  ':'FAIL'} ${g.model} ${g.name}: ${JSON.stringify(g.value)} (limit ${JSON.stringify(g.limit)}; ${g.why})`);
  const bad=gates.filter(g=>!g.ok).length;
  console.log(bad?`CHECK FAIL: ${bad} gate(s)`:'CHECK PASS');process.exitCode=bad?1:0;
})();

// per method: foot to ball, sliding feet, body away from the holder, offset speed; and the gates
async function summarise(R,gate){
  const m=R.model,dist=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]),rows=[];
  const take=R.take,base=R.methods.base.frames;
  gate(m,'tracks finite',take.finite.inPlace&&take.finite.raw&&(!R.window||R.window.finite.inPlace&&R.window.finite.raw),take.finite,'all','retarget must not make NaN or Infinity');
  // the clip moves: largest per-frame move of the kicking toe (the earlier static-clip failure showed 0.002)
  const toeMove=Math.max(...base.slice(1).map((f,k)=>Math.hypot(f.rToe[0]-base[k].rToe[0],f.rToe[1]-base[k].rToe[1],f.rToe[2]-base[k].rToe[2])));
  gate(m,'clip moves (toe, max per 1/60 s)',toeMove>0.005,+toeMove.toFixed(3),'>0.005','check_bvh.js limit; a broken retarget measured 0.002');
  const fits=[R.contactFit.inPlace,R.contactFit.raw].concat(R.window?[R.window.fit.inPlace,R.window.fit.raw]:[]);
  gate(m,'contact fit coordinates are numbers',fits.every(c=>[...c.lead,...c.ballCentre,...c.offset,c.speed].every(Number.isFinite)),fits.length+' fits','finite','a NaN here would place the ball nowhere');
  gate(m,'contact inside the clip',take.contact>0&&take.contact<take.duration&&Math.abs(take.contact-take.strikeFastest)<0.05,{contact:take.contact,fastest:take.strikeFastest},'0 < t < duration, within 0.05 s of the fastest frame','the source arc bottom is 0.017 s after its fastest frame');
  // toe speed at contact against the source's (scaled by the hip ratio): the retarget turns bones, so speeds follow
  const sp=s=>{const k=s.findIndex(f=>f.t>=take.contact-1e-6);const a=s[Math.max(0,k-1)],b=s[Math.min(s.length-1,k+1)];return Math.hypot(b.rToe[0]-a.rToe[0],b.rToe[1]-a.rToe[1],b.rToe[2]-a.rToe[2])/(b.t-a.t);};
  const v=sp(base);take.toeSpeedAtContact=+v.toFixed(2);
  for(const [k,M] of Object.entries(R.methods)){const f=M.frames,tc=M.contact,before=f.filter(x=>x.t<=tc-2/60);
    const atc=f.reduce((a,b)=>Math.abs(b.t-tc)<Math.abs(a.t-tc)?b:a);   // the contact is one of the samples
    // a foot slides: its ankle moves across the ground while that foot's lowest point is on the ground (<2 cm)
    const slide=(lowKey,ank)=>{let mx=0,sum=0,n=0;for(let j=1;j<f.length;j++)if(f[j][lowKey].low<0.02&&f[j-1][lowKey].low<0.02){const s=dist(f[j][ank],f[j-1][ank])/(f[j].t-f[j-1].t);mx=Math.max(mx,s);sum+=s;n++;}return {max:+mx.toFixed(2),mean:n?+(sum/n).toFixed(2):null,frames:n};};
    const off=M.offset?f.map(x=>{const o=offsetAtNode(M.offset,x.t);return o;}):f.map(()=>[0,0]);
    const offV=Math.max(0,...off.slice(1).map((o,j)=>Math.hypot(o[0]-off[j][0],o[1]-off[j][1])*60));
    const hipsAway=f.map(x=>Math.hypot(x.hips[0],x.hips[2]));
    const row={method:k,note:M.note,contact:+tc.toFixed(4),
      gapAtContact:atc.R.gap,gapMinBefore:before.length?Math.min(...before.map(x=>x.R.gap)):null,plantGapMin:Math.min(...f.filter(x=>x.t<=tc).map(x=>x.L.gap)),
      gapMin:Math.min(...f.filter(x=>x.t<=tc+1/60).map(x=>x.R.gap)),
      plantGapMinAt:f.filter(x=>x.t<=tc).reduce((a,b)=>b.L.gap<a.L.gap?b:a).t,
      plantAtContact:{lateral:+(atc.lAnkle[0]-0).toFixed(3),alongBall:+(atc.lAnkle[2]-BALL_Zn).toFixed(3),height:atc.L.low},
      plantSlide:slide('L','lAnkle'),kickFootSlide:slide('R','rAnkle'),
      hipsAway:{start:+hipsAway[0].toFixed(3),contact:+Math.hypot(atc.hips[0],atc.hips[2]).toFixed(3),end:+hipsAway[hipsAway.length-1].toFixed(3),max:+Math.max(...hipsAway).toFixed(3)},
      offsetMax:+Math.max(...off.map(o=>Math.hypot(o[0],o[1]))).toFixed(3),offsetSpeedMax:+offV.toFixed(2),
      transition:M.transition};
    rows.push(row);}
  R.rows=rows;
  // timing: the phases of the kick in the clip, and what each way of fitting the game's 0.24 s + 0.30 s keeps
  {const f=base,tc=take.contact,pl=R.plantLanding;
    const pre=f.filter(x=>x.t<tc&&x.t>=(pl??0)-0.25);const back=pre.reduce((a,b)=>b.rAnkle[1]>a.rAnkle[1]?b:a,pre[0]);
    const land=f.find(x=>x.t>tc+0.05&&x.R.low<0.02);
    const ph={plantLanding:pl,backswingTop:back?back.t:null,contact:+tc.toFixed(4),kickFootDownAgain:land?land.t:null,clipEnd:+take.duration.toFixed(3)};
    const need={before:GAME.beforeRelease,after:GAME.afterRelease},pre0=tc,post0=take.duration-tc;
    const uni=take.duration/(need.before+need.after);   // one speed for the whole clip
    const part={before:pre0/need.before,after:post0/need.after};
    R.timing={phases:ph,game:need,
      window:{from:+(tc-need.before).toFixed(3),to:+(tc+need.after).toFixed(3),keeps:{plantLanding:pl!=null&&pl>=tc-need.before,backswingTop:ph.backswingTop>=tc-need.before,kickFootDownAgain:!!(land&&land.t<=tc+need.after)},
        plantToContact:pl!=null?+(tc-pl).toFixed(3):null,toeSpeedAtContact:take.toeSpeedAtContact},
      uniformSpeed:{factor:+uni.toFixed(2),contactAt:+(tc/uni).toFixed(3),contactLateBy:+(tc/uni-need.before).toFixed(3),plantToContact:pl!=null?+((tc-pl)/uni).toFixed(3):null,toeSpeedAtContact:+(take.toeSpeedAtContact*uni).toFixed(1)},
      splitSpeed:{before:+part.before.toFixed(2),after:+part.after.toFixed(2),plantToContact:pl!=null?+((tc-pl)/part.before).toFixed(3):null,backswingToContact:ph.backswingTop!=null?+((tc-ph.backswingTop)/part.before).toFixed(3):null,toeSpeedBeforeContact:+(take.toeSpeedAtContact*part.before).toFixed(1)}};
    console.log(JSON.stringify({model:m,timing:R.timing}));}
  console.log(JSON.stringify({model:m,toeSpeedAtContact:take.toeSpeedAtContact,rows}));
  // foot height against the source on the same footing: lowest foot joint (ankle or toe joint) over its own floor
  // (target: the lowest such joint in the clip's 20th percentile, as the retarget grounds the clip; source: the
  // take's 10th percentile floor). Both are joints, so the sole thickness does not enter.
  const srcLow=take.sourceFootLow,jl=base.map(x=>Math.min(x.rAnkle[1],x.rToe[1],x.lAnkle[1],x.lToe[1]));
  const floorT=[...jl].sort((a,b)=>a-b)[Math.floor(jl.length*0.1)];
  const diffs=base.map((x,j)=>{const fidx=j/(base.length-1)*(srcLow.length-1),a=Math.floor(fidx),s=srcLow[a]+(srcLow[Math.min(a+1,srcLow.length-1)]-srcLow[a])*(fidx-a);return (jl[j]-floorT)-s;});
  const soleMin=Math.min(...base.map(x=>Math.min(x.R.low,x.L.low))),ownMin=Math.min(...Object.values(R.own));
  R.ground={jointVsSourceMax:+Math.max(...diffs).toFixed(3),jointVsSourceMin:+Math.min(...diffs).toFixed(3),soleMin:+soleMin.toFixed(3),ownClipsSoleMin:R.own,
    sourceAirborneMax:+Math.max(...srcLow).toFixed(3)};
  console.log(JSON.stringify({model:m,ground:R.ground}));
  // gates
  const pick=k=>rows.find(r=>r.method===k);
  for(const k of ['A','B','R','D','D2','CA','CR']){const r=pick(k);if(!r)continue;
    const fit=k.startsWith('C')?R.window.fit[k==='CA'?'inPlace':'raw']:R.contactFit[k==='R'?'raw':'inPlace'];
    gate(m,`${k}: a touching ball position was found`,fit.touchFound,fit.touchFound,'found','the ball on the ground must be reachable by the foot at the contact');
    gate(m,`${k}: foot touches the ball at contact`,Math.abs(r.gapAtContact)<=0.03,r.gapAtContact,'|gap| <= 0.03 m','the fit puts the ball against the foot; 0.03 m is the ground-contact tolerance used for the feet');
    gate(m,`${k}: no foot inside the ball before contact`,(r.gapMinBefore??1)>=-0.03&&r.plantGapMin>=-0.03,{kick:r.gapMinBefore,plant:r.plantGapMin},'>= -0.03 m','same tolerance');}
  gate(m,'toe speed at contact vs source',v>=0.75*take.kick.peakToeSpeedSourceUnits*take.hipScale&&v<=1.25*take.kick.peakToeSpeedSourceUnits*take.hipScale,{retarget:+v.toFixed(2),source:+(take.kick.peakToeSpeedSourceUnits*take.hipScale).toFixed(2)},'within 25 %','bones are turned, not stretched: speed follows the source up to limb proportions');
  // sinking: no deeper than the model's own clips go, plus how far the take's own joints dip under its floor
  const srcDip=Math.min(0,...take.sourceFootLow),sinkLimit=+(Math.min(ownMin,0)+srcDip).toFixed(4);
  gate(m,'feet not into the ground',soleMin>=sinkLimit,{kick:+soleMin.toFixed(3),ownWorst:ownMin,sourceDip:+srcDip.toFixed(4)},'>= '+sinkLimit,'the file\'s own clips plus the take\'s own dip under its floor');
  gate(m,'feet not higher than the source (joints, same footing)',R.ground.jointVsSourceMax<=R.ground.sourceAirborneMax,R.ground.jointVsSourceMax,R.ground.sourceAirborneMax,'the largest flight in the take itself');
  const rawStepMax=Math.max(...R.methods.R.frames.slice(1).map((f,j)=>{const g=R.methods.R.frames[j];return Math.hypot(f.hips[0]-g.hips[0],f.hips[1]-g.hips[1],f.hips[2]-g.hips[2]);}));
  const toeStepMax=Math.max(...base.slice(1).map((f,j)=>Math.hypot(f.rToe[0]-base[j].rToe[0],f.rToe[1]-base[j].rToe[1],f.rToe[2]-base[j].rToe[2])));
  R.capturedHipsStep=+rawStepMax.toFixed(4);R.kickToeStep=+toeStepMax.toFixed(4);R.sinkLimit=sinkLimit;   // reused by the shot gates
  for(const r of rows){const x=r.transition.x25;
    gate(m,`${r.method}: model root and hips step in the 0.25 s fades <= captured hips step`,Math.max(x.into.hips,x.back.hips,x.into.root,x.back.root)<=rawStepMax+1e-6,{into:[x.into.root,x.into.hips],back:[x.back.root,x.back.hips]},+rawStepMax.toFixed(4),'the largest hips move per 1/60 s in the captured take (method R, with its travel)');
    gate(m,`${r.method}: toe step in the 0.25 s fades <= the kick's own`,Math.max(x.into.toe,x.back.toe)<=toeStepMax+1e-6,{into:x.into.toe,back:x.back.toe},+toeStepMax.toFixed(4),'the largest kicking-toe move per 1/60 s inside the kick');}
}
const BALL_Zn=0.5;
function offsetAtNode(off,t){const T=off.times,n=T.length;if(t<=T[0])return off.xz[0];if(t>=T[n-1])return off.xz[n-1];let k=1;while(T[k]<t)k++;const f=(t-T[k-1])/(T[k]-T[k-1]);return [off.xz[k-1][0]+(off.xz[k][0]-off.xz[k-1][0])*f,off.xz[k-1][1]+(off.xz[k][1]-off.xz[k-1][1])*f];}

// six scenes, front and side, with the ball and a line from the kicking foot's nearest point to the ball centre
async function screenshots(page,m,R){
  const tag=m.replace(/\W/g,'_');
  for(const k of ['base','D','CA']){const M=R.methods[k];if(!M)continue;const tc=M.contact,d=M.frames[M.frames.length-1].t;
    const scenes=[['1_idle',null],['2_plant',Math.max(0,tc-0.2)],['3_preimpact',tc-0.05],['4_impact',tc],['5_follow',Math.min(d,tc+0.2)],['6_back',-1]];
    for(const [sc,t] of scenes)for(const view of ['front','side']){
      await page.evaluate(({k,t,view})=>{const V=window.__viewer,i=V.inst[0],mx=i.mixer;V.setPaused(true);V.stopAll();
        const clips=V.clipsPlay,names=V.clipsIn.map(c=>c.name);
        let ball=V.scene.getObjectByName('kickBall');if(!ball){ball=new THREE.Mesh(new THREE.SphereGeometry(0.11,20,14),new THREE.MeshLambertMaterial({color:0xffffff}));ball.name='kickBall';ball.position.set(0,0.11,0.5);V.scene.add(ball);
          const g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);const ln=new THREE.Line(g,new THREE.LineBasicMaterial({color:0xff2d55}));ln.name='kickLine';V.scene.add(ln);
          const lab=document.createElement('div');lab.id='kickLab';Object.assign(lab.style,{position:'absolute',right:'10px',top:'10px',background:'rgba(7,16,31,.85)',padding:'6px 8px',border:'1px solid #f5c542',font:'13px system-ui',color:'#fff'});document.querySelector('#view').appendChild(lab);}
        const meta=window.__kickMeta[k];const g0=i.root.userData.calib||(i.root.userData.calib=i.root.position.clone());
        let txt;
        if(t===null||t===-1){const idle=clips[names.findIndex(n=>/^idle$/i.test(n))]||clips[0];const a=mx.clipAction(idle);a.reset().play();a.time=t===-1?0.8:0.2;mx.update(0);i.root.position.copy(g0);txt=t===null?'킥 전 대기':'대기로 복귀 (킥 끝 + 0.25 s 페이드 뒤)';}
        else{const a=mx.clipAction(meta.clip);a.reset();a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.play();a.time=t;mx.update(0);const o=GLKick.offsetAt(meta.off,t);i.root.position.set(g0.x+o[0],g0.y,g0.z+o[1]);txt=`t=${t.toFixed(3)} s`;}
        i.holder.updateMatrixWorld(true);
        // the kicking foot's nearest skinned point to the ball centre
        const B=ball.position,w=new THREE.Vector3();let best=null,bd=Infinity;i.root.traverse(o=>{if(!o.isSkinnedMesh)return;const pos=o.geometry.attributes.position,si=o.geometry.attributes.skinIndex,sw=o.geometry.attributes.skinWeight,G=['getX','getY','getZ','getW'];
          const okb=o.skeleton.bones.map(b=>/Right(Foot|ToeBase|Toe_End)$/.test(b.name));
          for(let k2=0;k2<pos.count;k2+=2){let bi=-1,bw=0;for(let c=0;c<4;c++){const ww=sw[G[c]](k2);if(ww>bw){bw=ww;bi=si[G[c]](k2);}}if(!okb[bi])continue;w.fromBufferAttribute(pos,k2);o.boneTransform(k2,w);w.applyMatrix4(o.matrixWorld);const dd=w.distanceTo(B);if(dd<bd){bd=dd;best=w.clone();}}});
        const ln=V.scene.getObjectByName('kickLine');ln.geometry.setFromPoints([best,B.clone()]);
        document.querySelector('#kickLab').textContent=`${meta.label} · ${txt} · 발-공 표면 거리 ${(bd-0.11).toFixed(3)} m`;
        V.orbit.target.set(0.15,0.6,0.35);if(view==='front'){V.orbit.yaw=0.25;V.orbit.pitch=0.18;}else{V.orbit.yaw=Math.PI/2;V.orbit.pitch=0.08;}V.orbit.dist=3.3;
        return +(bd-0.11).toFixed(3);},{k,t,view});
      await page.waitForTimeout(250);
      const f=path.join(DIR,'out',`kick_${tag}_${k}_${sc}_${view}.png`);await page.locator('#view').screenshot({path:f,timeout:90000}).catch(e=>console.log('screenshot failed',f,e.message.split('\n')[0]));
    }}
}

// the source's own toe swing over the kick window: the toe segment (ToeBase -> its BVH end site) against frame 0
function sourceToeSwing(){
  global.window=global;global.THREE=require(P.THREE_JS);
  for(const f of ['vendor/BVHLoader.js','retarget.js'])eval(fs.readFileSync(path.join(DIR,f),'utf8'));
  const bvh=GLRetarget.parseBVH(fs.readFileSync(path.join(DIR,'models/cmu',TAKE+'.bvh'),'utf8'),TAKE),k=GLRetarget.findKick(bvh);
  const g=new THREE.Group(),clip=bvh.clip.clone();for(const t of clip.tracks)t.name=t.name.replace(/^\.bones\[([^\]]+)\]/,'$1');
  g.add(bvh.skeleton.bones[0]);const mx=new THREE.AnimationMixer(g),a=mx.clipAction(clip);a.play();
  const by=n=>bvh.skeleton.bones.find(b=>b.name===n),W=o=>o.getWorldPosition(new THREE.Vector3());
  const pitch=n=>{const b=by(n),e=b.children.find(c=>c.isBone),d=W(e).sub(W(b));return Math.atan2(d.y,Math.hypot(d.x,d.z))*180/Math.PI;};
  const at=t=>{a.time=t;mx.update(0);g.updateMatrixWorld(true);};
  at(0);const p0={L:pitch('LeftToeBase'),R:pitch('RightToeBase')},lo={L:Infinity,R:Infinity},hi={L:-Infinity,R:-Infinity};
  for(let t=k.time-0.6;t<=k.time+0.5;t+=1/120){at(t);for(const s of ['L','R']){const d=pitch(s==='L'?'LeftToeBase':'RightToeBase')-p0[s];lo[s]=Math.min(lo[s],d);hi[s]=Math.max(hi[s],d);}}
  delete global.window;
  return {Left:+(hi.L-lo.L).toFixed(1),Right:+(hi.R-lo.R).toFixed(1)};   // each foot's own toe swing
}

// the shots in the game's timeline: one row per scenario and method, and the gates for the candidate (E, E2)
function summariseShots(R,gate){
  const m=R.model,d2=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]),d3=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]),table=[];
  const lowIn=(f,a,b)=>{const w=f.filter(x=>x.t>a-1e-6&&x.t<=b+1e-6);return w.length?+Math.min(...w.map(x=>Math.min(x.L.low,x.R.low))).toFixed(3):null;};
  for(const [sn,S] of Object.entries(R.shots))for(const [k,M] of Object.entries(S.methods)){
    const f=M.frames,tC=S.contact,ks=M.kickStart,backAt=tC+0.3,at=t=>f.reduce((a,b)=>Math.abs(b.t-t)<Math.abs(a.t-t)?b:a),fc=at(tC);
    const win=f.filter(x=>x.t>=tC-0.1-1e-6&&x.t<=tC+0.1+1e-6),a0=win[0].lAnkle;
    // the plant foot sliding: only in the kick itself (after the fade in, before the fade back); the earlier clip's
    // own feet (a running clip at another speed than the game's) are not the kick's
    let smax=0,ssum=0,sn2=0;for(let j=1;j<f.length;j++){const x=f[j],y=f[j-1];if(x.t<ks+0.15-1e-6||x.t>backAt+1e-6)continue;if(x.L.low<0.02&&y.L.low<0.02){const v=d2(x.lAnkle,y.lAnkle)*60;smax=Math.max(smax,v);ssum+=v;sn2++;}}
    const step=key=>Math.max(...f.slice(1).map((x,j)=>d3(x[key],f[j][key])));
    const stepIn=(key,a,b)=>{let mx=0;for(let j=1;j<f.length;j++)if(f[j].t>a-1e-6&&f[j].t<=b+1e-6)mx=Math.max(mx,d3(f[j][key],f[j-1][key]));return +mx.toFixed(4);};
    const dev=x=>Math.hypot(x.root[0],x.root[2]-x.z),hdev=x=>Math.hypot(x.hips[0],x.hips[2]-x.z);   // from the game player (the holder at (0,0,z))
    table.push({scenario:sn,method:k,gapAtContact:fc.R.gap,kickWeightAtContact:fc.kickWeight,plantDrift:+Math.max(...win.map(x=>d2(x.lAnkle,a0))).toFixed(3),
      plantSlide:{mean:sn2?+(ssum/sn2).toFixed(2):null,max:+smax.toFixed(2)},modelStepMax:+step('root').toFixed(4),hipsStepMax:+step('hips').toFixed(4),chestStepMax:+step('chest').toFixed(4),
      devStart:+dev(f[0]).toFixed(4),devContact:+dev(fc).toFixed(3),devMax:+Math.max(...f.map(dev)).toFixed(3),devEnd:+dev(f[f.length-1]).toFixed(4),hipsDevMax:+Math.max(...f.map(hdev)).toFixed(3),
      fadeIn:{root:stepIn('root',ks,ks+0.15),hips:stepIn('hips',ks,ks+0.15),toe:stepIn('rToe',ks,ks+0.15)},fadeBack:{root:stepIn('root',backAt,backAt+0.25),hips:stepIn('hips',backAt,backAt+0.25),toe:stepIn('rToe',backAt,backAt+0.25)},
      soleMin:+Math.min(...f.filter(x=>x.t>=ks&&x.t<=backAt).map(x=>Math.min(x.L.low,x.R.low))).toFixed(3),
      liftMax:+Math.max(...f.map(x=>x.lift||0)).toFixed(4),
      steps:{fadeIn:{hips:stepIn('hips',ks,ks+0.15),chest:stepIn('chest',ks,ks+0.15)},kick:{hips:stepIn('hips',ks+0.15+1/60,backAt),chest:stepIn('chest',ks+0.15+1/60,backAt)},fadeBack:{hips:stepIn('hips',backAt+1/60,backAt+0.25),chest:stepIn('chest',backAt+1/60,backAt+0.25)}},hipsStepY:+Math.max(...f.slice(1).map((x,j)=>Math.abs(x.hips[1]-f[j].hips[1]))).toFixed(4),
      sole:{fadeIn:lowIn(f,ks,ks+0.15),kick:lowIn(f,ks+0.15,backAt),fadeBack:lowIn(f,backAt,backAt+0.25)},
      nonFinite:f.some(x=>[...x.root,...x.hips,...x.chest,...x.lAnkle,...x.rToe,x.L.low,x.R.gap].some(v=>!Number.isFinite(v)))});}
  R.shotTable=table;for(const r of table)console.log(JSON.stringify(Object.assign({model:m,shot:true},r)));
  const pick=(sn,k)=>table.find(r=>r.scenario===sn&&r.method===k);
  for(const r of table){gate(m,`${r.scenario} ${r.method}: finite`,!r.nonFinite,!r.nonFinite,'all','NaN/Infinity');
    gate(m,`${r.scenario} ${r.method}: offset starts and ends at zero`,r.devStart<=1e-3&&r.devEnd<=1e-3,{start:r.devStart,end:r.devEnd},'<= 0.001 m','nothing put on at once at the D press, nothing left after the fade back');}
  for(const sn of Object.keys(R.shots)){const ref=pick(sn.replace('running','standing'),'D');
    for(const k of ['E','E2','E3']){const r=pick(sn,k);if(!r)continue;
      gate(m,`${sn} ${k}: foot touches the ball at contact`,Math.abs(r.gapAtContact)<=0.03&&r.kickWeightAtContact>=0.999,{gap:r.gapAtContact,weight:r.kickWeightAtContact},'|gap| <= 0.03 m, kick fully in','as the earlier contact gates');
      gate(m,`${sn} ${k}: plant drift around contact <= the take's own`,r.plantDrift<=ref.plantDrift+1e-3,r.plantDrift,ref.plantDrift,'D standing, same D hold: the model still in the world, so this is the capture\'s own drift (+1 mm sampling)');
      for(const w of ['fadeIn','kick','fadeBack'])gate(m,`${sn} ${k}: hips, chest step in the ${w} <= the captured hips step`,Math.max(r.steps[w].hips,r.steps[w].chest)<=R.capturedHipsStep+1e-6,r.steps[w],R.capturedHipsStep,'the largest hips move per 1/60 s in the capture (the root is reported, not gated: it only carries the offset that keeps the hips where they show)');
      gate(m,`${sn} ${k}: toe step in the fades <= the kick's own`,Math.max(r.fadeIn.toe,r.fadeBack.toe)<=R.kickToeStep+1e-6,{in:r.fadeIn.toe,back:r.fadeBack.toe},R.kickToeStep,'the largest kicking-toe move per 1/60 s inside the kick');}
    for(const r2 of [pick(sn,'E2'),pick(sn,'E3')].filter(Boolean)){gate(m,`${sn} ${r2.method}: feet not into the ground in the kick`,r2.sole.kick>=R.sinkLimit,r2.sole.kick,R.sinkLimit,'the limit of "feet not into the ground"');
      gate(m,`${sn} ${r2.method}: feet not into the ground in the fades`,Math.min(r2.sole.fadeIn,r2.sole.fadeBack)>=R.sinkLimit,{in:r2.sole.fadeIn,back:r2.sole.fadeBack},R.sinkLimit,'same limit: a crossfade must not push the feet in either');}}
  // ground repairs on the full in-place clip
  const g2=R.ground2,low=fr=>+Math.min(...fr.map(x=>Math.min(x.L.low,x.R.low))).toFixed(4),swing=sourceToeSwing();
  const hipsDy=fr=>{let mx=0;for(let j=1;j<fr.length;j++)mx=Math.max(mx,Math.abs(fr[j].hips[1]-fr[j-1].hips[1]));return +mx.toFixed(4);};
  const baseF=R.methods.base.frames.filter(x=>Math.abs(x.t*60-Math.round(x.t*60))<0.01);   // every 1/60 s frame (times are rounded to 0.1 ms), not the contact sample
  R.groundRepair={none:{soleMin:low(baseF),hipsStepY:hipsDy(baseF)},toe:{soleMin:low(g2.toe.frames),info:g2.toe.info,otherBonesMoved:g2.toe.otherBonesMoved,worstBone:g2.toe.worstBone},
    lift:{soleMin:low(g2.lift.frames),info:g2.lift.info,hipsStepY:hipsDy(g2.lift.frames)},toeLift:{soleMin:low(g2.toeLift.frames),info:g2.toeLift.info,hipsStepY:hipsDy(g2.toeLift.frames)},sourceToeSwingDeg:swing};
  console.log(JSON.stringify({model:m,groundRepair:R.groundRepair}));
  gate(m,'toes then hips repair: feet not into the ground',R.groundRepair.toeLift.soleMin>=R.sinkLimit,R.groundRepair.toeLift.soleMin,R.sinkLimit,'the limit of "feet not into the ground"');
  gate(m,'toes then hips repair: hips moved up and down no more than without it',R.groundRepair.toeLift.hipsStepY<=R.groundRepair.none.hipsStepY+0.002,{with:R.groundRepair.toeLift.hipsStepY,without:R.groundRepair.none.hipsStepY},'+0.002 m per 1/60 s','the lift must not make the body bob: the clip\'s own largest vertical hips step (2 mm: the lift is a few mm, smoothed)');
  gate(m,'toe repair: no bone but the toes moves',g2.toe.otherBonesMoved<=1e-4,{moved:g2.toe.otherBonesMoved,bone:g2.toe.worstBone},'<= 0.0001 m','knees and hips must not be bent to fix the toes');
  for(const side of ['Left','Right'])gate(m,`toe repair: ${side} bend added within that foot's toe swing in the source`,g2.toe.info[side].maxDeg<=swing[side],g2.toe.info[side].maxDeg,swing[side],'how far the take\'s own toe on that foot turns over the kick window');
}

// screenshots of the shots: the game player (yellow ring), the model, the ball and a line from the kicking foot
async function shotShots(page,m,R){
  const tag=m.replace(/\W/g,'_'),list=[['running D 0.2 s',['A','B','C','D','E','E3']],['standing D 0.2 s',['E3']]];
  for(const [sn,ms] of list){const S=R.shots[sn];if(!S)continue;
    for(const k of ms){const tEnd=S.methods[k].frames[S.methods[k].frames.length-1].t;
      const scenes=[['1_press',0],['2_plant',S.plant],['3_preimpact',S.contact-0.05],['4_impact',S.contact],['5_follow',S.contact+0.2],['6_back',tEnd]];
      for(const [sc,t] of scenes)for(const view of ['front','side']){
        await page.evaluate(({sn,k,t,view,tC})=>{const V=window.__viewer,i=V.inst[0];V.setPaused(true);V.stopAll();
          for(const n of ['kickBall','kickLine'])if(V.scene.getObjectByName(n))V.scene.getObjectByName(n).visible=true;
          let ball=V.scene.getObjectByName('kickBall');if(!ball){ball=new THREE.Mesh(new THREE.SphereGeometry(0.11,20,14),new THREE.MeshLambertMaterial({color:0xffffff}));ball.name='kickBall';V.scene.add(ball);
            const ln=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:0xff2d55}));ln.name='kickLine';V.scene.add(ln);}
          let mark=V.scene.getObjectByName('playerMark');if(!mark){mark=new THREE.Mesh(new THREE.RingGeometry(0.16,0.22,32),new THREE.MeshBasicMaterial({color:0xf5c542,side:THREE.DoubleSide}));mark.rotation.x=-Math.PI/2;mark.name='playerMark';V.scene.add(mark);}
          let lab=document.querySelector('#kickLab');if(!lab){lab=document.createElement('div');lab.id='kickLab';Object.assign(lab.style,{position:'absolute',right:'10px',top:'10px',background:'rgba(7,16,31,.85)',padding:'6px 8px',border:'1px solid #f5c542',font:'13px system-ui',color:'#fff',maxWidth:'60%'});document.querySelector('#view').appendChild(lab);}
          const cfg=window.__shotCfg[sn][k],rows=GLKick.shotSim(i,Object.assign({},cfg,{stopAt:t})),r=rows[rows.length-1];
          const gr=cfg.game,zAt=tt=>gr[Math.min(gr.length-1,Math.max(0,Math.round(tt*60)))];const gb=t<=tC+1e-9?zAt(t):zAt(tC);
          ball.position.set(0,0.11,gb.z+gb.ballAhead);mark.position.set(0,0.012,r.z);
          // the kicking foot's nearest skinned point to the ball
          const w=new THREE.Vector3();let best=null,bd=Infinity;i.root.traverse(o=>{if(!o.isSkinnedMesh)return;const pos=o.geometry.attributes.position,si=o.geometry.attributes.skinIndex,sw=o.geometry.attributes.skinWeight,G=['getX','getY','getZ','getW'],okb=o.skeleton.bones.map(b=>/Right(Foot|ToeBase|Toe_End)$/.test(b.name));
            for(let q=0;q<pos.count;q+=2){let bi=-1,bw=0;for(let c=0;c<4;c++){const x=sw[G[c]](q);if(x>bw){bw=x;bi=si[G[c]](q);}}if(!okb[bi])continue;w.fromBufferAttribute(pos,q);o.boneTransform(q,w);w.applyMatrix4(o.matrixWorld);const dd=w.distanceTo(ball.position);if(dd<bd){bd=dd;best=w.clone();}}});
          V.scene.getObjectByName('kickLine').geometry.setFromPoints([best,ball.position.clone()]);
          const dev=Math.hypot(r.hips[0],r.hips[2]-r.z);   // the visible body (hips) from the game player
          lab.textContent=`${k} · ${sn} · t=${t.toFixed(3)} s (D 누름=0, 접촉 ${tC.toFixed(3)}) · 발-공 표면 ${(bd-0.11).toFixed(3)} m · 골반-선수 위치 ${dev.toFixed(2)} m${t>tC+1e-9?' · 공은 접촉 지점에 표시':''}`;
          V.orbit.target.set(0.25,0.6,r.z+0.35);if(view==='front'){V.orbit.yaw=0.25;V.orbit.pitch=0.18;}else{V.orbit.yaw=Math.PI/2;V.orbit.pitch=0.08;}V.orbit.dist=3.4;},{sn,k,t,view,tC:S.contact});
        await page.waitForTimeout(250);
        const f=path.join(DIR,'out',`shot_${tag}_${sn.replace(/\W+/g,'_')}_${k}_${sc}_${view}.png`);await page.locator('#view').screenshot({path:f,timeout:90000}).catch(e=>console.log('screenshot failed',f,e.message.split('\n')[0]));}}}
  await page.evaluate(()=>{const V=window.__viewer,i=V.inst[0];i.holder.position.set(0,0,0);i.root.position.copy(i.root.userData.calib||i.root.position);for(const n of ['kickBall','kickLine','playerMark'])if(V.scene.getObjectByName(n))V.scene.getObjectByName(n).visible=false;});
}
