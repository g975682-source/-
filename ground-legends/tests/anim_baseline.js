#!/usr/bin/env node
// Animation baseline for Ground Legends: records what the player rig does in every animation state and every
// skill move, and checks a changed index.html against it value by value.
//
//   node ground-legends/tests/anim_baseline.js record    write anim_baseline.json from index.html at BASE_REF (default HEAD)
//   node ground-legends/tests/anim_baseline.js compare   working index.html vs BASE_REF, exact, and vs anim_baseline.json
//   CANDIDATE=some.html node ... compare                  compare another file instead of the working index.html
//
// What is recorded (all on rigs built in a detached group, so the running game is not touched):
//   A. applyPose for the 20 states (A.*) over a grid of time, phase, speed and side, on four body types
//   B. applyPose for the 49 skill moves (A.skill, side = ±(id+1)) over their whole duration, both sides
//   C. the full visual step applyVisual (applyPose + rigLife) run frame by frame for each state and skill
// Every record is the rotation of the 19 rig joints plus the hip height. Values are compared exactly (-0 included).
// Debug access is injected at load time (window.__poseDbg), so index.html needs no test hook.
//
// env: THREE_JS  path to three r128 three.min.js   PLAYWRIGHT  path to the playwright module   BASE_REF  git ref
const fs=require('fs'),path=require('path'),cp=require('child_process'),os=require('os');
const HERE=__dirname,GAME=path.join(HERE,'..','index.html'),OUT=path.join(HERE,'anim_baseline.json');
const firstFile=(...c)=>c.find(f=>f&&fs.existsSync(f));
const pwPath=process.env.PLAYWRIGHT||firstFile('/opt/node22/lib/node_modules/playwright');
const { chromium }=require(pwPath||'playwright');
const THREE_JS=firstFile(process.env.THREE_JS,path.join(HERE,'node_modules/three/build/three.min.js'),
  '/tmp/claude-0/-home-user--/0b5a4a37-18af-51a6-8f0e-f8efcca46872/scratchpad/deps/node_modules/three/build/three.min.js');
if(!THREE_JS){console.error('three r128 three.min.js not found: set THREE_JS');process.exit(2);}
const BASE_REF=process.env.BASE_REF||'HEAD',CANDIDATE=process.env.CANDIDATE||GAME;
const mode=process.argv[2]||'compare';

function baseSource(){return cp.execSync(`git show ${BASE_REF}:ground-legends/index.html`,{cwd:path.join(HERE,'..'),maxBuffer:64<<20}).toString('utf8');}
// expose internals for the test only, right before the game's own test hooks
const INJECT=`window.__poseDbg={A,SKILLS,applyPose,rigLife,applyVisual,buildRig,teamMats,TEAMS,ball,
  setClock(g,v){gtime=g;visDt=v;},
  poseValues:typeof poseValues==='function'?poseValues:null,applyPoseValues:typeof applyPoseValues==='function'?applyPoseValues:null};\n`;
function prepare(src){const k=src.indexOf('window.__game={');if(k<0)throw new Error('anchor window.__game not found');return src.slice(0,k)+INJECT+src.slice(k);}

async function openPage(browser,src){
  const page=await browser.newPage({viewport:{width:640,height:360}});
  await page.addInitScript(()=>{try{localStorage.setItem('gl-tut-v1','1');}catch(e){}});
  const html='<!doctype html><html><head><meta charset="utf-8"></head><body>'+prepare(src)+'</body></html>',three=fs.readFileSync(THREE_JS,'utf8');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>{const u=r.request().url();
    if(u.startsWith('http://game.local'))return r.fulfill({body:html,contentType:'text/html'});
    if(u.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'});
    return r.abort();});
  await page.goto('http://game.local/');await page.waitForFunction(()=>window.__poseDbg&&window.__game,null,{timeout:30000});
  await page.evaluate(()=>{window.__freeze=true;});
  return {page,errors};
}

