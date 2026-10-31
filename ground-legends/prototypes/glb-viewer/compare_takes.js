// Compares CMU kick takes with 11_01 (prototype only; check_kick.js, check_shot.js and shot_lab.js are used as they are).
// 1. The source BVH of every take: which foot kicks, the phases (kicking foot off the ground, backswing top, plant foot
//    down, fastest toe, the estimated contact, kicking foot down again), where the kicking toe and the plant foot are
//    against the pelvis, how far the plant foot moves, the run-up. The source has no ball: the contact is an estimate
//    (the bottom of the kicking toe's arc near its fastest frame, as in check_kick.js and check_shot.js).
// 2. check_shot.js with the candidates (--takes/--take-dir/--tag): the same game probe, rigs, ball, frame, variants and
//    gates as the 11_01 run, which runs again inside the same process as the reference.
// 3. Tables per model: every candidate against 11_01, metric by metric (better / worse / same), and the failed gates.
// Usage (from this folder): node compare_takes.js [--reuse]   (--reuse: skip step 2 and read its last tagged output)
// Takes: models/cmu_extra/<take>.bvh (local, not in git; CMU licence, see README). Outputs: out/cmp4_*.
const path=require('path'),fs=require('fs'),cp=require('child_process'),crypto=require('crypto');
const P=require('../../tests/legacy/paths.js');
const DIR=__dirname,TAG='cmp4',REF='11_01',CANDS=['74_03','74_05','74_06','143_24'];
const SHA={'74_03':'1fc940453860b15de51a6841a461d6ccd02b9edd7a5db07442de2a04fe13443c','74_05':'df5d35499a12d9449918702ec1001ee5da79670a913469cd5aa2fb29b55ff222',
  '74_06':'c86f3f81550c56af20a586efdc81ff75372f6554c37f6dcc230cbf16a2e49223','143_24':'a2a1fd3f140a991f24a539c986d6a2ea72572a213da8134e500cf280edf22860'};
const file=tk=>tk===REF?path.join(DIR,'models/cmu',tk+'.bvh'):path.join(DIR,'models/cmu_extra',tk+'.bvh');
const out=(...a)=>path.join(DIR,'out',...a);
const problems=[];   // anything that did not run or does not match: the report says so, nothing counts as passed

