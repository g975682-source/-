// Game shots (standing and running) against retargeted CMU kicks: variants A-E3 (the earlier round) and F, G (this
// round) under the same conditions, with the toe and hips repairs as separate variants (Playwright + SwiftShader).
// Usage (from this folder): node check_shot.js [--existing-log <file>] [--no-existing] [--no-survey] [--no-shots] [model.glb ...]
//   other takes: --takes 74_03,74_05 --take-dir <folder with those .bvh> --tag <name> (the takes are served from that
//   folder, not copied into models/; 11_01 still runs as the reference; outputs get the tag: out/shot_lab_<tag>_*)
//   default models Xbot.glb Soldier.glb. Without --existing-log, check_kick.js runs first and its own gates are
//   reported in a section of their own (the 92 original gates kept apart from the A-E3 round's).
// Writes out/shot_lab_<model>.json (every tick of every variant), out/shot_lab_gates.log (every gate),
// out/shot_lab_summary.json, and screenshots out/lab_<model>_<scenario>_<variant>_<scene>_<view>.png.
// Exit 1 when any new gate fails. The exit code alone says nothing about the variants: read the tables.
const path=require('path'),fs=require('fs'),cp=require('child_process');
const P=require('../../tests/legacy/paths.js');
const {chromium}=require(P.PLAYWRIGHT);
const DIR=__dirname,three=fs.readFileSync(P.THREE_JS,'utf8');
const argv=process.argv.slice(2),flag=f=>argv.includes(f),opt=f=>{const k=argv.indexOf(f);return k>=0?argv[k+1]:null;};
const models=argv.filter((a,k)=>/\.glb$/i.test(a)&&!['--existing-log','--take-dir'].includes(argv[k-1]));
const MODELS=models.length?models:['Xbot.glb','Soldier.glb'];
const TAKE_DIR=opt('--take-dir'),TAG=opt('--tag')?opt('--tag')+'_':'';
const MAIN='11_01',SURVEY=opt('--takes')?opt('--takes').split(','):['10_01','10_02','10_03','10_05','10_06'];   // 10_04 is a walk (check_bvh.js)
const REACH=0.2;   // G: how far (m) the kicking leg reaches in towards the body's middle line at the contact
// limits that are not measured from the take itself (each with its reason; the rest come from the take or the model)
const LIM={
  gap:0.03,          // foot on the ball at the game's contact tick: the contact tolerance of check_kick.js
  tick:1/60,         // the estimated contact within one game tick of the ball leaving (the game moves the ball on that tick)
  dirDeg:15,         // the kicking foot's travel within 15° of the ball's flight at the contact (judgement: an instep
                     // strike can send the ball a little off the foot's line, not across it)
  inBall:-0.03,      // no foot more than 3 cm inside the ball (check_kick.js)
  grounded:0.02,     // the plant foot's lowest point within 2 cm of the ground at the contact (the stance test used throughout)
  spacing:0.707/2,   // the body (hips) within half the game's player spacing of the player (index.html separate(): 0.707 m)
  angleDeg:0.5,      // knee and ankle angles a repair may change (a repair of the toes or the hips height must not bend them)
  toeUpDeg:65,toeDownDeg:40,   // toe bend range (MTP joint: about 60-70° up, 30-40° down; general anatomy)
  toeStepPad:2,      // a repaired toe may turn per tick at most the take's own largest toe turn + 2° (sampling)
  clear:0.10,        // kicking foot and plant foot apart by at least a shoe's width while the kick plays
};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

// ---- the existing checks: check_kick.js as it is, its own gate lines, the 92 original ones counted apart ----
// the 12 original failures (the round before the A-E3 round): model and gate name
const REF12=[['Xbot.glb','feet not into the ground'],['Xbot.glb','R: model root and hips step in the 0.25 s fades <= captured hips step'],['Xbot.glb',"CA: toe step in the 0.25 s fades <= the kick's own"],['Xbot.glb',"CR: toe step in the 0.25 s fades <= the kick's own"],
  ['Soldier.glb','feet not into the ground'],['Soldier.glb','R: model root and hips step in the 0.25 s fades <= captured hips step'],['Soldier.glb','D: model root and hips step in the 0.25 s fades <= captured hips step'],['Soldier.glb','D2: model root and hips step in the 0.25 s fades <= captured hips step'],
  ['Soldier.glb','CA: model root and hips step in the 0.25 s fades <= captured hips step'],['Soldier.glb',"CA: toe step in the 0.25 s fades <= the kick's own"],['Soldier.glb','CR: model root and hips step in the 0.25 s fades <= captured hips step'],['Soldier.glb',"CR: toe step in the 0.25 s fades <= the kick's own"]];