// runs in the page: builds the rigs and every record; returns [key, hash] pairs (values stay in the page for diagnosis)
function collect(){
  const D=window.__poseDbg,{A,SKILLS}=D,TH=window.THREE;
  const RJ=['hips','torso','chest','neck','head','shL','shR','armL','armR','elbowL','elbowR','wristL','wristR','legL','legR','kneeL','kneeR','ankleL','ankleR'];
  const holder=new TH.Group(),mats=D.teamMats(D.TEAMS[0].home,D.TEAMS[0].gk);
  const PD=[
    {name:'Base Striker',short:'BS',label:'ST',num:9,st:{phy:70,pac:82},skin:'#e0ac85',hair:'#2b1d14',hs:0,boot:'#111111',h:1.0},
    {name:'Tall Stopper',short:'TS',label:'CB',num:4,st:{phy:88,pac:60},skin:'#9b6847',hair:'#16120f',hs:1,boot:'#f4f4f4',h:1.03},
    {name:'Quick Winger',short:'QW',label:'RW',num:7,st:{phy:55,pac:92},skin:'#f1c9a5',hair:'#d8b46a',hs:2,boot:'#ff3d7f',h:0.96},
    {name:'Base Keeper',short:'BK',label:'GK',num:1,st:{phy:75,pac:60},skin:'#c68b62',hair:'#5a3a22',hs:0,boot:'#111111',h:1.01,gk:true}];
  const rigs=PD.map(pd=>D.buildRig(mats,pd,!!pd.gk,{parent:holder}));
  const read=r=>{const v=[r.hips.position.y];for(const j of RJ){const o=r[j].rotation;v.push(o.x,o.y,o.z);}return v;};
  const reset=r=>{for(const j of RJ)r[j].rotation.set(0,0,0);r.hips.position.y=0;};
  const S=x=>Object.is(x,-0)?'-0':String(x);
  const hash=v=>{const s=v.map(S).join(',');let a=2166136261,b=5381;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);a=Math.imul(a^c,16777619);b=(Math.imul(b,33)^c)|0;}return (a>>>0).toString(16)+(b>>>0).toString(16)+':'+s.length;};
  const out=[],vals=new Map();const put=(k,v)=>{out.push([k,hash(v)]);vals.set(k,v);};
  const names=Object.keys(A);
  // A: the 20 states
  const TS=[0,0.03,0.08,0.15,0.22,0.3,0.4,0.5,0.62,0.75,1.0,1.7,3.3],PH=[0,0.9,2.6,4.7],SP=[0,3,7,10.5],SD=[-1,0,1];
  for(const nm of names)for(let ri=0;ri<rigs.length;ri++)for(const t of TS)for(const ph of PH)for(const sp of SP)for(const sd of SD){
    const r=rigs[ri];reset(r);D.applyPose(r,A[nm],t,ph,sp,sd);put(`A|${nm}|${ri}|${t}|${ph}|${sp}|${sd}`,read(r));}
  // B: the 49 skill moves, both sides, through the move
  for(let id=0;id<SKILLS.length;id++)for(const ri of [0,2])for(const s of [1,-1])for(let k=0;k<=20;k++)for(const sp of [0,4,8])for(const ph of [0,2.4]){
    const r=rigs[ri],t=SKILLS[id].dur*k/20;reset(r);D.applyPose(r,A.skill,t,ph,sp,s*(id+1));put(`B|${SKILLS[id].k}|${ri}|${s}|${k}|${sp}|${ph}`,read(r));}
  // C: applyPose + rigLife frame by frame, as the game draws them
  D.ball.pos.set(3,0.11,2);
  const run=(label,ri,aid,side,dur,spd,still)=>{const r=PD[ri].gk?D.buildRig(mats,PD[ri],true,{parent:holder}):D.buildRig(mats,PD[ri],false,{parent:holder});
    const p={team:0,isOfficial:false,stamina:70,rig:r};let ph=0.3;
    for(let f=0;f<45;f++){const g=12+f/60;D.setClock(g,1/60);ph+=(spd*1.2+(spd>0.3?1.5:0))/60;
      const t=still?g:Math.min(f/60,dur);D.applyVisual(p,1,0,-2,0.4+f*0.01,aid,t,ph,spd,side);
      if(f===10||f===25||f===44)put(`C|${label}|${ri}|${f}`,read(r));}
    holder.remove(r.root);};
  for(const nm of names)for(const ri of [0,3])run(nm,ri,A[nm],nm==='dive'||nm==='volley'?1:0,0.9,nm==='run'||nm==='celeb'?7:nm==='skill'?5:0,nm==='run'||nm==='celeb'||nm==='idle'||nm==='gkready');
  for(let id=0;id<SKILLS.length;id++)for(const s of [1,-1])run('skill:'+SKILLS[id].k+(s>0?'+':'-'),0,A.skill,s*(id+1),SKILLS[id].dur,5,false);
  window.__poseVals=vals;
  // the split itself (when the build has it): the values computed must be exactly what lands on the rig
  let split=null;
  if(D.poseValues&&D.applyPoseValues){split={checked:0,bad:0,first:null};const r=rigs[0];
    for(const nm of names)for(const t of TS)for(const ph of PH)for(const sp of SP)for(const sd of SD){
      reset(r);D.applyPose(r,A[nm],t,ph,sp,sd);const a=read(r);reset(r);const pv=Object.assign({},D.poseValues(r,A[nm],t,ph,sp,sd,{}));D.applyPoseValues(r,pv);const b=read(r);
      split.checked++;if(a.some((x,i)=>!Object.is(x,b[i]))){split.bad++;if(!split.first)split.first=[nm,t,ph,sp,sd];}}}
  return {records:out,split,counts:{A:out.filter(x=>x[0][0]==='A').length,B:out.filter(x=>x[0][0]==='B').length,C:out.filter(x=>x[0][0]==='C').length},states:names.length,skills:SKILLS.length};
}
function digest(records,prefix){let a=2166136261;for(const [k,h] of records){if(prefix&&!k.startsWith(prefix))continue;const s=k+'='+h;for(let i=0;i<s.length;i++)a=Math.imul(a^s.charCodeAt(i),16777619);}return (a>>>0).toString(16);}
function summarize(res){
  const groups={};for(const [k] of res.records){const p=k.split('|'),g=p[0]+'|'+p[1];groups[g]=1;}
  const per={};for(const g of Object.keys(groups))per[g]=digest(res.records,g+'|');
  return {counts:res.counts,states:res.states,skills:res.skills,all:digest(res.records),per};
}