// ---- 1. the source takes ----
function sourcePhases(tk){
  global.window=global;global.THREE=global.THREE||require(P.THREE_JS);
  if(!global.GLRetarget)for(const f of ['vendor/BVHLoader.js','retarget.js'])eval.call(global,fs.readFileSync(path.join(DIR,f),'utf8'));
  const bvh=GLRetarget.parseBVH(fs.readFileSync(file(tk),'utf8'),tk),k=GLRetarget.findKick(bvh);
  const g=new THREE.Group(),clip=bvh.clip.clone();for(const t of clip.tracks)t.name=t.name.replace(/^\.bones\[([^\]]+)\]/,'$1');
  g.add(bvh.skeleton.bones[0]);const mx=new THREE.AnimationMixer(g),a=mx.clipAction(clip);a.play();
  const by=n=>bvh.skeleton.bones.find(b=>b.name===n),V=()=>new THREE.Vector3();
  const names=['Hips','LeftUpLeg','RightUpLeg','LeftFoot','RightFoot','LeftToeBase','RightToeBase'];
  const at=t=>{a.time=Math.max(0,Math.min(clip.duration,t));mx.update(0);g.updateMatrixWorld(true);const o={t};for(const n of names)o[n]=by(n).getWorldPosition(V());return o;};
  const f0=at(0),leg=f0.Hips.y-Math.min(f0.LeftFoot.y,f0.RightFoot.y),S=0.95/leg;   // metres at a 0.95 m leg (about Xbot's)
  const dt=1/120,F=[];for(let t=0;t<=clip.duration+1e-9;t+=dt)F.push(at(t));
  const low=(f,s)=>Math.min(f[s+'Foot'].y,f[s+'ToeBase'].y),lows=F.map(f=>Math.min(low(f,'Left'),low(f,'Right'))).sort((x,y)=>x-y),floor=lows[Math.floor(lows.length*0.1)];
  const K=k.foot==='left'?'Left':'Right',Pl=K==='Left'?'Right':'Left',down=(f,s)=>(low(f,s)-floor)*S<=0.03;   // a foot on the ground: its lowest joint within 3 cm of the floor
  const idx=t=>Math.max(0,Math.min(F.length-1,Math.round(t/dt)));
  const toeV=j=>{const p=F[Math.max(0,j-1)][K+'ToeBase'],q=F[Math.min(F.length-1,j+1)][K+'ToeBase'];return q.clone().sub(p).multiplyScalar(S/(2*dt));};
  // the estimated contact: the kicking toe's lowest point within -0.03..+0.145 s of its fastest frame
  let jc=idx(k.time),lo=Infinity;for(let j=idx(k.time-0.03);j<=idx(k.time+0.145);j++)if(F[j][K+'ToeBase'].y<lo){lo=F[j][K+'ToeBase'].y;jc=j;}
  const st=s=>F.map(f=>down(f,s));const kD=st(K),pD=st(Pl);
  let lift=null;for(let j=jc;j>0;j--)if(!kD[j]&&kD[j-1]){lift=j;break;}   // kicking foot leaves the ground before the contact
  let land=null;for(let j=jc;j>0;j--)if(pD[j]&&!pD[j-1]){land=j;break;}   // plant foot comes down before the contact
  let touch=null;for(let j=jc+6;j<F.length;j++)if(kD[j]){touch=j;break;}   // kicking foot down again after the contact
  let top=lift;if(lift!=null)for(let j=lift;j<=jc;j++)if(F[j][K+'Foot'].y>F[top][K+'Foot'].y)top=j;
  const fc=F[jc],lr=fc.LeftUpLeg.clone().sub(fc.RightUpLeg).setY(0).normalize(),vel=toeV(jc),hv=vel.clone().setY(0);
  const fwd=V().crossVectors(lr,V().set(0,1,0)).negate();if(fwd.dot(hv)<0)fwd.negate();
  const side=K==='Right'?-1:1;   // + = towards the kicking foot's side
  const rel=p=>{const d=p.clone().sub(fc.Hips);return {side:+(d.dot(lr)*side*S).toFixed(3),fwd:+(d.dot(fwd)*S).toFixed(3),height:+((p.y-floor)*S).toFixed(3)};};
  const hor=(p,q)=>Math.hypot(p.x-q.x,p.z-q.z)*S;
  const plantMove=(a0,b0)=>{let m=0;if(a0==null)return null;for(let j=a0;j<=Math.min(F.length-1,b0);j++)m=Math.max(m,hor(F[j][Pl+'Foot'],F[a0][Pl+'Foot']));return +m.toFixed(3);};
  const hipsSpeed=(t0,t1)=>{const p=F[idx(t0)].Hips,q=F[idx(t1)].Hips;return +(hor(p,q)/Math.max(1e-6,t1-t0)).toFixed(2);};
  // kicks in the take: toe-speed peaks over 8 m/s at least 0.5 s apart
  const sp=F.map((_,j)=>toeV(j).length());const peaks=[];for(let j=1;j<F.length-1;j++)if(sp[j]>8&&sp[j]>=sp[j-1]&&sp[j]>=sp[j+1]&&!peaks.some(q=>Math.abs(q-j)*dt<0.5))peaks.push(j);
  const tt=j=>j==null?null:+(j*dt).toFixed(3),travelNet=hor(F[F.length-1].Hips,F[0].Hips),travelMax=Math.max(...F.map(f=>hor(f.Hips,F[0].Hips)));
  const dirDeg=Math.atan2(hv.clone().normalize().dot(lr),hv.clone().normalize().dot(fwd))*180/Math.PI*-side;   // + = across the body
  const r={take:tk,frames:bvh.clip.tracks[0].times.length,duration:+clip.duration.toFixed(2),foot:k.foot,kicksInTake:peaks.length,
    phases:{kickFootOff:tt(lift),backswingTop:tt(top),plantDown:tt(land),fastestToe:+k.time.toFixed(3),contactEstimate:tt(jc),kickFootDownAgain:tt(touch)},
    atContactEstimate:{kickToe:rel(fc[K+'ToeBase']),plantFoot:rel(fc[Pl+'Foot']),toeSpeed:+vel.length().toFixed(1),toeTravelDegAcross:+dirDeg.toFixed(1),toeTravelUpDeg:+(Math.atan2(vel.y,hv.length())*180/Math.PI).toFixed(1)},
    plantFootMoved:{landingToContactPlus01:plantMove(land,jc+12),aroundContact01:plantMove(idx(jc*dt-0.1),jc+12)},
    runUp:{hipsSpeedBeforeContact:hipsSpeed(Math.max(0,jc*dt-0.6),Math.max(0,jc*dt-0.1)),hipsSpeedAfterContact:hipsSpeed(jc*dt,Math.min(clip.duration,jc*dt+0.4)),travelToContact:+hor(fc.Hips,F[0].Hips).toFixed(2),travelNet:+travelNet.toFixed(2),travelMax:+travelMax.toFixed(2),rootMotion:travelNet>0.1||travelMax>0.25},
    // a kick, as far as the joints tell: one fast forward swing of the toe near the ground (no ball to confirm it)
    looksLikeGroundKick:vel.length()>5&&Math.abs(dirDeg)<45&&rel(fc[K+'ToeBase']).height<0.3};
  return r;
}