function existing(){
  let log,src;
  if(flag('--no-existing'))return null;
  const f=opt('--existing-log');
  if(f){log=fs.readFileSync(f,'utf8');src=f+' (재사용, '+fs.statSync(f).mtime.toISOString()+')';}
  else{const r=cp.spawnSync(process.execPath,['check_kick.js'],{cwd:DIR,encoding:'utf8',maxBuffer:1<<30});log=r.stdout+r.stderr+'\nexit '+r.status+'\n';fs.writeFileSync(path.join(DIR,'out','check_kick_existing.log'),log);src='check_kick.js 실행 (exit '+r.status+')';}
  const lines=log.split('\n').filter(l=>/^(ok  |FAIL) /.test(l)).map(l=>{const m=l.match(/^(ok  |FAIL) (\S+) (.*): (.*?) \(limit (.*)$/);return m?{ok:m[1]==='ok  ',model:m[2],name:m[3],value:m[4],rest:m[5],line:l}:{ok:false,model:'?',name:l,value:'',rest:'',line:l,unparsed:true};});
  // the A-E3 round added the game probe gates and every shot / repair gate; the rest are the original 92
  const later=g=>g.model==='game'||/^(standing|running) D /.test(g.name)||/^toes then hips repair|^toe repair/.test(g.name);
  const orig=lines.filter(g=>!later(g)),round2=lines.filter(later);
  const summary=log.match(/CHECK (PASS|FAIL[^\n]*)/);
  return {src,orig,round2,summary:summary?summary[0]:'(요약 줄 없음)',ref:REF12.map(([m,n])=>{const g=orig.find(x=>x.model===m&&x.name===n);return {model:m,name:n,found:!!g,ok:g?g.ok:null,value:g?g.value:null,limit:g?g.rest:null};})};
}

// ---- the game, read only: every tick from the D press, standing and running, D held 0.1, 0.2, 0.3 s ----
// the player's position and heading, the ball, and the shot's moments (index.html is loaded as it is)
async function probeGame(){
  const open=require('../../tests/legacy/harness.js');const {browser,page,errors}=await open();
  const sc=await page.evaluate(()=>{const g=__game;g.startMatch({mode:'play',minutes:12,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(1);
    // running: 'angled' holds the right arrow as the A-E3 round did (the camera turns it: the player runs at 56.6° and
    // the game aims the shot at the goal, about 37° to his left); 'straight' runs at the goal (a move vector of (1,0,0))
    const one=(running,holdTicks,kind)=>{const p=g.give(0,9);const K=g.ctrl[0];p.pos.set(0,0,0);p.face=Math.PI/2;p.vel.set(running?6:0,0,0);p.wantVel.copy(p.vel);g.ball.pos.set(0.5,0.11,0);
      for(const q of g.players)if(q!==p&&!q.isGK){q.pos.set(q.team?-30:-40,0,q.slot*3-15);q.vel.set(0,0,0);}
      g.setCtl(p);p.sk=null;p.cdSkill=0;g.sim(1/60);
      if(kind==='straight'){K.remote=true;K.mv.set(1,0,0);}
      if(kind==='angled')g.actDown('right');
      if(running)for(let k=0;k<60;k++)g.sim(1/60);
      // the holder's frame at the press: z = his heading then (game (sin f0, cos f0)), x = his left (cos f0, -sin f0).
      // (The A-E3 round took game +x as the heading; a running player was then 34° off it, see README.)
      const x0=p.pos.x,z0=p.pos.z,f0=p.face,b=g.ball.pos,rows=[],F=[Math.sin(f0),Math.cos(f0)],Lf=[Math.cos(f0),-Math.sin(f0)];
      const loc=(x,z)=>[+((x-x0)*Lf[0]+(z-z0)*Lf[1]).toFixed(4),+((x-x0)*F[0]+(z-z0)*F[1]).toFixed(4)];
      const rec=()=>{const pp=loc(p.pos.x,p.pos.z),bb=loc(b.x,b.z),vv=[p.vel.x*F[0]+p.vel.z*F[1],p.vel.x*Lf[0]+p.vel.z*Lf[1]];rows.push({t:+(rows.length/60).toFixed(4),x:pp[0],z:pp[1],yaw:+(p.face-f0).toFixed(5),speed:+Math.hypot(p.vel.x,p.vel.z).toFixed(3),velFwd:+vv[0].toFixed(3),velLeft:+vv[1].toFixed(3),gx:+(p.pos.x-x0).toFixed(4),gBallAhead:+(b.x-p.pos.x).toFixed(4),
        ball:[bb[0],+b.y.toFixed(4),bb[1]],owned:g.ball.owner===p,kickPose:p.oAnim==='kick',oT:p.oAnim==='kick'?+(p.oT||0).toFixed(3):null});};
      rec();g.actDown('shoot');for(let k=0;k<holdTicks;k++){g.sim(1/60);rec();}g.actUp('shoot');if(kind==='angled')g.actUp('right');if(kind==='straight')K.mv.set(0,0,0);
      for(let k=0;k<75;k++){g.sim(1/60);rec();}
      K.remote=false;K.mv.set(0,0,0);
      const kLeave=rows.findIndex(r=>!r.owned),kPose=rows.findIndex(r=>r.kickPose),kEnd=rows.findIndex((r,j)=>j>kLeave&&!r.kickPose);
      const b0=rows[kLeave-1].ball,b3=rows[kLeave+3].ball,aim=Math.atan2(b3[0]-b0[0],b3[2]-b0[2]);
      return {headingAtPressDeg:+(f0*180/Math.PI).toFixed(2),aimDeg:+(aim*180/Math.PI).toFixed(2),aim,name:(running?'running '+kind:'standing')+' D '+(holdTicks/60).toFixed(1)+' s',running,kind:running?kind:'standing',hold:holdTicks/60,rows,
        dRelease:holdTicks/60,kickPose:kPose/60,lastOwned:(kLeave-1)/60,ballLeaves:kLeave/60,followEnd:kEnd>0?kEnd/60:null,
        ballAtContact:+(rows[kLeave-1].ball[2]-rows[kLeave-1].z).toFixed(4),ballLatAtContact:+(rows[kLeave-1].ball[0]-rows[kLeave-1].x).toFixed(4),
        speedAtPress:rows[0].speed,speedAtContact:rows[kLeave-1].speed};};
    return [6,12,18].map(h=>one(false,h,'standing')).concat([6,12,18].map(h=>one(true,h,'straight')),[6,12,18].map(h=>one(true,h,'angled')));});
  await browser.close();
  return {scenarios:sc,errors:errors.filter(e=>!e.includes('ERR_FAILED'))};
}

// ---- in the page: clips, references from the take itself, variants, simulation ----
async function runModel(browser,m,GP){
  const page=await browser.newPage({viewport:{width:1000,height:640}});
  const errors=[];
  page.on('console',x=>{if(x.type()==='error')errors.push(x.text());});
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  await page.route('**/*',r=>{const u=r.request().url();
    if(u.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'});
    if(TAKE_DIR&&u.startsWith('http://viewer.local/extra/')){const f=path.join(TAKE_DIR,path.basename(decodeURIComponent(u.split('?')[0])));return fs.existsSync(f)?r.fulfill({body:fs.readFileSync(f),contentType:'text/plain'}):r.fulfill({status:404,body:'not found'});}
    if(u.startsWith('http://viewer.local/')){const f=path.join(DIR,decodeURIComponent(u.slice(20).split('?')[0])||'index.html');
      if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.html')?'text/html':'application/octet-stream'});
      return r.fulfill({status:404,body:'not found'});}
    return r.abort();});
  await page.goto('http://viewer.local/index.html?autoload=0');
  await page.addScriptTag({url:'http://viewer.local/shot_lab.js'});
  const R=await page.evaluate(async({m,MAIN,SURVEY,SCEN,REACH,survey,EXTRA})=>{
    const Vw=window.__viewer,out={takes:{}};const src=tk=>EXTRA&&tk!==MAIN?`extra/${tk}.bvh`:`models/cmu/${tk}.bvh`;
    if(!(await Vw.load('models/'+m)))return {failed:'model: '+document.querySelector('#status').textContent};
    const takes=[MAIN].concat(survey?SURVEY:[]),info={};
    for(const tk of takes){const inf=await Vw.addBVH(src(tk),{trim:true,before:0.6,after:0.5,name:tk+' 킥 (슛 실험)'});info[tk]=inf||{failed:document.querySelector('#status').textContent};}
    const i=Vw.inst[0],V=()=>new THREE.Vector3();   // adding clips rebuilds the instances: take the instance after the last one
    const idle=Vw.animations.find(c=>/^idle$/i.test(c.name))||Vw.animations[0],run=Vw.animations.find(c=>/^run$/i.test(c.name))||idle;
    const times=d=>{const t=[];for(let k=0;k<=Math.round(d*60);k++)t.push(Math.min(d,k/60));return t;};
    const finite=c=>c.tracks.every(t=>Array.prototype.every.call(t.values,Number.isFinite));
    // the model's own clips: how low the soles go there (the ground limit of check_kick.js)
    const own={};for(const c of Vw.animations.filter(c=>!c.inPlaceVersion&&!/슛 실험|킥/.test(c.name)&&c.duration>0.2)){const s=GLKick.series(i,c,times(Math.min(c.duration,3)).filter((_,k)=>k%2===0),null,0.5);own[c.name]=+Math.min(...s.map(f=>Math.min(f.R.low,f.L.low))).toFixed(4);}
    const ownMin=Math.min(...Object.values(own));
    window.__lab={};
    for(const tk of takes){const inf=info[tk];if(inf.failed){out.takes[tk]={failed:inf.failed};continue;}
      const ci=Vw.clipsIn.findIndex(c=>c.retarget===inf),ip=Vw.clipsPlay[ci],raw=Vw.animations[ci],strike=Vw.clipsIn[ci].strikeAt;
      // the contact (estimated: the source has no ball): the bottom of the kicking toe's arc near its fastest frame, at 240 Hz
      const arc=GLKick.series(i,ip,Array.from({length:43},(_,k)=>strike-0.03+k/240),null,0.5);let lowT=arc[0];for(const f of arc)if(f.rToe[1]<lowT.rToe[1])lowT=f;const tc=lowT.t;
      const T=times(ip.duration),base=GLKick.series(i,ip,T,null,0.5),rawS=GLKick.series(i,raw,T,null,0.5);
      let plant=null;for(let j=1;j<base.length;j++){const f=base[j];if(f.t>=tc)break;if(f.L.low<0.02&&base[j-1].L.low>=0.02)plant=f.t;}
      // a take whose plant foot never leaves the ground before the contact (a standing kick) has no landing: then the
      // plant lock starts 0.13 s before the contact (11_01's landing-to-contact), and the take is marked
      let plantFallback=false;if(plant==null){plant=Math.max(0,tc-0.13);plantFallback=true;}
      const down=base.find(f=>f.t>tc+0.05&&f.R.low<0.02);
      // the take's own references, the model standing still on the captured clip (its travel kept)
      const d2=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]),d3=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
      const capHipsStep=Math.max(...rawS.slice(1).map((f,j)=>d3(f.hips,rawS[j].hips)));
      const kickToeStep=Math.max(...base.slice(1).map((f,j)=>d3(f.rToe,base[j].rToe)));
      const ipBodyStep=Math.max(...base.slice(1).map((f,j)=>Math.max(d3(f.hips,base[j].hips),d3(f.chest,base[j].chest))));
      const win=rawS.filter(f=>f.t>=tc-0.1-1e-6&&f.t<=tc+0.1+1e-6),ownDrift=Math.max(...win.map(f=>d2(f.lAnkle,win[0].lAnkle)));
      const srcDip=Math.min(0,...inf.sourceFootLow),sinkLimit=+(Math.min(ownMin,0)+srcDip).toFixed(4);
      // the clip's own sole and toe extremes, every 1/60 s (in place)
      const soleIn=+Math.min(...base.map(f=>Math.min(f.L.low,f.R.low))).toFixed(4);
      // repairs: toes bent up, hips raised, both (kick_align.js), and the kicking leg reaching in (shot_lab.js)
      const fit=(clip,ballZ)=>GLKick.contact(i,clip,tc,'Right',ballZ);
      const toe=GLKick.fixToes(i,ip),lift=GLKick.liftHips(i,ip),toeLift=GLKick.liftHips(i,toe.clip);
      const rawToe=GLKick.liftHips(i,GLKick.fixToes(i,raw).clip).clip;
      const rch=GLShot.reach(i,ip,tc,REACH,0.5,{hold:0.03,width:0.12}),rT=GLKick.fixToes(i,rch.clip),rH=GLKick.liftHips(i,rch.clip),rTH=GLKick.liftHips(i,rT.clip);
      const clips={ip,raw,rawToe,ipT:toe.clip,ipH:lift.clip,ipTH:toeLift.clip,g:rch.clip,gT:rT.clip,gH:rH.clip,gTH:rTH.clip};
      const travelS=GLKick.series(i,raw,T,null,0.5);const travel={times:T,xz:travelS.map((f,k)=>[f.hips[0]-base[k].hips[0],f.hips[2]-base[k].hips[2]])};
      const ref={tc,strike,plant,plantFallback,kickDown:down?down.t:null,duration:ip.duration,capHipsStep:+capHipsStep.toFixed(4),ipBodyStep:+ipBodyStep.toFixed(4),kickToeStep:+kickToeStep.toFixed(4),ownDrift:+ownDrift.toFixed(4),
        sinkLimit,ownMin,srcDip:+srcDip.toFixed(4),soleInPlace:soleIn,finite:Object.fromEntries(Object.entries(clips).map(([k,c])=>[k,finite(c)])),
        repairs:{toe:toe.info,lift:lift.info,toeLift:toeLift.info,reach:rch.info,reachToe:rT.info,reachLift:rH.info}};
      // the take's own toe bends (raw clip, model still): range and largest turn per 1/60 s, for the toe gates
      {const pa=(f,a,b,c)=>{const p=(u,v)=>{const d=[v[0]-u[0],v[1]-u[1],v[2]-u[2]];return Math.atan2(d[1],Math.hypot(d[0],d[2]));};return (p(b,c)-p(a,b))*180/Math.PI;};
        const own2=[];i.mixer.stopAllAction();const g=GLShot.rig(i);const at=t=>{const mx=i.mixer;mx.stopAllAction();const a=mx.clipAction(raw);a.reset();a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.play();a.time=t;mx.update(0);i.root.updateWorldMatrix(true,false);i.root.updateMatrixWorld(true);
          const J=n=>GLShot.joint(g,n).toArray();return {L:pa(0,J('LeftFoot'),J('LeftToeBase'),J('LeftToe_End')),R:pa(0,J('RightFoot'),J('RightToeBase'),J('RightToe_End'))};};
        for(const t of T)own2.push(at(t));i.mixer.stopAllAction();
        const st=s=>Math.max(...own2.slice(1).map((o,j)=>Math.abs(o[s]-own2[j][s])));
        ref.toeOwn={L:[+Math.min(...own2.map(o=>o.L)).toFixed(1),+Math.max(...own2.map(o=>o.L)).toFixed(1)],R:[+Math.min(...own2.map(o=>o.R)).toFixed(1),+Math.max(...own2.map(o=>o.R)).toFixed(1)],stepL:+st('L').toFixed(2),stepR:+st('R').toFixed(2)};}
      out.takes[tk]={ref,info:{from:inf.from,to:inf.to,strikeTurnDeg:inf.strikeTurnDeg,hipScale:inf.hipScale},scen:{}};window.__lab[tk]={};
      const ramp=(t,a,b)=>{const x=(t-a)/Math.max(1e-6,b-a);return x<=0?0:x>=1?1:x*x*(3-2*x);};
      const variants=tk===MAIN?['A','B','C','D','E','E2','E3','F','F+T','F+H','F+TH','F+THC','F+THC+Y','G','G+T','G+H','G+TH','G+THC','G+THC+Y']:['E3','F+THC','F+THC+Y','G+THC','G+THC+Y'];
      for(const sc of SCEN){
        const tC=sc.lastOwned,tPl=tC-(tc-plant),backAt=sc.followEnd!=null?sc.followEnd:tC+0.3,game=sc.rows.map(r=>({x:r.x,z:r.z,yaw:r.yaw,ball:r.ball}));
        const at=t=>game[Math.min(game.length-1,Math.max(0,Math.round(t*60)))];
        const bz=sc.ballAtContact,bx=sc.ballLatAtContact,fitX=c=>({offset:[c.offset[0]+bx,c.offset[1]],touch:c.touchFound});
        const common={prev:sc.running?run:idle,back:idle,xfIn:0.15,xfOut:0.25,backAt,tEnd:backAt+0.25+0.3,game,sub:{from:tC-0.1,to:tC+0.1}};
        const lin=(c,a,b)=>(t,kt,wk)=>{const s=ramp(t,a,b);return [wk*s*c.offset[0],wk*s*c.offset[1]];};
        const anchored=c=>(t,kt,wk)=>{const s=ramp(t,0,tPl),p=GLKick.offsetAt(travel,kt),g0=at(tC),g1=at(t);return [wk*((1-s)*-p[0]+s*(c.offset[0]-(g1.x-g0.x))),wk*((1-s)*-p[1]+s*(c.offset[1]-(g1.z-g0.z)))];};
        const fits={ip:fitX(fit(ip,bz)),raw:fitX(fit(raw,bz)),rawToe:fitX(fit(rawToe,bz))};
        const defs={A:{kick:ip,kickStart:0,off:lin(fits.ip,0,tPl)},B:{kick:ip,kickStart:0,off:lin(fits.ip,0,tC)},C:{kick:ip,kickStart:sc.kickPose,off:lin(fits.ip,sc.kickPose,tC)},
          D:{kick:raw,kickStart:0,off:()=>[0,0]},E:{kick:raw,kickStart:0,off:anchored(fits.raw)},E2:{kick:rawToe,kickStart:0,off:anchored(fits.rawToe)},E3:{kick:rawToe,kickStart:0,off:anchored(fits.rawToe),groundClamp:true}};
        // F, G: the kick follows the player (the in-place clip, the game's own movement), the sideways offset grows from
        // the D press to the plant, the plant ankle stays still in the world from the plant to the fade back (the
        // offset aimed so that the foot meets the ball with that lock in force), then everything fades with the kick
        const famF={'F':'ip','F+T':'ipT','F+H':'ipH','F+TH':'ipTH','F+THC':'ipTH','F+THC+Y':'ipTH','G':'g','G+T':'gT','G+H':'gH','G+TH':'gTH','G+THC':'gTH','G+THC+Y':'gTH'};
        // Y: the body turned (about the ball at the contact) to the game's aim, from the D press to the plant; with the
        // kick's weight it gives way to the game's own heading (the game turns the player after the shot)
        const aim=sc.aim,yawY=(t,kt,wk)=>wk*(ramp(t,0,tPl)*aim-at(t).yaw);
        out.takes[tk].scen[sc.name]={tC,tPl,backAt,kickPose:sc.kickPose,ballLeaves:sc.ballLeaves,variants:{}};window.__lab[tk][sc.name]={};
        for(const v of variants){let cfg;
          if(defs[v])cfg=Object.assign({},common,defs[v],{t0:tc-(tC-defs[v].kickStart),fitTouch:true});
          else{const clip=clips[famF[v]],f0=fitX(fit(clip,bz)),Y=/\+Y$/.test(v),mk=post=>Object.assign({},common,{kick:clip,kickStart:0,t0:tc-tC,lock:{from:tPl,to:backAt},groundClamp:/C(\+Y)?$/.test(v),
              off:(t,kt,wk)=>{const s=ramp(t,0,tPl);return [wk*s*f0.offset[0],wk*s*f0.offset[1]];},
              post:(t,kt,wk)=>{const s=ramp(t,0,tPl);return [wk*s*post[0],wk*s*post[1]];},yaw:Y?yawY:null,pivot:[bx,bz]});
            // two passes: the plant lock moves the model by what the in-place plant foot would slide between the plant and
            // the contact; the second pass aims the offset so that the foot still meets the ball with the lock in force
            const p1=GLShot.sim(i,mk([0,0])),rc=p1.rows.find(r=>Math.abs(r.t-tC)<1e-6)||p1.rows[Math.round(tC*60)];
            cfg=mk([-rc.lock[0],-rc.lock[1]]);cfg.fitTouch=f0.touch;cfg.pass1Lock=rc.lock;}
          window.__lab[tk][sc.name][v]=cfg;
          const res=GLShot.sim(i,cfg);
          out.takes[tk].scen[sc.name].variants[v]={kickStart:cfg.kickStart,t0:+cfg.t0.toFixed(4),groundClamp:!!cfg.groundClamp,lock:cfg.lock||null,fitTouch:cfg.fitTouch,pass1Lock:cfg.pass1Lock||null,rows:res.rows,subs:res.subs};}}}
    out.own=own;
    return out;},{m,MAIN,SURVEY,SCEN:GP.scenarios,REACH,survey:!flag('--no-survey'),EXTRA:!!TAKE_DIR});
  return {page,R,errors};
}

// ---- measurements from the ticks ----
const d2=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]),d3=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]),sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const pitch=v=>Math.atan2(v[1],Math.hypot(v[0],v[2]));
const ang=(a,b,c)=>{const u=sub(a,b),w=sub(c,b),d=u[0]*w[0]+u[1]*w[1]+u[2]*w[2];return Math.acos(Math.max(-1,Math.min(1,d/(Math.hypot(...u)*Math.hypot(...w)))))*180/Math.PI;};
const toeBend=(an,tb,te)=>(pitch(sub(te,tb))-pitch(sub(tb,an)))*180/Math.PI;   // + = toe tip up from the foot's line
// the knee bent the wrong way: the knee behind the hip-ankle line, against the foot's forward direction
const kneeBack=(up,kn,an,toe)=>{const a=sub(an,up),L=Math.hypot(...a),u=a.map(x=>x/L),k=sub(kn,up),s=k[0]*u[0]+k[1]*u[1]+k[2]*u[2],perp=[k[0]-u[0]*s,k[1]-u[1]*s,k[2]-u[2]*s],f=sub(toe,an),fl=Math.hypot(f[0],f[2])||1;
  return (perp[0]*f[0]+perp[2]*f[2])/fl<-0.01&&ang(up,kn,an)<170;};
