// The MakeHuman player (out/mh_player.glb) with CMU takes: the clip set, the state chain and the game's shots, measured
// (Playwright + SwiftShader). Prototype only: nothing here changes the game; index.html is loaded read-only for the
// shot probe, as check_shot.js does.
// Usage (from this folder): node check_player.js [--kicks 143_24,11_01,10_01,10_02,10_03,10_05,10_06] [--no-shots]
//   round 2: [--out <dir>] (results there instead of out/) [--probe <game_probe.json>] (reuse a recorded game probe:
//   the same game rows for a baseline and a variant) [--variant toes] (exp_v2.js applied to every clip set)
// Writes out/check_player_<kick>.json (every tick of every scenario), out/check_player_gates.log (every gate),
// out/check_player_summary.json, out/game_probe.json and screenshots out/pa_<kick>_<scenario>_<moment>.png.
// Exit 1 when the model check fails or the page logs errors. Gate failures are results, not script failures: read the
// tables (the exit code says nothing about which kick passes).
const path=require('path'),fs=require('fs'),crypto=require('crypto');
const DIR=__dirname,GV=path.join(DIR,'..'),REPO=path.join(GV,'..','..','..');
const P=require(path.join(GV,'..','..','tests','legacy','paths.js'));
const {chromium}=require(P.PLAYWRIGHT);
const three=fs.readFileSync(P.THREE_JS,'utf8');
const argv=process.argv.slice(2),flag=f=>argv.includes(f),opt=f=>{const k=argv.indexOf(f);return k>=0?argv[k+1]:null;};
const KICKS=(opt('--kicks')||'143_24,11_01,10_01,10_02,10_03,10_05,10_06').split(',');
const OUT=opt('--out')?path.resolve(opt('--out')):path.join(DIR,'out');fs.mkdirSync(OUT,{recursive:true});
const VARIANT=opt('--variant'),PROBE=opt('--probe');
// limits taken from check_shot.js (same values, same meaning); the ones added here say so
const LIM={
  gap:0.03,          // check_shot.js: foot on the ball at the game's contact tick
  tick:1/60,         // check_shot.js: the estimated contact within one game tick of the ball leaving
  dirDeg:15,         // check_shot.js: the kicking foot's travel within 15° of the ball's flight
  inBall:-0.03,      // check_shot.js / check_kick.js: no foot more than 3 cm inside the ball
  grounded:0.02,     // check_shot.js: the plant foot's lowest point within 2 cm of the ground at the contact
  spacing:0.707/2,   // check_shot.js: the body within half the game's player spacing of the player
  clear:0.10,        // check_shot.js: kicking foot and plant foot apart by a shoe's width while the kick plays
  // added here (no criterion in check_shot.js for these):
  slidePad:0.02,     // a foot's slide in one ground contact: at most the clip's own (alone, its own speed) + 2 cm
  boneMm:1,          // bone lengths: no stretch (the rig has no scale tracks; 1 mm for rounding)
  basePose:0.001,    // back in the base pose: every joint within 1 mm of the idle clip's own pose
  edgePad:0.05,      // mesh stretch in a fade: at most the larger of the two clips' own + 0.05
};
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const PROTECTED=[path.join(REPO,'ground-legends','index.html'),path.join(REPO,'docs','index.html')];
const before=Object.fromEntries(PROTECTED.map(f=>[path.relative(REPO,f),sha(f)]));

