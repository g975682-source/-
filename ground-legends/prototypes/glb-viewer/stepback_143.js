// 143_24: a recovery step for the fade back (kick -> idle), tried on its own (prototype only).
//   Requirements: from S0 (= recovery_143.js's R0) and O, per model and shot: where the plant foot is at the fade
//     back and where idle wants it, how it moves and how fast in the fade, when the kicking foot is down again, the
//     hips and chest; and the pure clip poses (kick at its time at the fade back, idle) for the pose-only difference.
//   Variants (stepback_lab.js: real clip poses only, no IK, no joint set by hand; the kick part is S0's tick for tick):
//     S0  R0 as it is (crossfade kick -> idle);
//     S1  a short recovery step: the walk clip comes in full (the feet step as it steps, the plant foot lifted by it),
//         then idle;
//     S2  a small step: the walk clip at a lower weight (0.5-0.75) and quicker (x1.6-2.2): a lower, shorter step;
//     S3  by situation: standing as S1 (walk), running with the run clip (a higher, quicker stride).
//     Each step's timing and weights are chosen per shot by GLStep.plan from a fixed grid (scored by the feet's slide
//     and drag on the ground and the body's per-tick steps); the remaining offset from the player goes to zero by the
//     end of the shot, and whatever that slides is measured.
// Limits, game probe, measurements and gates are check_shot.js's own code, read from that file and run as they are.
// Added verdicts ([추가]): recovery_143.js's (as defined there), and step-aware ones: each foot's slide while it is
// down (per contact: from its touch-down), its drag (path moved while down), whether the plant foot really lifts, the
// end pose against S0's (idle on the player). Limits are check_shot.js's (the plant drift limit, the ball, the body).
// Usage (from this folder): node stepback_143.js   SB_REPEATS (3), SB_VARIANTS=S1,S2 (S0 always), SB_TAG.
// Outputs: out/stepback143{TAG}_* (nothing earlier touched). Exit 0 when every harness check passed; 2 otherwise.
const path=require('path'),fs=require('fs');
const P=require('../../tests/legacy/paths.js');
const {chromium}=require(P.PLAYWRIGHT);
const DIR=__dirname,three=fs.readFileSync(P.THREE_JS,'utf8'),TAKE='143_24',MODELS=['Xbot.glb','Soldier.glb'];
const REPEATS=Math.max(1,+(process.env.SB_REPEATS||3)),TAG=process.env.SB_TAG||'';
const ALLV=['S0','S1','S2','S3'];
const VARS=process.env.SB_VARIANTS?[...new Set(['S0',...process.env.SB_VARIANTS.split(',').map(s=>s.trim()).filter(Boolean)])]:ALLV;
for(const v of VARS)if(!ALLV.includes(v))throw new Error('unknown variant '+v);
const out=f=>path.join(DIR,'out',f.replace(/^stepback143_/,'stepback143'+TAG+'_'));
for(const f of ['stepback143_report.txt','stepback143_report.json'])if(fs.existsSync(out(f)))throw new Error(out(f)+' exists; set SB_TAG');
const CS=fs.readFileSync(path.join(DIR,'check_shot.js'),'utf8').split('\n');
const block=(from,to)=>{const a=CS.findIndex(l=>l.startsWith(from)),b=CS.findIndex((l,k)=>k>a&&l.startsWith(to));if(a<0||b<0)throw new Error('check_shot.js block not found: '+from);return CS.slice(a,b).join('\n');};
const SRC=[block('const LIM={','const sleep='),block('// ---- the game, read only','// ---- in the page'),block('// ---- measurements from the ticks','// ---- screenshots of the shot')].join('\n');
const {LIM,probeGame,measure,gatesFor,gates}=new Function('require','path','fs','P',SRC+'\nreturn {LIM,probeGame,measure,gatesFor,gates,gate};')(require,path,fs,P);
const checks=[];const check=(model,name,ok,value,limit)=>checks.push({model,name,ok:!!ok,value,limit});
const extra=[];
const xgate=(model,scen,variant,name,ok,value,limit,why,kind)=>extra.push({model,scen,variant,name,ok:ok===true,unmeasured:ok===null,value,limit,why,kind});
const LABEL={S0:'기준: R0 (크로스페이드)',S1:'짧은 회복 스텝 (walk 왼발 스윙)',S2:'작은 회복 스텝 (walk, 낮은 비중·짧게)',S3:'상황별 (서기 walk, 달리기 run 스윙)'};

