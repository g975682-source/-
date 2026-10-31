// 143_24: the plant foot sliding in the fade back (kick -> idle), taken apart and tried on its own (prototype only).
//   Cause: per tick in the fade back, the plant ankle's world move split exactly into what the game player's move does,
//     what each whole-model shift does (lateral fit `off`, aim `post`, plant lock, body speed limit, the new hold) and
//     what the blend of the poses does; for O (no correction), F (diag_143.js's F) and R0 (tune_143.js's pick).
//   Variants (all on R0 = F with the lock from the actual touch + 1 tick, aim 100 % by the touch, hips+chest limit):
//     R0  as it is; R0n the same without the body speed limit;
//     R1  the plant ankle held in the world (whole-model shift) from its first grounded tick in the fade back to the
//         fade's end, then let go by the end of the shot (the model must be back on the player there);
//     R2  the same hold at the kick's weight (gone when the fade is);
//     R3  held only while the plant foot is on the ground, let go over 0.1 s when it lifts, then as R1;
//     suffix p: the hold after the body speed limit (plant wins), b: before it (the limit sees it), n: no body limit.
//   No joint is changed (no IK): the hold moves the whole model.
// Limits, game probe, measurements and gates are check_shot.js's own code, read from that file and run as they are.
// The added verdicts (marked [추가]) are tune_143.js's plus the plant drift over the fade back and the let-go after it,
// and the kicking foot's drift once it is down; the plant drift limit (the take's own + 1 mm) is check_shot.js's.
// Usage (from this folder): node recovery_143.js
//   REC_REPEATS (default 3) game probes for the running shots; REC_VARIANTS=R0,R1p,... to run only those (O, F and
//   R0 always run); REC_TAG suffix for the output names. Outputs: out/recovery143{TAG}_* (nothing earlier touched).
// Exit 0 when every harness check passed (gate verdicts are results, failures expected); 2 otherwise.
const path=require('path'),fs=require('fs');
const P=require('../../tests/legacy/paths.js');
const {chromium}=require(P.PLAYWRIGHT);
const DIR=__dirname,three=fs.readFileSync(P.THREE_JS,'utf8'),TAKE='143_24',MODELS=['Xbot.glb','Soldier.glb'];
const REPEATS=Math.max(1,+(process.env.REC_REPEATS||3)),TAG=process.env.REC_TAG||'';
const ALLV=['R0','R0n','R1p','R1b','R1n','R2p','R2b','R2n','R3p','R3b','R3n'];
const VARS=process.env.REC_VARIANTS?[...new Set(['R0',...process.env.REC_VARIANTS.split(',').map(s=>s.trim()).filter(Boolean)])]:ALLV;
for(const v of VARS)if(!ALLV.includes(v))throw new Error('unknown variant '+v);
const out=f=>path.join(DIR,'out',f.replace(/^recovery143_/,'recovery143'+TAG+'_'));
for(const f of ['recovery143_report.txt','recovery143_report.json'])if(fs.existsSync(out(f))&&!process.env.REC_OVERWRITE)throw new Error(out(f)+' exists; set REC_TAG');
const CS=fs.readFileSync(path.join(DIR,'check_shot.js'),'utf8').split('\n');
const block=(from,to)=>{const a=CS.findIndex(l=>l.startsWith(from)),b=CS.findIndex((l,k)=>k>a&&l.startsWith(to));if(a<0||b<0)throw new Error('check_shot.js block not found: '+from);return CS.slice(a,b).join('\n');};
const SRC=[block('const LIM={','const sleep='),block('// ---- the game, read only','// ---- in the page'),block('// ---- measurements from the ticks','// ---- screenshots of the shot')].join('\n');
const {LIM,probeGame,measure,gatesFor,gates}=new Function('require','path','fs','P',SRC+'\nreturn {LIM,probeGame,measure,gatesFor,gates,gate};')(require,path,fs,P);
const checks=[];const check=(model,name,ok,value,limit)=>checks.push({model,name,ok:!!ok,value,limit});
const extra=[];
const xgate=(model,scen,variant,name,ok,value,limit,why)=>extra.push({model,scen,variant,name,ok:ok===true,unmeasured:ok===null,value,limit,why});
const LABEL={O:'보정 없음 (원래 클립)',F:'F (diag_143)',R0:'기준: tune143 선택 (A4+B100l+골반·가슴 제한)',R0n:'R0에서 몸 속도 제한 없음'};
for(const [k,l] of [['1','페이드 구간 고정'],['2','점진적 고정 (킥 비중)'],['3','접지 조건부 고정']])for(const [o,ol] of [['p','몸 제한 뒤 (지지발 우선)'],['b','몸 제한 앞 (몸 제한 우선)'],['n','몸 제한 없음']])LABEL[`R${k}${o}`]=`${l} · ${ol}`;

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
  for(const f of ['shot_lab.js','diag_lab.js','tune_lab.js','recovery_lab.js'])await page.addScriptTag({url:'http://viewer.local/'+f});
  const ref=await page.evaluate(async({m,TAKE,GROUNDED})=>{
    const Vw=window.__viewer;if(!(await Vw.load('models/'+m)))return {failed:'model: '+document.querySelector('#status').textContent};
    const inf=await Vw.addBVH(`models/cmu_extra/${TAKE}.bvh`,{trim:true,before:0.6,after:0.5,name:TAKE+' 킥 (슛 실험)'});if(!inf)return {failed:'retarget: '+document.querySelector('#status').textContent};
    const i=Vw.inst[0];
    const idle=Vw.animations.find(c=>/^idle$/i.test(c.name))||Vw.animations[0],run=Vw.animations.find(c=>/^run$/i.test(c.name))||idle;
    const times=d=>{const t=[];for(let k=0;k<=Math.round(d*60);k++)t.push(Math.min(d,k/60));return t;};
    // the references exactly as check_shot.js and tune_143.js compute them
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
    const ref={tc,strike,plant,plantFallback,capHipsStep:+capHipsStep.toFixed(4),ipBodyStep:+ipBodyStep.toFixed(4),kickToeStep:+kickToeStep.toFixed(4),ownDrift:+ownDrift.toFixed(4),sinkLimit,ownMin,srcDip:+srcDip.toFixed(4)};
    const ramp=(t,a,b)=>{const x=(t-a)/Math.max(1e-6,b-a);return x<=0?0:x>=1?1:x*x*(3-2*x);};
    const fit=(clip,ballZ)=>GLKick.contact(i,clip,tc,'Right',ballZ);
    // three.js keeps the crossfade start and end times in a Float32Array, so as the mixer's clock grows over hundreds
    // of sims the fades get quantised (0.1-0.2 ms, 0.1-0.3 mm at the feet): every sim starts with the clock at 0
    const SIM={rec:c=>(i.mixer.setTime(0),GLRecovery.sim(i,c)),tune:c=>(i.mixer.setTime(0),GLTune.sim(i,c)),diag:c=>(i.mixer.setTime(0),GLDiag.sim(i,c))};
    // a shot of one spec on one game probe (tune_143.js's, plus spec.fb {mode, order}: the fade-back hold)
    window.__T={shot(sc,spec){
        const tC=sc.lastOwned,tPl=tC-(tc-plant),backAt=sc.followEnd!=null?sc.followEnd:tC+0.3,game=sc.rows.map(r=>({x:r.x,z:r.z,yaw:r.yaw,ball:r.ball}));
        const bz=sc.ballAtContact,bx=sc.ballLatAtContact,f0=fit(ip,bz),off=[f0.offset[0]+bx,f0.offset[1]];
        const pStep=k=>{const a=game[Math.max(0,k-1)],b=game[Math.min(game.length-1,k)];return Math.hypot(b.x-a.x,b.z-a.z);};
        const body={none:[],hips:['Hips'],chest:['Spine2'],both:['Hips','Spine2']}[spec.body||'none'];
        const tEnd=backAt+0.25+0.3,lastT=Math.floor(tEnd*60+1e-9)/60;
        const mk=aim=>{const c={prev:sc.running?run:idle,back:idle,xfIn:0.15,xfOut:0.25,backAt,tEnd,game,sub:{from:tC-0.1,to:tC+0.1},kick:ip,kickStart:0,t0:tc-tC,
            off:(t,kt,wk)=>{const s=ramp(t,0,tPl);return [wk*s*off[0],wk*s*off[1]];},groundClamp:!!spec.clamp,
            lock:spec.lockFrom!=null?{from:spec.lockFrom,to:backAt}:null,
            post:aim?(t,kt,wk)=>{const s=ramp(t,0,aim.end);return [wk*s*aim.v[0],wk*s*aim.v[1]];}:null};
          if(body.length){const L=k=>0.97*Math.max(ref.capHipsStep,pStep(k)+ref.ipBodyStep);c.bodyLimit=L;
            if(spec.sim==='diag'){if(body.length!==1||body[0]!=='Hips')throw new Error('diag sim limits the hips only');}else c.bodyPoints=body;}
          return c;};
        const run1=SIM[spec.sim||'rec'];let pass1Lock=null,cfg;
        // the first pass (the lock without the aim) never has the hold: the hold starts after the contact
        if(spec.lockFrom!=null){const p1=run1(mk(null)),rc=p1.rows.find(r=>Math.abs(r.t-tC)<1e-6)||p1.rows[Math.round(tC*60)];pass1Lock=rc.lock;
          const sc_=spec.post?spec.post.scale:1,end=spec.post&&spec.post.end!=null?spec.post.end:tPl;cfg=mk({v:[-rc.lock[0]*sc_,-rc.lock[1]*sc_],end});}
        else cfg=mk(null);
        if(spec.fb)cfg.fb={mode:spec.fb.mode,order:spec.fb.order,from:backAt,fadeEnd:backAt+0.25,end:lastT,grounded:GROUNDED,airRelease:0.1};
        const r=run1(cfg);
        if(spec.sim&&spec.sim!=='rec')for(const x of r.rows)delete x.X;
        return {rows:r.rows,subs:r.subs,infeasible:r.infeasible||0,anchorSet:r.anchorSet,pass1Lock,tC,tPl,backAt,lastT,ballLeaves:sc.ballLeaves};}};
    return ref;},{m,TAKE,GROUNDED:LIM.grounded});
  return {browser,page,ref,errors};
}
async function runSpecs(M,jobs){const res=[];for(const j of jobs){const r=await M.page.evaluate(({sc,spec})=>window.__T.shot(sc,spec),{sc:j.inst,spec:j.spec});res.push(Object.assign({name:j.name,inst:j.inst.id,base:j.inst.base,probe:j.inst.probe,running:j.inst.running,spec:j.spec},r));}return res;}