function measure(S,V,ref){
  // per tick, a body point may move as far as the captured hips do, or as far as the game player moved that tick plus
  // what the in-place clip itself does (its body about its own path, or the kicking toe for the feet)
  const f=V.rows,tC=S.tC,ks=V.kickStart,back=S.backAt,xfIn=0.15,xfOut=0.25,dt=1/60;
  const at=t=>f.reduce((a,b)=>Math.abs(b.t-t)<Math.abs(a.t-t)?b:a),fc=at(tC);
  const pl=r=>[r.player[0],0,r.player[1]],hipsDev=r=>d2(r.hips,pl(r)),rootDev=r=>d2(r.root,pl(r));
  const inW=(a,b)=>f.filter(r=>r.t>a+1e-6&&r.t<=b+1e-6);
  const stepIn=(keys,a,b)=>{let mx=0;for(let j=1;j<f.length;j++)if(f[j].t>a+1e-6&&f[j].t<=b+1e-6)for(const k of keys)mx=Math.max(mx,d3(f[j][k],f[j-1][k]));return +mx.toFixed(4);};
  // relative to the game player: what the drawing adds to the game's own movement (a running player covers 0.09 m a tick)
  const rel=(r,k)=>[r[k][0]-r.player[0],r[k][1],r[k][2]-r.player[1]];
  const pStep=j=>Math.hypot(f[j].player[0]-f[j-1].player[0],f[j].player[1]-f[j-1].player[1]);
  const over=(keys,a,b,own,cap)=>{let w={excess:-Infinity};for(let j=1;j<f.length;j++){if(!(f[j].t>a+1e-6&&f[j].t<=b+1e-6))continue;const L=Math.max(cap,pStep(j)+own);
    for(const k of keys){const s=d3(f[j][k],f[j-1][k]);if(s-L>w.excess)w={excess:+(s-L).toFixed(4),step:+s.toFixed(4),limit:+L.toFixed(4),at:f[j].t,point:k,playerStep:+pStep(j).toFixed(4)};}}return w;};
  const relIn=(keys,a,b)=>{let mx=0;for(let j=1;j<f.length;j++)if(f[j].t>a+1e-6&&f[j].t<=b+1e-6)for(const k of keys)mx=Math.max(mx,d3(rel(f[j],k),rel(f[j-1],k)));return +mx.toFixed(4);};
  const soleIn=(a,b)=>{const w=f.filter(r=>r.t>=a-1e-6&&r.t<=b+1e-6);return w.length?+Math.min(...w.map(r=>Math.min(r.L.low,r.R.low))).toFixed(4):null;};
  // the estimated contact: the first 1/240 s sample (+-0.1 s of the game's contact tick) where the kicking foot touches
  // the ball (gap <= 5 mm); else the closest sample
  const su=V.subs;let touch=su.find(s=>s.gap<=0.005);const closest=su.reduce((a,b)=>b.gap<a.gap?b:a,su[0]);
  const tEff=touch?touch.t:null;
  // the kicking foot's direction at the estimated contact (toe joint over +-1/240 s), against the ball's flight in the game
  const ref0=touch||closest,k0=su.indexOf(ref0),pa=su[Math.max(0,k0-1)],pb=su[Math.min(su.length-1,k0+1)];
  const fv=[pb.rToe[0]-pa.rToe[0],pb.rToe[1]-pa.rToe[1],pb.rToe[2]-pa.rToe[2]],footDeg=Math.atan2(fv[0],fv[2])*180/Math.PI;
  const kL=Math.round(S.ballLeaves*60),b0=f.find(r=>r.k===kL-1),b1=f.find(r=>r.k===kL+3);
  const ballDeg=b0&&b1?Math.atan2(b1.ball[0]-b0.ball[0],b1.ball[2]-b0.ball[2])*180/Math.PI:null;
  let dirErr=ballDeg==null?null:footDeg-ballDeg;if(dirErr!=null){while(dirErr>180)dirErr-=360;while(dirErr<-180)dirErr+=360;}
  // the plant ankle around the contact, and from the plant to the fade back; the take's own is measured on the same clip
  const w=f.filter(r=>r.t>=tC-0.1-1e-6&&r.t<=tC+0.1+1e-6),plantDrift=Math.max(...w.map(r=>d2(r.lAnk,w[0].lAnk)));
  const lk=f.filter(r=>r.t>=S.tPl-1e-6&&r.t<=back+1e-6),plantTravel=lk.length?Math.max(...lk.map(r=>d2(r.lAnk,lk[0].lAnk))):null;
  let slideMax=0;for(let j=1;j<f.length;j++){const a=f[j],b=f[j-1];if(a.t<ks+xfIn-1e-6||a.t>back+1e-6)continue;if(a.L.low<LIM.grounded&&b.L.low<LIM.grounded)slideMax=Math.max(slideMax,d2(a.lAnk,b.lAnk)/dt);}
  // angles every tick
  const A=f.map(r=>({kL:ang(r.lUp,r.lKnee,r.lAnk),kR:ang(r.rUp,r.rKnee,r.rAnk),aL:ang(r.lKnee,r.lAnk,r.lToe),aR:ang(r.rKnee,r.rAnk,r.rToe),tL:toeBend(r.lAnk,r.lToe,r.lToeEnd),tR:toeBend(r.rAnk,r.rToe,r.rToeEnd),
    backL:kneeBack(r.lUp,r.lKnee,r.lAnk,r.lToe),backR:kneeBack(r.rUp,r.rKnee,r.rAnk,r.rToe)}));
  const toeStep=s=>Math.max(...A.slice(1).map((a,j)=>Math.abs(a[s]-A[j][s])));
  // the feet apart: kicking ankle, toe and toe end against the plant ankle, toe and toe end, while the kick plays
  let clear=Infinity;for(const r of inW(ks+xfIn,back))for(const a of [r.rAnk,r.rToe,r.rToeEnd])for(const b of [r.lAnk,r.lToe,r.lToeEnd])clear=Math.min(clear,d3(a,b));
  const finite=f.every(r=>[...r.root,...r.hips,...r.lAnk,...r.rToe,r.L.low,r.R.gap,r.L.gap].every(Number.isFinite));
  return {rows:f.length,finite,tC,
    player:{pressToContact:+d2(pl(fc),pl(f[0])).toFixed(3),contactToEnd:+d2(pl(f[f.length-1]),pl(fc)).toFixed(3)},
    hips:{pressToContact:+d2(fc.hips,f[0].hips).toFixed(3),contactToEnd:+d2(f[f.length-1].hips,fc.hips).toFixed(3)},
    hipsDev:{max:+Math.max(...f.map(hipsDev)).toFixed(3),contact:+hipsDev(fc).toFixed(3),end:+hipsDev(f[f.length-1]).toFixed(3)},
    rootDev:{max:+Math.max(...f.map(rootDev)).toFixed(3),end:+rootDev(f[f.length-1]).toFixed(4)},
    gapAtContact:fc.R.gap,kickWeightAtContact:fc.kickWeight,tEff,timingErr:tEff==null?null:+(tEff-tC).toFixed(4),closestGap:closest.gap,closestAt:closest.t,
    footDeg:+footDeg.toFixed(1),ballDeg:ballDeg==null?null:+ballDeg.toFixed(1),dirErr:dirErr==null?null:+dirErr.toFixed(1),
    kickInBallBefore:+Math.min(...f.filter(r=>r.t<=(tEff??tC)-dt+1e-6).map(r=>r.R.gap)).toFixed(4),plantInBall:+Math.min(...f.filter(r=>r.t<=tC+1e-6).map(r=>r.L.gap)).toFixed(4),
    sole:{all:soleIn(0,f[f.length-1].t),fadeIn:soleIn(ks,ks+xfIn),kick:soleIn(ks+xfIn,back),fadeBack:soleIn(back,back+xfOut)},plantLowAtContact:fc.L.low,
    plantDrift:+plantDrift.toFixed(4),plantTravel:plantTravel==null?null:+plantTravel.toFixed(4),slideMax:+slideMax.toFixed(2),
    steps:{fadeIn:{body:relIn(['hips','chest'],ks,ks+xfIn+dt),feet:relIn(['lAnk','rAnk','lToe','rToe'],ks,ks+xfIn+dt),bodyWorld:stepIn(['hips','chest'],ks,ks+xfIn+dt)},kick:{body:relIn(['hips','chest'],ks+xfIn+dt,back),bodyWorld:stepIn(['hips','chest'],ks+xfIn+dt,back)},
      fadeBack:{body:relIn(['hips','chest'],back,back+xfOut+dt),feet:relIn(['lAnk','rAnk','lToe','rToe'],back,back+xfOut+dt),bodyWorld:stepIn(['hips','chest'],back,back+xfOut+dt)},root:stepIn(['root'],0,f[f.length-1].t)},
    speed:{fadeInBody:over(['hips','chest'],ks,ks+xfIn+dt,ref.ipBodyStep,ref.capHipsStep),kickBody:over(['hips','chest'],ks+xfIn+dt,back,ref.ipBodyStep,ref.capHipsStep),fadeBackBody:over(['hips','chest'],back,back+xfOut+dt,ref.ipBodyStep,ref.capHipsStep),
      fadeInFeet:over(['lAnk','rAnk','lToe','rToe'],ks,ks+xfIn+dt,ref.kickToeStep,ref.kickToeStep),fadeBackFeet:over(['lAnk','rAnk','lToe','rToe'],back,back+xfOut+dt,ref.kickToeStep,ref.kickToeStep)},
    hipsBobMax:+Math.max(...f.slice(1).map((r,j)=>Math.abs(r.hips[1]-f[j].hips[1]))).toFixed(4),liftMax:+Math.max(...f.map(r=>r.lift)).toFixed(4),
    toe:{L:[+Math.min(...A.map(a=>a.tL)).toFixed(1),+Math.max(...A.map(a=>a.tL)).toFixed(1)],R:[+Math.min(...A.map(a=>a.tR)).toFixed(1),+Math.max(...A.map(a=>a.tR)).toFixed(1)],stepL:+toeStep('tL').toFixed(2),stepR:+toeStep('tR').toFixed(2)},
    kneeBackFrames:A.filter(a=>a.backL||a.backR).length,clear:+clear.toFixed(3),angles:A};
}