async function openModel(m){
  const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const page=await browser.newPage({viewport:{width:900,height:600}});const errors=[];
  page.on('console',x=>{if(x.type()==='error')errors.push(x.text());});page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  await page.route('**/*',r=>{const u=r.request().url();
    if(u.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'});
    if(u.startsWith('http://viewer.local/')){const f=path.join(DIR,decodeURIComponent(u.slice(20).split('?')[0])||'index.html');
      if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.html')?'text/html':'application/octet-stream'});
      return r.fulfill({status:404,body:'not found'});}
    return r.abort();});
  await page.goto('http://viewer.local/index.html?autoload=0');
  for(const f of ['shot_lab.js','diag_lab.js','tune_lab.js','recovery_lab.js','stepback_lab.js'])await page.addScriptTag({url:'http://viewer.local/'+f});
  const ref=await page.evaluate(async({m,TAKE,GROUNDED,SPACING})=>{
    const Vw=window.__viewer;if(!(await Vw.load('models/'+m)))return {failed:'model: '+document.querySelector('#status').textContent};
    const inf=await Vw.addBVH(`models/cmu_extra/${TAKE}.bvh`,{trim:true,before:0.6,after:0.5,name:TAKE+' 킥 (슛 실험)'});if(!inf)return {failed:'retarget: '+document.querySelector('#status').textContent};
    const i=Vw.inst[0],V=()=>new THREE.Vector3();
    const idle=Vw.animations.find(c=>/^idle$/i.test(c.name))||Vw.animations[0],run=Vw.animations.find(c=>/^run$/i.test(c.name))||idle,walk=Vw.animations.find(c=>/^walk$/i.test(c.name));
    const times=d=>{const t=[];for(let k=0;k<=Math.round(d*60);k++)t.push(Math.min(d,k/60));return t;};
    // the references exactly as check_shot.js and recovery_143.js compute them
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
    const ref={tc,strike,plant,plantFallback,capHipsStep:+capHipsStep.toFixed(4),ipBodyStep:+ipBodyStep.toFixed(4),kickToeStep:+kickToeStep.toFixed(4),ownDrift:+ownDrift.toFixed(4),sinkLimit,ownMin,srcDip:+srcDip.toFixed(4),kickDur:ip.duration};
    // a clip alone at a time (model at its calibration, holder at the origin): feet, hips, lowest points
    const g=GLShot.rig(i),upd=()=>{i.root.updateWorldMatrix(true,false);i.root.updateMatrixWorld(true);};
    const poseAt=(clip,t)=>{const mx=i.mixer;mx.stopAllAction();mx.setTime(0);const a=mx.clipAction(clip);a.reset();a.setEffectiveWeight(1);a.setEffectiveTimeScale(1);a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.play();a.time=Math.min(t,clip.duration-1e-4);mx.update(0);
      i.holder.position.set(0,0,0);i.holder.rotation.set(0,0,0);i.holder.updateMatrixWorld(true);i.root.position.copy(g.calib);i.root.quaternion.copy(g.calibQ);upd();
      const P=n=>g.by[n].getWorldPosition(V()).toArray().map(x=>+x.toFixed(4));const o={L:P('LeftFoot'),R:P('RightFoot'),hips:P('Hips'),lowL:GLShot.footLow(g.L).low,lowR:GLShot.footLow(g.R).low};mx.stopAllAction();return o;};
    // the swing sources: the longest stretch of each clip's cycle with the LEFT foot up (lowest point >= 2 cm)
    const swingOf=clip=>{if(!clip)return null;const n=Math.round(clip.duration*60),s=[];for(let k=0;k<n;k++){const p=poseAt(clip,k/60);s.push({t:k/60,up:p.lowL>=GROUNDED,h:p.lowL,rDown:p.lowR<GROUNDED});}
      let best=null;for(let a=0;a<n;a++){if(!s[a].up||s[(a-1+n)%n].up)continue;let b=a,len=0,pk=0;while(s[b%n].up&&len<n){pk=Math.max(pk,s[b%n].h);b++;len++;}if(!best||len>best.len)best={toeOff:s[a].t,strike:(b%n)/60,len,peak:+pk.toFixed(3),rDownTicks:Array.from({length:len},(_,j)=>s[(a+j)%n].rDown).filter(Boolean).length};}
      return best&&Object.assign(best,{name:clip.name,dur:clip.duration});};
    const swings={walk:swingOf(walk),run:swingOf(run)};
    const ramp=(t,a,b)=>{const x=(t-a)/Math.max(1e-6,b-a);return x<=0?0:x>=1?1:x*x*(3-2*x);};
    const fit=(clip,ballZ)=>GLKick.contact(i,clip,tc,'Right',ballZ);
    const SIM={rec:c=>(i.mixer.setTime(0),GLRecovery.sim(i,c)),step:c=>(i.mixer.setTime(0),GLStep.sim(i,c))};
    // the plan grids (fixed before any run): S1 a full walk step, S2 a lower and quicker walk step, S3 standing = S1,
    // running = a run-clip stride; the swing source's start phase on 12 points of its cycle
    const grid=(variant,running)=>{const src=variant==='S3'&&running?'run':'walk',sw=swings[src];if(!sw)return [];const out=[];
      const G=variant==='S2'?{nA:[0,3,6],wMax:[0.5,0.75],rate:[1.6,2.2],gap:[4,7,10],nUp:[4],nDown:[4]}
        :variant==='S3'&&running?{nA:[0,3,6],wMax:[0.7,1],rate:[1,1.4],gap:[6,10,14],nUp:[4],nDown:[6]}
        :{nA:[0,3,6],wMax:[1],rate:[1,1.6],gap:[6,10,14,18],nUp:[4],nDown:[4,8]};
      for(const nA of G.nA)for(let q=0;q<12;q++)for(const wMax of G.wMax)for(const rate of G.rate)for(const gap of G.gap)for(const nUp of G.nUp)for(const nDown of G.nDown){
        const nB=nA+gap;if(nB+nDown>30)continue;out.push({src:src==='walk'?walk:run,srcName:src,srcDur:sw.dur,phA:+(q*sw.dur/12).toFixed(4),nA,nUp,wMax,rate,nB,nDown});}
      return out;};
    // the planner's score: each foot's slide per contact and drag while down, the body's per-tick steps over the limit
    // (check_shot.js's: max(captured hips step, player step + in-place body step)), the ankles' steps over the kicking
    // toe's own in the fade window, the hips beyond half the player spacing
    const scoreOf=(rows)=>{const seg=key=>{let worst=0,drag=0,start=null,up=0,peak=0;for(let j=0;j<rows.length;j++){const r=rows[j],low=key==='L'?r.lowL:r.lowR,p=r[key];
        if(low<GROUNDED){if(!start)start=p;worst=Math.max(worst,Math.hypot(p[0]-start[0],p[1]-start[1]));if(j>0){const q=rows[j-1],ql=key==='L'?q.lowL:q.lowR;if(ql<GROUNDED)drag+=Math.hypot(p[0]-q[key][0],p[1]-q[key][1]);}}
        else{start=null;up++;peak=Math.max(peak,low);}}return {worst,drag,up,peak};};
      const L=seg('L'),R=seg('R');let body=0,feet=0,dev=0;
      for(let j=1;j<rows.length;j++){const a=rows[j],b=rows[j-1],ps=a.player&&b.player?Math.hypot(a.player[0]-b.player[0],a.player[1]-b.player[1]):0,lim=Math.max(ref.capHipsStep,ps+ref.ipBodyStep);
        for(const k of ['hips','chest']){const s=Math.hypot(a[k][0]-b[k][0],a[k][1]-b[k][1],a[k][2]-b[k][2]);body+=Math.max(0,s-lim);}
        if(j<=16)for(const k of ['L','R']){const s=Math.hypot(a[k][0]-b[k][0],a[k][1]-b[k][1]);feet+=Math.max(0,s-(ps+ref.kickToeStep));}
        if(a.player)dev=Math.max(dev,Math.hypot(a.hips[0]-a.player[0],a.hips[2]-a.player[1])-SPACING);}
      return {cost:L.worst+R.worst+0.5*(L.drag+R.drag)+5*body+2*feet+10*Math.max(0,dev),L,R,body,feet,dev,trace:rows.map(r=>({n:r.n,L:r.L,R:r.R,lowL:r.lowL,lowR:r.lowR}))};};
    window.__T={swings,
      pose(t){return {kick:poseAt(ip,t),idle0:poseAt(idle,0),idle25:poseAt(idle,0.25),idleEnd:poseAt(idle,0.55)};},
      kickClip(){const n=Math.round(ip.duration*60),o=[];for(let k=0;k<=n;k++){const p=poseAt(ip,k/60);o.push({t:+(k/60).toFixed(4),lowL:p.lowL,lowR:p.lowR,L:p.L,R:p.R});}return o;},
      shot(sc,spec){
        const tC=sc.lastOwned,tPl=tC-(tc-plant),backAt=sc.followEnd!=null?sc.followEnd:tC+0.3,game=sc.rows.map(r=>({x:r.x,z:r.z,yaw:r.yaw,ball:r.ball}));
        const bz=sc.ballAtContact,bx=sc.ballLatAtContact,f0=fit(ip,bz),off=[f0.offset[0]+bx,f0.offset[1]];
        const pStep=k=>{const a=game[Math.max(0,k-1)],b=game[Math.min(game.length-1,k)];return Math.hypot(b.x-a.x,b.z-a.z);};
        const body={none:[],hips:['Hips'],chest:['Spine2'],both:['Hips','Spine2']}[spec.body||'none'];
        const tEnd=backAt+0.25+0.3,lastT=Math.floor(tEnd*60+1e-9)/60;
        const mk=aim=>{const c={prev:sc.running?run:idle,back:idle,xfIn:0.15,xfOut:0.25,backAt,tEnd,lastT,grounded:GROUNDED,game,sub:{from:tC-0.1,to:tC+0.1},kick:ip,kickStart:0,t0:tc-tC,
            off:(t,kt,wk)=>{const s=ramp(t,0,tPl);return [wk*s*off[0],wk*s*off[1]];},groundClamp:!!spec.clamp,
            lock:spec.lockFrom!=null?{from:spec.lockFrom,to:backAt}:null,
            post:aim?(t,kt,wk)=>{const s=ramp(t,0,aim.end);return [wk*s*aim.v[0],wk*s*aim.v[1]];}:null};
          if(body.length){c.bodyLimit=k=>0.97*Math.max(ref.capHipsStep,pStep(k)+ref.ipBodyStep);c.bodyPoints=body;}
          return c;};
        const run1=SIM[spec.sim||'step'];let pass1Lock=null,cfg;
        // the first pass (the lock without the aim) is R0's, without a step
        if(spec.lockFrom!=null){const p1=run1(mk(null)),rc=p1.rows.find(r=>Math.abs(r.t-tC)<1e-6)||p1.rows[Math.round(tC*60)];pass1Lock=rc.lock;
          const sc_=spec.post?spec.post.scale:1,end=spec.post&&spec.post.end!=null?spec.post.end:tPl;cfg=mk({v:[-rc.lock[0]*sc_,-rc.lock[1]*sc_],end});}
        else cfg=mk(null);
        let planInfo=null;
        if(spec.step){const G=grid(spec.step,sc.running);if(!G.length)return {failed:'no swing source clip'};
          i.mixer.setTime(0);const pl=GLStep.plan(i,Object.assign({},cfg,{step:G[0]}),G,scoreOf);
          const b=pl.best;cfg.step=b;
          planInfo={src:b.srcName,nA:b.nA,nUp:b.nUp,phA:b.phA,rate:b.rate,wMax:b.wMax,nB:b.nB,nDown:b.nDown,candidates:pl.n,cost:+pl.bestScore.cost.toFixed(4),next:pl.costs.map(x=>+x.toFixed(4)),
            score:{L:pl.bestScore.L,R:pl.bestScore.R,body:+pl.bestScore.body.toFixed(4),feet:+pl.bestScore.feet.toFixed(4),dev:+pl.bestScore.dev.toFixed(4)},trace:pl.bestScore.trace};}
        const r=run1(cfg);
        return {rows:r.rows,subs:r.subs,infeasible:r.infeasible||0,pass1Lock,tC,tPl,backAt,lastT,ballLeaves:sc.ballLeaves,plan:planInfo};}};
    return ref;},{m,TAKE,GROUNDED:LIM.grounded,SPACING:LIM.spacing});
  return {browser,page,ref,errors};
}
async function runSpecs(M,jobs){const res=[];for(const j of jobs){const r=await M.page.evaluate(({sc,spec})=>window.__T.shot(sc,spec),{sc:j.inst,spec:j.spec});res.push(Object.assign({name:j.name,inst:j.inst.id,base:j.inst.base,probe:j.inst.probe,running:j.inst.running,spec:j.spec},r));}return res;}

const d2=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]),d3=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
// recovery_143.js's grounded drift (from the first grounded tick of the window, lifts or not)
function drift(f,a,b,side){const key=side==='L'?'lAnk':'rAnk',w=f.filter(x=>x.t>=a-1e-6&&x.t<=b+1e-6&&x[side].low<LIM.grounded);if(!w.length)return {drift:null,slide:null,worst:null,first:null,n:0};
  let mx=0,at=w[0].t;for(const x of w){const d=d2(x[key],w[0][key]);if(d>mx){mx=d;at=x.t;}}
  let sl=0;for(let j=1;j<f.length;j++){const x=f[j],y=f[j-1];if(x.t<a-1e-6||x.t>b+1e-6)continue;if(x[side].low<LIM.grounded&&y[side].low<LIM.grounded)sl=Math.max(sl,d2(x[key],y[key])*60);}
  return {drift:+mx.toFixed(4),slide:+sl.toFixed(3),worst:at,first:w[0].t,n:w.length};}