const d2=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]),d3=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
// grounded drift: largest horizontal move of an ankle from its first grounded tick in [a,b]; the fastest grounded step
function drift(f,a,b,side){const key=side==='L'?'lAnk':'rAnk',w=f.filter(x=>x.t>=a-1e-6&&x.t<=b+1e-6&&x[side].low<LIM.grounded);if(!w.length)return {drift:null,slide:null,worst:null,first:null,n:0};
  let mx=0,at=w[0].t;for(const x of w){const d=d2(x[key],w[0][key]);if(d>mx){mx=d;at=x.t;}}
  let sl=0;for(let j=1;j<f.length;j++){const x=f[j],y=f[j-1];if(x.t<a-1e-6||x.t>b+1e-6)continue;if(x[side].low<LIM.grounded&&y[side].low<LIM.grounded)sl=Math.max(sl,d2(x[key],y[key])*60);}
  return {drift:+mx.toFixed(4),slide:+sl.toFixed(3),worst:at,first:w[0].t,n:w.length};}

// ---- the cause: the plant ankle's move in the fade back, split exactly (holder frame: world = R(yaw) local + player)
const rot=(yaw,v)=>{const c=Math.cos(yaw),s=Math.sin(yaw);return [v[0]*c+v[2]*s,v[1],-v[0]*s+v[2]*c];};
const toW=(X,v)=>{const r=rot(X.yaw,v);return [r[0]+X.px,r[1],r[2]+X.pz];};
const sub3=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add3=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const COMP=['player','off','post','lock','body','hold','pose'];
function decompose(r){
  const f=r.rows,back=r.backAt,fe=back+0.25;let maxErr=0,rootErr=0;
  const per=[];   // per tick: the world move of the plant ankle by part
  for(let j=1;j<f.length;j++){const A=f[j-1].X,B=f[j].X;if(!A||!B)return null;
    const aPrev=A.ankH,poseA=sub3(A.ankH,A.rootH),poseB=sub3(B.ankH,B.rootH);
    const c={player:sub3(toW(B,aPrev),toW(A,aPrev))};
    const dv=(k)=>[B[k][0]-A[k][0],0,B[k][1]-A[k][1]];
    c.off=rot(B.yaw,dv('off'));c.post=rot(B.yaw,dv('post'));c.lock=rot(B.yaw,dv('lock'));c.body=rot(B.yaw,dv('dc'));c.hold=rot(B.yaw,dv('fb'));
    const dRoot=sub3(B.rootH,A.rootH),sumC=[B.off[0]-A.off[0]+B.post[0]-A.post[0]+B.lock[0]-A.lock[0]+B.dc[0]-A.dc[0]+B.fb[0]-A.fb[0],B.lift-A.lift,B.off[1]-A.off[1]+B.post[1]-A.post[1]+B.lock[1]-A.lock[1]+B.dc[1]-A.dc[1]+B.fb[1]-A.fb[1]];
    rootErr=Math.max(rootErr,Math.abs(dRoot[0]-sumC[0]),Math.abs(dRoot[2]-sumC[2]));
    c.pose=rot(B.yaw,sub3(poseB,poseA));
    let tot=[0,0,0];for(const k of COMP)tot=add3(tot,c[k]);tot=add3(tot,rot(B.yaw,[0,B.lift-A.lift,0]));
    const real=sub3(B.ankW,A.ankW);maxErr=Math.max(maxErr,Math.abs(real[0]-tot[0]),Math.abs(real[2]-tot[2]));
    per.push({t:f[j].t,k:f[j].k,c,real,low:f[j].L.low,lowPrev:f[j-1].L.low,wKick:B.wKick,wBack:B.wBack,wPrev:B.wPrev,fbOn:B.fbOn});}
  // the window: the plant foot's grounded ticks in the fade back (as the drift verdict), from the first to the worst
  const dr=drift(f,back,fe,'L');let parts=null;
  if(dr.first!=null){const g0=dr.first,g1=dr.worst;const sum={};for(const k of COMP)sum[k]=[0,0,0];
    for(const p of per)if(p.t>g0+1e-6&&p.t<=g1+1e-6)for(const k of COMP)sum[k]=add3(sum[k],p.c[k]);
    let tot=[0,0,0];for(const k of COMP)tot=add3(tot,sum[k]);const L=Math.hypot(tot[0],tot[2])||1,u=[tot[0]/L,0,tot[2]/L];
    parts={from:g0,to:g1,net:+Math.hypot(tot[0],tot[2]).toFixed(4)};
    for(const k of COMP)parts[k]={along:+(sum[k][0]*u[0]+sum[k][2]*u[2]).toFixed(4),length:+Math.hypot(sum[k][0],sum[k][2]).toFixed(4)};}
  // the whole fade (backAt..fade end), grounded or not: the net by part, and the path by part
  const fsum={},path={};for(const k of COMP){fsum[k]=[0,0,0];path[k]=0;}
  for(const p of per)if(p.t>back+1e-6&&p.t<=fe+1e-6)for(const k of COMP){fsum[k]=add3(fsum[k],p.c[k]);path[k]+=Math.hypot(p.c[k][0],p.c[k][2]);}
  const fade={};for(const k of COMP)fade[k]={net:+Math.hypot(fsum[k][0],fsum[k][2]).toFixed(4),path:+path[k].toFixed(4)};
  // the ticks: grounded or not, the blend weights, the speed, the parts' speed
  const ticks=per.filter(p=>p.t>=back-5/60-1e-6&&p.t<=r.lastT+1e-6).map(p=>{const o={t:p.t,k:p.k,low:+p.low.toFixed(4),grounded:p.low<LIM.grounded,wKick:p.wKick,wBack:p.wBack,wPrev:p.wPrev,speed:+(Math.hypot(p.real[0],p.real[2])*60).toFixed(3),hold:p.fbOn};
    for(const k of COMP)o[k]=+(Math.hypot(p.c[k][0],p.c[k][2])*60).toFixed(3);return o;});
  const gT=f.filter(x=>x.t>=back-1e-6&&x.t<=fe+1e-6).map(x=>({k:x.k,g:x.L.low<LIM.grounded}));
  const lifts=[];for(let j=1;j<gT.length;j++)if(gT[j-1].g&&!gT[j].g)lifts.push(gT[j].k);
  return {maxErr,rootErr,drift:dr,parts,fade,ticks,backTick:Math.round(back*60),fadeEndTick:Math.round(fe*60),firstGrounded:dr.first==null?null:Math.round(dr.first*60),
    groundedTicks:gT.filter(x=>x.g).length,fadeTicks:gT.length,lifts};}

