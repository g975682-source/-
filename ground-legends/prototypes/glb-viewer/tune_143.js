// 143_24 follow-up tuning on top of variant F (B+C+D of diag_143.js), prototype only.
//   Experiment A: when the plant lock starts - A1 the clip's landing (as F), A2 the tick the plant foot first touches the
//     ground in the shot itself, A3 one tick earlier, A4 one tick later (touch: the plant foot's lowest point comes down
//     to 2 cm, from above, before the contact; its height and speeds are recorded).
//   Experiment B (on the best of A): the body shift that aims the kick with the lock in force, at 50/75/100 %, complete
//     by the end of the fade-in (0.15 s), by the actual landing, or by the estimated contact.
//   Experiment C (on the best of A and B): the body speed limit on nothing, the hips (as F), the chest, or both.
// The best variant of an experiment: the kick must still meet the ball (contact gap, timing, direction pass on every
// shot), then the fewest failed gates, then the larger plant-to-ball distance, then the smaller body excess.
// Limits, game probe, measurements and gates are check_shot.js's own code, read from that file and run as they are.
// The running shots are probed 3 times (the game's dribble puts the ball a little differently each time); a gate that
// passes on some probes and fails on others is reported as varying, not as passed.
// Usage (from this folder): node tune_143.js        Outputs: out/tune143_* (nothing earlier is overwritten).
// Exit 0 when every harness check passed (the gate verdicts are results, failures expected); 2 otherwise.
const path=require('path'),fs=require('fs');
const P=require('../../tests/legacy/paths.js');
const {chromium}=require(P.PLAYWRIGHT);
// TUNE_REPEATS: how many game probes for the running shots (default 3); TUNE_TAG: a suffix for the output names
const DIR=__dirname,three=fs.readFileSync(P.THREE_JS,'utf8'),TAKE='143_24',MODELS=['Xbot.glb','Soldier.glb'],REPEATS=Math.max(1,+(process.env.TUNE_REPEATS||3)),TAG=process.env.TUNE_TAG||'';
const out=(...a)=>path.join(DIR,'out',...a.map(f=>f.replace(/^tune143_/,'tune143'+TAG+'_')));
const CS=fs.readFileSync(path.join(DIR,'check_shot.js'),'utf8').split('\n');
const block=(from,to)=>{const a=CS.findIndex(l=>l.startsWith(from)),b=CS.findIndex((l,k)=>k>a&&l.startsWith(to));if(a<0||b<0)throw new Error('check_shot.js block not found: '+from);return CS.slice(a,b).join('\n');};
const SRC=[block('const LIM={','const sleep='),block('// ---- the game, read only','// ---- in the page'),block('// ---- measurements from the ticks','// ---- screenshots of the shot')].join('\n');
const {LIM,probeGame,measure,gatesFor,gates}=new Function('require','path','fs','P',SRC+'\nreturn {LIM,probeGame,measure,gatesFor,gates,gate};')(require,path,fs,P);
const checks=[];const check=(model,name,ok,value,limit)=>checks.push({model,name,ok:!!ok,value,limit});
const extra=[];   // the added verdicts (split by foot / by body point, and the fade-back drift)
const xgate=(model,scen,variant,name,ok,value,limit,why)=>extra.push({model,scen,variant,name,ok:ok===true,unmeasured:ok===null,value,limit,why});
const LABEL={O:'보정 없음 (143_24 원래, 관절 비교 기준)',A1:'A 기존 고정 시작 (클립 착지)',A2:'B 실제 첫 착지 틱',A3:'C 실제 착지 - 1틱',A4:'D 실제 착지 + 1틱',
  Cnone:'상체 제한 없음',Chips:'골반 제한 (F와 같음)',Cchest:'가슴 제한',Cboth:'골반+가슴 제한'};
for(const s of [50,75,100])for(const [w,l] of [['f','페이드인 끝까지'],['l','실제 착지까지'],['c','추정 접촉까지']])LABEL[`B${s}${w}`]=`몸 이동 보정 ${s}% · ${l}`;