// ---- 3. tables ----
const better=(a,b,tol)=>a==null||b==null?'?':Math.abs(a)<Math.abs(b)-tol?'▲':Math.abs(a)>Math.abs(b)+tol?'▼':'=';
function tables(sum,gl){
  const G=gl.split('\n').filter(Boolean).map(l=>{const m=l.match(/^(ok  |FAIL) \[(\w+)\] (\S+(?: vs \S+)?) (\S+) (.+?) (\S+) · (.+?): 측정 (.*) \/ 기준 (.*) \/ 이유: (.*)$/);return m&&{ok:m[1]==='ok  ',sec:m[2],model:m[3],take:m[4],scen:m[5],variant:m[6],name:m[7],value:m[8],limit:m[9],why:m[10]};}).filter(Boolean);
  const kinds=[['standing','정지','F+THC'],['running straight','곧은 달리기','F+THC'],['running angled','비스듬한 달리기','F+THC+Y']];
  const res={},md=[];
  for(const [m,M] of Object.entries(sum.models)){res[m]={};md.push(`### ${m}`);
    for(const [kind,label,v] of kinds){const sn=kind+' D 0.2 s';
      md.push(`\n**${label}** (변형 ${v}, D 0.2 s 값; 실패 수는 D 0.1/0.2/0.3 s 합, ▲ 11_01보다 나음 / ▼ 나쁨 / = 같음)\n`);
      md.push('| 테이크 | 공-발 최소 거리 | 접촉 추정 위치 오차 | 발 방향 오차 | 골반-선수 최대 (≤0.354) | 지지발 드리프트 / 최대 미끄럼 속도 | 발바닥 최저 | 페이드 몸 / 발 초과 | 실패 | 실패한 검사 |');
      md.push('|---|---|---|---|---|---|---|---|---|---|');
      const ref=M.takes[REF]&&M.takes[REF].scen[sn]&&M.takes[REF].scen[sn].variants[v];
      for(const tk of [REF,...CANDS]){const T=M.takes[tk];const x=T&&T.scen&&T.scen[sn]&&T.scen[sn].variants[v];
        if(!x){md.push(`| ${tk} | 미완료 | | | | | | | | 결과 없음 |`);problems.push(`${m} ${tk} ${sn} ${v}: no result`);continue;}
        const gs=G.filter(g=>g.sec==='new'&&g.model===m&&g.take===tk&&g.variant===v&&g.scen.startsWith(kind+' D'));
        if(gs.length!==48)problems.push(`${m} ${tk} ${kind} ${v}: ${gs.length} gates (48 expected)`);
        const failed=gs.filter(g=>!g.ok),names=[...new Set(failed.map(g=>g.name))];
        const sp=x.speed,fb=Math.max(sp.fadeInBody.excess,sp.fadeBackBody.excess),ff=Math.max(sp.fadeInFeet.excess,sp.fadeBackFeet.excess);
        const c=(val,rv,tol)=>tk===REF?'':' '+better(val,rv,tol);
        // the fades: how far past the limits (body and feet together; 0 when within)
        const over=y=>Math.max(0,y.speed.fadeInBody.excess,y.speed.fadeBackBody.excess)+Math.max(0,y.speed.fadeInFeet.excess,y.speed.fadeBackFeet.excess);
        const nRef=res[m][REF]&&res[m][REF][kind]?res[m][REF][kind].failed:null;
        const row={closestGap:x.closestGap,gapAtContact:x.gapAtContact,dirErr:x.dirErr,timingErr:x.timingErr,hipsDevMax:x.hipsDev.max,plantDrift:x.plantDrift,slideMax:x.slideMax,soleMin:x.sole.all,fadeBody:fb,fadeFeet:ff,failed:failed.length,gates:gs.length,failedNames:names};
        res[m][tk]=res[m][tk]||{};res[m][tk][kind]=row;
        const r=ref||x;
        md.push(`| ${tk} | ${x.closestGap.toFixed(3)} m${c(x.closestGap,r.closestGap,0.005)} | ${x.gapAtContact.toFixed(3)} m${c(x.gapAtContact,r.gapAtContact,0.005)} | ${x.dirErr}°${c(x.dirErr,r.dirErr,1)} | ${x.hipsDev.max.toFixed(2)} m${c(x.hipsDev.max,r.hipsDev.max,0.01)} | ${x.plantDrift.toFixed(3)} m / ${x.slideMax} m/s${c(x.slideMax,r.slideMax,0.05)} | ${x.sole.all.toFixed(3)} m${c(Math.min(0,x.sole.all),Math.min(0,r.sole.all),0.001)} | ${fb>=0?'+':''}${fb.toFixed(3)} / ${ff>=0?'+':''}${ff.toFixed(3)}${c(over(x),over(r),0.002)} | ${failed.length}/${gs.length}${tk===REF||nRef==null?'':' '+(failed.length<nRef?'▲':failed.length>nRef?'▼':'=')} | ${names.join(', ')||'없음'} |`);}}
    md.push('');}
  return {res,md:md.join('\n'),G};
}