// ---- measuring a result: check_shot.js's measure and gates, tune_143.js's added verdicts and the new ones ----
function analyse(m,r,ref,baseM,O_){
  const S={tC:r.tC,tPl:r.tPl,backAt:r.backAt,ballLeaves:r.ballLeaves},Vv={rows:r.rows,subs:r.subs,kickStart:0};
  let M;try{M=measure(S,Vv,ref);}catch(e){check(m,`${r.inst} ${r.name}: measured`,false,e.message,'measured');return null;}
  gatesFor(m,TAKE,r.inst,r.name,M,ref,baseM?{[r.name]:Object.assign({name:'O'},baseM)}:{});
  const f=r.rows,ks=0,xfIn=0.15,back=r.backAt,dt=1/60,fe=back+0.25;
  const pStep=j=>Math.hypot(f[j].player[0]-f[j-1].player[0],f[j].player[1]-f[j-1].player[1]);
  const over=(key,a,b,own,cap)=>{let w={excess:-Infinity};for(let j=1;j<f.length;j++){if(!(f[j].t>a+1e-6&&f[j].t<=b+1e-6))continue;const L=Math.max(cap,pStep(j)+own),s=d3(f[j][key],f[j-1][key]);if(s-L>w.excess)w={excess:+(s-L).toFixed(4),step:+s.toFixed(4),limit:+L.toFixed(4),at:f[j].t};}return w;};
  const sp={};for(const key of ['hips','chest'])sp[key]={fadeIn:over(key,ks,ks+xfIn+dt,ref.ipBodyStep,ref.capHipsStep),kick:over(key,ks+xfIn+dt,back,ref.ipBodyStep,ref.capHipsStep),fadeBack:over(key,back,back+0.25+dt,ref.ipBodyStep,ref.capHipsStep)};
  const official=Math.max(M.speed.fadeInBody.excess,M.speed.fadeBackBody.excess,M.speed.kickBody.excess),split=Math.max(...['hips','chest'].flatMap(k=>['fadeIn','kick','fadeBack'].map(w=>sp[k][w].excess)));
  check(m,`${r.inst} ${r.name}: split body speed = check_shot.js's`,Math.abs(official-split)<=1e-4,{official,split},'equal');
  // after the fade back (the let-go window) the body points per tick, with the same per-tick limit (diagnosis)
  const after={hips:over('hips',fe+dt,r.lastT,ref.ipBodyStep,ref.capHipsStep),chest:over('chest',fe+dt,r.lastT,ref.ipBodyStep,ref.capHipsStep)};
  const fb=drift(f,back,fe,'L'),fbAll=drift(f,back,r.lastT,'L'),kAll=drift(f,back,r.lastT,'R');
  const kin=f.filter(x=>x.kickWeight>0&&x.t<=r.tC+1e-6),w=kin.reduce((a,b)=>b.L.gap<a.L.gap?b:a,kin[0]);
  const kk=f.filter(x=>x.kickWeight>0&&x.t<=(M.tEff??r.tC)-dt+1e-6),wk_=kk.length?kk.reduce((a,b)=>b.R.gap<a.R.gap?b:a):null;
  // the feet against the ball after the contact (the hold moves the model while the ball may still be near)
  const postBall=+Math.min(...f.filter(x=>x.t>r.tC+1e-6).map(x=>Math.min(x.L.gap,x.R.gap))).toFixed(4);
  const X={M,sp,after,fb,fbAll,kAll,postBall,plantKickIn:{gap:w.L.gap,at:w.t},kickKickIn:wk_?{gap:wk_.R.gap,at:wk_.t}:null,infeasible:r.infeasible,pass1Lock:r.pass1Lock,
    vsO:O_?{fb:O_.fb.drift!=null&&fb.drift!=null?+(O_.fb.drift-fb.drift).toFixed(4):null,fbAll:O_.fbAll.drift!=null&&fbAll.drift!=null?+(O_.fbAll.drift-fbAll.drift).toFixed(4):null}:null};
  const sc=r.inst,v=r.name,lim=+(ref.ownDrift+0.001).toFixed(4);
  xgate(m,sc,v,'plant foot not in the ball',M.plantInBall>=LIM.inBall,M.plantInBall,'>= -0.03 m','"no foot inside the ball", the plant foot alone');
  xgate(m,sc,v,'kicking foot not in the ball before the contact',M.kickInBallBefore>=LIM.inBall,M.kickInBallBefore,'>= -0.03 m','"no foot inside the ball", the kicking foot alone');
  xgate(m,sc,v,'no foot in the ball after the contact',postBall>=LIM.inBall,postBall,'>= -0.03 m','"no foot inside the ball" after the contact (the hold moves the model)');
  for(const k of ['hips','chest'])xgate(m,sc,v,`${k} speed`,['fadeIn','kick','fadeBack'].every(x=>sp[k][x].excess<=1e-6),sp[k],'max(captured hips step, player step + in-place body step) per tick','the body speed gates, this point alone');
  xgate(m,sc,v,'body speed after the fade back',Math.max(after.hips.excess,after.chest.excess)<=1e-6,after,'the same per-tick limit','the let-go of the hold must not make the body jump');
  xgate(m,sc,v,'plant drift in the fade back',fb.drift==null?null:fb.drift<=lim,fb,lim,'the plant drift limit (the take\'s own +1 mm) over the fade back, while the plant foot is on the ground; no grounded tick there = not measured');
  xgate(m,sc,v,'plant drift from the fade back to the end',fbAll.drift==null?null:fbAll.drift<=lim,fbAll,lim,'the same limit from the fade back to the end of the shot (the let-go included): a slide moved later is still a slide');
  xgate(m,sc,v,'kicking foot drift once down (fade back to end)',kAll.drift==null?null:kAll.drift<=lim,kAll,lim,'the hold moves the whole model: the kicking foot, once on the ground, must not slide either');
  return X;}