// ---- the game, read only: every tick from the D press (as check_shot.js probeGame), plus one shot where the player
// lets go of the direction after the ball leaves (the game's own slowing down) ----
async function probeGame(){
  const open=require(path.join(GV,'..','..','tests','legacy','harness.js'));const {browser,page,errors}=await open();
  const sc=await page.evaluate(()=>{const g=__game;g.startMatch({mode:'play',minutes:12,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(1);
    // rows every 1/60 s in the player's frame at the press (z = his heading then, x = his left), from 1 s before the
    // press when running (the run-up: the run clip at the game's speed is measured there); times from the first row
    const one=(running,holdTicks,kind,stopAfter)=>{const p=g.give(0,9);const K=g.ctrl[0];p.pos.set(0,0,0);p.face=Math.PI/2;p.vel.set(running?6:0,0,0);p.wantVel.copy(p.vel);g.ball.pos.set(0.5,0.11,0);
      for(const q of g.players)if(q!==p&&!q.isGK){q.pos.set(q.team?-30:-40,0,q.slot*3-15);q.vel.set(0,0,0);}
      g.setCtl(p);p.sk=null;p.cdSkill=0;g.sim(1/60);
      if(kind==='straight'){K.remote=true;K.mv.set(1,0,0);}
      if(kind==='angled')g.actDown('right');
      const b=g.ball.pos,raw=[],snap=()=>raw.push({x:p.pos.x,z:p.pos.z,f:p.face,speed:Math.hypot(p.vel.x,p.vel.z),ball:[b.x,b.y,b.z],owned:g.ball.owner===p,kickPose:p.oAnim==='kick'});
      if(running)for(let k=0;k<60;k++){snap();g.sim(1/60);}
      const lead=raw.length;snap();g.actDown('shoot');for(let k=0;k<holdTicks;k++){g.sim(1/60);snap();}g.actUp('shoot');
      let released=false;
      for(let k=0;k<180;k++){if(stopAfter&&!released&&!raw[raw.length-1].owned){released=true;if(kind==='angled')g.actUp('right');K.mv.set(0,0,0);}g.sim(1/60);snap();}
      if(kind==='angled')g.actUp('right');K.remote=false;K.mv.set(0,0,0);
      const P0=raw[lead],x0=P0.x,z0=P0.z,f0=P0.f,F=[Math.sin(f0),Math.cos(f0)],Lf=[Math.cos(f0),-Math.sin(f0)];
      const loc=(x,z)=>[+((x-x0)*Lf[0]+(z-z0)*Lf[1]).toFixed(4),+((x-x0)*F[0]+(z-z0)*F[1]).toFixed(4)];
      const rows=raw.map((r,k)=>{const pp=loc(r.x,r.z),bb=loc(r.ball[0],r.ball[2]);return {t:+(k/60).toFixed(4),x:pp[0],z:pp[1],yaw:+(r.f-f0).toFixed(5),speed:+r.speed.toFixed(3),ball:[bb[0],+r.ball[1].toFixed(4),bb[1]],owned:r.owned,kickPose:r.kickPose};});
      const after=k=>k>lead,kLeave=rows.findIndex((r,k)=>after(k)&&!r.owned),kPose=rows.findIndex((r,k)=>k>=lead&&r.kickPose),kEnd=rows.findIndex((r,j)=>j>kLeave&&!r.kickPose);
      const b0=rows[kLeave-1].ball,b3=rows[kLeave+3].ball,aim=Math.atan2(b3[0]-b0[0],b3[2]-b0[2]);
      return {name:(running?'running '+kind:'standing')+' D '+(holdTicks/60).toFixed(1)+' s'+(stopAfter?' then stop':''),running,kind:running?kind:'standing',hold:holdTicks/60,stopAfter:!!stopAfter,rows,press:lead/60,
        aimDeg:+(aim*180/Math.PI).toFixed(2),kickPose:kPose/60,lastOwned:(kLeave-1)/60,ballLeaves:kLeave/60,followEnd:kEnd>0?kEnd/60:null,
        ballAtContact:+(rows[kLeave-1].ball[2]-rows[kLeave-1].z).toFixed(4),ballLatAtContact:+(rows[kLeave-1].ball[0]-rows[kLeave-1].x).toFixed(4),speedAtPress:rows[lead].speed,speedAtContact:rows[kLeave-1].speed};};
    return [6,12,18].map(h=>one(false,h,'standing')).concat([6,12,18].map(h=>one(true,h,'straight')),[6,12,18].map(h=>one(true,h,'angled')),[one(true,12,'straight',true),one(true,12,'angled',true)]);});
  await browser.close();
  return {scenarios:sc,errors:errors.filter(e=>!e.includes('ERR_FAILED')&&!/Failed to load resource/.test(e))};
}

// ---- the lab page: the viewer (index.html) as it is, PALab driven from here ----
async function openLab(browser){
  const page=await browser.newPage({viewport:{width:960,height:640}});const errors=[];
  page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errors.push(m.text());});page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  await page.route('**/*',r=>{const u=r.request().url();
    if(u.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'});
    if(u.startsWith('http://viewer.local/')){const f=path.join(GV,decodeURIComponent(u.slice(20).split('?')[0]));
      if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.html')?'text/html':f.endsWith('.json')?'application/json':'application/octet-stream'});
      return r.fulfill({status:404,body:'not found'});}
    return r.abort();});
  await page.goto('http://viewer.local/player-animation/index.html?autoload=0');
  await page.waitForFunction(()=>window.PALab&&window.__pa,null,{timeout:60000});
  return {page,errors};
}

// ---- measurements from the ticks ----
const d2=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]),d3=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const ang=(a,b,c)=>{const u=sub(a,b),w=sub(c,b),d=u[0]*w[0]+u[1]*w[1]+u[2]*w[2];return Math.acos(Math.max(-1,Math.min(1,d/(Math.hypot(...u)*Math.hypot(...w)))))*180/Math.PI;};
// check_shot.js kneeBack: the knee behind the hip-ankle line, against the foot's forward direction
const kneeBack=(up,kn,an,toe)=>{const a=sub(an,up),L=Math.hypot(...a),u=a.map(x=>x/L),k=sub(kn,up),s=k[0]*u[0]+k[1]*u[1]+k[2]*u[2],perp=[k[0]-u[0]*s,k[1]-u[1]*s,k[2]-u[2]*s],f=sub(toe,an),fl=Math.hypot(f[0],f[2])||1;
  return (perp[0]*f[0]+perp[2]*f[2])/fl<-0.01&&ang(up,kn,an)<170;};
const PALabJ=['Hips','Spine2','Head','LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase','RightUpLeg','RightLeg','RightFoot','RightToeBase','LeftArm','LeftForeArm','LeftHand','RightArm','RightForeArm','RightHand'];   // PALab.JOINTS, same order
const kbAt=r=>kneeBack(r.j.LeftUpLeg,r.j.LeftLeg,r.j.LeftFoot,r.j.LeftToeBase)||kneeBack(r.j.RightUpLeg,r.j.RightLeg,r.j.RightFoot,r.j.RightToeBase);
// backward knees the scenario adds: ticks where a knee bends backwards but none of the clips playing does so alone
// at its own clip time (the knee test of check_shot.js also fires in a run's back swing; those are the clip's own)
function newKnees(T,ownKB,clips){const out=[];for(const r of T){if(!kbAt(r))continue;
  const own=r.times.some(([st,ct])=>{const a=ownKB[st];if(!a)return false;const d=clips[st].duration,k=Math.round((clips[st].loop?ct%d:Math.min(ct,d))*60);return a.slice(Math.max(0,k-1),k+2).some(Boolean);});
  if(!own)out.push(+r.t.toFixed(3));}return out;}
