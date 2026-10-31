#!/usr/bin/env node
// Left and right kicks through the full visual step (applyPose + rigLife) with the kicking toe scaled by the leg's
// swing: in A.kick rigLife adds 0.5*swing rad to the kicking ankle (the left one when side < 0), in A.volley still a
// flat 0.5. anim_kick_sides.js checks the earlier rule (a flat +0.5 in the kick too) and its records, and is left as
// it was; this file checks the new rule and keeps its own records.
//
//   node ground-legends/tests/anim_kick_toe_swing.js          check: the checks below, then the records against
//                                                             anim_kick_toe_swing.json
//   node ground-legends/tests/anim_kick_toe_swing.js record   write anim_kick_toe_swing.json (only when the checks
//                                                             pass, and never over an existing file unless FORCE=1)
//   CANDIDATE=some.html node ...       check another file instead of the working index.html
//   REF=before.html node ...           the build before the change, for check R (default: the backup kept with the
//                                      experiment, prototypes/glb-viewer/player-animation/toe_swing_exp/backup/)
//
// What runs: 4 body types x sides 0, +1, -1 x speeds 0 and 6 m/s x two clocks ('smooth' visDt 1/60 as the game
// draws, 'raw' visDt 0.25 past rigLife's reset), 45 frames of A.kick each; and A.volley the same way, side 0.
// Checks that need no stored data:
//   S1  side +1 gives the same values as side 0 on every joint
//   S2  side -1 mirrors side 0 on the legs (thigh, knee, ankle: x swapped, z equal), as in anim_kick_sides.js
//   T   on 'raw' kick frames each ankle's rotation.x equals clamp((1-swing)*-(pelvis x + thigh x + knee x)*0.9 +
//       swing*0.45 + toe, -0.75, 1.0), swing = clamp((knee x - 0.45)/0.6, 0, 1), toe = 0.5*swing on the kicking
//       leg, 0 on the plant leg; on 'raw' volley frames the same with toe = 0.5 on the right leg. Compared exactly.
//   R   against REF: every value of every frame equal, except the kicking ankle's rotation.x in A.kick (the volley
//       equal everywhere). Skipped with a note when REF is not found.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const HERE=__dirname,GAME=path.join(HERE,'..','index.html'),OUT=path.join(HERE,'anim_kick_toe_swing.json');
const firstFile=(...c)=>c.find(f=>f&&fs.existsSync(f));
const pwPath=process.env.PLAYWRIGHT||firstFile('/opt/node22/lib/node_modules/playwright');
const { chromium }=require(pwPath||'playwright');
const THREE_JS=firstFile(process.env.THREE_JS,path.join(HERE,'node_modules/three/build/three.min.js'),
  '/tmp/claude-0/-home-user--/0b5a4a37-18af-51a6-8f0e-f8efcca46872/scratchpad/deps/node_modules/three/build/three.min.js');
if(!THREE_JS){console.error('three r128 three.min.js not found: set THREE_JS');process.exit(2);}
const CANDIDATE=process.env.CANDIDATE||GAME,mode=process.argv[2]||'check';
const REF=firstFile(process.env.REF,path.join(HERE,'..','prototypes','glb-viewer','player-animation','toe_swing_exp','backup','index.before_toe_swing.html'));
const INJECT=`window.__kickDbg={A,applyVisual,buildRig,teamMats,TEAMS,ball,setClock(g,v){gtime=g;visDt=v;}};\n`;
function prepare(src){const k=src.indexOf('window.__game={');if(k<0)throw new Error('anchor window.__game not found');return src.slice(0,k)+INJECT+src.slice(k);}