// the step-aware view of one foot over [a,b]: contacts (touch-down to lift-off) with their slide from the touch-down,
// the path moved while down (drag) and in the air, the time and height in the air, the fastest move down and up
function footPath(f,a,b,side){const key=side==='L'?'lAnk':'rAnk',w=f.filter(x=>x.t>=a-1e-6&&x.t<=b+1e-6);
  const contacts=[];let cur=null,drag=0,air=0,airTicks=0,peak=0,vDown=0,vAir=0,lifts=0;
  for(let j=0;j<w.length;j++){const x=w[j],down=x[side].low<LIM.grounded;
    if(down){if(!cur){cur={from:x.t,start:x[key],slide:0,ticks:0};contacts.push(cur);}cur.slide=Math.max(cur.slide,d2(x[key],cur.start));cur.ticks++;cur.to=x.t;}
    else{if(cur||j===0)lifts++;cur=null;airTicks++;peak=Math.max(peak,x[side].low);}
    if(j>0){const y=w[j-1],s=d2(x[key],y[key]),bothDown=down&&y[side].low<LIM.grounded;if(bothDown){drag+=s;vDown=Math.max(vDown,s*60);}else{air+=s;vAir=Math.max(vAir,s*60);}}}
  const net=w.length?d2(w[w.length-1][key],w[0][key]):null;
  return {net:net==null?null:+net.toFixed(4),slide:+Math.max(0,...contacts.map(c=>c.slide)).toFixed(4),contacts:contacts.map(c=>({from:c.from,to:c.to,ticks:c.ticks,slide:+c.slide.toFixed(4)})),drag:+drag.toFixed(4),air:+air.toFixed(4),airTicks,peak:+peak.toFixed(4),lifts,vDown:+vDown.toFixed(3),vAir:+vAir.toFixed(3)};}