const BODY=['Hips','Spine2','Head'],FEET=['LeftFoot','LeftToeBase','RightFoot','RightToeBase'],HANDS=['LeftHand','RightHand'];
const BONES=[['LeftUpLeg','LeftLeg'],['LeftLeg','LeftFoot'],['LeftFoot','LeftToeBase'],['RightUpLeg','RightLeg'],['RightLeg','RightFoot'],['RightFoot','RightToeBase'],
  ['LeftArm','LeftForeArm'],['LeftForeArm','LeftHand'],['RightArm','RightForeArm'],['RightForeArm','RightHand']];
const rel=(r,k)=>[r.j[k][0]-r.holder[0],r.j[k][1],r.j[k][2]-r.holder[1]];   // a joint relative to the holder's ground point
function stepsIn(T,a,b){const o={body:0,feet:0,hands:0,rotLegs:0,rotArms:0,rotSpine:0,at:{}};
  for(let i=1;i<T.length;i++){const t=T[i].t;if(t<=a+1e-6||t>b+1e-6)continue;
    for(const [g,ks] of [['body',BODY],['feet',FEET],['hands',HANDS]])for(const k of ks){const s=d3(rel(T[i],k),rel(T[i-1],k));if(s>o[g]){o[g]=s;o.at[g]=[+t.toFixed(4),k];}}
    if(T[i].rot){o.rotLegs=Math.max(o.rotLegs,T[i].rot.legs);o.rotArms=Math.max(o.rotArms,T[i].rot.arms);o.rotSpine=Math.max(o.rotSpine,T[i].rot.spine);}}
  for(const k of ['body','feet','hands','rotLegs','rotArms','rotSpine'])o[k]=+o[k].toFixed(4);return o;}
// ground contacts of each foot: runs of ticks where its touching vertices are known in both ticks; slide summed per run
function contacts(T,a,b){const o={};for(const s of ['Left','Right']){let cur=null;const runs=[];
  for(const r of T){if(r.t<a-1e-6||r.t>b+1e-6){if(cur){runs.push(cur);cur=null;}continue;}
    const d=r.slide&&r.slide[s];if(d!=null){if(!cur)cur={from:r.t,to:r.t,slide:0,maxSpeed:0};cur.to=r.t;cur.slide+=d;cur.maxSpeed=Math.max(cur.maxSpeed,d*60);}else if(cur){runs.push(cur);cur=null;}}
  if(cur)runs.push(cur);
  const mx=runs.reduce((m,x)=>x.slide>m.slide?x:m,{slide:0,from:null,to:null,maxSpeed:0});
  o[s]={runs:runs.length,maxSlide:+mx.slide.toFixed(4),maxSlideAt:mx.from==null?null:[+mx.from.toFixed(3),+mx.to.toFixed(3)],maxSpeed:+Math.max(0,...runs.map(x=>x.maxSpeed)).toFixed(3),touchTime:+runs.reduce((s2,x)=>s2+x.to-x.from,0).toFixed(3)};}
  o.max=Math.max(o.Left.maxSlide,o.Right.maxSlide);return o;}
function common(T,restLen,a,b){
  const W=T.filter(r=>r.t>=a-1e-6&&r.t<=b+1e-6);
  const finite=W.every(r=>Object.values(r.j).every(v=>v.every(Number.isFinite))&&Number.isFinite(r.feet.Left.low)&&Number.isFinite(r.feet.Right.low));
  const sole=Math.min(...W.map(r=>Math.min(r.feet.Left.low,r.feet.Right.low,r.sole)));
  let bone=0,boneAt=null;for(const r of W)for(const [x,y] of BONES){const e=Math.abs(d3(r.j[x],r.j[y])-restLen[x+'-'+y]);if(e>bone){bone=e;boneAt=[r.t,x+'-'+y];}}
  let kb=0,kneeMin=180;for(const r of W){const L=kneeBack(r.j.LeftUpLeg,r.j.LeftLeg,r.j.LeftFoot,r.j.LeftToeBase),R=kneeBack(r.j.RightUpLeg,r.j.RightLeg,r.j.RightFoot,r.j.RightToeBase);if(L||R)kb++;
    kneeMin=Math.min(kneeMin,ang(r.j.LeftUpLeg,r.j.LeftLeg,r.j.LeftFoot),ang(r.j.RightUpLeg,r.j.RightLeg,r.j.RightFoot));}
  const E=W.filter(r=>r.edge);const edge=E.length?{min:+Math.min(...E.map(r=>r.edge.min)).toFixed(3),max:+Math.max(...E.map(r=>r.edge.max)).toFixed(3),maxAt:E.reduce((m,r)=>r.edge.max>m.edge.max?r:m).edge.maxAt}:null;
  return {ticks:W.length,finite,sole:+sole.toFixed(4),penetration:+Math.max(0,-sole).toFixed(4),boneErrMm:+(bone*1000).toFixed(3),boneAt,kneeBackTicks:kb,kneeMinDeg:+kneeMin.toFixed(1),edge,
    slide:contacts(T,a,b),steps:stepsIn(T,a,b)};
}