// ---- the page ----
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
  for(const f of ['shot_lab.js','diag_lab.js','tune_lab.js'])await page.addScriptTag({url:'http://viewer.local/'+f});
  const ref=await page.evaluate(async({m,TAKE})=>{
    const Vw=window.__viewer;if(!(await Vw.load('models/'+m)))return {failed:'model: '+document.querySelector('#status').textContent};
    const inf=await Vw.addBVH(`models/cmu_extra/${TAKE}.bvh`,{trim:true,before:0.6,after:0.5,name:TAKE+' 킥 (슛 실험)'});if(!inf)return {failed:'retarget: '+document.querySelector('#status').textContent};
    const i=Vw.inst[0],V=()=>new THREE.Vector3();
    const idle=Vw.animations.find(c=>/^idle$/i.test(c.name))||Vw.animations[0],run=Vw.animations.find(c=>/^run$/i.test(c.name))||idle;
    const times=d=>{const t=[];for(let k=0;k<=Math.round(d*60);k++)t.push(Math.min(d,k/60));return t;};
    // the references exactly as check_shot.js and diag_143.js compute them
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
    const toeLift=GLKick.liftHips(i,GLKick.fixToes(i,ip).clip).clip;
    {const pa=(f,a,b,c)=>{const p=(u,v)=>{const d=[v[0]-u[0],v[1]-u[1],v[2]-u[2]];return Math.atan2(d[1],Math.hypot(d[0],d[2]));};return (p(b,c)-p(a,b))*180/Math.PI;};
      const own2=[];i.mixer.stopAllAction();const g=GLShot.rig(i);const at=t=>{const mx=i.mixer;mx.stopAllAction();const a=mx.clipAction(raw);a.reset();a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.play();a.time=t;mx.update(0);i.root.updateWorldMatrix(true,false);i.root.updateMatrixWorld(true);
        const J=n=>GLShot.joint(g,n).toArray();return {L:pa(0,J('LeftFoot'),J('LeftToeBase'),J('LeftToe_End')),R:pa(0,J('RightFoot'),J('RightToeBase'),J('RightToe_End'))};};
      for(const t of T)own2.push(at(t));i.mixer.stopAllAction();
      const st=s=>Math.max(...own2.slice(1).map((o,j)=>Math.abs(o[s]-own2[j][s])));
      ref.toeOwn={L:[+Math.min(...own2.map(o=>o.L)).toFixed(1),+Math.max(...own2.map(o=>o.L)).toFixed(1)],R:[+Math.min(...own2.map(o=>o.R)).toFixed(1),+Math.max(...own2.map(o=>o.R)).toFixed(1)],stepL:+st('L').toFixed(2),stepR:+st('R').toFixed(2)};}
    const ramp=(t,a,b)=>{const x=(t-a)/Math.max(1e-6,b-a);return x<=0?0:x>=1?1:x*x*(3-2*x);};
    const fit=(clip,ballZ)=>GLKick.contact(i,clip,tc,'Right',ballZ);
    // a shot of one spec on one game probe; spec: {clip:'ip'|'ipTH', lockFrom: s|null, post:{scale,end}|null,
    // clamp, body:'none'|'hips'|'chest'|'both', sim:'tune'|'diag'|'shot'}. With a lock, two passes (as F): the first
    // without the aim, the second with the aim (scale x the first pass's lock shift at the contact, ramped to `end`).
    const SIM={tune:(c)=>GLTune.sim(i,c),diag:(c)=>GLDiag.sim(i,c),shot:(c)=>GLShot.sim(i,c)};
    window.__T={i,ip,toeLift,idle,run,ref,tc,plant,ramp,fit,SIM,
      shot(sc,spec){
        const tC=sc.lastOwned,tPl=tC-(tc-plant),backAt=sc.followEnd!=null?sc.followEnd:tC+0.3,game=sc.rows.map(r=>({x:r.x,z:r.z,yaw:r.yaw,ball:r.ball}));
        const bz=sc.ballAtContact,bx=sc.ballLatAtContact,clip=spec.clip==='ipTH'?toeLift:ip,f0=fit(clip,bz),off=[f0.offset[0]+bx,f0.offset[1]];
        const pStep=k=>{const a=game[Math.max(0,k-1)],b=game[Math.min(game.length-1,k)];return Math.hypot(b.x-a.x,b.z-a.z);};
        const body={none:[],hips:['Hips'],chest:['Spine2'],both:['Hips','Spine2']}[spec.body||'none'];
        const mk=aim=>{const c={prev:sc.running?run:idle,back:idle,xfIn:0.15,xfOut:0.25,backAt,tEnd:backAt+0.25+0.3,game,sub:{from:tC-0.1,to:tC+0.1},kick:clip,kickStart:0,t0:tc-tC,
            off:(t,kt,wk)=>{const s=ramp(t,0,tPl);return [wk*s*off[0],wk*s*off[1]];},groundClamp:!!spec.clamp,
            lock:spec.lockFrom!=null?{from:spec.lockFrom,to:backAt}:null,
            post:aim?(t,kt,wk)=>{const s=ramp(t,0,aim.end);return [wk*s*aim.v[0],wk*s*aim.v[1]];}:null};
          if(body.length){const L=k=>0.97*Math.max(ref.capHipsStep,pStep(k)+ref.ipBodyStep);c.bodyLimit=L;
            if(spec.sim==='diag'){if(body.length!==1||body[0]!=='Hips')throw new Error('diag sim limits the hips only');}else c.bodyPoints=body;}
          return c;};
        const run1=SIM[spec.sim||'tune'];let pass1Lock=null,cfg;
        if(spec.lockFrom!=null){const p1=run1(mk(null)),rc=p1.rows.find(r=>Math.abs(r.t-tC)<1e-6)||p1.rows[Math.round(tC*60)];pass1Lock=rc.lock;
          const sc_=spec.post?spec.post.scale:1,end=spec.post&&spec.post.end!=null?spec.post.end:tPl;cfg=mk({v:[-rc.lock[0]*sc_,-rc.lock[1]*sc_],end});}
        else cfg=mk(null);
        const r=run1(cfg);return {rows:r.rows,subs:r.subs,infeasible:r.infeasible||0,pass1Lock,tC,tPl,backAt,ballLeaves:sc.ballLeaves};}};
    return ref;},{m,TAKE});
  return {browser,page,ref,errors};
}
// run specs on instances in the page: [{inst, name, spec}] -> results (rows kept in Node)
async function runSpecs(M,jobs){const res=[];for(const j of jobs){const r=await M.page.evaluate(({sc,spec})=>window.__T.shot(sc,spec),{sc:j.inst,spec:j.spec});res.push(Object.assign({name:j.name,inst:j.inst.id,base:j.inst.base,probe:j.inst.probe,spec:j.spec},r));}return res;}