(async()=>{
  // files present and the ones fetched for this comparison unchanged
  for(const tk of [REF,...CANDS]){if(!fs.existsSync(file(tk))){problems.push(`missing ${file(tk)}`);continue;}
    if(SHA[tk]){const h=crypto.createHash('sha256').update(fs.readFileSync(file(tk))).digest('hex');if(h!==SHA[tk])problems.push(`${tk}: sha256 ${h} (expected ${SHA[tk]})`);}}
  if(problems.length){console.log('STOP',problems);process.exitCode=2;return;}
  const src={};for(const tk of [REF,...CANDS]){try{src[tk]=sourcePhases(tk);}catch(e){problems.push(`${tk} source analysis: ${e.message}`);}}
  fs.writeFileSync(out(`${TAG}_source.json`),JSON.stringify(src,null,1));
  console.log('=== 원본 BVH (공 없음: 접촉 시점은 추정치) ===');for(const s of Object.values(src))console.log(JSON.stringify(s));
  // 2. the shot tests, same code and limits as the 11_01 run, outputs tagged
  const t0=Date.now();
  if(!process.argv.includes('--reuse')){
    const r=cp.spawnSync(process.execPath,['check_shot.js','--no-existing','--takes',CANDS.join(','),'--take-dir',path.join(DIR,'models/cmu_extra'),'--tag',TAG],{cwd:DIR,encoding:'utf8',maxBuffer:1<<30});
    fs.writeFileSync(out(`${TAG}_check_shot.log`),r.stdout+r.stderr+`\nexit ${r.status}\n`);
    // exit 1 only means that some gate failed; a crash has no closing line
    if(!/SHOT CHECK (PASS|FAIL)/.test(r.stdout))problems.push(`check_shot.js did not finish (exit ${r.status}): ${(r.stderr||'').split('\n').slice(-6).join(' | ')}`);}
  const sf=out(`shot_lab_${TAG}_summary.json`),gf=out(`shot_lab_${TAG}_gates.log`);
  if(!fs.existsSync(sf)||!fs.existsSync(gf)){problems.push('tagged summary or gates missing');console.log('STOP',problems);process.exitCode=2;return;}
  if(!process.argv.includes('--reuse')&&fs.statSync(sf).mtimeMs<t0)problems.push('tagged summary older than this run (not written by it)');
  const sum=JSON.parse(fs.readFileSync(sf,'utf8')),T=tables(sum,fs.readFileSync(gf,'utf8'));
  // the screenshots check_shot.js took for the candidates (press, plant, contact, follow-through, back; front and side)
  const shots=fs.readdirSync(out()).filter(f=>f.startsWith(`lab_${TAG}_`)&&f.endsWith('.png'));
  for(const m of Object.keys(sum.models))for(const tk of CANDS)for(const sc of ['standing_D_0_2_s','running_straight_D_0_2_s'])for(const s of ['1_press','2_plant','3_contact','4_follow','5_back'])for(const v of ['front','side']){
    const n=`lab_${TAG}_${m.replace(/\W/g,'_')}_${tk}_${sc}_FTHC_${s}_${v}.png`;if(!shots.includes(n))problems.push('missing screenshot '+n);}
  fs.writeFileSync(out(`${TAG}_compare.json`),JSON.stringify({source:src,shot:T.res,problems,screenshots:shots.length},null,1));
  fs.writeFileSync(out(`${TAG}_tables.md`),T.md+'\n');
  console.log('=== 같은 조건 비교 (check_shot.js 게이트, 기준 변경 없음) ===');console.log(T.md);
  console.log('screenshots',shots.length);
  console.log(problems.length?'COMPARE INCOMPLETE: '+problems.join(' ; '):'COMPARE COMPLETE (모든 테이크·모델·시나리오 결과와 스크린샷 있음)');
  process.exitCode=problems.length?2:0;
})();