// ---- gates ----
const gates=[];
const gate=(sec,model,take,scen,variant,name,ok,value,limit,why)=>gates.push({sec,model,take,scen,variant,name,ok:!!ok,value,limit,why});
const SAME_KEYS=['contact gap','timing','direction','body near player','ground','plant drift','fade jump body','fade jump feet'];
function gatesFor(model,tk,sn,v,M,ref,baseOf){
  const g=(name,ok,value,limit,why)=>gate('new',model,tk,sn,v,name,ok,value,limit,why);
  g('measured',M.finite&&M.rows>30,{rows:M.rows,finite:M.finite},'all ticks, finite','a variant that did not run gives no evidence');
  g('position: offset gone at the end',M.rootDev.end<=0.001,M.rootDev.end,'<= 0.001 m','the drawn model must be back on the game player after the fade back');
  g('body near player',M.hipsDev.max<=LIM.spacing,M.hipsDev,'max <= '+LIM.spacing.toFixed(3)+' m','half the game\'s player spacing (0.707 m): further away, the body is drawn where the game keeps other players');
  g('contact gap',Math.abs(M.gapAtContact)<=LIM.gap&&M.kickWeightAtContact>=0.999,{gap:M.gapAtContact,weight:M.kickWeightAtContact},'|gap| <= 0.03 m, kick fully in','the foot on the ball at the game\'s last tick before the ball leaves');
  g('timing',M.timingErr!=null&&Math.abs(M.timingErr)<=LIM.tick+1e-6,{estimatedContact:M.tEff,gameContact:+M.tC.toFixed(4),errorMs:M.timingErr==null?null:Math.round(M.timingErr*1000),closestGap:M.closestGap},'|error| <= 16.7 ms (one tick)','the estimated contact (first touch on 1/240 s steps) within one game tick of the ball leaving; none found = the foot never reaches the ball');
  g('direction',M.dirErr!=null&&Math.abs(M.dirErr)<=LIM.dirDeg,{foot:M.footDeg,ball:M.ballDeg,error:M.dirErr},'|error| <= 15°','the kicking foot\'s travel at the contact against the ball\'s flight in the game');
  g('no foot inside the ball',M.kickInBallBefore>=LIM.inBall&&M.plantInBall>=LIM.inBall,{kick:M.kickInBallBefore,plant:M.plantInBall},'>= -0.03 m','as check_kick.js');
  g('ground',M.sole.all>=ref.sinkLimit,M.sole,'>= '+ref.sinkLimit,'soles not under the ground on any tick (the model\'s own clips plus the take\'s own dip, as check_kick.js)');
  g('plant on the ground at contact',M.plantLowAtContact<=LIM.grounded&&M.plantLowAtContact>=ref.sinkLimit,M.plantLowAtContact,'0..0.02 m (>= '+ref.sinkLimit+')','the plant foot stands on the ground when the ball is struck');
  g('plant drift',M.plantDrift<=ref.ownDrift+0.001,M.plantDrift,+(ref.ownDrift+0.001).toFixed(4),'the plant ankle +-0.1 s around the contact: no more than on the captured take (model still, +1 mm)');
  const sp=M.speed,worse=(a,b)=>a.excess>=b.excess?a:b;
  g('fade jump body',worse(sp.fadeInBody,sp.fadeBackBody).excess<=1e-6,{in:sp.fadeInBody,back:sp.fadeBackBody},{captured:ref.capHipsStep,inPlaceOwn:ref.ipBodyStep},'hips and chest per 1/60 s in the fades: no further than max(captured hips step, the game player\'s step + the in-place body\'s own step)');
  g('fade jump feet',worse(sp.fadeInFeet,sp.fadeBackFeet).excess<=1e-6,{in:sp.fadeInFeet,back:sp.fadeBackFeet},{kickToe:ref.kickToeStep},'ankles and toes per 1/60 s in the fades: no further than the game player\'s step + the kicking toe\'s own largest step');
  g('kick body speed',sp.kickBody.excess<=1e-6,sp.kickBody,{captured:ref.capHipsStep,inPlaceOwn:ref.ipBodyStep},'hips and chest per 1/60 s inside the kick: same limit as the fades');
  g('feet apart',M.clear>=LIM.clear,M.clear,'>= 0.10 m','the kicking foot must not pass through the plant foot');
  if(/T/.test(v)){g('toe range (all ticks)',M.toe.L[0]>=-LIM.toeDownDeg&&M.toe.L[1]<=LIM.toeUpDeg&&M.toe.R[0]>=-LIM.toeDownDeg&&M.toe.R[1]<=LIM.toeUpDeg,{L:M.toe.L,R:M.toe.R},'-40..65°','toe bend from the foot\'s line before, in and after the kick (anatomical range)');
    g('toe speed (all ticks)',M.toe.stepL<=ref.toeOwn.stepL+LIM.toeStepPad&&M.toe.stepR<=ref.toeOwn.stepR+LIM.toeStepPad,{L:M.toe.stepL,R:M.toe.stepR},{L:+(ref.toeOwn.stepL+2).toFixed(2),R:+(ref.toeOwn.stepR+2).toFixed(2)},'per 1/60 s: no faster than the take\'s own toes (+2°), so the repair does not snap');}
  // a repair compared with the same variant without it: knee and ankle angles and the knee's bend direction
  const b=baseOf[v];if(b){const da=Math.max(...M.angles.map((a,j)=>{const c=b.angles[j];if(!c)return 0;return Math.max(Math.abs(a.kL-c.kL),Math.abs(a.kR-c.kR),Math.abs(a.aL-c.aL),Math.abs(a.aR-c.aR));}));
    g('knee and ankle unchanged by the repair',da<=LIM.angleDeg&&M.kneeBackFrames<=b.kneeBackFrames,{maxDeg:+da.toFixed(2),kneeBackFrames:M.kneeBackFrames,without:b.kneeBackFrames},'<= 0.5°, no new backward knee','against '+b.name+': the repair must not bend the knees or ankles');
    if(/H/.test(v))g('hips height repair: no extra bob',M.hipsBobMax<=b.hipsBobMax+0.002,{with:M.hipsBobMax,without:b.hipsBobMax},'+0.002 m per 1/60 s','the lift must not make the body bob (as check_kick.js)');}
}