function analyse(m,r,ref,baseM,S0r){
  const S={tC:r.tC,tPl:r.tPl,backAt:r.backAt,ballLeaves:r.ballLeaves},Vv={rows:r.rows,subs:r.subs,kickStart:0};
  let M;try{M=measure(S,Vv,ref);}catch(e){check(m,`${r.inst} ${r.name}: measured`,false,e.message,'measured');return null;}
  gatesFor(m,TAKE,r.inst,r.name,M,ref,baseM?{[r.name]:Object.assign({name:'O'},baseM)}:{});
  const f=r.rows,ks=0,xfIn=0.15,back=r.backAt,dt=1/60,fe=back+0.25;
  const pStep=j=>Math.hypot(f[j].player[0]-f[j-1].player[0],f[j].player[1]-f[j-1].player[1]);
  const over=(key,a,b,own,cap)=>{let w={excess:-Infinity};for(let j=1;j<f.length;j++){if(!(f[j].t>a+1e-6&&f[j].t<=b+1e-6))continue;const L=Math.max(cap,pStep(j)+own),s=d3(f[j][key],f[j-1][key]);if(s-L>w.excess)w={excess:+(s-L).toFixed(4),step:+s.toFixed(4),limit:+L.toFixed(4),at:f[j].t};}return w;};
  const sp={};for(const key of ['hips','chest'])sp[key]={fadeIn:over(key,ks,ks+xfIn+dt,ref.ipBodyStep,ref.capHipsStep),kick:over(key,ks+xfIn+dt,back,ref.ipBodyStep,ref.capHipsStep),fadeBack:over(key,back,back+0.25+dt,ref.ipBodyStep,ref.capHipsStep)};
  const official=Math.max(M.speed.fadeInBody.excess,M.speed.fadeBackBody.excess,M.speed.kickBody.excess),split=Math.max(...['hips','chest'].flatMap(k=>['fadeIn','kick','fadeBack'].map(w=>sp[k][w].excess)));
  check(m,`${r.inst} ${r.name}: split body speed = check_shot.js's`,Math.abs(official-split)<=1e-4,{official,split},'equal');
  const after={hips:over('hips',fe+dt,r.lastT,ref.ipBodyStep,ref.capHipsStep),chest:over('chest',fe+dt,r.lastT,ref.ipBodyStep,ref.capHipsStep)};
  const fb=drift(f,back,fe,'L'),fbAll=drift(f,back,r.lastT,'L'),kAll=drift(f,back,r.lastT,'R');
  const pL=footPath(f,back,r.lastT,'L'),pR=footPath(f,back,r.lastT,'R');
  const postBall=+Math.min(...f.filter(x=>x.t>r.tC+1e-6).map(x=>Math.min(x.L.gap,x.R.gap))).toFixed(4);
  // the end: hips, chest and ankles about the player against S0's last tick (S0 ends in idle, on the player)
  let endDev=null;if(S0r){const a=f[f.length-1],b=S0r.rows[S0r.rows.length-1];const rel=(x,k)=>[x[k][0]-x.player[0],x[k][1],x[k][2]-x.player[1]];endDev=+Math.max(...['hips','chest','lAnk','rAnk'].map(k=>d3(rel(a,k),rel(b,k)))).toFixed(4);}
  // knee and ankle angles: before the fade back against S0 (must be the same), in the recovery the largest change per tick
  const A=M.angles,back_j=f.findIndex(x=>x.t>=back-1e-6);let preDiff=null,recStep=0,recStep0=0;
  if(S0r&&S0r.M){const M0=S0r.M;preDiff=0;for(let j=0;j<back_j;j++){const a=A[j],c=M0.angles[j];preDiff=Math.max(preDiff,Math.abs(a.kL-c.kL),Math.abs(a.kR-c.kR),Math.abs(a.aL-c.aL),Math.abs(a.aR-c.aR));}
    for(let j=Math.max(1,back_j);j<A.length;j++){for(const s of ['kL','kR','aL','aR']){recStep=Math.max(recStep,Math.abs(A[j][s]-A[j-1][s]));recStep0=Math.max(recStep0,Math.abs(M0.angles[j][s]-M0.angles[j-1][s]));}}}
  const X={M,sp,after,fb,fbAll,kAll,pL,pR,postBall,endDev,preKneeDiff:preDiff==null?null:+preDiff.toFixed(3),recAngleStep:+recStep.toFixed(2),recAngleStepS0:+recStep0.toFixed(2),plan:r.plan};
  const sc=r.inst,v=r.name,lim=+(ref.ownDrift+0.001).toFixed(4);
  const R143='recovery143',SB='stepback';
  xgate(m,sc,v,'plant foot not in the ball',M.plantInBall>=LIM.inBall,M.plantInBall,'>= -0.03 m','"no foot inside the ball", the plant foot alone',R143);
  xgate(m,sc,v,'kicking foot not in the ball before the contact',M.kickInBallBefore>=LIM.inBall,M.kickInBallBefore,'>= -0.03 m','"no foot inside the ball", the kicking foot alone',R143);
  xgate(m,sc,v,'no foot in the ball after the contact',postBall>=LIM.inBall,postBall,'>= -0.03 m','"no foot inside the ball" after the contact',R143);
  for(const k of ['hips','chest'])xgate(m,sc,v,`${k} speed`,['fadeIn','kick','fadeBack'].every(x=>sp[k][x].excess<=1e-6),sp[k],'max(captured hips step, player step + in-place body step) per tick','the body speed gates, this point alone',R143);
  xgate(m,sc,v,'body speed after the fade back',Math.max(after.hips.excess,after.chest.excess)<=1e-6,after,'the same per-tick limit','after the fade window to the end of the shot',R143);
  xgate(m,sc,v,'plant drift in the fade back',fb.drift==null?null:fb.drift<=lim,fb,lim,'recovery_143.js: from the first grounded tick of the fade back (a lifted step counts as drift here)',R143);
  xgate(m,sc,v,'plant drift from the fade back to the end',fbAll.drift==null?null:fbAll.drift<=lim,fbAll,lim,'recovery_143.js: the same to the end of the shot',R143);
  xgate(m,sc,v,'kicking foot drift once down (fade back to end)',kAll.drift==null?null:kAll.drift<=lim,kAll,lim,'recovery_143.js: from its first grounded tick',R143);
  xgate(m,sc,v,'plant foot slide while down (each contact)',pL.slide<=lim,{slide:pL.slide,contacts:pL.contacts},lim,'from each touch-down to its lift-off (or the end): the plant drift limit',SB);
  xgate(m,sc,v,'kicking foot slide while down (each contact)',pR.contacts.length?pR.slide<=lim:null,{slide:pR.slide,contacts:pR.contacts},lim,'the same for the kicking foot (none down = not measured)',SB);
  xgate(m,sc,v,'plant foot drag (moved while down)',pL.drag<=lim,{drag:pL.drag,air:pL.air,vDown:pL.vDown},lim,'the path the plant foot covers on ground ticks (a lifted step moves in the air)',SB);
  xgate(m,sc,v,'kicking foot drag (moved while down)',pR.drag<=lim,{drag:pR.drag,air:pR.air,vDown:pR.vDown},lim,'the same for the kicking foot',SB);
  xgate(m,sc,v,'plant foot moved by lifting',pL.net<=lim||(pL.airTicks>=3&&pL.drag<=lim),{net:pL.net,airTicks:pL.airTicks,peak:pL.peak,drag:pL.drag},`net <= ${lim} m, or up >= 3 ticks and drag <= ${lim} m`,'the plant foot gets to its idle place through the air, not along the ground',SB);
  xgate(m,sc,v,'end pose as S0 (idle on the player)',endDev==null?null:endDev<=0.001,endDev,'<= 0.001 m','hips, chest and ankles about the player at the end, against S0',SB);
  return X;}
function touchOf(rows,tC){let k=null;for(let j=1;j<rows.length;j++){const a=rows[j],b=rows[j-1];if(a.t>tC+1e-6)break;if(a.kickWeight>0&&a.L.low<LIM.grounded&&b.L.low>=LIM.grounded)k=j;}
  if(k==null)return null;const a=rows[k];return {tick:a.k,t:a.t};}
const cmpRows=(A,B,until)=>{let w=0;if(A.rows.length!==B.rows.length)return Infinity;for(let j=0;j<A.rows.length;j++){const x=A.rows[j],y=B.rows[j];if(until!=null&&x.t>until+1e-6)break;for(const k of ['root','hips','chest','lAnk','rAnk','rToe'])for(let c=0;c<3;c++)w=Math.max(w,Math.abs(x[k][c]-y[k][c]));w=Math.max(w,Math.abs(x.L.gap-y.L.gap),Math.abs(x.R.gap-y.R.gap),Math.abs(x.L.low-y.L.low));}return w;};
// player frame: lateral (x) and forward (z) of a world horizontal vector for a player of heading yaw
const toPF=(v,yaw)=>{const c=Math.cos(yaw),s=Math.sin(yaw);return [v[0]*c-v[1]*s,v[0]*s+v[1]*c];};