function touchOf(rows,tC){let k=null;for(let j=1;j<rows.length;j++){const a=rows[j],b=rows[j-1];if(a.t>tC+1e-6)break;if(a.kickWeight>0&&a.L.low<LIM.grounded&&b.L.low>=LIM.grounded)k=j;}
  if(k==null)return null;const a=rows[k],b=rows[k-1];
  return {tick:a.k,t:a.t,height:a.L.low,heightBefore:b.L.low,downSpeed:+((b.L.low-a.L.low)*60).toFixed(3),slideSpeed:+(d2(a.lAnk,b.lAnk)*60).toFixed(3),slideNext:rows[k+1]?+(d2(rows[k+1].lAnk,a.lAnk)*60).toFixed(3):null};}
const cmpRows=(A,B,until)=>{let w=0;if(A.rows.length!==B.rows.length)return Infinity;for(let j=0;j<A.rows.length;j++){const x=A.rows[j],y=B.rows[j];if(until!=null&&x.t>until+1e-6)break;for(const k of ['root','hips','chest','lAnk','rAnk','rToe'])for(let c=0;c<3;c++)w=Math.max(w,Math.abs(x[k][c]-y[k][c]));w=Math.max(w,Math.abs(x.L.gap-y.L.gap),Math.abs(x.R.gap-y.R.gap),Math.abs(x.L.low-y.L.low));}return w;};