// ---- screenshots of the shot: the game player (yellow ring), the model, the ball, a line from the kicking foot ----
async function shots(page,m,R,list){
  const tag=m.replace(/\W/g,'_'),done=[];
  for(const [sn,v,tk0] of list){const TK=tk0||MAIN,S=R.takes[TK]&&R.takes[TK].scen&&R.takes[TK].scen[sn];if(!S||!S.variants[v])continue;const f=S.variants[v].rows,tEnd=f[f.length-1].t;
    for(const [scn,t] of [['1_press',0],['2_plant',S.tPl],['3_contact',S.tC],['4_follow',S.tC+0.2],['5_back',tEnd]])for(const view of ['front','side']){
      await page.evaluate(({TK,sn,v,t,view})=>{const Vw=window.__viewer,i=Vw.inst[0];Vw.setPaused(true);Vw.stopAll();
        let ball=Vw.scene.getObjectByName('labBall');if(!ball){ball=new THREE.Mesh(new THREE.SphereGeometry(0.11,20,14),new THREE.MeshLambertMaterial({color:0xffffff}));ball.name='labBall';Vw.scene.add(ball);
          const mark=new THREE.Mesh(new THREE.RingGeometry(0.16,0.22,32),new THREE.MeshBasicMaterial({color:0xf5c542,side:THREE.DoubleSide}));mark.rotation.x=-Math.PI/2;mark.name='labMark';Vw.scene.add(mark);
          const lab=document.createElement('div');lab.id='labLab';Object.assign(lab.style,{position:'absolute',right:'10px',top:'10px',background:'rgba(7,16,31,.85)',padding:'6px 8px',border:'1px solid #f5c542',font:'13px system-ui',color:'#fff',maxWidth:'62%'});document.querySelector('#view').appendChild(lab);}
        const cfg=window.__lab[TK][sn][v],res=GLShot.sim(i,Object.assign({},cfg,{stopAt:t,sub:null})),r=res.rows[res.rows.length-1];
        ball.position.fromArray(r.ball);Vw.scene.getObjectByName('labMark').position.set(r.player[0],0.012,r.player[1]);
        const dev=Math.hypot(r.hips[0]-r.player[0],r.hips[2]-r.player[1]);
        document.querySelector('#labLab').textContent=`${TK} ${v} · ${sn} · t=${t.toFixed(3)} s (D 누름 0) · 오른발-공 ${r.R.gap.toFixed(3)} m · 골반-선수 ${dev.toFixed(2)} m · 발바닥 최저 ${Math.min(r.L.low,r.R.low).toFixed(3)} m`;
        Vw.orbit.target.set(r.player[0]+0.2,0.6,r.player[1]+0.35);if(view==='front'){Vw.orbit.yaw=0.25;Vw.orbit.pitch=0.18;}else{Vw.orbit.yaw=Math.PI/2;Vw.orbit.pitch=0.08;}Vw.orbit.dist=3.4;},{TK,sn,v,t,view});
      await page.waitForTimeout(250);
      const file=path.join(DIR,'out',`lab_${TAG}${tag}_${TK===MAIN?'':TK+'_'}${sn.replace(/\W+/g,'_')}_${v.replace(/\W/g,'')}_${scn}_${view}.png`);
      await page.locator('#view').screenshot({path:file,timeout:90000}).then(()=>done.push(path.basename(file)),e=>console.log('screenshot failed',file,e.message.split('\n')[0]));}}
  return done;
}