// ---- measuring a result: check_shot.js's measure and gates, the added split verdicts, and the diagnosis fields ----
const d2=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]),d3=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
function analyse(m,r,ref,baseOf){
  const S={tC:r.tC,tPl:r.tPl,backAt:r.backAt,ballLeaves:r.ballLeaves},Vv={rows:r.rows,subs:r.subs,kickStart:0};
  let M;try{M=measure(S,Vv,ref);}catch(e){check(m,`${r.inst} ${r.name}: measured`,false,e.message,'measured');return null;}
  gatesFor(m,TAKE,r.inst,r.name,M,ref,baseOf?{[r.name]:Object.assign({name:'O'},baseOf)}:{});
  const f=r.rows,ks=0,xfIn=0.15,back=r.backAt,dt=1/60;
  // the body speed split by point, with the gate's own per-tick limit (same formula as check_shot.js's measure)
  const pStep=j=>Math.hypot(f[j].player[0]-f[j-1].player[0],f[j].player[1]-f[j-1].player[1]);
  const over=(key,a,b,own,cap)=>{let w={excess:-Infinity};for(let j=1;j<f.length;j++){if(!(f[j].t>a+1e-6&&f[j].t<=b+1e-6))continue;const L=Math.max(cap,pStep(j)+own),s=d3(f[j][key],f[j-1][key]);if(s-L>w.excess)w={excess:+(s-L).toFixed(4),step:+s.toFixed(4),limit:+L.toFixed(4),at:f[j].t};}return w;};
  const sp={};for(const key of ['hips','chest'])sp[key]={fadeIn:over(key,ks,ks+xfIn+dt,ref.ipBodyStep,ref.capHipsStep),kick:over(key,ks+xfIn+dt,back,ref.ipBodyStep,ref.capHipsStep),fadeBack:over(key,back,back+0.25+dt,ref.ipBodyStep,ref.capHipsStep)};
  const official=Math.max(M.speed.fadeInBody.excess,M.speed.fadeBackBody.excess,M.speed.kickBody.excess),split=Math.max(...['hips','chest'].flatMap(k=>['fadeIn','kick','fadeBack'].map(w=>sp[k][w].excess)));
  check(m,`${r.inst} ${r.name}: split body speed = check_shot.js's`,Math.abs(official-split)<=1e-4,{official,split},'equal');
  // the plant foot on the ground in the fade back: largest move from its first grounded tick there
  const fb=f.filter(x=>x.t>=back-1e-6&&x.t<=back+0.25+1e-6&&x.L.low<LIM.grounded);const fbDrift=fb.length?Math.max(...fb.map(x=>d2(x.lAnk,fb[0].lAnk))):null;
  let fbSlide=0;for(let j=1;j<f.length;j++){const a=f[j],b=f[j-1];if(a.t<back-1e-6||a.t>back+0.25+1e-6)continue;if(a.L.low<LIM.grounded&&b.L.low<LIM.grounded)fbSlide=Math.max(fbSlide,d2(a.lAnk,b.lAnk)*60);}
  // the plant foot against the ball with the kick in only (the earlier clip's pose at the press left out)
  const kin=f.filter(x=>x.kickWeight>0&&x.t<=r.tC+1e-6),w=kin.reduce((a,b)=>b.L.gap<a.L.gap?b:a,kin[0]);
  const kk=f.filter(x=>x.kickWeight>0&&x.t<=(M.tEff??r.tC)-dt+1e-6),wk_=kk.length?kk.reduce((a,b)=>b.R.gap<a.R.gap?b:a):null;
  const X={M,sp,fbDrift:fbDrift==null?null:+fbDrift.toFixed(4),fbSlide:+fbSlide.toFixed(3),plantKickIn:{gap:w.L.gap,at:w.t},kickKickIn:wk_?{gap:wk_.R.gap,at:wk_.t}:null,infeasible:r.infeasible,pass1Lock:r.pass1Lock};
  // the added verdicts (limits from check_shot.js; the fade-back drift uses the plant drift limit on that window)
  const sc=r.inst,v=r.name;
  xgate(m,sc,v,'plant foot not in the ball',M.plantInBall>=LIM.inBall,M.plantInBall,'>= -0.03 m','"no foot inside the ball", the plant foot alone');
  xgate(m,sc,v,'kicking foot not in the ball before the contact',M.kickInBallBefore>=LIM.inBall,M.kickInBallBefore,'>= -0.03 m','"no foot inside the ball", the kicking foot alone');
  for(const k of ['hips','chest'])xgate(m,sc,v,`${k==='hips'?'hips':'chest'} speed`,['fadeIn','kick','fadeBack'].every(x=>sp[k][x].excess<=1e-6),sp[k],'max(captured hips step, player step + in-place body step) per tick','the body speed gates, this point alone');
  xgate(m,sc,v,'plant drift in the fade back',fbDrift==null?null:fbDrift<=ref.ownDrift+0.001,{drift:X.fbDrift,slideMps:X.fbSlide},+(ref.ownDrift+0.001).toFixed(4),'the plant drift limit (the take\'s own +1 mm) over the fade back, while the plant foot is on the ground; no grounded tick there = not measured');
  return X;
}
// the touch: the plant foot's lowest point comes down to the stance height (2 cm) from above, the last time before
// the contact with the kick in; heights and speeds around it from the same ticks
function touchOf(rows,tC){let k=null;for(let j=1;j<rows.length;j++){const a=rows[j],b=rows[j-1];if(a.t>tC+1e-6)break;if(a.kickWeight>0&&a.L.low<LIM.grounded&&b.L.low>=LIM.grounded)k=j;}
  if(k==null)return null;const a=rows[k],b=rows[k-1];
  return {tick:a.k,t:a.t,height:a.L.low,heightBefore:b.L.low,downSpeed:+((b.L.low-a.L.low)*60).toFixed(3),slideSpeed:+(d2(a.lAnk,b.lAnk)*60).toFixed(3),slideNext:rows[k+1]?+(d2(rows[k+1].lAnk,a.lAnk)*60).toFixed(3):null};}