(async()=>{
  const t0=Date.now();
  const probes=[];for(let k=0;k<REPEATS;k++){const g=await probeGame();if(g.errors.length)check('game',`probe ${k+1} without page errors`,false,g.errors.slice(0,3),'none');probes.push(g);}
  const inst=[];for(let k=0;k<REPEATS;k++)for(const s of probes[k].scenarios){if(/angled/.test(s.name))continue;if(!s.running&&k>0)continue;inst.push(Object.assign({},s,{id:s.name+' #'+(k+1),base:s.name,probe:k+1}));}
  const variability=probes.map((g,k)=>g.scenarios.filter(s=>!/angled/.test(s.name)).map(s=>({probe:k+1,name:s.name,ballAtContact:s.ballAtContact,aimDeg:s.aimDeg,followEnd:s.followEnd,lastOwned:s.lastOwned})));
  check('game',`instances: 3 standing + 3 x ${REPEATS} straight running`,inst.length===3+3*REPEATS,inst.length,3+3*REPEATS);
  const prior=fs.existsSync(path.join(DIR,'out','shot_lab_cmp4_summary.json'))?JSON.parse(fs.readFileSync(path.join(DIR,'out','shot_lab_cmp4_summary.json'),'utf8')):null;
  const tunePrior=fs.existsSync(path.join(DIR,'out','tune143_r10_report.json'))?JSON.parse(fs.readFileSync(path.join(DIR,'out','tune143_r10_report.json'),'utf8')):null;
  const MS={};await Promise.all(MODELS.map(async m=>{MS[m]=await openModel(m);}));
  for(const m of MODELS){const R=MS[m];if(R.ref.failed){check(m,'model and take load',false,R.ref.failed,'loaded');continue;}
    const pr=prior&&prior.models[m]&&prior.models[m].takes[TAKE].ref;for(const k of ['tc','plant','capHipsStep','ipBodyStep','kickToeStep','ownDrift','sinkLimit'])check(m,`reference ${k} = check_shot.js`,pr&&Math.abs(R.ref[k]-pr[k])<=1e-4,{here:R.ref[k],checkShot:pr?pr[k]:null},'|diff| <= 0.0001');}
  if(checks.some(c=>!c.ok)){console.log('STOP',checks.filter(c=>!c.ok));process.exitCode=2;for(const m of MODELS)await MS[m].browser.close();return;}
  const runAll=async(jobsOf)=>{const res={};await Promise.all(MODELS.map(async m=>{res[m]=await runSpecs(MS[m],jobsOf(m));}));return res;};
  // 0. base runs: O (no correction), detect (F without the lock, for the touch), F (diag_143.js's F)
  const clipPl=(m,s)=>s.lastOwned-(MS[m].ref.tc-MS[m].ref.plant);
  const base=await runAll(m=>inst.flatMap(s=>[{inst:s,name:'O',spec:{lockFrom:null,clamp:false,body:'none'}},{inst:s,name:'detect',spec:{lockFrom:null,clamp:true,body:'hips'}},{inst:s,name:'F',spec:{lockFrom:clipPl(m,s),clamp:true,body:'hips'}}]));
  const touch={},O={},Fr={};
  for(const m of MODELS){touch[m]={};O[m]={};Fr[m]={};for(const r of base[m]){if(r.name==='detect')touch[m][r.inst]=touchOf(r.rows,r.tC);if(r.name==='O')O[m][r.inst]=r;if(r.name==='F')Fr[m][r.inst]=r;}
    for(const s of inst)check(m,`${s.id}: plant touch found`,!!touch[m][s.id],touch[m][s.id],'found');}
  const lockR0=(m,s)=>{const t=touch[m][s.id];return t?t.t+1/60:null;};
  const R0spec=(m,s,body)=>{const l=lockR0(m,s),t=touch[m][s.id];if(l==null)return null;return {lockFrom:l,clamp:true,body,post:{scale:1,end:t.t}};};
  const specOf=(m,s,n)=>{if(n==='R0')return R0spec(m,s,'both');if(n==='R0n')return R0spec(m,s,'none');
    const mm=n.match(/^R([123])([pbn])$/),b=R0spec(m,s,mm[2]==='n'?'none':'both');if(!b)return null;return Object.assign(b,{fb:{mode:'R'+mm[1],order:mm[2]==='b'?'b':'p'}});};
  // 1. harness checks on probe 1: the new sim without the hold = tune_lab.js's; R0 = tune_143.js's Cboth (standing)
  const val=await runAll(m=>inst.filter(s=>s.probe===1).flatMap(s=>[{inst:s,name:'tune1',spec:Object.assign(R0spec(m,s,'both'),{sim:'tune'})},{inst:s,name:'tune2',spec:Object.assign(R0spec(m,s,'both'),{sim:'tune'})},{inst:s,name:'rec1',spec:R0spec(m,s,'both')},{inst:s,name:'rec2',spec:R0spec(m,s,'both')}]));
  // the sims' own run-to-run noise (rows are kept to 0.1 mm): the same spec twice, on every instance (R0 and R0rep
  // below) and here; a comparison "the same as" allows the largest noise seen on that model, at least one 0.1 mm step
  const noise={},recVsTune={};
  for(const m of MODELS){noise[m]=0;recVsTune[m]=[];for(const s of inst.filter(s=>s.probe===1)){const by=n=>val[m].find(r=>r.inst===s.id&&r.name===n);
    noise[m]=Math.max(noise[m],cmpRows(by('tune1'),by('tune2')),cmpRows(by('rec1'),by('rec2')));recVsTune[m].push({id:s.id,d:cmpRows(by('rec1'),by('tune1'))});
    if(!s.running&&tunePrior){const x=measure({tC:by('rec1').tC,tPl:by('rec1').tPl,backAt:by('rec1').backAt,ballLeaves:by('rec1').ballLeaves},{rows:by('rec1').rows,subs:by('rec1').subs,kickStart:0},MS[m].ref);
      const tp=tunePrior.metrics[m].Cboth[s.id];const d=tp?{hipsDev:Math.abs(x.hipsDev.max-tp.M.hipsDev.max),gap:Math.abs(x.gapAtContact-tp.M.gapAtContact),plant:Math.abs(x.plantInBall-tp.M.plantInBall),sole:Math.abs(x.sole.all-tp.M.sole.all)}:null;
      check(m,`${s.id}: R0 reproduces tune143_r10 Cboth`,d&&Object.values(d).every(v=>v<=0.002),d,'<= 2 mm');}}}
  // 2. the experiments
  const results={},rowsOf={};const Ocache={},Oan={};
  const OM=(m,id)=>{const k=m+'|'+id;if(!Ocache[k]){const r=O[m][id];Ocache[k]=measure({tC:r.tC,tPl:r.tPl,backAt:r.backAt,ballLeaves:r.ballLeaves},{rows:r.rows,subs:r.subs,kickStart:0},MS[m].ref);}return Ocache[k];};
  const Odr=(m,id)=>{const k=m+'|'+id;if(!Oan[k]){const r=O[m][id];Oan[k]={fb:drift(r.rows,r.backAt,r.backAt+0.25,'L'),fbAll:drift(r.rows,r.backAt,r.lastT,'L'),kAll:drift(r.rows,r.backAt,r.lastT,'R')};}return Oan[k];};
  const res=await runAll(m=>inst.flatMap(s=>VARS.map(n=>({inst:s,name:n,spec:specOf(m,s,n)})).concat([{inst:s,name:'R0rep',spec:specOf(m,s,'R0')}]).filter(j=>j.spec)));
  for(const m of MODELS){for(const r of res[m].filter(r=>r.name==='R0rep')){const a=res[m].find(x=>x.name==='R0'&&x.inst===r.inst);noise[m]=Math.max(noise[m],cmpRows(a,r));}
    res[m]=res[m].filter(r=>r.name!=='R0rep');}
  const tol=m=>Math.max(noise[m],1e-4)+1e-9;
  for(const m of MODELS)for(const x of recVsTune[m])check(m,`${x.id}: GLRecovery.sim without the hold = GLTune.sim`,x.d<=tol(m),{recVsTune:x.d,simNoise:noise[m]},'no more than a sim against itself (largest seen on this model)');
  for(const m of MODELS){for(const s of inst)for(const n of VARS)if(!specOf(m,s,n))check(m,`${s.id} ${n}: could be run`,false,'no plant touch','touch found');
    for(const r of res[m]){results[m]=results[m]||{};const X=analyse(m,r,MS[m].ref,OM(m,r.inst),Odr(m,r.inst));if(X)X.anchorSet=r.anchorSet;(results[m][r.name]=results[m][r.name]||{})[r.inst]=X;rowsOf[`${m}|${r.name}|${r.inst}`]=r;}
    // F gets its gates too (reference, not a candidate)
    for(const s of inst){const r=Fr[m][s.id];(results[m].F=results[m].F||{})[s.id]=analyse(m,r,MS[m].ref,OM(m,s.id),Odr(m,s.id));rowsOf[`${m}|F|${s.id}`]=r;rowsOf[`${m}|O|${s.id}`]=O[m][s.id];}}
  // the hold did something, and nothing before it: each R against its base (R0 for p/b, R0n for n), same instance
  for(const m of MODELS)for(const s of inst)for(const n of VARS.filter(n=>/^R[123]/.test(n))){const r=rowsOf[`${m}|${n}|${s.id}`],bn=n.endsWith('n')?'R0n':'R0',b=rowsOf[`${m}|${bn}|${s.id}`];if(!r||!b)continue;
    const before=cmpRows(r,b,r.backAt-1e-3),after=cmpRows(r,b,null);
    const holdBefore=Math.max(...r.rows.filter(x=>x.t<r.backAt-1e-6).map(x=>Math.hypot(x.X.fb[0],x.X.fb[1])));
    check(m,`${s.id} ${n}: the hold is exactly zero before the fade back`,holdBefore===0,{holdBefore},'0');
    check(m,`${s.id} ${n}: same as ${bn} before the fade back`,before<=tol(m),{before,simNoise:noise[m]},'no more than a sim against itself (largest seen on this model)');
    check(m,`${s.id} ${n}: the hold acted (differs from ${bn} after)`,r.anchorSet&&after>1e-3,{after,anchorSet:r.anchorSet},'> 1 mm somewhere, anchor set');}
  // the cause: O, F, R0 (and R0n) per instance
  const cause={};for(const m of MODELS){cause[m]={};for(const s of inst){cause[m][s.id]={};for(const n of ['O','F','R0','R0n']){const r=rowsOf[`${m}|${n}|${s.id}`];if(!r)continue;const D=decompose(r);
      if(!D){check(m,`${s.id} ${n}: decomposed`,false,'no records','records');continue;}
      check(m,`${s.id} ${n}: parts add up to the plant ankle's move`,D.maxErr<=1e-5&&D.rootErr<=1e-5,{maxErr:D.maxErr,rootErr:D.rootErr},'<= 0.00001 m');
      const {ticks,...rest}=D;cause[m][s.id][n]=rest;cause[m][s.id][n+'_ticks']=ticks;}}}
  for(const m of MODELS)await MS[m].browser.close();
  // ---- the verdicts over the repeats ----
  const VN=['F',...VARS];
  const summarise=()=>{const T={};for(const m of MODELS){T[m]={};for(const n of VN){const gs=gates.filter(g=>g.sec==='new'&&g.model===m&&g.variant===n),xs=extra.filter(g=>g.model===m&&g.variant===n);
      const by={};for(const g of gs.concat(xs.map(x=>Object.assign({},x,{extra:true})))){const sc=g.scen.replace(/ #\d+$/,''),key=sc+'|'+g.name+(g.extra?'|x':'');(by[key]=by[key]||{sc,name:g.name,extra:!!g.extra,ok:0,fail:0,unmeasured:0,values:[],ids:[]});const b=by[key];if(g.unmeasured)b.unmeasured++;else if(g.ok)b.ok++;else b.fail++;b.values.push(g.value);b.ids.push(g.scen);}
      const rows=Object.values(by),official=rows.filter(r=>!r.extra),added=rows.filter(r=>r.extra);
      const cnt=list=>({gates:list.length,fail:list.filter(r=>r.fail&&!r.ok&&!r.unmeasured).length,varying:list.filter(r=>r.fail&&r.ok).length,unmeasured:list.filter(r=>r.unmeasured).length,allPass:list.every(r=>!r.fail&&!r.unmeasured)});
      const kickOK=official.filter(r=>['contact gap','timing','direction'].includes(r.name)).every(r=>r.fail===0&&r.unmeasured===0);
      const X=Object.entries(results[m][n]||{}).filter(([,x])=>x);
      const worst=(get)=>{let w=null;for(const [id,x] of X){const v=get(x);if(v==null)return {value:null,id};if(!w||v>w.value)w={value:v,id};}return w;};
      const passN=(name)=>{const r=added.filter(r=>r.name===name);return {pass:r.reduce((a,b)=>a+b.ok,0),n:r.reduce((a,b)=>a+b.ok+b.fail+b.unmeasured,0)};};
      T[m][n]={official:cnt(official),added:cnt(added),kickOK,
        fbWorst:worst(x=>x.fb.drift),fbAllWorst:worst(x=>x.fbAll.drift),kWorst:worst(x=>x.kAll.drift),fbPass:passN('plant drift in the fade back'),fbAllPass:passN('plant drift from the fade back to the end'),kPass:passN('kicking foot drift once down (fade back to end)'),
        plantMin:X.length?Math.min(...X.map(([,x])=>x.M.plantInBall)):null,kickMin:X.length?Math.min(...X.map(([,x])=>x.M.kickInBallBefore)):null,postBallMin:X.length?Math.min(...X.map(([,x])=>x.postBall)):null,
        soleMin:X.length?Math.min(...X.map(([,x])=>x.M.sole.all)):null,rootEndMax:X.length?Math.max(...X.map(([,x])=>x.M.rootDev.end)):null,hipsDevMax:X.length?Math.max(...X.map(([,x])=>x.M.hipsDev.max)):null,
        bodyExcess:X.length?Math.max(...X.map(([,x])=>Math.max(...['hips','chest'].flatMap(k=>['fadeIn','kick','fadeBack'].map(w=>x.sp[k][w].excess))))):null,
        afterExcess:X.length?Math.max(...X.map(([,x])=>Math.max(x.after.hips.excess,x.after.chest.excess))):null,
        improveFb:X.length?[Math.min(...X.map(([,x])=>x.vsO.fb??-Infinity)),Math.max(...X.map(([,x])=>x.vsO.fb??-Infinity))]:null,
        improveAll:X.length?[Math.min(...X.map(([,x])=>x.vsO.fbAll??-Infinity)),Math.max(...X.map(([,x])=>x.vsO.fbAll??-Infinity))]:null,rows};}}return T;};
  const T=summarise();
  // the choice: 1. the kick meets the ball; 2. fewest official gates failing always / varying (+ not measured);
  // 3. the fade-back drift verdicts passed (fade, and fade to the end) and the worst drift; 4. the side effects (added fails)
  const score=n=>{let ok=true,offF=0,offV=0,fbp=0,fbn=0,fbw=0,addF=0,addV=0;for(const m of MODELS){const t=T[m][n];ok=ok&&t.kickOK;offF+=t.official.fail+t.official.unmeasured;offV+=t.official.varying;
      fbp+=t.fbPass.pass+t.fbAllPass.pass;fbn+=t.fbPass.n+t.fbAllPass.n;fbw=Math.max(fbw,t.fbWorst.value??Infinity,t.fbAllWorst.value??Infinity);
      const side=t.rows.filter(r=>r.extra&&!/plant drift (in|from) the fade back/.test(r.name));addF+=side.filter(r=>!r.ok&&(r.fail||r.unmeasured)).length;addV+=side.filter(r=>r.ok&&(r.fail||r.unmeasured)).length;}
    return {n,kickOK:ok,offF,offV,fbp,fbn,fbw:+fbw.toFixed(4),addF,addV,all:MODELS.every(m=>T[m][n].official.allPass&&T[m][n].added.allPass)};};
  const ranking=VARS.map(score).sort((a,b)=>(b.kickOK-a.kickOK)||(a.offF-b.offF)||(a.offV-b.offV)||(b.fbp-a.fbp)||(a.fbw-b.fbw)||(a.addF-b.addF)||(a.addV-b.addV));
  // promising (for the 10-repeat run): the kick still meets the ball and the fade-back drift verdicts pass more often
  // than R0's, or the worst drift is at least 5 mm smaller
  const r0=score('R0');const promising=ranking.filter(s=>s.n!=='R0'&&s.kickOK&&(s.fbp>r0.fbp||s.fbw<r0.fbw-0.005)).map(s=>s.n);
  // O (no correction) for reference: its drifts on every instance
  const Oref={};for(const m of MODELS){Oref[m]={};for(const s of inst)Oref[m][s.id]=Odr(m,s.id);}
  // ---- outputs ----
  const L=[];const p=s=>{L.push(s);console.log(s);};
  p(`recovery_143.js · 반복 ${REPEATS}회 · 변형 ${VARS.join(', ')}`);
  p('=== 1. 도구 자체 확인 (애니메이션 판정과 별개) ===');for(const c of checks)if(!c.ok)p(`FAIL ${c.model} ${c.name}: ${JSON.stringify(c.value)} (${JSON.stringify(c.limit)})`);
  p(`도구 확인 ${checks.length}건 중 실패 ${checks.filter(c=>!c.ok).length}건`);
  p('=== 2. 실행마다 달라지는 게임 값 (공 위치·공 방향; 발 방향과 별개) ===');for(const v of variability.flat())p(`probe ${v.probe} ${v.name}: 접촉 때 공 거리 ${v.ballAtContact} m, 공 방향 ${v.aimDeg}°, 복귀 시작 ${v.followEnd} s`);
  p('=== 3. 원인 분석: 복귀 페이드의 지지발 이동 분해 (판정 아님) ===');
  p('부분: player=게임 선수 이동, off=측면 맞춤 오프셋 소멸, post=조준 이동 소멸, lock=지지발 고정 보정 소멸, body=골반·가슴 속도 제한 이동, hold=새 고정, pose=클립 블렌드(킥→idle) 자세 변화');
  p('along = 접지 첫 틱부터 최대 이동 틱까지 이동 방향으로 투영한 기여 (합 = 이동량), fade = 페이드 전체(접지 무관) 부분별 순이동/경로');
  for(const m of MODELS)for(const s of inst){for(const n of ['O','F','R0','R0n']){const c=cause[m][s.id][n];if(!c)continue;const pp=c.parts;
    p(`${m} ${s.id} ${n}: 복귀 틱 ${c.backTick}~${c.fadeEndTick}, 접지 ${c.groundedTicks}/${c.fadeTicks}틱 (첫 접지 ${c.firstGrounded}${c.lifts.length?', 들림 '+c.lifts.join('/'):''}) · 이동 ${c.drift.drift} m (최대 ${c.drift.slide} m/s)`+
      (pp?` · along: `+COMP.map(k=>`${k} ${pp[k].along>=0?'+':''}${pp[k].along}`).join(' '):'')+` · fade net: `+COMP.map(k=>`${k} ${c.fade[k].net}`).join(' '));}}
  p('-- O (보정 없음) 참고: 장면별 지지발 이동 (페이드 / 끝까지) · 차는발 이동 (착지 후 끝까지), 최악');
  for(const m of MODELS){const byB={};for(const s of inst){const o=Oref[m][s.id];(byB[s.base]=byB[s.base]||[]).push([o.fb.drift,o.fbAll.drift,o.kAll.drift,s.id]);}
    for(const [b,l] of Object.entries(byB))p(`${m} ${b}: 지지발 페이드 ${Math.min(...l.map(x=>x[0]))}~${Math.max(...l.map(x=>x[0]))} m · 끝까지 ${Math.min(...l.map(x=>x[1]))}~${Math.max(...l.map(x=>x[1]))} m · 차는발 ${Math.min(...l.map(x=>x[2]??Infinity))}~${Math.max(...l.map(x=>x[2]??-Infinity))} m`);}
  // per variant tables
  const fmtW=w=>w?`${w.value==null?'측정불가':w.value} (${w.id})`:'-';
  const table=(names,title)=>{p(`=== ${title} ===`);for(const m of MODELS){p(`-- ${m}`);
      for(const n of names){const t=T[m][n];if(!t)continue;
        p(`${n} ${LABEL[n]} | 기존 실패 ${t.official.fail}+변동 ${t.official.varying}+측정불가 ${t.official.unmeasured} / ${t.official.gates} | 추가 실패 ${t.added.fail}+변동 ${t.added.varying}+측정불가 ${t.added.unmeasured} / ${t.added.gates} | 공 맞춤 ${t.kickOK?'ok':'FAIL'}`+
          ` | 복귀 페이드 지지발 최악 ${fmtW(t.fbWorst)} 통과 ${t.fbPass.pass}/${t.fbPass.n} | 끝까지 최악 ${fmtW(t.fbAllWorst)} 통과 ${t.fbAllPass.pass}/${t.fbAllPass.n} | 차는발 최악 ${fmtW(t.kWorst)} 통과 ${t.kPass.pass}/${t.kPass.n}`+
          ` | O 대비 개선 (페이드) ${t.improveFb?t.improveFb.map(x=>x.toFixed(4)).join('~'):'-'} m, (끝까지) ${t.improveAll?t.improveAll.map(x=>x.toFixed(4)).join('~'):'-'} m | 지지발-공 ${t.plantMin} · 차는발-공(접촉 전) ${t.kickMin} · 접촉 후 ${t.postBallMin} | 발바닥 최저 ${t.soleMin} | 끝 위치 ${t.rootEndMax} | 골반-선수 ${t.hipsDevMax} | 몸 초과 ${t.bodyExcess} · 페이드 후 ${t.afterExcess}`);
        for(const r of t.rows.filter(r=>r.fail||r.unmeasured))p(`     ${r.ok&&r.fail?'변동':r.unmeasured&&!r.fail&&!r.ok?'측정불가':'FAIL'} ${r.sc} · ${r.name}${r.extra?' [추가]':' [기존]'} (통과 ${r.ok}/${r.ok+r.fail+r.unmeasured}${r.unmeasured?', 측정불가 '+r.unmeasured:''}): ${JSON.stringify(r.values.slice(0,2)).slice(0,300)}`);}}};
  table(VN,'4. 변형별 판정 (장면별 통과 수는 반복 횟수 기준)');
  p('=== 5. 선택 ===');p('순위: '+ranking.map(r=>`${r.n}(공맞춤 ${r.kickOK?'ok':'X'}, 기존 실패 ${r.offF}, 변동 ${r.offV}, 페이드 판정 통과 ${r.fbp}/${r.fbn}, 최악 ${r.fbw}, 부작용 실패 ${r.addF}, 변동 ${r.addV}${r.all?', 전부 통과':''})`).join(' > '));
  p(`유망 (공 맞춤 ok, 기존 실패 R0 이하, 페이드 판정 개선): ${promising.join(', ')||'없음'}`);
  p(`모든 판정 통과: ${ranking.filter(r=>r.all).map(r=>r.n).join(', ')||'없음 — 통합 가능한 변형 없음'}`);
  // frames of the fade back for O, F, R0, R0n and every R (probe 1 and every running probe)
  const csv=[];for(const m of MODELS)for(const s of inst)for(const n of ['O','F',...VARS]){const r=rowsOf[`${m}|${n}|${s.id}`];if(!r)continue;
    for(let j=1;j<r.rows.length;j++){const x=r.rows[j],q=r.rows[j-1];if(x.t<r.backAt-5/60-1e-6)continue;const X=x.X||{};
      csv.push({model:m,variant:n,instance:s.id,t:x.t,tick:x.k,phase:x.t<r.backAt-1e-6?'kick':x.t<=r.backAt+0.25+1e-6?'fadeBack':'after',kickWeight:X.wKick??x.kickWeight,backWeight:X.wBack??'',prevWeight:X.wPrev??'',
        playerX:x.player[0],playerZ:x.player[1],plantAnkleX:x.lAnk[0],plantAnkleY:x.lAnk[1],plantAnkleZ:x.lAnk[2],plantSoleHeight:x.L.low,plantGrounded:x.L.low<LIM.grounded?1:0,plantSpeedMps:+(d2(x.lAnk,q.lAnk)*60).toFixed(3),
        kickAnkleX:x.rAnk[0],kickAnkleZ:x.rAnk[2],kickSoleHeight:x.R.low,kickSpeedMps:+(d2(x.rAnk,q.rAnk)*60).toFixed(3),hipsX:x.hips[0],hipsZ:x.hips[2],hipsStep:+d3(x.hips,q.hips).toFixed(4),chestStep:+d3(x.chest,q.chest).toFixed(4),
        offX:X.off?+X.off[0].toFixed(4):'',offZ:X.off?+X.off[1].toFixed(4):'',postX:X.post?+X.post[0].toFixed(4):'',postZ:X.post?+X.post[1].toFixed(4):'',lockX:x.lock[0],lockZ:x.lock[1],bodyX:x.dShift[0],bodyZ:x.dShift[1],holdX:X.fb?+X.fb[0].toFixed(4):'',holdZ:X.fb?+X.fb[1].toFixed(4):'',holdOn:X.fbOn?1:0,lift:x.lift,plantToBall:x.L.gap,kickToBall:x.R.gap});}}
  const keys=Object.keys(csv[0]||{});fs.writeFileSync(out('recovery143_frames.csv'),keys.join(',')+'\n'+csv.map(r=>keys.map(k=>typeof r[k]==='string'?`"${r[k]}"`:r[k]).join(',')).join('\n')+'\n');
  fs.writeFileSync(out('recovery143_gates.log'),gates.filter(g=>g.sec==='new').map(g=>`${g.ok?'ok  ':'FAIL'} [기존] ${g.model} ${g.scen} ${g.variant} · ${g.name}: 측정 ${JSON.stringify(g.value)} / 기준 ${JSON.stringify(g.limit)} / 이유: ${g.why}`).concat(extra.map(g=>`${g.unmeasured?'N/A ':g.ok?'ok  ':'FAIL'} [추가] ${g.model} ${g.scen} ${g.variant} · ${g.name}: 측정 ${JSON.stringify(g.value)} / 기준 ${JSON.stringify(g.limit)} / 이유: ${g.why}`)).join('\n')+'\n');
  const metrics={};for(const m of MODELS){metrics[m]={};for(const [n,byI] of Object.entries(results[m]||{})){metrics[m][n]={};for(const [id,X] of Object.entries(byI)){if(!X)continue;const c=Object.assign({},X.M);delete c.angles;metrics[m][n][id]=Object.assign({},X,{M:c});}}}
  const strip=Object.fromEntries(MODELS.map(m=>[m,Object.fromEntries(Object.entries(T[m]).map(([n,t])=>[n,Object.assign({},t,{rows:t.rows.map(r=>Object.assign({},r,{values:r.fail||r.unmeasured?r.values:undefined}))})]))]));
  fs.writeFileSync(out('recovery143_report.json'),JSON.stringify({repeats:REPEATS,variants:VARS,checks,noise,variability,touch,cause,Oref,tables:strip,ranking,promising,metrics,seconds:Math.round((Date.now()-t0)/1000)},null,1));
  const bad=checks.filter(c=>!c.ok);
  p(bad.length?`RECOVERY INCOMPLETE: 도구 확인 ${bad.length}건 실패 — 판정을 결과로 쓰지 말 것`:`RECOVERY COMPLETE: 도구 확인 ${checks.length}건 통과 · ${Math.round((Date.now()-t0)/1000)}초`);
  fs.writeFileSync(out('recovery143_report.txt'),L.join('\n')+'\n');
  process.exitCode=bad.length?2:0;
})();