// ---- gates ----
const gates=[];
const gate=(kick,scen,name,ok,value,limit,why)=>gates.push({kick,scen,name,ok:!!ok,value,limit,why});

(async()=>{
  const t0=Date.now();
  console.log('game probe (index.html read only) ...');
  const GP=PROBE?JSON.parse(fs.readFileSync(PROBE,'utf8')):await probeGame();
  fs.writeFileSync(path.join(OUT,'game_probe.json'),JSON.stringify(GP));
  gate('-','game','probe ran without page errors',!GP.errors.length,GP.errors.slice(0,3),'none','the game page must load and play');
  for(const s of GP.scenarios)gate('-',s.name,'shot moments found',s.lastOwned>0&&s.kickPose>=0,{kickPose:s.kickPose,lastOwned:s.lastOwned,ballLeaves:s.ballLeaves},'found','without them nothing lines the kick up');
  const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const {page,errors}=await openLab(browser);
  if(VARIANT){await page.addScriptTag({url:'http://viewer.local/player-animation/exp_v2.js'});await page.evaluate(v=>window.PAExp.use(v),VARIANT);}
  const model=await page.evaluate(async()=>{const M=await window.__pa.loadModel();PALab.toRest(M);const J={};for(const n of PALab.JOINTS)J[n]=M.by[n].getWorldPosition(new THREE.Vector3()).toArray();return {check:M.check,restJ:J};});
  const restLen={};for(const [x,y] of BONES)restLen[x+'-'+y]=d3(model.restJ[x],model.restJ[y]);
  gate('-','model','skeleton and skin check',model.check.ok,model.check,'all ok','Mixamo bone names and parents, weights sum 1, inverse bind matrices, feet on the ground, faces +z');
  const summary={model:model.check,kicks:{},limits:LIM,game:GP.scenarios.map(s=>({name:s.name,press:s.press,lastOwned:s.lastOwned,ballLeaves:s.ballLeaves,kickPose:s.kickPose,aimDeg:s.aimDeg,ballAtContact:s.ballAtContact,ballLatAtContact:s.ballLatAtContact,speedAtPress:s.speedAtPress,speedAtContact:s.speedAtContact,
    speedEnd:s.rows[s.rows.length-1].speed,yawAtContactDeg:+(s.rows[Math.round(s.lastOwned*60)].yaw*180/Math.PI).toFixed(1)}))};

  for(const kick of KICKS){
    console.log('kick',kick,'...');
    const L=await page.evaluate(async kick=>{const lib=await window.__pa.useKick(kick);const o={};
      for(const k of ['idle','start','run','decel','kick','recover']){const c=lib[k];o[k]={take:c.take,from:c.from,to:c.to,duration:+c.duration.toFixed(4),speed:+c.speed.toFixed(3),net:+c.net.toFixed(3),loop:c.loop,yawDeg:c.yawDeg,
        hipScale:c.info.hipScale,groundLift:c.info.groundLiftModelUnits,sourceDip:+Math.min(0,...c.info.sourceFootLow).toFixed(4),clavicle:c.clavicle,poses:PALab.poseTable(lib._M,c).map(p=>p.map(v=>v.map(x=>+x.toFixed(4))))};}
      o.kick.contact=lib.kick.contact;return o;},kick);
    // every clip alone, at its own speed with its own path (root motion): the references
    const own={};
    const ownKB={};   // per clip, per 1/60 s of clip time: does the clip alone bend a knee backwards there
    for(const k of ['idle','start','run','decel','kick','recover']){const R=await page.evaluate(k=>window.__pa.alone(k),k);
      ownKB[k]=R.ticks.map(kbAt);
      const C=common(R.ticks,restLen,0,R.ticks[R.ticks.length-1].t);
      own[k]=Object.assign(C,{});
      if(k==='kick'){const tc=L.kick.contact.contact,w=R.ticks.filter(r=>r.t>=tc-0.1-1e-6&&r.t<=tc+0.1+1e-6);own.kick.plantDrift=+Math.max(...w.map(r=>d2(r.j.LeftFoot,w[0].j.LeftFoot))).toFixed(4);
        own.kick.plantLowAtContact=R.ticks.reduce((a,b)=>Math.abs(b.t-tc)<Math.abs(a.t-tc)?b:a).feet.Left.low;}}
    const sinkLimit=+Math.min(0,...Object.values(L).map(c=>c.sourceDip)).toFixed(4);   // the rest pose stands at 0 (no own clips in the file) plus the takes' own dip under their floor
    const K={clips:Object.fromEntries(Object.entries(L).map(([k,c])=>[k,Object.assign({},c,{poses:undefined})])),own,sinkLimit,scen:{}};
    const dump={kick,clips:K.clips,own,scen:{}};
    const ownStep=(a,b,g)=>Math.max(own[a]?own[a].steps[g]:0,own[b]?own[b].steps[g]:0);
    // fades: every event with a fade, its window, its pose gap, and its speed against the two clips' own
    const fadesOf=(T,log,kickName)=>log.filter(e=>e.fade>0&&e.outgoing.length).map(e=>{const a=e.t,b=e.t+e.fade+1/60,st=stepsIn(T,a,b),from=e.outgoing[e.outgoing.length-1];
      const pf=L[from.state].poses,pi=L[e.state].poses,P1=pf[Math.min(pf.length-1,Math.round(from.time*60))],P2=pi[Math.min(pi.length-1,Math.round((e.phase%L[e.state].duration)*60))];
      let gap=0;for(let k=0;k<P1.length;k++)gap=Math.max(gap,d3(P1[k],P2[k]));
      const lim={body:ownStep(from.state,e.state,'body'),feet:ownStep(from.state,e.state,'feet'),hands:ownStep(from.state,e.state,'hands'),rotLegs:ownStep(from.state,e.state,'rotLegs'),rotArms:ownStep(from.state,e.state,'rotArms'),rotSpine:ownStep(from.state,e.state,'rotSpine')};
      const over=Object.keys(lim).filter(k=>st[k]>lim[k]+1e-6).map(k=>k+' '+st[k]+' > '+lim[k]);
      const sl=contacts(T,a,b),slLim=Math.max(own[from.state].slide.max,own[e.state].slide.max)+LIM.slidePad;
      return {t:e.t,from:from.state,to:e.state,restart:e.restart,fade:e.fade,phase:e.phase,poseGap:+gap.toFixed(4),steps:st,limits:lim,over,slide:sl.max,slideLimit:+slLim.toFixed(4),why:e.why};});
    // ---- the chain and the repeats (root motion) ----
    for(const sn of ['chain','repeat']){const R=await page.evaluate(sn=>window.__pa.plan(sn),sn);const T=R.ticks;
      const C=common(T,restLen,0,T[T.length-1].t),F=fadesOf(T,R.log);
      // back in the base pose: from baseFrom on, the idle clip alone at the same idle time, relative to the hips' ground point
      const ip=L.idle.poses,B=T.filter(r=>r.t>=R.plan.baseFrom-1e-6);let base=0,drift=0;
      for(const r of B){const it=(r.times.find(x=>x[0]==='idle')||[])[1];if(it==null){base=Infinity;continue;}const f=Math.min(ip.length-1,it*60),j0=Math.floor(f),j1=Math.min(ip.length-1,j0+1),u=f-j0,P=ip[j0].map((v,k)=>v.map((x,c)=>x+(ip[j1][k][c]-x)*u));
        // the pose table is relative to the hips' ground point, in the holder's frame (root mode keeps the holder's yaw at 0)
        PALabJ.forEach((n,k)=>{const q=[r.j[n][0]-r.j.Hips[0],r.j[n][1],r.j[n][2]-r.j.Hips[2]];base=Math.max(base,d3(q,P[k]));});
        drift=Math.max(drift,d2([B[0].holder[0],0,B[0].holder[1]],[r.holder[0],0,r.holder[1]]));}
      const M={common:C,fades:F,base:{from:R.plan.baseFrom,maxJointMm:+(base*1000).toFixed(3),holderDrift:+drift.toFixed(4),ownIdleNet:L.idle.net},log:R.log,events:R.plan.events};
      K.scen[sn]=M;dump.scen[sn]={plan:R.plan,ticks:T,log:R.log};
      gate(kick,sn,'measured',C.finite&&C.ticks>60,{ticks:C.ticks,finite:C.finite},'all ticks, finite','a scenario that did not run gives no evidence');
      gate(kick,sn,'ground',C.sole>=sinkLimit,{sole:C.sole,penetration:C.penetration},'>= '+sinkLimit,'no sole or body point under the ground (rest pose 0 + the takes\' own dip; check_kick.js limit, see README)');
      gate(kick,sn,'fades no faster than the clips',F.every(f=>!f.over.length),F.filter(f=>f.over.length).map(f=>({t:f.t,from:f.from,to:f.to,over:f.over})),'per 1/60 s: body, feet, hands, joint turns <= the faster of the two clips alone','a fade must not jump (added; check_shot.js compares with the take\'s own steps the same way)');
      gate(kick,sn,'fades: no extra foot slide',F.every(f=>f.slide<=f.slideLimit+1e-6),F.map(f=>({t:f.t,to:f.to,slide:f.slide,limit:f.slideLimit})),'<= own + 0.02 m','a foot on the ground slides in a fade no more than in the two clips alone (added)');
      const nk=newKnees(T,ownKB,L);M.newKnees=nk;
      gate(kick,sn,'no backward knee added',!nk.length,{added:nk,allTicks:C.kneeBackTicks},'none beyond the clips\' own','check_shot.js kneeBack, per tick against the clips alone at their own clip time');
      gate(kick,sn,'bones keep their length',C.boneErrMm<=LIM.boneMm,{mm:C.boneErrMm,at:C.boneAt},'<= 1 mm','no stretch at the joints (added)');
      gate(kick,sn,'back in the base pose',M.base.maxJointMm<=LIM.basePose*1000,M.base,'<= 1 mm from the idle clip','after the last fade to idle the pose is the idle clip\'s own (added)');
      gate(kick,sn,'mesh in the fades',!C.edge||C.edge.max<=Math.max(...Object.values(own).map(o=>o.edge?o.edge.max:0))+LIM.edgePad,{scenario:C.edge,ownMax:Math.max(...Object.values(own).map(o=>o.edge?o.edge.max:0))},'max stretch <= the clips\' own + 0.05','a fade must not tear the mesh more than the clips do (added)');}
    // ---- the game's shots (the holder follows the game's player; the clips play in place) ----
    for(const g of GP.scenarios){const R=await page.evaluate(g=>window.__pa.plan('game',g),g);const T=R.ticks,S=R.subs,pl=R.plan,tC=pl.tC;
      const C=common(T,restLen,0,T[T.length-1].t),F=fadesOf(T,R.log);
      const at=t=>T.reduce((a,b)=>Math.abs(b.t-t)<Math.abs(a.t-t)?b:a),fc=at(tC);
      const touch=S.find(s=>s.feet.Right.gap<=0.005),closest=S.reduce((a,b)=>b.feet.Right.gap<a.feet.Right.gap?b:a,S[0]),tEff=touch?touch.t:null;
      const r0=touch||closest,k0=S.indexOf(r0),pa=S[Math.max(0,k0-1)],pb=S[Math.min(S.length-1,k0+1)],fv=sub(pb.j.RightToeBase,pa.j.RightToeBase),footDeg=Math.atan2(fv[0],fv[2])*180/Math.PI;
      const kL=Math.round(g.ballLeaves*60),b0=g.rows[kL-1].ball,b1=g.rows[Math.min(g.rows.length-1,kL+3)].ball,ballDeg=Math.atan2(b1[0]-b0[0],b1[2]-b0[2])*180/Math.PI;
      let dirErr=footDeg-ballDeg;while(dirErr>180)dirErr-=360;while(dirErr<-180)dirErr+=360;
      const w=T.filter(r=>r.t>=tC-0.1-1e-6&&r.t<=tC+0.1+1e-6),plantDrift=Math.max(...w.map(r=>d2(r.j.LeftFoot,w[0].j.LeftFoot)));
      const kickIn=pl.kickStart+pl.fadeIn,kickOut=(R.log.find(e=>e.t>pl.kickStart+1e-6&&e.state!=='kick')||{t:T[T.length-1].t}).t;
      let clear=Infinity;for(const r of T.filter(r=>r.t>=kickIn-1e-6&&r.t<=kickOut+1e-6))for(const a of ['RightFoot','RightToeBase'])for(const b of ['LeftFoot','LeftToeBase'])clear=Math.min(clear,d3(r.j[a],r.j[b]));
      const hipsDev=Math.max(...T.map(r=>Math.hypot(r.j.Hips[0]-r.holder[0],r.j.Hips[2]-r.holder[1])));
      const kickSlide=contacts(T,pl.kickStart,kickOut),runSlide=g.running?contacts(T,0,g.press):null;
      const M={common:C,fades:F,tC,kickStart:pl.kickStart,kickPhase:pl.kickPhase,fadeIn:pl.fadeIn,kickOut,
        gapAtContact:fc.feet.Right.gap,kickWeightAtContact:fc.w.kick||0,tEff,timingErr:tEff==null?null:+(tEff-tC).toFixed(4),closestGap:+closest.feet.Right.gap.toFixed(4),closestAt:closest.t,
        footDeg:+footDeg.toFixed(1),ballDeg:+ballDeg.toFixed(1),dirErr:+dirErr.toFixed(1),
        kickInBallBefore:+Math.min(...T.filter(r=>r.t>=g.press-1e-6&&r.t<=(tEff??tC)-1/60+1e-6).map(r=>r.feet.Right.gap)).toFixed(4),plantInBall:+Math.min(...T.filter(r=>r.t>=g.press-1e-6&&r.t<=tC+1e-6).map(r=>r.feet.Left.gap)).toFixed(4),   // from the press, as check_shot.js (the run-up dribbles the ball at the feet)
        
        plantLowAtContact:fc.feet.Left.low,plantDrift:+plantDrift.toFixed(4),clear:+clear.toFixed(3),hipsDev:+hipsDev.toFixed(3),kickSlide,runSlide,
        toeAtContact:sub(fc.j.RightToeBase,[fc.holder[0],0,fc.holder[1]]).map(x=>+x.toFixed(3)),ballAtContactTick:fc.ball,log:R.log};
      K.scen[g.name]=M;dump.scen[g.name]={plan:Object.assign({},pl,{game:undefined}),ticks:T,subs:S,log:R.log};
      const G=(n,ok,v,l,why)=>gate(kick,g.name,n,ok,v,l,why);
      G('measured',C.finite&&C.ticks>30,{ticks:C.ticks,finite:C.finite},'all ticks, finite','a scenario that did not run gives no evidence');
      G('body near player',hipsDev<=LIM.spacing,hipsDev,'<= '+LIM.spacing.toFixed(3)+' m','check_shot.js: half the game\'s player spacing');
      G('contact gap',Math.abs(M.gapAtContact)<=LIM.gap&&M.kickWeightAtContact>=0.999,{gap:M.gapAtContact,weight:M.kickWeightAtContact,toe:M.toeAtContact,ball:M.ballAtContactTick},'|gap| <= 0.03 m, kick fully in','check_shot.js: the foot on the ball at the game\'s last tick before the ball leaves');
      G('timing',M.timingErr!=null&&Math.abs(M.timingErr)<=LIM.tick+1e-6,{estimatedContact:tEff,gameContact:+tC.toFixed(4),errorMs:M.timingErr==null?null:Math.round(M.timingErr*1000),closestGap:M.closestGap},'|error| <= 16.7 ms','check_shot.js: first touch (gap <= 5 mm, 1/240 s) within one tick; none = the foot never reaches the ball');
      G('direction',Math.abs(M.dirErr)<=LIM.dirDeg,{foot:M.footDeg,ball:M.ballDeg,error:M.dirErr},'|error| <= 15°','check_shot.js: the kicking toe\'s travel at the (estimated or closest) contact against the ball\'s flight');
      G('no foot inside the ball',M.kickInBallBefore>=LIM.inBall&&M.plantInBall>=LIM.inBall,{kick:M.kickInBallBefore,plant:M.plantInBall},'>= -0.03 m','check_shot.js');
      G('ground',C.sole>=sinkLimit,{sole:C.sole,penetration:C.penetration},'>= '+sinkLimit,'no sole or body point under the ground (see README)');
      G('plant on the ground at contact',M.plantLowAtContact<=LIM.grounded&&M.plantLowAtContact>=sinkLimit,M.plantLowAtContact,'0..0.02 m','check_shot.js');
      G('plant drift',plantDrift<=own.kick.plantDrift+0.001,{drift:M.plantDrift,own:own.kick.plantDrift},'<= own + 1 mm','check_shot.js: the plant ankle +-0.1 s around the contact against the kick clip alone with its own path');
      G('foot slide in the kick',kickSlide.max<=own.kick.slide.max+LIM.slidePad,{scenario:kickSlide,own:own.kick.slide.max},'<= own + 0.02 m per contact','a foot on the ground slides no more than in the kick clip alone (added)');
      if(runSlide)G('foot slide running before the press',runSlide.max<=own.run.slide.max+LIM.slidePad,{scenario:runSlide,own:own.run.slide.max},'<= own + 0.02 m per contact','the run clip at the game\'s speed (time scale = game speed / clip speed) slides no more than alone (added)');
      G('fades no faster than the clips',F.every(f=>!f.over.length),F.map(f=>({t:f.t,from:f.from,to:f.to,over:f.over})),'per 1/60 s <= the faster clip alone','added (as check_shot.js fade jump)');
      G('feet apart',clear>=LIM.clear,clear,'>= 0.10 m','check_shot.js');
      const nk=newKnees(T,ownKB,L);M.newKnees=nk;
      G('no backward knee added',!nk.length,{added:nk,allTicks:C.kneeBackTicks},'none beyond the clips\' own','check_shot.js kneeBack, per tick against the clips alone at their own clip time');
      G('bones keep their length',C.boneErrMm<=LIM.boneMm,{mm:C.boneErrMm},'<= 1 mm','added');}
    summary.kicks[kick]=K;
    fs.writeFileSync(path.join(OUT,'check_player_'+kick+'.json'),JSON.stringify(dump));
  }
  // screenshots of the first kick: model at rest, the chain, and the shots' contact
  const shots=[];
  if(!flag('--no-shots')){const kick=KICKS[0];await page.evaluate(k=>window.__pa.useKick(k),kick);
    const moments=[['rest',{rest:true}],['chain_run',{plan:'chain',t:3.0}],['chain_decel',{plan:'chain',t:4.1}],['chain_kick',{plan:'chain',contact:true}],['chain_base',{plan:'chain',end:true}],
      ['repeat_kick2',{plan:'repeat',t:1.45}]];
    for(const g of GP.scenarios.filter(s=>/D 0\.2 s$/.test(s.name)||/then stop/.test(s.name)))for(const [m,dt] of [['contact',0],['follow',0.25],['end',null]])moments.push([g.name.replace(/\W+/g,'_')+'_'+m,{plan:'game',game:g,dt,end:dt==null}]);
    for(const [name,o] of moments)for(const view of ['side','front']){await page.evaluate(({o,view})=>window.__pa.pose(o,view),{o,view});await page.waitForTimeout(150);
      const f=path.join(OUT,`pa_${kick}_${name}_${view}.png`);await page.locator('#view').screenshot({path:f,timeout:90000}).then(()=>shots.push(path.basename(f)),e=>console.log('screenshot failed',f,e.message.split('\n')[0]));}}
  const variantApplied=VARIANT?await page.evaluate(()=>window.PAExp.applied):null;
  await browser.close();
  const after=Object.fromEntries(PROTECTED.map(f=>[path.relative(REPO,f),sha(f)]));
  summary.protected={before,after,unchanged:JSON.stringify(before)===JSON.stringify(after)};
  summary.variant=VARIANT||null;summary.probe=PROBE||'recorded in this run';summary.variantApplied=variantApplied;
  summary.pageErrors=errors;summary.shots=shots;summary.seconds=Math.round((Date.now()-t0)/1000);
  gate('-','lab','page without errors',!errors.length,errors.slice(0,3),'none','the viewer page must load and run');
  gate('-','files','protected files unchanged by this run',summary.protected.unchanged,summary.protected,'same SHA-256','ground-legends/index.html and docs/index.html');
  const log=gates.map(g=>`${g.ok?'ok  ':'FAIL'} [${g.kick}] ${g.scen} | ${g.name}: ${JSON.stringify(g.value)} (limit ${typeof g.limit==='string'?g.limit:JSON.stringify(g.limit)}) — ${g.why}`).join('\n');
  fs.writeFileSync(path.join(OUT,'check_player_gates.log'),log+'\n');
  // per kick: gates passed per scenario
  summary.table={};for(const kick of KICKS){summary.table[kick]={};for(const g of gates.filter(x=>x.kick===kick)){const t=summary.table[kick][g.scen]||(summary.table[kick][g.scen]={pass:0,fail:[]});if(g.ok)t.pass++;else t.fail.push(g.name);}}
  summary.gates={total:gates.length,failed:gates.filter(g=>!g.ok).length};
  fs.writeFileSync(path.join(OUT,'check_player_summary.json'),JSON.stringify(summary,null,1));
  // tables: the kicks side by side on the game's shots (D held 0.2 s) and the chain
  {const f=(x,d=3)=>x==null||!Number.isFinite(x)?'–':(+x).toFixed(d),okOf=(k,sc,n)=>{const g=gates.find(x=>x.kick===k&&x.scen===sc&&x.name===n);return g?(g.ok?'':' ✗'):'';};
    let md='# check_player.js 결과 표\n\n'+new Date().toISOString()+' · 게이트 '+summary.gates.total+'개 중 실패 '+summary.gates.failed+'개 · ✗ = 게이트 실패\n\n';
    md+='## 클립 (킥 후보별 같은 이동 클립: 143_03, 143_01, 143_02)\n\n| 킥 | 킥 길이 s | 접촉 추정 s (클립) | 발끝 최고 m/s | 킥 자체 이동 m/s | 단독 재생 최저 발바닥 m | 단독 재생 디딤발 drift m |\n|---|---|---|---|---|---|---|\n';
    for(const k of KICKS){const K=summary.kicks[k];md+=`| ${k} | ${f(K.clips.kick.duration,2)} | ${f(K.clips.kick.contact.contact)} | ${f(K.clips.kick.contact.toeSpeed,1)} | ${f(K.clips.kick.speed,2)} | ${f(K.own.kick.sole)} | ${f(K.own.kick.plantDrift)} |\n`;}
    for(const sc of GP.scenarios.filter(s=>/D 0\.2 s/.test(s.name)).map(s=>s.name)){
      md+=`\n## ${sc}\n\n| 킥 | 접촉 간격 m | 타이밍 오차 ms (최근접 m) | 방향 오차 ° | 공 안 발 m | 디딤발 높이 m | 디딤발 drift m | 킥 중 미끄럼 m | 최저 발바닥 m | 몸-선수 m |\n|---|---|---|---|---|---|---|---|---|---|\n`;
      for(const k of KICKS){const M=summary.kicks[k].scen[sc];if(!M)continue;
        md+=`| ${k} | ${f(M.gapAtContact)}${okOf(k,sc,'contact gap')} | ${M.timingErr==null?'없음 ('+f(M.closestGap)+')':Math.round(M.timingErr*1000)}${okOf(k,sc,'timing')} | ${f(M.dirErr,1)}${okOf(k,sc,'direction')} | ${f(Math.min(M.kickInBallBefore,M.plantInBall))}${okOf(k,sc,'no foot inside the ball')} | ${f(M.plantLowAtContact)}${okOf(k,sc,'plant on the ground at contact')} | ${f(M.plantDrift)}${okOf(k,sc,'plant drift')} | ${f(M.kickSlide.max)}${okOf(k,sc,'foot slide in the kick')} | ${f(M.common.sole)}${okOf(k,sc,'ground')} | ${f(M.hipsDev)}${okOf(k,sc,'body near player')} |\n`;}}
    md+='\n## 상태 체인 (루트 모션) 과 반복\n\n| 킥 | 장면 | 최저 발바닥 m | 페이드 수 | 속도 초과 페이드 | 페이드 최대 미끄럼 m | 추가 역무릎 틱 | 기준 자세 오차 mm | 메시 늘어남 최대 |\n|---|---|---|---|---|---|---|---|---|\n';
    for(const k of KICKS)for(const sn of ['chain','repeat']){const M=summary.kicks[k].scen[sn];md+=`| ${k} | ${sn} | ${f(M.common.sole)}${okOf(k,sn,'ground')} | ${M.fades.length} | ${M.fades.filter(x=>x.over.length).map(x=>x.from+'→'+x.to+' '+x.over.join('/')).join('; ')||'없음'} | ${f(Math.max(...M.fades.map(x=>x.slide)))}${okOf(k,sn,'fades: no extra foot slide')} | ${M.newKnees.length} | ${f(M.base.maxJointMm,2)}${okOf(k,sn,'back in the base pose')} | ${M.common.edge?f(M.common.edge.max,2)+' ('+M.common.edge.maxAt+')':'–'} |\n`;}
    fs.writeFileSync(path.join(OUT,'check_player_tables.md'),md);}
  for(const kick of KICKS){console.log('\n'+kick);for(const [s,t] of Object.entries(summary.table[kick]))console.log(`  ${s.padEnd(34)} ok ${String(t.pass).padStart(2)}  fail ${t.fail.length}${t.fail.length?': '+t.fail.join(', '):''}`);}
  console.log(`\ngates ${summary.gates.total}, failed ${summary.gates.failed}; protected files unchanged: ${summary.protected.unchanged}; page errors: ${errors.length}; ${summary.seconds} s`);
  process.exitCode=(!model.check.ok||errors.length||!summary.protected.unchanged)?1:0;
})();