(async()=>{
  const t0=Date.now();
  // the game, probed REPEATS times: standing shots from the first probe (they do not move), straight running from all
  const probes=[];for(let k=0;k<REPEATS;k++){const g=await probeGame();if(g.errors.length)check('game',`probe ${k+1} without page errors`,false,g.errors.slice(0,3),'none');probes.push(g);}
  const inst=[];for(let k=0;k<REPEATS;k++)for(const s of probes[k].scenarios){if(/angled/.test(s.name))continue;if(!s.running&&k>0)continue;inst.push(Object.assign({},s,{id:s.name+' #'+(k+1),base:s.name,probe:k+1}));}
  const variability=probes.map((g,k)=>g.scenarios.filter(s=>!/angled/.test(s.name)).map(s=>({probe:k+1,name:s.name,ballAtContact:s.ballAtContact,aimDeg:s.aimDeg})));
  check('game','instances: 3 standing + 3 x 3 straight running',inst.length===3+3*REPEATS,inst.length,3+3*REPEATS);
  const prior=fs.existsSync(out('shot_lab_cmp4_summary.json'))?JSON.parse(fs.readFileSync(out('shot_lab_cmp4_summary.json'),'utf8')):null;
  const diagPrior={};for(const m of MODELS){const f=out(`diag143_${m.replace(/\W/g,'_')}.json`);if(fs.existsSync(f))diagPrior[m]=JSON.parse(fs.readFileSync(f,'utf8')).report;}
  const MS={};await Promise.all(MODELS.map(async m=>{MS[m]=await openModel(m);}));
  for(const m of MODELS){const R=MS[m];if(R.ref.failed){check(m,'model and take load',false,R.ref.failed,'loaded');continue;}
    const pr=prior&&prior.models[m]&&prior.models[m].takes[TAKE].ref;for(const k of ['tc','plant','capHipsStep','ipBodyStep','kickToeStep','ownDrift','sinkLimit'])check(m,`reference ${k} = check_shot.js`,pr&&Math.abs(R.ref[k]-pr[k])<=1e-4,{here:R.ref[k],checkShot:pr?pr[k]:null},'|diff| <= 0.0001');}
  if(checks.some(c=>!c.ok)){console.log('STOP',checks.filter(c=>!c.ok));process.exitCode=2;for(const m of MODELS)await MS[m].browser.close();return;}
  const all={};const runAll=async(jobsOf)=>{const res={};await Promise.all(MODELS.map(async m=>{res[m]=await runSpecs(MS[m],jobsOf(m));}));return res;};
  const F=lock=>({clip:'ip',lockFrom:lock,clamp:true,body:'hips'});
  // 0. the base runs: no correction (the joint-angle reference), the touch detection (F without the lock: the heights
  //    are the same as F's, the lock only shifts the model sideways), and the harness checks on probe 1
  const base=await runAll(m=>inst.flatMap(s=>[{inst:s,name:'O',spec:{clip:'ip',lockFrom:null,clamp:false,body:'none'}},{inst:s,name:'detect',spec:{clip:'ip',lockFrom:null,clamp:true,body:'hips'}}]));
  const touch={},O={};
  for(const m of MODELS){touch[m]={};O[m]={};for(const r of base[m]){if(r.name==='detect')touch[m][r.inst]=touchOf(r.rows,r.tC);if(r.name==='O')O[m][r.inst]=r;}
    for(const s of inst)check(m,`${s.id}: plant touch found`,!!touch[m][s.id],touch[m][s.id],'found');}
  const val=await runAll(m=>inst.filter(s=>s.probe===1).flatMap(s=>{const fs_=MS[m].ref;return [
    {inst:s,name:'shot1',spec:{clip:'ipTH',lockFrom:s.lastOwned-(fs_.tc-fs_.plant),clamp:true,body:'none',sim:'shot'}},{inst:s,name:'shot2',spec:{clip:'ipTH',lockFrom:s.lastOwned-(fs_.tc-fs_.plant),clamp:true,body:'none',sim:'shot'}},
    {inst:s,name:'diagF1',spec:Object.assign(F(s.lastOwned-(fs_.tc-fs_.plant)),{sim:'diag'})},{inst:s,name:'diagF2',spec:Object.assign(F(s.lastOwned-(fs_.tc-fs_.plant)),{sim:'diag'})},{inst:s,name:'tuneF',spec:F(s.lastOwned-(fs_.tc-fs_.plant))}];}));
  const cmpRows=(A,B)=>{let w=0;if(A.rows.length!==B.rows.length||A.subs.length!==B.subs.length)return Infinity;for(let j=0;j<A.rows.length;j++){const x=A.rows[j],y=B.rows[j];for(const k of ['root','hips','chest','lAnk','rToe'])for(let c=0;c<3;c++)w=Math.max(w,Math.abs(x[k][c]-y[k][c]));w=Math.max(w,Math.abs(x.L.gap-y.L.gap),Math.abs(x.R.gap-y.R.gap),Math.abs(x.L.low-y.L.low));}return w;};
  for(const m of MODELS)for(const s of inst.filter(s=>s.probe===1)){const by=n=>val[m].find(r=>r.inst===s.id&&r.name===n);
    const noise=Math.max(cmpRows(by('shot1'),by('shot2')),cmpRows(by('diagF1'),by('diagF2')));
    check(m,`${s.id}: GLTune.sim (hips) = GLDiag.sim F`,cmpRows(by('tuneF'),by('diagF1'))<=Math.max(1e-9,noise)+1e-12,{tuneVsDiag:cmpRows(by('tuneF'),by('diagF1')),simNoise:noise},'no more than a sim against itself');
    // the standing F of this run against diag_143.js's F (the standing shot does not depend on the dribble)
    const dp=diagPrior[m]&&diagPrior[m].scen[s.base]&&diagPrior[m].scen[s.base].variants.F;
    if(!s.running){const x=measure({tC:by('tuneF').tC,tPl:by('tuneF').tPl,backAt:by('tuneF').backAt,ballLeaves:by('tuneF').ballLeaves},{rows:by('tuneF').rows,subs:by('tuneF').subs,kickStart:0},MS[m].ref);
      const d=dp?{hipsDev:Math.abs(x.hipsDev.max-dp.hipsDev.max),gap:Math.abs(x.gapAtContact-dp.gapAtContact),footDir:Math.abs(x.footDeg-dp.footDeg),sole:Math.abs(x.sole.all-dp.sole.all),drift:Math.abs(x.plantDrift-dp.plantDrift)}:null;
      check(m,`${s.id}: F reproduces diag_143.js`,d&&d.hipsDev<=0.002&&d.gap<=0.002&&d.footDir<=0.5&&d.sole<=0.002&&d.drift<=0.002,d,'<= 2 mm, foot direction <= 0.5°');}}
  // ---- the experiments ----
  const results={},tuneRows={};
  const runExp=async(names,specOf)=>{const res=await runAll(m=>inst.flatMap(s=>names.map(n=>({inst:s,name:n,spec:specOf(m,s,n)})).filter(j=>j.spec)));
    for(const m of MODELS)for(const r of res[m]){results[m]=results[m]||{};const X=analyse(m,r,MS[m].ref,O[m][r.inst]?analyse_O(m,r.inst):null);(results[m][r.name]=results[m][r.name]||{})[r.inst]=X;tuneRows[`${m}|${r.name}|${r.inst}`]=r;}
    // a spec that could not be built (no touch found) is not measured, and says so
    for(const m of MODELS)for(const s of inst)for(const n of names)if(!specOf(m,s,n))check(m,`${s.id} ${n}: could be run`,false,'no plant touch','touch found');};
  const Ocache={};function analyse_O(m,id){const k=m+'|'+id;if(!Ocache[k]){const r=O[m][id];const S={tC:r.tC,tPl:r.tPl,backAt:r.backAt,ballLeaves:r.ballLeaves};Ocache[k]=measure(S,{rows:r.rows,subs:r.subs,kickStart:0},MS[m].ref);}return Ocache[k];}
  const clipPl=(m,s)=>s.lastOwned-(MS[m].ref.tc-MS[m].ref.plant);
  const lockAt=(m,s,which)=>{if(which==='clip')return clipPl(m,s);const t=touch[m][s.id];if(!t)return null;return t.t+(which==='touch-1'?-1/60:which==='touch+1'?1/60:0);};
  // A
  const A={A1:'clip',A2:'touch',A3:'touch-1',A4:'touch+1'};
  await runExp(Object.keys(A),(m,s,n)=>{const l=lockAt(m,s,A[n]);return l==null?null:F(l);});
  // the verdict over the repeats: ok on every probe, FAIL on every probe, or varying
  const summarise=(names)=>{const T={};for(const m of MODELS){T[m]={};for(const n of names){const gs=gates.filter(g=>g.sec==='new'&&g.model===m&&g.variant===n),xs=extra.filter(g=>g.model===m&&g.variant===n);
      const by={};for(const g of gs.concat(xs.map(x=>Object.assign({},x,{extra:true})))){const sc=g.scen.replace(/ #\d+$/,''),key=sc+'|'+g.name+(g.extra?'|x':'');(by[key]=by[key]||{sc,name:g.name,extra:!!g.extra,ok:0,fail:0,unmeasured:0,values:[]});const b=by[key];if(g.unmeasured)b.unmeasured++;else if(g.ok)b.ok++;else b.fail++;b.values.push(g.value);}
      const rows=Object.values(by),official=rows.filter(r=>!r.extra),added=rows.filter(r=>r.extra);
      const cnt=list=>({gates:list.length,fail:list.filter(r=>r.fail&&!r.ok&&!r.unmeasured).length,varying:list.filter(r=>r.fail&&r.ok).length,unmeasured:list.filter(r=>r.unmeasured).length});
      const kickOK=official.filter(r=>['contact gap','timing','direction'].includes(r.name)).every(r=>r.fail===0&&r.unmeasured===0);
      const X=Object.values(results[m][n]||{});
      T[m][n]={official:cnt(official),added:cnt(added),kickOK,plantMin:X.length?Math.min(...X.map(x=>x.M.plantInBall)):null,plantKickInMin:X.length?Math.min(...X.map(x=>x.plantKickIn.gap)):null,
        bodyExcess:X.length?Math.max(...X.map(x=>Math.max(...['hips','chest'].flatMap(k=>['fadeIn','kick','fadeBack'].map(w=>x.sp[k][w].excess))))):null,rows};}}return T;};
  const pick=(T,names)=>{const sc=n=>{let fail=0,vary=0,ok=true,pm=Infinity,be=-Infinity;for(const m of MODELS){const t=T[m][n];fail+=t.official.fail+t.added.fail+t.official.unmeasured+t.added.unmeasured;vary+=t.official.varying+t.added.varying;ok=ok&&t.kickOK;pm=Math.min(pm,t.plantKickInMin);be=Math.max(be,t.bodyExcess);}return {n,ok,fail,vary,pm,be};};
    const s=names.map(sc).sort((a,b)=>(b.ok-a.ok)||(a.fail+a.vary-(b.fail+b.vary))||(b.pm-a.pm)||(a.be-b.be));return {best:s[0].n,ranking:s};};
  const TA=summarise(Object.keys(A)),PA=pick(TA,Object.keys(A));
  // B: the aim's amount and when it is complete, on the best lock start
  const lockBest=A[PA.best],Bn=[];for(const s_ of [50,75,100])for(const w of ['f','l','c'])Bn.push(`B${s_}${w}`);
  await runExp(Bn,(m,s,n)=>{const l=lockAt(m,s,lockBest);if(l==null)return null;const scale=+n.match(/\d+/)[0]/100,w=n.slice(-1),t=touch[m][s.id];
    const end=w==='f'?0.15:w==='l'?(t?t.t:null):s.lastOwned;if(end==null)return null;return Object.assign(F(l),{post:{scale,end}});});
  const TB=summarise(Bn),PB=pick(TB,Bn);
  // C: the body speed limit, on the best of A and B
  const bestB=PB.best,bScale=+bestB.match(/\d+/)[0]/100,bW=bestB.slice(-1),Cn=['Cnone','Chips','Cchest','Cboth'];
  await runExp(Cn,(m,s,n)=>{const l=lockAt(m,s,lockBest);const t=touch[m][s.id];if(l==null)return null;const end=bW==='f'?0.15:bW==='l'?(t?t.t:null):s.lastOwned;if(end==null)return null;
    return {clip:'ip',lockFrom:l,clamp:true,body:{Cnone:'none',Chips:'hips',Cchest:'chest',Cboth:'both'}[n],post:{scale:bScale,end}};});
  const TC=summarise(Cn),PC=pick(TC,Cn);
  for(const m of MODELS)await MS[m].browser.close();
  // ---- outputs ----
  const L=[];const p=s=>{L.push(s);console.log(s);};
  p('=== 1. 도구 자체 확인 (애니메이션 판정과 별개) ===');for(const c of checks)if(!c.ok)p(`FAIL ${c.model} ${c.name}: ${JSON.stringify(c.value)} (${JSON.stringify(c.limit)})`);
  p(`도구 확인 ${checks.length}건 중 실패 ${checks.filter(c=>!c.ok).length}건`);
  p('=== 2. 실행마다 달라지는 게임 값 (공 위치·공 방향; 발 방향과 별개) ===');for(const v of variability.flat())p(`probe ${v.probe} ${v.name}: 접촉 때 공 거리 ${v.ballAtContact} m, 공 방향 ${v.aimDeg}°`);
  p('=== 2b. 보정 없는 원래 클립(O)의 복귀 페이드 지지발 이동 (판정 아님) ===');for(const m of MODELS)for(const s of inst){const r=O[m][s.id],fb=r.rows.filter(x=>x.t>=r.backAt-1e-6&&x.t<=r.backAt+0.25+1e-6&&x.L.low<LIM.grounded);let sl=0;for(let j=1;j<r.rows.length;j++){const a=r.rows[j],b=r.rows[j-1];if(a.t<r.backAt-1e-6||a.t>r.backAt+0.25+1e-6)continue;if(a.L.low<LIM.grounded&&b.L.low<LIM.grounded)sl=Math.max(sl,d2(a.lAnk,b.lAnk)*60);}
    p(`${m} ${s.id}: 이동 ${fb.length?Math.max(...fb.map(x=>d2(x.lAnk,fb[0].lAnk))).toFixed(4):'접지 없음'} m, 미끄럼 ${sl.toFixed(3)} m/s`);}
  p('=== 3. 실제 착지 틱 (F에서 고정을 뺀 장면, 발 최저점 2 cm 도달) ===');for(const m of MODELS)for(const s of inst){const t=touch[m][s.id],cl=clipPl(m,s);p(`${m} ${s.id}: 클립 착지 ${cl.toFixed(4)} s (고정 시작 틱 ${Math.ceil(cl*60-1e-6)}) · 실제 첫 착지 ${t?`틱 ${t.tick} (${t.t} s), 높이 ${t.heightBefore}→${t.height} m, 내려오는 속도 ${t.downSpeed} m/s, 수평 ${t.slideSpeed} → 다음 틱 ${t.slideNext} m/s`:'없음'}`);}
  const table=(T,names,title,P)=>{p(`=== ${title} (선택: ${P.best}) ===`);for(const m of MODELS){p(`-- ${m}`);
      for(const n of names){const t=T[m][n],X=Object.values(results[m][n]||{});const mx=(f)=>X.length?Math.max(...X.map(f)):null,mn=(f)=>X.length?Math.min(...X.map(f)):null;
        p(`${n} ${LABEL[n]} | 기존 게이트 실패 ${t.official.fail}+변동 ${t.official.varying}+측정불가 ${t.official.unmeasured} / ${t.official.gates} | 추가 판정 실패 ${t.added.fail}+변동 ${t.added.varying}+측정불가 ${t.added.unmeasured} / ${t.added.gates} | 공 맞춤 ${t.kickOK?'ok':'FAIL'}`+
          ` | 지지발-공 최소 ${mn(x=>x.M.plantInBall)?.toFixed(4)} (킥 들어온 뒤 ${mn(x=>x.plantKickIn.gap)?.toFixed(4)}) | 접촉 간격 최대 ${mx(x=>Math.abs(x.M.gapAtContact))?.toFixed(4)} | 접촉 시점 오차 최대 ${mx(x=>x.M.timingErr==null?Infinity:Math.abs(x.M.timingErr))} | 발 방향 오차 최대 ${mx(x=>Math.abs(x.M.dirErr))}° | 골반-선수 최대 ${mx(x=>x.M.hipsDev.max)?.toFixed(3)} | 골반 초과 ${mx(x=>Math.max(x.sp.hips.fadeIn.excess,x.sp.hips.kick.excess,x.sp.hips.fadeBack.excess))?.toFixed(4)} | 가슴 초과 ${mx(x=>Math.max(x.sp.chest.fadeIn.excess,x.sp.chest.kick.excess,x.sp.chest.fadeBack.excess))?.toFixed(4)} | 복귀 페이드 지지발 이동 ${mx(x=>x.fbDrift??Infinity)?.toFixed(4)} m, 미끄럼 ${mx(x=>x.fbSlide)} m/s | 발바닥 최저 ${mn(x=>x.M.sole.all)?.toFixed(4)} | 차는발-공 (킥 들어온 뒤, 접촉 전) ${mn(x=>x.kickKickIn?x.kickKickIn.gap:Infinity)?.toFixed(4)}`);
        const bad=t.rows.filter(r=>r.fail||r.unmeasured);for(const r of bad)p(`     ${r.ok&&r.fail?'변동':r.unmeasured?'측정불가':'FAIL'} ${r.sc} · ${r.name}${r.extra?' (추가)':''} (${r.ok} 통과/${r.fail} 실패${r.unmeasured?'/'+r.unmeasured+' 측정불가':''}): ${JSON.stringify(r.values.slice(0,3))}`);}}
    p('순위: '+P.ranking.map(r=>`${r.n}(공맞춤 ${r.ok?'ok':'X'}, 실패 ${r.fail}, 변동 ${r.vary}, 지지발-공 ${r.pm.toFixed(4)}, 몸 초과 ${r.be.toFixed(4)})`).join(' > '));};
  table(TA,Object.keys(A),'실험 A — 지지발 고정 시작 시점',PA);table(TB,Bn,`실험 B — 몸 이동 보정량과 시점 (고정 시작: ${lockBest})`,PB);table(TC,Cn,`실험 C — 상체 이동 제한 (${PA.best} + ${PB.best})`,PC);
  // frames of F (A1) and of the final choice, for the record
  const csv=[];for(const key of Object.keys(tuneRows)){const [m,n,id]=key.split('|');if(n!=='A1'&&n!==PC.best)continue;const r=tuneRows[key];
    for(let j=0;j<r.rows.length;j++){const x=r.rows[j],q=r.rows[j-1];csv.push({model:m,variant:n,instance:id,t:x.t,playerX:x.player[0],playerZ:x.player[1],playerYawDeg:+(x.yaw*180/Math.PI).toFixed(2),hipsX:x.hips[0],hipsY:x.hips[1],hipsZ:x.hips[2],pelvisYawDeg:+(x.pelvisYaw*180/Math.PI).toFixed(2),
      chestX:x.chest[0],chestY:x.chest[1],chestZ:x.chest[2],kickAnkleX:x.rAnk[0],kickAnkleZ:x.rAnk[2],plantAnkleX:x.lAnk[0],plantAnkleY:x.lAnk[1],plantAnkleZ:x.lAnk[2],ballX:x.ball[0],ballY:x.ball[1],ballZ:x.ball[2],ballRadius:0.11,plantToBall:x.L.gap,kickToBall:x.R.gap,plantSoleHeight:x.L.low,
      plantSlideMps:q?+(d2(x.lAnk,q.lAnk)*60).toFixed(3):0,hipsStep:q?+d3(x.hips,q.hips).toFixed(4):0,chestStep:q?+d3(x.chest,q.chest).toFixed(4):0,kickWeight:x.kickWeight,lockX:x.lock[0],lockZ:x.lock[1],bodyShiftX:x.dShift[0],bodyShiftZ:x.dShift[1],lift:x.lift});}}
  const keys=Object.keys(csv[0]||{});fs.writeFileSync(out('tune143_frames.csv'),keys.join(',')+'\n'+csv.map(r=>keys.map(k=>typeof r[k]==='string'?`"${r[k]}"`:r[k]).join(',')).join('\n')+'\n');
  fs.writeFileSync(out('tune143_gates.log'),gates.map(g=>`${g.ok?'ok  ':'FAIL'} [기존] ${g.model} ${g.scen} ${g.variant} · ${g.name}: 측정 ${JSON.stringify(g.value)} / 기준 ${JSON.stringify(g.limit)} / 이유: ${g.why}`).concat(extra.map(g=>`${g.unmeasured?'N/A ':g.ok?'ok  ':'FAIL'} [추가] ${g.model} ${g.scen} ${g.variant} · ${g.name}: 측정 ${JSON.stringify(g.value)} / 기준 ${JSON.stringify(g.limit)} / 이유: ${g.why}`)).join('\n')+'\n');
  const strip=T=>Object.fromEntries(Object.entries(T).map(([m,v])=>[m,Object.fromEntries(Object.entries(v).map(([n,t])=>[n,Object.assign({},t,{rows:t.rows.filter(r=>r.fail||r.unmeasured)})]))]));
  const metrics={};for(const m of MODELS){metrics[m]={};for(const [n,byI] of Object.entries(results[m]||{})){metrics[m][n]={};for(const [id,X] of Object.entries(byI)){const c=Object.assign({},X.M);delete c.angles;metrics[m][n][id]=Object.assign({},X,{M:c});}}}
  fs.writeFileSync(out('tune143_report.json'),JSON.stringify({checks,variability,touch,pick:{A:PA,B:PB,C:PC},tables:{A:strip(TA),B:strip(TB),C:strip(TC)},metrics,seconds:Math.round((Date.now()-t0)/1000)},null,1));
  const bad=checks.filter(c=>!c.ok);
  p(bad.length?`TUNE INCOMPLETE: 도구 확인 ${bad.length}건 실패 — 판정을 결과로 쓰지 말 것`:`TUNE COMPLETE: 도구 확인 ${checks.length}건 통과 · ${Math.round((Date.now()-t0)/60000)}분`);
  fs.writeFileSync(out('tune143_report.txt'),L.join('\n')+'\n');
  process.exitCode=bad.length?2:0;
})();
