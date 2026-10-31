// Headless check of CMU BVH kicks retargeted onto the GLB models (Playwright + SwiftShader, as check.js).
// For each model and each BVH in models/cmu/: retarget the kick window, play it in place on the model, and measure
// feet against the ground, hips and chest movement, knees bending the wrong way, the strike (foot, time, toe position,
// direction), the start and end against idle, and the jump per frame when crossfading from idle and back.
// Usage (from this folder): node check_bvh.js [model.glb ...]   (default: Xbot.glb Soldier.glb)
// Exit 1 when a model or BVH fails to load or retarget, a clip holds a non-number, a clip does not move, the strike time
// or a strike coordinate is not valid, or the page logs an error. Quality limits (below) do not change the exit code:
// each clip is listed as usable or with its defects. The gated look at one kick (11_01) is check_kick.js.
// Limits of this survey: the strike is the fastest toe frame (not the contact), the ball distance is from the toe joint
// to an assumed ball centre, foot sliding is not measured, and its foot height compares soles with source joints.
const path=require('path'),fs=require('fs');
const P=require('../../tests/legacy/paths.js');
const {chromium}=require(P.PLAYWRIGHT);
const DIR=__dirname,three=fs.readFileSync(P.THREE_JS,'utf8');
const models=process.argv.slice(2).length?process.argv.slice(2):['Xbot.glb','Soldier.glb'];
const bvhs=fs.existsSync(path.join(DIR,'models/cmu'))?fs.readdirSync(path.join(DIR,'models/cmu')).filter(f=>/\.bvh$/i.test(f)).sort():[];
// what counts as a visible defect (metres, degrees, per 1/60 s frame)
const LIMIT={soleSunk:-0.03,extraFloat:0.04,hipsAway:0.35,chestTilt:60,strikeOffForward:35,frameJump:0.15,seam:0.25};
const BALL=0.5;   // the game keeps a carried ball 0.5 m ahead of a standing player (more when running)
// what each take is, from Shriinivas/cmubvh Sequence-010-014/{10,11}/README.md (CMU's own descriptions)
const DESC={'10_01':'soccer - kick ball','10_02':'soccer - kick ball','10_03':'soccer - kick ball','10_04':'walk','10_05':'soccer - kick ball','10_06':'soccer - kick ball','11_01':'soccer - kick ball'};
(async()=>{
  if(!bvhs.length){console.error('CHECK FAIL: models/cmu/ 에 BVH 파일이 없습니다 (README 의 받는 방법 참고)');process.exit(1);}
  const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  let failed=0;const summary=[];
  for(const m of models){
    const page=await browser.newPage({viewport:{width:1100,height:700}});
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
    const loaded=await page.evaluate(async m=>!!(await window.__viewer.load('models/'+m)),m);
    if(!loaded){console.log(m,'LOAD FAILED',await page.$eval('#status',e=>e.textContent));failed++;await page.close();continue;}
    for(const b of bvhs){
      const rep=await page.evaluate(async({b,BALL})=>{const V=window.__viewer;
        const info=await V.addBVH('models/cmu/'+b,{trim:true,before:0.6,after:0.5});
        if(!info)return {bvh:b,failed:document.querySelector('#status').textContent};
        const ci=V.clipsIn.findIndex(c=>c.retarget===info),c=V.clipsIn[ci],clip=V.clipsPlay[ci];
        const nan=clip.tracks.some(t=>Array.prototype.some.call(t.values,x=>!Number.isFinite(x)));
        const i=V.inst[0],r={bvh:b,clip:c.name,duration:c.duration,tracks:c.tracks,missingBones:c.missingBones.length,nonFinite:nan,
          sourceFrameTime:info.sourceFrameTime,sourceDuration:info.sourceDuration,window:[info.from,info.to],facingTurnDeg:info.facingTurnDeg,hipScale:info.hipScale,
          mappedBones:info.mappedBones,sourceUnmapped:info.sourceUnmapped,targetWithoutSource:info.targetWithoutSource,missingTarget:info.missingTarget,
          strikeAt:c.strikeAt,strikeFoot:c.strikeFoot,rootMotion:c.rootMotion,inPlaceHipsMaxOffset:c.inPlaceHipsMaxOffset};
        r.played=GLRetarget.measure(i,clip,c.strikeAt,c.strikeFoot,BALL,info.sourceFootLow);r.groundLift=info.groundLiftModelUnits;r.strikeTurnDeg=info.strikeTurnDeg;r.travel=[info.travelNet,info.travelMax];
        // switching: idle -> kick -> idle, 0.25 s crossfade and hard cut; the largest bone move in one 1/60 s frame,
        // and the largest change of a bone's local rotation in one frame (twists show as big angles)
        const idle=V.clipsIn.find(x=>/^idle$/i.test(x.name))||V.clipsIn[0];
        const bones=[];i.root.traverse(o=>{if(o.isBone)bones.push(o);});const prev=bones.map(()=>new THREE.Vector3()),prevQ=bones.map(()=>new THREE.Quaternion()),v=new THREE.Vector3();
        const step=()=>{i.mixer.update(1/60);i.holder.updateMatrixWorld(true);let mx=0,ang=0;bones.forEach((bn,k)=>{bn.getWorldPosition(v);mx=Math.max(mx,v.distanceTo(prev[k]));prev[k].copy(v);
          ang=Math.max(ang,bn.quaternion.angleTo(prevQ[k]));prevQ[k].copy(bn.quaternion);});return [mx,ang];};
        const run=n=>{let mx=0,ang=0;for(let k=0;k<n;k++){const [a,g]=step();mx=Math.max(mx,a);ang=Math.max(ang,g);}return [+mx.toFixed(3),+(ang*180/Math.PI).toFixed(1)];};
        const sw={};
        for(const xf of [0.25,0]){document.querySelector('#xfade').value=String(xf);V.stopAll();V.play(idle.name);run(30);
          V.play(c.name);const a=V.inst[0].cur;a.time=0;const into=run(Math.round(0.35*60));   // the fade in and the first frames of the kick
          run(Math.max(0,Math.round((clip.duration-0.35)*60)-6));V.play(idle.name);const out=run(Math.round(0.35*60));
          sw[xf?'crossfade0.25':'hardCut']={intoKick:into,backToIdle:out};}
        document.querySelector('#xfade').value='0.25';
        r.switching=sw;r.kickSteady=(()=>{V.stopAll();V.play(c.name);run(2);return run(Math.round(clip.duration*60)-4);})();
        return r;},{b,BALL});
      if(rep.failed){console.log(JSON.stringify({model:m,bvh:b,failed:rep.failed}));failed++;continue;}
      // defects by the limits above
      const d=[],p=rep.played;
      if(rep.nonFinite){d.push('숫자가 아닌 키 값');failed++;}
      // the strike must be a real place and time: inside the clip, every coordinate a number
      const st=p.strike;if(!(st.atSeconds>0&&st.atSeconds<rep.duration)||![...st.toe,...st.plantFoot,st.toeSpeed,st.directionDegFromForward].every(Number.isFinite)){d.push(`타격 시점이나 좌표가 잘못됨 (${JSON.stringify(st)})`);failed++;}
      if(!(rep.kickSteady[0]>0.005)||!(p.strike.toeSpeed>0.5)){d.push(`클립이 거의 움직이지 않음 (프레임당 최대 ${rep.kickSteady[0]} m, 발끝 ${p.strike.toeSpeed} m/s): 리타깃 실패`);failed++;}
      if(p.soleMin<LIMIT.soleSunk)d.push(`발이 바닥에 묻힘 (최저 ${p.soleMin} m)`);
      // both feet up is a defect only where the take itself is on the ground: the bound onto the plant foot is in the capture
      if(p.extraFloatMax>LIMIT.extraFloat)d.push(`리타깃이 원본보다 발을 더 띄움 (최대 ${p.extraFloatMax} m)`);
      if(p.extraSinkMax<-LIMIT.extraFloat)d.push(`리타깃이 원본보다 발을 더 내림 (최대 ${p.extraSinkMax} m)`);
      if(p.hipsHorizMax>LIMIT.hipsAway)d.push(`제자리 재생에서 골반이 위치에서 벗어남 (최대 ${p.hipsHorizMax} m)`);
      if(p.chestTiltMaxDeg>LIMIT.chestTilt)d.push(`몸통이 많이 기움 (최대 ${p.chestTiltMaxDeg}°)`);
      if(p.kneeBackwardsFrames)d.push(`무릎이 뒤로 꺾여 보이는 샘플 ${p.kneeBackwardsFrames}/${p.samples}`);
      if(Math.abs(p.strike.directionDegFromForward)>LIMIT.strikeOffForward)d.push(`타격 방향이 정면에서 ${p.strike.directionDegFromForward}°`);
      // a kick plays once, so its start and end against each other do not matter; against idle they do (the fades)
      const cf=rep.switching['crossfade0.25'];
      for(const [k,lab] of [['intoKick','대기→킥'],['backToIdle','킥→대기']])if(cf[k][0]>LIMIT.frameJump)d.push(`${lab} 크로스페이드 중 한 프레임 ${cf[k][0]} m`);
      rep.defects=d;
      // a screenshot at the strike, seen from the kicking side
      await page.evaluate(({name,at,foot})=>{const V=window.__viewer;V.setPaused(true);V.stopAll();V.play(name);const a=V.inst[0].cur;a.time=at;V.inst[0].mixer.update(0);
        V.orbit.yaw=foot==='left'?-Math.PI/2:Math.PI/2;V.orbit.pitch=0.12;V.orbit.dist=3.6;},{name:rep.clip,at:rep.strikeAt,foot:rep.strikeFoot});
      await page.waitForTimeout(400);
      const shot=path.join(DIR,'out',`kick_${m.replace(/\W/g,'_')}_${b.replace(/\W/g,'_')}.png`);
      rep.screenshot=await page.screenshot({path:shot,timeout:90000}).then(()=>path.relative(DIR,shot),e=>'failed: '+e.message.split('\n')[0]);
      await page.evaluate(()=>{const V=window.__viewer;V.setPaused(false);V.orbit.yaw=0.6;V.orbit.pitch=0.25;V.orbit.dist=4.2;});
      rep.description=DESC[b.replace(/\.bvh$/i,'')]||'?';
      console.log(JSON.stringify(Object.assign({model:m},rep)));
      summary.push(`${m} ${b} [${rep.description}] ${rep.strikeFoot} 타격 ${rep.strikeAt}s / ${rep.duration}s: ${d.length?'결함 '+d.join('; '):'눈에 띄는 결함 없음'}`);
    }
    if(errors.length){console.log(JSON.stringify({model:m,consoleErrors:errors}));failed++;}
    await page.close();
  }
  await browser.close();
  console.log('--- 요약');for(const s of summary)console.log(s);
  console.log(failed?`CHECK FAIL: ${failed} 건 (불러오기/리타깃 실패, 숫자 아닌 값, 움직이지 않는 클립, 잘못된 타격 시점·좌표, 콘솔 오류)`:'CHECK PASS (불러오기, 리타깃, 유한한 값, 움직임, 타격 시점·좌표, 콘솔 오류 기준. 품질 결함은 위 요약)');process.exitCode=failed?1:0;
})();