(async()=>{
  const EX=existing();
  const GP=await probeGame();
  for(const s of GP.scenarios)console.log(JSON.stringify({game:s.name,dRelease:s.dRelease,kickPose:s.kickPose,lastOwned:s.lastOwned,ballLeaves:s.ballLeaves,followEnd:s.followEnd,ballAtContact:s.ballAtContact,ballLat:s.ballLatAtContact,speedAtPress:s.speedAtPress,speedAtContact:s.speedAtContact,
    moved:{pressToContact:s.rows[Math.round(s.lastOwned*60)].z,lateral:Math.max(...s.rows.map(r=>Math.abs(r.x))),yawDeg:+(Math.max(...s.rows.map(r=>Math.abs(r.yaw)))*180/Math.PI).toFixed(2)}}));
  gate('new','game','-','-','-','probe ran without page errors',!GP.errors.length,GP.errors.slice(0,3),'none','the game page must load and play');
  for(const s of GP.scenarios)gate('new','game','-',s.name,'-','shot moments found',s.lastOwned>0&&s.followEnd!=null&&s.kickPose>0,{kickPose:s.kickPose,lastOwned:s.lastOwned,followEnd:s.followEnd},'all found','without them there is nothing to line the clip up with');
  const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const all={},summary={scenarios:GP.scenarios.map(s=>({name:s.name,dRelease:s.dRelease,kickPose:s.kickPose,lastOwned:s.lastOwned,ballLeaves:s.ballLeaves,followEnd:s.followEnd,ballAtContact:s.ballAtContact,speedAtPress:s.speedAtPress,speedAtContact:s.speedAtContact,movedPressToContact:s.rows[Math.round(s.lastOwned*60)].z})),models:{}};
  for(const m of MODELS){
    const t0=Date.now(),{page,R,errors}=await runModel(browser,m,GP);
    if(R.failed){gate('new',m,'-','-','-','load',false,R.failed,'loaded','the model must load');await page.close();continue;}
    gate('new',m,'-','-','-','console errors',!errors.length,errors.slice(0,3),'none','the page must not log errors');
    const sm=summary.models[m]={own:R.own,takes:{}};
    for(const [tk,T] of Object.entries(R.takes)){
      if(T.failed){gate('new',m,tk,'-','-','take loads',false,T.failed,'loaded','');continue;}
      gate('new',m,tk,'-','-','repaired clips finite',Object.values(T.ref.finite).every(Boolean),T.ref.finite,'all','retarget and repairs must not make NaN');
      const st=sm.takes[tk]={ref:T.ref,info:T.info,scen:{}};
      for(const [sn,S] of Object.entries(T.scen)){const Ms={};st.scen[sn]={tC:S.tC,tPl:S.tPl,backAt:S.backAt,variants:{}};
        for(const [v,Vv] of Object.entries(S.variants))Ms[v]=Object.assign(measure(S,Vv,T.ref),{fitTouch:Vv.fitTouch,pass1Lock:Vv.pass1Lock});
        // the variant without the repair, for the repair gates
        const baseOf={};for(const v of Object.keys(Ms)){const b={'F+T':'F','F+H':'F','F+TH':'F+T','G+T':'G','G+H':'G','G+TH':'G+T','G':'F'}[v];if(b&&Ms[b])baseOf[v]=Object.assign({name:b},Ms[b]);}
        for(const [v,M] of Object.entries(Ms)){gatesFor(m,tk,sn,v,M,T.ref,baseOf);const c=Object.assign({},M);delete c.angles;st.scen[sn].variants[v]=c;}}}
    fs.writeFileSync(path.join(DIR,'out',`shot_lab_${TAG}${m.replace(/\W/g,'_')}.json`),JSON.stringify({R,summary:sm}));
    sm.screenshots=flag('--no-shots')?[]:await shots(page,m,R,TAKE_DIR?SURVEY.flatMap(tk=>[['standing D 0.2 s','F+THC',tk],['running straight D 0.2 s','F+THC',tk]]):[['running angled D 0.2 s','F+THC+Y'],['running straight D 0.2 s','F+THC'],['standing D 0.2 s','F+THC'],['running angled D 0.2 s','E3']]);
    sm.seconds=Math.round((Date.now()-t0)/1000);
    await page.close();
  }
  await browser.close();
  // ---- Xbot against Soldier: the same verdict on every gate of every variant and scenario ----
  if(MODELS.length>1){const [m1,m2]=MODELS;
    for(const g1 of gates.filter(g=>g.sec==='new'&&g.model===m1&&g.variant!=='-')){const g2=gates.find(g=>g.sec==='new'&&g.model===m2&&g.take===g1.take&&g.scen===g1.scen&&g.variant===g1.variant&&g.name===g1.name);if(!g2)continue;
      if(g1.name==='measured')continue;
      gate('cross',m1+' vs '+m2,g1.take,g1.scen,g1.variant,'same verdict: '+g1.name,g1.ok===g2.ok,{[m1]:g1.ok?'ok':'FAIL',[m2]:g2.ok?'ok':'FAIL',values:[g1.value,g2.value]},'same verdict','a method for the game must work on any Mixamo-named model, not on one');}}
  // ---- report ----
  const L=[];const p=s=>{L.push(s);console.log(s);};
  p('=== 1. 기존 검사 (check_kick.js, 수정하지 않음) ===');
  if(!EX)p('(--no-existing: 실행하지 않음)');
  else{p('출처: '+EX.src+' · '+EX.summary);
    const o=EX.orig;p(`원래 92개 게이트: ${o.length}개 읽음, 통과 ${o.filter(g=>g.ok).length}, 실패 ${o.filter(g=>!g.ok).length}`);
    for(const r of EX.ref)p(`  ${r.found?(r.ok?'해결':'남음'):'없음'} ${r.model} ${r.name}: ${r.value} (limit ${r.limit}`);
    const extra=o.filter(g=>!g.ok&&!REF12.some(([m,n])=>m===g.model&&n===g.name));p(`  원래 92개 중 새 실패: ${extra.length}`);for(const g of extra)p('  '+g.line);
    const r2=EX.round2;p(`A–E3 회차 게이트: ${r2.length}개, 통과 ${r2.filter(g=>g.ok).length}, 실패 ${r2.filter(g=>!g.ok).length}`);}
  p('=== 2. 새 검사 (check_shot.js) ===');
  const nw=gates.filter(g=>g.sec!=='existing');
  for(const g of nw.filter(g=>!g.ok))p(`FAIL [${g.sec}] ${g.model} ${g.take} ${g.scen} ${g.variant} · ${g.name}: 측정 ${JSON.stringify(g.value)} / 기준 ${JSON.stringify(g.limit)} / 이유: ${g.why}`);
  // pass counts per variant (take MAIN), per scenario kind
  const kinds=['standing','running straight','running angled'];
  for(const m of MODELS){p(`-- ${m} ${MAIN}: 변형별 실패 게이트 수 (각 3개 시나리오 합: 정지 / 직선 달리기 / 비스듬히 달리기)`);
    const vs=[...new Set(nw.filter(g=>g.model===m&&g.take===MAIN&&g.variant!=='-').map(g=>g.variant))];
    for(const v of vs){const c=kinds.map(k=>{const gs=nw.filter(g=>g.model===m&&g.take===MAIN&&g.variant===v&&g.scen.startsWith(k));return `${gs.filter(g=>!g.ok).length}/${gs.length}`;});
      const names=[...new Set(nw.filter(g=>g.model===m&&g.take===MAIN&&g.variant===v&&!g.ok).map(g=>g.name))];p(`   ${v.padEnd(8)} 정지 ${c[0]} · 직선 ${c[1]} · 비스듬히 ${c[2]} · 실패 항목: ${names.join(', ')||'없음'}`);}}
  fs.writeFileSync(path.join(DIR,'out',`shot_lab_${TAG}gates.log`),gates.map(g=>`${g.ok?'ok  ':'FAIL'} [${g.sec}] ${g.model} ${g.take} ${g.scen} ${g.variant} · ${g.name}: 측정 ${JSON.stringify(g.value)} / 기준 ${JSON.stringify(g.limit)} / 이유: ${g.why}`).join('\n')+'\n');
  summary.gates={total:nw.length,failed:nw.filter(g=>!g.ok).length};summary.existing=EX&&{src:EX.src,summary:EX.summary,orig:{n:EX.orig.length,failed:EX.orig.filter(g=>!g.ok).length},ref:EX.ref,round2:{n:EX.round2.length,failed:EX.round2.filter(g=>!g.ok).length}};
  fs.writeFileSync(path.join(DIR,'out',`shot_lab_${TAG}summary.json`),JSON.stringify(summary,null,1));
  const bad=nw.filter(g=>!g.ok).length;
  p(bad?`SHOT CHECK FAIL: 새 게이트 ${bad}/${nw.length} 실패 (변형별 표와 out/shot_lab_gates.log 참고)`:`SHOT CHECK PASS: 새 게이트 ${nw.length}개 모두 통과`);
  process.exitCode=bad?1:0;
})();