function collect(){
  const D=window.__kickDbg,TH=window.THREE;
  const RJ=['hips','torso','chest','neck','head','shL','shR','armL','armR','elbowL','elbowR','wristL','wristR','legL','legR','kneeL','kneeR','ankleL','ankleR'];
  const holder=new TH.Group(),mats=D.teamMats(D.TEAMS[0].home,D.TEAMS[0].gk);
  const PD=[
    {name:'Base Striker',short:'BS',label:'ST',num:9,st:{phy:70,pac:82},skin:'#e0ac85',hair:'#2b1d14',hs:0,boot:'#111111',h:1.0},
    {name:'Tall Stopper',short:'TS',label:'CB',num:4,st:{phy:88,pac:60},skin:'#9b6847',hair:'#16120f',hs:1,boot:'#f4f4f4',h:1.03},
    {name:'Quick Winger',short:'QW',label:'RW',num:7,st:{phy:55,pac:92},skin:'#f1c9a5',hair:'#d8b46a',hs:2,boot:'#ff3d7f',h:0.96},
    {name:'Base Keeper',short:'BK',label:'GK',num:1,st:{phy:75,pac:60},skin:'#c68b62',hair:'#5a3a22',hs:0,boot:'#111111',h:1.01,gk:true}];
  const read=r=>{const v=[r.hips.position.y];for(const j of RJ){const o=r[j].rotation;v.push(o.x,o.y,o.z);}return v;};
  const S=x=>Object.is(x,-0)?'-0':String(x);
  const hash=v=>{const s=v.map(S).join(',');let a=2166136261,b=5381;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);a=Math.imul(a^c,16777619);b=(Math.imul(b,33)^c)|0;}return (a>>>0).toString(16)+(b>>>0).toString(16)+':'+s.length;};
  const IX=n=>1+RJ.indexOf(n)*3;
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  D.ball.pos.set(3,0.11,2);
  const recs=[],seq={},toeBad=[];let toeN=0;
  const runs=[];for(let ri=0;ri<PD.length;ri++)for(const clock of ['smooth','raw'])for(const spd of [0,6]){
    for(const side of [0,1,-1])runs.push({anim:'kick',ri,clock,spd,side});runs.push({anim:'volley',ri,clock,spd,side:0});}
  for(const {anim,ri,clock,spd,side} of runs){
    const r=D.buildRig(mats,PD[ri],!!PD[ri].gk,{parent:holder}),p={team:0,isOfficial:false,stamina:70,rig:r},rows=[],aid=D.A[anim];
    for(let f=0;f<45;f++){const g=12+f/60;D.setClock(g,clock==='raw'?0.25:1/60);
      D.applyVisual(p,1,0,-2,0.4+f*0.01,aid,Math.min(f/60,0.9),0.3,spd,side);
      const v=read(r);rows.push(v);recs.push([`${anim==='kick'?'K':'V'}|${clock}|${ri}|${spd}|${side}|${f}`,hash(v)]);
      if(clock==='raw'){const tX=r.hips.rotation.x;
        for(const [L,K,An,w] of [[r.legL,r.kneeL,r.ankleL,0],[r.legR,r.kneeR,r.ankleR,1]]){
          const swing=clamp((K.rotation.x-0.45)/0.6,0,1),kicking=w===(side<0?0:1),toe=kicking?(anim==='kick'?0.5*swing:0.5):0;
          const exp=clamp((1-swing)*-(tX+L.rotation.x+K.rotation.x)*0.9+swing*0.45+toe,-0.75,1.0);toeN++;
          if(!Object.is(exp,An.rotation.x))toeBad.push({anim,ri,spd,side,f,leg:w?'R':'L',expected:exp,got:An.rotation.x});}}}
    seq[`${anim}|${clock}|${ri}|${spd}|${side}`]=rows;holder.remove(r.root);}
  const legs=[['legL','legR'],['kneeL','kneeR'],['ankleL','ankleR']],s1=[],s2=[];let s1n=0,s2n=0;
  for(const key of Object.keys(seq).filter(k=>k.startsWith('kick|')&&k.endsWith('|0'))){const base=key.slice(0,-2),R0=seq[key],R1=seq[base+'|1'],RL=seq[base+'|-1'];
    for(let f=0;f<45;f++){
      for(let i=0;i<R0[f].length;i++){s1n++;if(!Object.is(R0[f][i],R1[f][i])){s1.push({key:base,f,i});break;}}
      for(const [a,b] of legs){s2n+=4;
        if(!Object.is(RL[f][IX(a)],R0[f][IX(b)])||!Object.is(RL[f][IX(b)],R0[f][IX(a)]))s2.push({key:base,f,joint:a+'/'+b,axis:'x',left:[RL[f][IX(a)],RL[f][IX(b)]],right:[R0[f][IX(a)],R0[f][IX(b)]]});
        if(!Object.is(RL[f][IX(a)+2],R0[f][IX(a)+2])||!Object.is(RL[f][IX(b)+2],R0[f][IX(b)+2]))s2.push({key:base,f,joint:a+'/'+b,axis:'z'});}}}
  return {records:recs,seq,ankleIx:{L:IX('ankleL'),R:IX('ankleR')},checks:{S1:{compared:s1n,different:s1.length,first:s1.slice(0,3)},S2:{compared:s2n,different:s2.length,first:s2.slice(0,3)},
    T:{compared:toeN,different:toeBad.length,first:toeBad.slice(0,3)}}};
}

async function run(browser,src){
  const page=await browser.newPage({viewport:{width:640,height:360}});
  await page.addInitScript(()=>{try{localStorage.setItem('gl-tut-v1','1');}catch(e){}});
  const html='<!doctype html><html><head><meta charset="utf-8"></head><body>'+prepare(src)+'</body></html>',three=fs.readFileSync(THREE_JS,'utf8');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>{const u=r.request().url();
    if(u.startsWith('http://game.local'))return r.fulfill({body:html,contentType:'text/html'});
    if(u.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'});
    return r.abort();});
  await page.goto('http://game.local/');await page.waitForFunction(()=>window.__kickDbg&&window.__game,null,{timeout:30000});
  await page.evaluate(()=>{window.__freeze=true;});
  const res=await page.evaluate(collect);await page.close();res.errors=errors;return res;
}