(async()=>{
  const t0=Date.now();
  const probes=[];for(let k=0;k<REPEATS;k++){const g=await probeGame();if(g.errors.length)check('game',`probe ${k+1} without page errors`,false,g.errors.slice(0,3),'none');probes.push(g);}
  const inst=[];for(let k=0;k<REPEATS;k++)for(const s of probes[k].scenarios){if(/angled/.test(s.name))continue;if(!s.running&&k>0)continue;inst.push(Object.assign({},s,{id:s.name+' #'+(k+1),base:s.name,probe:k+1}));}
  const variability=probes.map((g,k)=>g.scenarios.filter(s=>!/angled/.test(s.name)).map(s=>({probe:k+1,name:s.name,ballAtContact:s.ballAtContact,aimDeg:s.aimDeg,followEnd:s.followEnd})));
  check('game',`instances: 3 standing + 3 x ${REPEATS} straight running`,inst.length===3+3*REPEATS,inst.length,3+3*REPEATS);
  const prior=JSON.parse(fs.readFileSync(path.join(DIR,'out','shot_lab_cmp4_summary.json'),'utf8'));
  const recPrior=fs.existsSync(path.join(DIR,'out','recovery143_r10_report.json'))?JSON.parse(fs.readFileSync(path.join(DIR,'out','recovery143_r10_report.json'),'utf8')):null;
  const MS={};await Promise.all(MODELS.map(async m=>{MS[m]=await openModel(m);}));
  for(const m of MODELS){const R=MS[m];if(R.ref.failed){check(m,'model and take load',false,R.ref.failed,'loaded');continue;}
    const pr=prior.models[m]&&prior.models[m].takes[TAKE].ref;for(const k of ['tc','plant','capHipsStep','ipBodyStep','kickToeStep','ownDrift','sinkLimit'])check(m,`reference ${k} = check_shot.js`,pr&&Math.abs(R.ref[k]-pr[k])<=1e-4,{here:R.ref[k],checkShot:pr?pr[k]:null},'|diff| <= 0.0001');}
  if(checks.some(c=>!c.ok)){console.log('STOP',checks.filter(c=>!c.ok));process.exitCode=2;for(const m of MODELS)await MS[m].browser.close();return;}
  const swings={},kickClip={};for(const m of MODELS){swings[m]=await MS[m].page.evaluate(()=>window.__T.swings);kickClip[m]=await MS[m].page.evaluate(()=>window.__T.kickClip());
    for(const k of ['walk','run'])check(m,`swing source ${k}: the left foot is up for a stretch of its cycle`,swings[m][k]&&swings[m][k].len>=6,swings[m][k],'>= 6 ticks');}
  const runAll=async(jobsOf)=>{const res={};await Promise.all(MODELS.map(async m=>{res[m]=await runSpecs(MS[m],jobsOf(m));}));return res;};
  const clipPl=(m,s)=>s.lastOwned-(MS[m].ref.tc-MS[m].ref.plant);
  const base=await runAll(m=>inst.flatMap(s=>[{inst:s,name:'O',spec:{lockFrom:null,clamp:false,body:'none'}},{inst:s,name:'detect',spec:{lockFrom:null,clamp:true,body:'hips'}}]));
  const touch={},O={};
  for(const m of MODELS){touch[m]={};O[m]={};for(const r of base[m]){if(r.name==='detect')touch[m][r.inst]=touchOf(r.rows,r.tC);if(r.name==='O')O[m][r.inst]=r;}
    for(const s of inst)check(m,`${s.id}: plant touch found`,!!touch[m][s.id],touch[m][s.id],'found');}
  const R0spec=(m,s)=>{const t=touch[m][s.id];if(!t)return null;return {lockFrom:t.t+1/60,clamp:true,body:'both',post:{scale:1,end:t.t}};};
  const specOf=(m,s,n)=>{const b=R0spec(m,s);if(!b)return null;return n==='S0'?b:Object.assign(b,{step:n});};
  // harness: GLStep.sim without a step = GLRecovery.sim R0 (probe 1), and S0 twice (the sims' own noise)
  const val=await runAll(m=>inst.filter(s=>s.probe===1).flatMap(s=>[{inst:s,name:'rec',spec:Object.assign(R0spec(m,s),{sim:'rec'})},{inst:s,name:'S0b',spec:R0spec(m,s)}]));
  const res=await runAll(m=>inst.flatMap(s=>VARS.map(n=>({inst:s,name:n,spec:specOf(m,s,n)})).filter(j=>j.spec)));
  const rowsOf={},results={};
  for(const m of MODELS){for(const r of res[m]){if(r.failed){check(m,`${r.inst} ${r.name}: ran`,false,r.failed,'ran');continue;}rowsOf[`${m}|${r.name}|${r.inst}`]=r;}
    for(const s of inst)rowsOf[`${m}|O|${s.id}`]=O[m][s.id];
    for(const s of inst.filter(s=>s.probe===1)){const by=n=>val[m].find(r=>r.inst===s.id&&r.name===n),s0=rowsOf[`${m}|S0|${s.id}`];
      check(m,`${s.id}: GLStep.sim without a step = GLRecovery.sim R0`,cmpRows(by('rec'),s0)===0,{diff:cmpRows(by('rec'),s0)},'0 (identical rows)');
      check(m,`${s.id}: S0 twice gives the same rows`,cmpRows(by('S0b'),s0)===0,{diff:cmpRows(by('S0b'),s0)},'0');
      const rp=recPrior&&recPrior.metrics[m]&&recPrior.metrics[m].R0&&recPrior.metrics[m].R0[s.id];
      if(!s.running&&rp){const x=measure({tC:s0.tC,tPl:s0.tPl,backAt:s0.backAt,ballLeaves:s0.ballLeaves},{rows:s0.rows,subs:s0.subs,kickStart:0},MS[m].ref);const d={gap:Math.abs(x.gapAtContact-rp.M.gapAtContact),plant:Math.abs(x.plantInBall-rp.M.plantInBall),hipsDev:Math.abs(x.hipsDev.max-rp.M.hipsDev.max)};
        check(m,`${s.id}: S0 reproduces recovery143_r10 R0`,Object.values(d).every(v=>v<=0.002),d,'<= 2 mm (the game aims a little differently each run)');}}
    // each step variant: the same as S0 before the fade back; weights sum to 1; the planner's feet = the sim's feet
    for(const s of inst)for(const n of VARS.filter(n=>n!=='S0')){const r=rowsOf[`${m}|${n}|${s.id}`],b=rowsOf[`${m}|S0|${s.id}`];if(!r||!b)continue;
      check(m,`${s.id} ${n}: same as S0 before the fade back`,cmpRows(r,b,r.backAt-1e-3)===0,{diff:cmpRows(r,b,r.backAt-1e-3)},'0');
      const k0=Math.round(r.backAt*60),wsum=Math.max(...r.rows.filter(x=>x.k>k0).map(x=>Math.abs(x.X.wKick+x.X.wIdle+x.X.wSwing-1)));
      check(m,`${s.id} ${n}: the blend weights sum to 1 in the recovery`,wsum<=2e-4,{maxErr:wsum},'<= 0.0002 (rows keep 4 decimals)');
      let pe=0;for(const t of r.plan.trace){const x=r.rows.find(q=>q.k===k0+t.n);if(!x)continue;pe=Math.max(pe,Math.abs(x.X.ankW[0]-t.L[0]),Math.abs(x.X.ankW[2]-t.L[1]),Math.abs(x.X.rAnkW[0]-t.R[0]),Math.abs(x.X.rAnkW[2]-t.R[1]),Math.abs(x.L.low-t.lowL),Math.abs(x.R.low-t.lowR));}
      check(m,`${s.id} ${n}: the planner's feet = the sim's feet`,pe<=2e-4,{maxDiff:pe},'<= 0.0002 m');}
    // the verdicts and measures
    const OMc={};const OM=id=>OMc[id]||(OMc[id]=measure({tC:O[m][id].tC,tPl:O[m][id].tPl,backAt:O[m][id].backAt,ballLeaves:O[m][id].ballLeaves},{rows:O[m][id].rows,subs:O[m][id].subs,kickStart:0},MS[m].ref));
    results[m]={};const S0M={};
    for(const s of inst){const r=rowsOf[`${m}|S0|${s.id}`];if(!r)continue;const X=analyse(m,r,MS[m].ref,OM(s.id),{rows:r.rows,M:null});(results[m].S0=results[m].S0||{})[s.id]=X;S0M[s.id]={M:X.M,rows:r.rows};}
    for(const n of VARS.filter(n=>n!=='S0'))for(const s of inst){const r=rowsOf[`${m}|${n}|${s.id}`];if(!r)continue;(results[m][n]=results[m][n]||{})[s.id]=analyse(m,r,MS[m].ref,OM(s.id),S0M[s.id]);}}
  // ---- the requirements (from S0, O and the clips; not a verdict) ----
  const req={};
  for(const m of MODELS){req[m]={};for(const s of inst){const r=rowsOf[`${m}|S0|${s.id}`],o=rowsOf[`${m}|O|${s.id}`];if(!r)continue;const k0=Math.round(r.backAt*60),f=r.rows,b=f.find(x=>x.k===k0),e=f[f.length-1],yaw=b.yaw;
      const kt0=b.kickTime,poses=await MS[m].page.evaluate(t=>window.__T.pose(t),kt0);
      const pf=(a,bb)=>toPF([a[0]-bb[0],a[2]-bb[2]],yaw).map(x=>+x.toFixed(4));
      const fade=f.filter(x=>x.k>=k0&&x.k<=k0+15);let Lpath=0,Lv=0,Lvk=null;for(let j=1;j<fade.length;j++){const s_=d2(fade[j].lAnk,fade[j-1].lAnk);Lpath+=s_;if(s_*60>Lv){Lv=s_*60;Lvk=fade[j].k-k0;}}
      const rLand=f.find(x=>x.k>k0&&x.R.low<LIM.grounded),rLandAfter=rLand?footPath(f.filter(x=>x.k>=rLand.k),0,99,'R'):null;
      const kc=kickClip[m],kcLand=kc.find(x=>x.t>kt0+1e-6&&x.lowR<LIM.grounded);
      let hipsStep=0,chestStep=0;for(let j=1;j<f.length;j++)if(f[j].k>k0){hipsStep=Math.max(hipsStep,d3(f[j].hips,f[j-1].hips));chestStep=Math.max(chestStep,d3(f[j].chest,f[j-1].chest));}
      req[m][s.id]={backTick:k0,fadeEndTick:k0+15,endTick:e.k,kickTimeAtBack:kt0,kickClipEnd:+MS[m].ref.kickDur.toFixed(4),
        plantAtBack:{world:b.lAnk,low:b.L.low},plantAtEnd:{world:e.lAnk},plantMove:{pf:pf(e.lAnk,b.lAnk),len:+d2(e.lAnk,b.lAnk).toFixed(4)},
        poseOnly:{kickL_idleL:+Math.hypot(poses.kick.L[0]-poses.idle25.L[0],poses.kick.L[2]-poses.idle25.L[2]).toFixed(4),kickR_idleR:+Math.hypot(poses.kick.R[0]-poses.idle25.R[0],poses.kick.R[2]-poses.idle25.R[2]).toFixed(4),kickL:poses.kick.L,idleL:poses.idle25.L,kickR:poses.kick.R,idleR:poses.idle25.R},
        plantFade:{path:+Lpath.toFixed(4),maxSpeed:+Lv.toFixed(3),maxAtTick:Lvk,groundedTicks:fade.filter(x=>x.L.low<LIM.grounded).length,ticks:fade.length},
        kickFoot:{lowAtBack:b.R.low,landTickS0:rLand?rLand.k-k0:null,landLowAtBack:b.R.low,slideAfterLandS0:rLandAfter?rLandAfter.slide:null,moveAfterLand:rLand?+d2(e.rAnk,rLand.rAnk).toFixed(4):null,landClipTime:kcLand?kcLand.t:null,landClipTicksAfterBack:kcLand?Math.round((kcLand.t-kt0)*60):null},
        body:{hipsMove:pf(e.hips,b.hips),chestMove:pf(e.chest,b.chest),hipsMaxStep:+hipsStep.toFixed(4),chestMaxStep:+chestStep.toFixed(4),limit:Math.max(MS[m].ref.capHipsStep,MS[m].ref.ipBodyStep)},
        O:o?{plantMove:+d2(o.rows[o.rows.length-1].lAnk,o.rows.find(x=>x.k===k0).lAnk).toFixed(4)}:null};}}
  for(const m of MODELS)await MS[m].browser.close();
  // ---- the verdicts over the repeats ----
  const summarise=()=>{const T={};for(const m of MODELS){T[m]={};for(const n of VARS){const gs=gates.filter(g=>g.sec==='new'&&g.model===m&&g.variant===n),xs=extra.filter(g=>g.model===m&&g.variant===n);
      const by={};for(const g of gs.concat(xs.map(x=>Object.assign({},x,{extra:true})))){const sc=g.scen.replace(/ #\d+$/,''),key=sc+'|'+g.name+(g.extra?'|x':'');(by[key]=by[key]||{sc,name:g.name,extra:!!g.extra,kind:g.kind||'check_shot',ok:0,fail:0,unmeasured:0,values:[],ids:[]});const b=by[key];if(g.unmeasured)b.unmeasured++;else if(g.ok)b.ok++;else b.fail++;b.values.push(g.value);b.ids.push(g.scen);}
      const rows=Object.values(by),official=rows.filter(r=>!r.extra),added=rows.filter(r=>r.extra),stepG=added.filter(r=>r.kind==='stepback');
      const cnt=list=>({gates:list.length,fail:list.filter(r=>(r.fail||r.unmeasured)&&!r.ok).length,varying:list.filter(r=>(r.fail||r.unmeasured)&&r.ok).length,unmeasured:list.filter(r=>r.unmeasured).length,allPass:list.every(r=>!r.fail&&!r.unmeasured)});
      const kickOK=official.filter(r=>['contact gap','timing','direction'].includes(r.name)).every(r=>r.fail===0&&r.unmeasured===0);
      const X=Object.entries(results[m][n]||{}).filter(([,x])=>x);
      const worst=(get,sign=1)=>{let w=null;for(const [id,x] of X){const v=get(x);if(v==null)return {value:null,id};if(!w||sign*v>sign*w.value)w={value:v,id};}return w;};
      T[m][n]={official:cnt(official),added:cnt(added),step:cnt(stepG),stepPass:stepG.reduce((a,b)=>a+b.ok,0),stepN:stepG.reduce((a,b)=>a+b.ok+b.fail+b.unmeasured,0),kickOK,
        plantSlide:worst(x=>x.pL.slide),plantDrag:worst(x=>x.pL.drag),plantAirTicks:worst(x=>x.pL.airTicks,-1),plantPeak:worst(x=>x.pL.peak,-1),plantVDown:worst(x=>x.pL.vDown),plantVAir:worst(x=>x.pL.vAir),
        kickSlide:worst(x=>x.pR.contacts.length?x.pR.slide:null),kickDrag:worst(x=>x.pR.drag),fbAll:worst(x=>x.fbAll.drift),endDev:worst(x=>x.endDev),
        hipsDevMax:X.length?Math.max(...X.map(([,x])=>x.M.hipsDev.max)):null,soleMin:X.length?Math.min(...X.map(([,x])=>x.M.sole.all)):null,postBallMin:X.length?Math.min(...X.map(([,x])=>x.postBall)):null,rootEndMax:X.length?Math.max(...X.map(([,x])=>x.M.rootDev.end)):null,
        bodyFadeBack:X.length?Math.max(...X.map(([,x])=>Math.max(x.sp.hips.fadeBack.excess,x.sp.chest.fadeBack.excess))):null,afterExcess:X.length?Math.max(...X.map(([,x])=>Math.max(x.after.hips.excess,x.after.chest.excess))):null,
        recAngleStep:X.length?Math.max(...X.map(([,x])=>x.recAngleStep)):null,recAngleStepS0:X.length?Math.max(...X.map(([,x])=>x.recAngleStepS0)):null,preKneeDiff:X.length?Math.max(...X.map(([,x])=>x.preKneeDiff??0)):null,rows};}}return T;};
  const T=summarise();
  const score=n=>{let ok=true,offF=0,offV=0,sp=0,sn=0,addF=0,addV=0;for(const m of MODELS){const t=T[m][n];ok=ok&&t.kickOK;offF+=t.official.fail;offV+=t.official.varying;sp+=t.stepPass;sn+=t.stepN;addF+=t.added.fail;addV+=t.added.varying;}
    return {n,kickOK:ok,offF,offV,stepPass:sp,stepN:sn,addF,addV,all:MODELS.every(m=>T[m][n].official.allPass&&T[m][n].added.allPass)};};
  const ranking=VARS.map(score).sort((a,b)=>(b.kickOK-a.kickOK)||(a.offF-b.offF)||(a.offV-b.offV)||(b.stepPass-a.stepPass)||(a.addF-b.addF)||(a.addV-b.addV));
  const s0=score('S0'),promising=ranking.filter(s=>s.n!=='S0'&&s.kickOK&&s.stepPass>s0.stepPass).map(s=>s.n);
  // ---- outputs ----
  const L=[];const p=s=>{L.push(s);console.log(s);};
  p(`stepback_143.js · 반복 ${REPEATS}회 · 변형 ${VARS.join(', ')}`);
  p('=== 1. 도구 자체 확인 (애니메이션 판정과 별개) ===');for(const c of checks)if(!c.ok)p(`FAIL ${c.model} ${c.name}: ${JSON.stringify(c.value)} (${JSON.stringify(c.limit)})`);
  p(`도구 확인 ${checks.length}건 중 실패 ${checks.filter(c=>!c.ok).length}건`);
  p('=== 2. 실행마다 달라지는 게임 값 (공 위치·공 방향; 발 방향과 별개) ===');for(const v of variability.flat())p(`probe ${v.probe} ${v.name}: 접촉 때 공 거리 ${v.ballAtContact} m, 공 방향 ${v.aimDeg}°, 복귀 시작 ${v.followEnd} s`);
  p('=== 3. 복귀 동작의 요구 조건 (S0·O·클립에서, 판정 아님) ===');
  for(const m of MODELS){p(`-- ${m} 스윙 원천: walk ${JSON.stringify(swings[m].walk)} · run ${JSON.stringify(swings[m].run)}`);
    for(const s of inst){const q=req[m][s.id];if(!q)continue;
      p(`${m} ${s.id}: 복귀 틱 ${q.backTick}~${q.fadeEndTick} (끝 ${q.endTick}), 킥 클립 시각 ${q.kickTimeAtBack}/${q.kickClipEnd} s · 지지발 이동 ${q.plantMove.len} m (선수 기준 옆 ${q.plantMove.pf[0]}, 앞 ${q.plantMove.pf[1]}; O ${q.O?q.O.plantMove:'-'}) · 자세만의 차이 지지발 ${q.poseOnly.kickL_idleL} m, 차는발 ${q.poseOnly.kickR_idleR} m`+
        ` · 페이드 중 지지발 경로 ${q.plantFade.path} m, 최대 ${q.plantFade.maxSpeed} m/s (+${q.plantFade.maxAtTick}틱), 접지 ${q.plantFade.groundedTicks}/${q.plantFade.ticks}틱 · 차는발: 복귀 때 높이 ${q.kickFoot.lowAtBack} m, S0 착지 +${q.kickFoot.landTickS0}틱 (착지 후 미끄럼 ${q.kickFoot.slideAfterLandS0} m), 킥 클립 자체 착지 ${q.kickFoot.landClipTime} s (+${q.kickFoot.landClipTicksAfterBack}틱)`+
        ` · 골반 이동 ${JSON.stringify(q.body.hipsMove)}, 가슴 ${JSON.stringify(q.body.chestMove)}, 틱당 최대 ${q.body.hipsMaxStep}/${q.body.chestMaxStep} (한도 ${q.body.limit})`);}}
  p('=== 4. 변형별 판정 ===');
  const fmtW=w=>w?`${w.value==null?'측정불가':w.value} (${w.id})`:'-';
  for(const m of MODELS){p(`-- ${m}`);for(const n of VARS){const t=T[m][n];
    p(`${n} ${LABEL[n]} | 기존 실패 ${t.official.fail}+변동 ${t.official.varying} / ${t.official.gates} | 추가 실패 ${t.added.fail}+변동 ${t.added.varying} / ${t.added.gates} (스텝 판정 통과 ${t.stepPass}/${t.stepN}) | 공 맞춤 ${t.kickOK?'ok':'FAIL'}`+
      ` | 지지발: 접지 중 미끄럼 최악 ${fmtW(t.plantSlide)}, 끌림 ${fmtW(t.plantDrag)}, 들린 틱 최소 ${fmtW(t.plantAirTicks)}, 최고 높이 최소 ${fmtW(t.plantPeak)}, 접지 속도 ${fmtW(t.plantVDown)}, 공중 속도 ${fmtW(t.plantVAir)}`+
      ` | 차는발: 접지 중 미끄럼 ${fmtW(t.kickSlide)}, 끌림 ${fmtW(t.kickDrag)} | recovery143 정의 끝까지 이동 ${fmtW(t.fbAll)} | 끝 자세 차이 ${fmtW(t.endDev)} | 골반-선수 ${t.hipsDevMax} · 발바닥 최저 ${t.soleMin} · 접촉 후 공 ${t.postBallMin} · 끝 위치 ${t.rootEndMax} · 몸 초과 (복귀 ${t.bodyFadeBack}, 그 뒤 ${t.afterExcess}) · 관절 틱당 최대 ${t.recAngleStep}° (S0 ${t.recAngleStepS0}°) · 복귀 전 관절 차이 ${t.preKneeDiff}°`);
    for(const r of t.rows.filter(r=>r.fail||r.unmeasured))p(`     ${r.ok&&(r.fail||r.unmeasured)?'변동':r.unmeasured&&!r.fail?'측정불가':'FAIL'} ${r.sc} · ${r.name} ${r.extra?'[추가·'+r.kind+']':'[기존]'} (통과 ${r.ok}/${r.ok+r.fail+r.unmeasured}${r.unmeasured?', 측정불가 '+r.unmeasured:''}): ${JSON.stringify(r.values.slice(0,2)).slice(0,260)}`);}}
  p('=== 5. 계획(스텝 타이밍·비중) 선택 결과 ===');
  for(const m of MODELS)for(const n of VARS.filter(n=>n!=='S0'))for(const s of inst){const X=results[m][n]&&results[m][n][s.id];if(!X||!X.plan)continue;const q=X.plan;p(`${m} ${n} ${s.id}: ${q.src} 시작 +${q.nA}틱 (위상 ${q.phA} s, 속도 x${q.rate}, 최대 비중 ${q.wMax}) · idle +${q.nB}틱부터 ${q.nDown}틱 · 후보 ${q.candidates} · 점수 ${q.cost} (다음 ${q.next.slice(1,3).join(', ')}) · 지지발 들린 ${X.pL.airTicks}틱 최고 ${X.pL.peak} m · 미끄럼 ${X.pL.slide} 끌림 ${X.pL.drag} · 차는발 미끄럼 ${X.pR.slide} 끌림 ${X.pR.drag}`);}
  p('=== 6. 선택 ===');p('순위: '+ranking.map(r=>`${r.n}(공맞춤 ${r.kickOK?'ok':'X'}, 기존 실패 ${r.offF}, 변동 ${r.offV}, 스텝 판정 통과 ${r.stepPass}/${r.stepN}, 추가 실패 ${r.addF}, 변동 ${r.addV}${r.all?', 전부 통과':''})`).join(' > '));
  p(`유망 (공 맞춤 ok, 스텝 판정 통과가 S0보다 많음): ${promising.join(', ')||'없음'}`);
  p(`모든 판정 통과: ${ranking.filter(r=>r.all).map(r=>r.n).join(', ')||'없음 — 통합 가능한 변형 없음'}`);
  // frames of the recovery for every variant
  const csv=[];for(const m of MODELS)for(const s of inst)for(const n of ['O',...VARS]){const r=rowsOf[`${m}|${n}|${s.id}`];if(!r)continue;
    for(let j=1;j<r.rows.length;j++){const x=r.rows[j],q=r.rows[j-1];if(x.t<r.backAt-5/60-1e-6)continue;const X=x.X||{};
      csv.push({model:m,variant:n,instance:s.id,t:x.t,tick:x.k,phase:x.t<r.backAt-1e-6?'kick':x.t<=r.backAt+0.25+1e-6?'fadeBack':'after',kickWeight:X.wKick??'',idleWeight:X.wIdle??'',swingWeight:X.wSwing??'',swingTime:X.swingTime??'',stance:X.stance??'',
        playerX:x.player[0],playerZ:x.player[1],plantAnkleX:x.lAnk[0],plantAnkleY:x.lAnk[1],plantAnkleZ:x.lAnk[2],plantSoleHeight:x.L.low,plantDown:x.L.low<LIM.grounded?1:0,plantSpeedMps:+(d2(x.lAnk,q.lAnk)*60).toFixed(3),
        kickAnkleX:x.rAnk[0],kickAnkleY:x.rAnk[1],kickAnkleZ:x.rAnk[2],kickSoleHeight:x.R.low,kickDown:x.R.low<LIM.grounded?1:0,kickSpeedMps:+(d2(x.rAnk,q.rAnk)*60).toFixed(3),
        hipsX:x.hips[0],hipsY:x.hips[1],hipsZ:x.hips[2],hipsStep:+d3(x.hips,q.hips).toFixed(4),chestStep:+d3(x.chest,q.chest).toFixed(4),offsetX:X.offset?X.offset[0]:'',offsetZ:X.offset?X.offset[1]:'',lift:x.lift,plantToBall:x.L.gap,kickToBall:x.R.gap});}}
  const keys=Object.keys(csv[0]||{});fs.writeFileSync(out('stepback143_frames.csv'),keys.join(',')+'\n'+csv.map(r=>keys.map(k=>typeof r[k]==='string'?`"${r[k]}"`:r[k]).join(',')).join('\n')+'\n');
  fs.writeFileSync(out('stepback143_gates.log'),gates.filter(g=>g.sec==='new').map(g=>`${g.ok?'ok  ':'FAIL'} [기존] ${g.model} ${g.scen} ${g.variant} · ${g.name}: 측정 ${JSON.stringify(g.value)} / 기준 ${JSON.stringify(g.limit)} / 이유: ${g.why}`).concat(extra.map(g=>`${g.unmeasured?'N/A ':g.ok?'ok  ':'FAIL'} [추가·${g.kind}] ${g.model} ${g.scen} ${g.variant} · ${g.name}: 측정 ${JSON.stringify(g.value)} / 기준 ${JSON.stringify(g.limit)} / 이유: ${g.why}`)).join('\n')+'\n');
  const metrics={};for(const m of MODELS){metrics[m]={};for(const [n,byI] of Object.entries(results[m]||{})){metrics[m][n]={};for(const [id,X] of Object.entries(byI)){if(!X)continue;const c=Object.assign({},X.M);delete c.angles;const pl=X.plan?Object.assign({},X.plan,{trace:undefined}):null;metrics[m][n][id]=Object.assign({},X,{M:c,plan:pl});}}}
  const strip=Object.fromEntries(MODELS.map(m=>[m,Object.fromEntries(Object.entries(T[m]).map(([n,t])=>[n,Object.assign({},t,{rows:t.rows.map(r=>Object.assign({},r,{values:r.fail||r.unmeasured?r.values:undefined}))})]))]));
  fs.writeFileSync(out('stepback143_report.json'),JSON.stringify({repeats:REPEATS,variants:VARS,checks,variability,swings,req,tables:strip,ranking,promising,metrics,seconds:Math.round((Date.now()-t0)/1000)},null,1));
  const bad=checks.filter(c=>!c.ok);
  p(bad.length?`STEPBACK INCOMPLETE: 도구 확인 ${bad.length}건 실패 — 판정을 결과로 쓰지 말 것`:`STEPBACK COMPLETE: 도구 확인 ${checks.length}건 통과 · ${Math.round((Date.now()-t0)/1000)}초`);
  fs.writeFileSync(out('stepback143_report.txt'),L.join('\n')+'\n');
  process.exitCode=bad.length?2:0;
})();