(async()=>{
  const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  try{
    if(mode==='record'){
      const src=baseSource(),{page,errors}=await openPage(browser,src);const res=await page.evaluate(collect);
      const sum=summarize(res);sum.ref=cp.execSync(`git rev-parse --short ${BASE_REF}`,{cwd:HERE}).toString().trim();sum.recorded=new Date().toISOString();
      fs.writeFileSync(OUT,JSON.stringify(sum,null,1)+'\n');
      console.log('recorded',OUT,'from',BASE_REF,sum.ref,JSON.stringify(sum.counts),'states',sum.states,'skills',sum.skills,'digest',sum.all);
      if(errors.length)console.log('page errors:',errors.slice(0,5).join(' | '));
      return;}
    // compare: the committed version and the working file side by side
    const A=await openPage(browser,baseSource()),B=await openPage(browser,fs.readFileSync(CANDIDATE,'utf8'));
    const ra=await A.page.evaluate(collect),rb=await B.page.evaluate(collect);
    const mb=new Map(rb.records);let missing=0,diff=[];
    for(const [k,h] of ra.records){if(!mb.has(k)){missing++;continue;}if(mb.get(k)!==h)diff.push(k);}
    const extra=rb.records.length-(ra.records.length-missing);
    console.log('records base',ra.records.length,'working',rb.records.length,JSON.stringify(rb.counts),'states',rb.states,'skills',rb.skills);
    console.log('exact mismatches',diff.length,'missing',missing,'extra',extra);
    if(diff.length){const byG={};for(const k of diff){const g=k.split('|').slice(0,2).join('|');byG[g]=(byG[g]||0)+1;}console.log('mismatching groups',JSON.stringify(byG));
      for(const k of diff.slice(0,5)){const va=await A.page.evaluate(k=>window.__poseVals.get(k),k),vb=await B.page.evaluate(k=>window.__poseVals.get(k),k);
        let m=0,at=-1;va.forEach((x,i)=>{const d=Math.abs(x-vb[i]);if(d>m||!Object.is(x,vb[i])&&at<0){m=Math.max(m,d);at=i;}});console.log('  ',k,'max |Δ|',m,'first index',at);}}
    if(rb.split)console.log('split check (poseValues → applyPoseValues equals applyPose):',rb.split.checked,'checked,',rb.split.bad,'different',rb.split.first?JSON.stringify(rb.split.first):'');
    else console.log('split check: working build has no poseValues/applyPoseValues');
    if(fs.existsSync(OUT)){const base=JSON.parse(fs.readFileSync(OUT,'utf8')),sb=summarize(rb);
      const bad=Object.keys(base.per).filter(g=>base.per[g]!==sb.per[g]);
      console.log('vs anim_baseline.json (ref',base.ref+'):',base.all===sb.all?'identical':'DIFFERENT in '+bad.length+' groups '+bad.slice(0,8).join(', '));}
    const errs=[...A.errors,...B.errors];if(errs.length)console.log('page errors:',errs.slice(0,5).join(' | '));
    const ok=!diff.length&&!missing&&!extra&&(!rb.split||!rb.split.bad)&&!errs.length;
    console.log(ok?'RESULT: PASS':'RESULT: FAIL');process.exitCode=ok?0:1;
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(2);});