(async()=>{
  const src=fs.readFileSync(CANDIDATE,'utf8'),srcHash=crypto.createHash('sha256').update(src).digest('hex');
  const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  try{
    const res=await run(browser,src),C=res.checks,errors=res.errors;
    let digest=2166136261;for(const [k,h] of res.records){const s=k+'='+h;for(let i=0;i<s.length;i++)digest=Math.imul(digest^s.charCodeAt(i),16777619);}digest=(digest>>>0).toString(16);
    console.log('source',path.relative(process.cwd(),CANDIDATE),'sha256',srcHash.slice(0,16));
    console.log('records',res.records.length,'(kick',res.records.filter(x=>x[0][0]==='K').length+', volley',res.records.filter(x=>x[0][0]==='V').length+') digest',digest);
    console.log('S1 side +1 = side 0, all joints:',C.S1.compared,'values,',C.S1.different,'different',C.S1.first.length?JSON.stringify(C.S1.first):'');
    console.log('S2 side -1 mirrors side 0 on the legs (x swapped, z equal):',C.S2.compared,'values,',C.S2.different,'different',C.S2.first.length?JSON.stringify(C.S2.first):'');
    console.log('T  ankle = rigLife formula, toe 0.5*swing on the kicking leg (kick), 0.5 (volley), raw frames:',C.T.compared,'ankles,',C.T.different,'different',C.T.first.length?JSON.stringify(C.T.first):'');
    // R: against the build before the change
    let refOk=true;
    if(REF){const ref=await run(browser,fs.readFileSync(REF,'utf8'));let n=0,ankle=0;const bad=[];
      for(const key of Object.keys(res.seq)){const A=res.seq[key],B=ref.seq[key],[anim,,,,side]=key.split('|'),kIx=res.ankleIx[+side<0?'L':'R'];
        for(let f=0;f<45;f++)for(let i=0;i<A[f].length;i++){n++;if(Object.is(A[f][i],B[f][i]))continue;
          if(anim==='kick'&&i===kIx){ankle++;continue;}bad.push({key,f,i,now:A[f][i],before:B[f][i]});}}
      refOk=!bad.length&&!ref.errors.length;
      console.log('R  vs',path.relative(process.cwd(),REF),'sha256',crypto.createHash('sha256').update(fs.readFileSync(REF)).digest('hex').slice(0,16)+':',n,'values,',ankle,'differ on the kicking ankle x (expected),',bad.length,'differ elsewhere',bad.length?JSON.stringify(bad.slice(0,3)):'');}
    else console.log('R  skipped: the build before the change was not found (set REF)');
    const checksOk=!C.S1.different&&!C.S2.different&&!C.T.different&&refOk&&!errors.length;
    if(errors.length)console.log('page errors:',errors.slice(0,5).join(' | '));
    if(mode==='record'){
      if(!checksOk){console.log('not recorded: the checks above must pass first');process.exitCode=1;return;}
      if(fs.existsSync(OUT)&&process.env.FORCE!=='1'){console.log('not recorded:',path.basename(OUT),'exists (FORCE=1 to replace it)');process.exitCode=1;return;}
      const map={};for(const [k,h] of res.records)map[k]=h;
      fs.writeFileSync(OUT,JSON.stringify({about:'anim_kick_toe_swing.js records: A.kick (sides 0/+1/-1) and A.volley through applyVisual',source:path.relative(path.join(HERE,'..','..'),CANDIDATE),sourceSha256:srcHash,
        recorded:new Date().toISOString(),count:res.records.length,digest,records:map},null,0)+'\n');
      console.log('recorded',path.basename(OUT),res.records.length,'records');return;}
    let stored='no stored records',recOk=true;
    if(fs.existsSync(OUT)){const base=JSON.parse(fs.readFileSync(OUT,'utf8'));let miss=0;const diff=[],seen=new Set();
      for(const [k,h] of res.records){seen.add(k);if(!(k in base.records))miss++;else if(base.records[k]!==h)diff.push(k);}
      const extra=Object.keys(base.records).filter(k=>!seen.has(k)).length;recOk=!miss&&!diff.length&&!extra;
      stored=`vs ${path.basename(OUT)} (source sha256 ${base.sourceSha256.slice(0,16)}): ${diff.length} different, ${miss} not stored, ${extra} stored but not produced`+(diff.length?' e.g. '+diff.slice(0,4).join(', '):'');}
    else recOk=false;
    console.log(stored);
    const ok=checksOk&&recOk;console.log(ok?'RESULT: PASS':'RESULT: FAIL');process.exitCode=ok?0:1;
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(2);});
