// Diagnosis of the failures in check_player.js (round 2): where the soles go under the ground, how far the in-place
// kick's own path explains the foot slide on the game's player, what the mesh stretch at the toes is in millimetres,
// and how the game turns and moves the player around a shot. Reads the baseline results in out/ (never writes there)
// and measures the clips again in the viewer page. Writes out/v2/diag.json and prints a summary.
//   node diag_v2.js
const path=require('path'),fs=require('fs');
const DIR=__dirname,GV=path.join(DIR,'..');
const P=require(path.join(GV,'..','..','tests','legacy','paths.js'));
const {chromium}=require(P.PLAYWRIGHT);
const three=fs.readFileSync(P.THREE_JS,'utf8');
const OUT=path.join(DIR,'out','v2');fs.mkdirSync(OUT,{recursive:true});
const KICK='143_24';

async function openLab(browser){
  const page=await browser.newPage({viewport:{width:960,height:640}});const errors=[];
  page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errors.push(m.text());});page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  await page.route('**/*',r=>{const u=r.request().url();
    if(u.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'});
    if(u.startsWith('http://viewer.local/')){const f=path.join(GV,decodeURIComponent(u.slice(20).split('?')[0]));
      if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.html')?'text/html':'application/octet-stream'});
      return r.fulfill({status:404,body:'not found'});}
    return r.abort();});
  await page.goto('http://viewer.local/player-animation/index.html?autoload=0');
  await page.waitForFunction(()=>window.PALab&&window.__pa,null,{timeout:60000});
  return {page,errors};
}

(async()=>{
  const base=JSON.parse(fs.readFileSync(path.join(DIR,'out','check_player_'+KICK+'.json'),'utf8'));
  const GP=JSON.parse(fs.readFileSync(path.join(DIR,'out','game_probe.json'),'utf8'));
  const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const {page,errors}=await openLab(browser);
  const D=await page.evaluate(async KICK=>{
    const M=await window.__pa.loadModel(),lib=await window.__pa.useKick(KICK),V=()=>new THREE.Vector3(),out={};
    const m=M.skin.mesh,w=V();
    // ---- G: soles under the ground, clip by clip (alone, holder at the origin) ----
    out.ground={};
    for(const k of ['idle','start','run','decel','kick','recover']){const c=lib[k];
      const bvh=await PALab.loadTake('assets/cmu/'+c.take+'.bvh'),S=PALab.sourceSeries(bvh,1/60),ft=S.frameTime,ratio=c.info.hipScale;
      // retarget.js's floor: the 10th percentile, over the whole take, of the lowest foot joint
      const lows=S.rows.map(r=>Math.min(r.lFoot[1],r.rFoot[1],r.lToe[1],r.rToe[1])).sort((a,b)=>a-b),floor10=lows[Math.floor(lows.length*0.1)];
      const T=[];for(let t=0;t<=c.duration+1e-6;t+=1/60)T.push(t);
      const F=PALab.sampleClip(M,c,T,t=>{const r={t};for(const side of ['Left','Right']){let lo=Infinity,at=-1;for(const id of M.skin.feet[side]){PALab.skinned(m,id,w);if(w.y<lo){lo=w.y;at=id;}}
        const an=M.by[side+'Foot'].getWorldPosition(V()),toe=M.by[side+'ToeBase'].getWorldPosition(V()),hp=M.by.Hips.getWorldPosition(V());PALab.skinned(m,at,w);
        r[side]={mesh:lo,ankle:an.y,toe:toe.y,hipsToAnkle:hp.y-an.y,lowBone:PALab.short(m.skeleton.bones[M.skin.dom[at]].name),lowAlongFoot:+(w.clone().sub(an).dot(toe.clone().sub(an).setY(0).normalize())).toFixed(3),
          pitchDeg:+(Math.atan2(toe.y-an.y,Math.hypot(toe.x-an.x,toe.z-an.z))*180/Math.PI).toFixed(1)};}return r;});
      const rows=F.map((f,k2)=>{const st=c.from+k2/60,j=Math.max(0,Math.min(S.rows.length-1,Math.round((st-ft)*60))),s=S.rows[j];
        const src={Left:{ankle:(s.lFoot[1]-floor10)*ratio,toe:(s.lToe[1]-floor10)*ratio,hipsToAnkle:(s.hips[1]-s.lFoot[1])*ratio},Right:{ankle:(s.rFoot[1]-floor10)*ratio,toe:(s.rToe[1]-floor10)*ratio,hipsToAnkle:(s.hips[1]-s.rFoot[1])*ratio}};
        return {t:f.t,tgt:{Left:f.Left,Right:f.Right},src};});
      // the deepest sole and what sits under it
      let deep=null;for(const r of rows)for(const side of ['Left','Right'])if(!deep||r.tgt[side].mesh<deep.mesh)deep=Object.assign({t:+r.t.toFixed(3),side,src:r.src[side]},r.tgt[side]);
      // the ankle against the source's ankle (both over their floor): a constant gap is the ground placement, a gap
      // that changes is the retarget (leg proportions); hips-to-ankle height says the same without any floor
      const gap=side=>rows.map(r=>r.tgt[side].ankle-r.src[side].ankle),hta=side=>rows.map(r=>r.tgt[side].hipsToAnkle-r.src[side].hipsToAnkle);
      const st=a=>({min:+Math.min(...a).toFixed(4),max:+Math.max(...a).toFixed(4),range:+(Math.max(...a)-Math.min(...a)).toFixed(4)});
      deep.ankleGap=+(deep.ankle-deep.src.ankle).toFixed(4);deep.hipsToAnkleGap=+(deep.hipsToAnkle-deep.src.hipsToAnkle).toFixed(4);
      for(const x of ['mesh','ankle','toe','hipsToAnkle'])deep[x]=+deep[x].toFixed(4);for(const x in deep.src)deep.src[x]=+deep.src[x].toFixed(4);
      out.ground[k]={take:c.take,lift:c.info.groundLiftModelUnits,ratio,deep,ankleGap:{Left:st(gap('Left')),Right:st(gap('Right'))},hipsToAnkleGap:{Left:st(hta('Left')),Right:st(hta('Right'))},
        framesUnder2cm:rows.filter(r=>Math.min(r.tgt.Left.mesh,r.tgt.Right.mesh)<-0.02).length,frames:rows.length};}
    // ---- T: toe bend, toe tip below the ground: the front-most toe vertex of each foot (at rest), its pitch from the
    // toe joint against the foot's own pitch (ankle -> toe joint); + = toes bent up (check_shot.js range -40..65°)
    {PALab.toRest(M);const tip={};for(const side of ['Left','Right']){let best=-Infinity,id=-1;for(const v of M.skin.feet[side]){PALab.skinned(m,v,w);if(w.z>best){best=w.z;id=v;}}tip[side]=id;}
      out.toe={};for(const k of ['run','decel','kick','recover']){const c=lib[k],T=[];for(let t=0;t<=c.duration+1e-6;t+=1/60)T.push(t);
        const F=PALab.sampleClip(M,c,T,t=>{const r={t};for(const side of ['Left','Right']){const an=M.by[side+'Foot'].getWorldPosition(V()),tj=M.by[side+'ToeBase'].getWorldPosition(V());PALab.skinned(m,tip[side],w);
          const p=(a,b)=>Math.atan2(b.y-a.y,Math.hypot(b.x-a.x,b.z-a.z))*180/Math.PI;r[side]={bend:p(tj,w)-p(an,tj),tipY:w.y,toeY:tj.y};}return r;});
        const all=F.flatMap(f=>['Left','Right'].map(s=>Object.assign({t:f.t,side:s},f[s])));const under=all.filter(x=>x.tipY<-0.02);
        out.toe[k]={bend:[+Math.min(...all.map(x=>x.bend)).toFixed(1),+Math.max(...all.map(x=>x.bend)).toFixed(1)],tipUnder2cm:under.length,bendWhenTipUnder:under.length?[+Math.min(...under.map(x=>x.bend)).toFixed(1),+Math.max(...under.map(x=>x.bend)).toFixed(1)]:null,
          deepestTip:(()=>{const d=all.reduce((a,b)=>b.tipY<a.tipY?b:a);return {t:+d.t.toFixed(3),side:d.side,tipY:+d.tipY.toFixed(4),toeJointY:+d.toeY.toFixed(4),bend:+d.bend.toFixed(1)};})()};}}
    // ---- P: leg proportions (rest), target against the source T-pose scaled by the hips ratio ----
    {const bvh=await PALab.loadTake('assets/cmu/'+KICK+'.bvh'),g=new THREE.Group(),root=bvh.skeleton.bones[0],old=root.parent;g.add(root);
      const clip=bvh.clip.clone();for(const t of clip.tracks)t.name=t.name.replace(/^\.bones\[([^\]]+)\]/,'$1');const mx=new THREE.AnimationMixer(g),a=mx.clipAction(clip);a.play();a.time=0;mx.update(0);g.updateMatrixWorld(true);
      const by={};for(const b of bvh.skeleton.bones)by[b.name]=b;const SP=n=>new THREE.Vector3().setFromMatrixPosition(by[n].matrixWorld),r=lib.kick.info.hipScale;
      PALab.toRest(M);const TP=n=>M.by[n].getWorldPosition(V());
      out.legs={sourceScaled:{thigh:+(SP('LeftUpLeg').distanceTo(SP('LeftLeg'))*r).toFixed(4),shin:+(SP('LeftLeg').distanceTo(SP('LeftFoot'))*r).toFixed(4),foot:+(SP('LeftFoot').distanceTo(SP('LeftToeBase'))*r).toFixed(4),hipsY:+((SP('Hips').y-Math.min(SP('LeftFoot').y,SP('RightFoot').y))*r).toFixed(4)},
        target:{thigh:+TP('LeftUpLeg').distanceTo(TP('LeftLeg')).toFixed(4),shin:+TP('LeftLeg').distanceTo(TP('LeftFoot')).toFixed(4),foot:+TP('LeftFoot').distanceTo(TP('LeftToeBase')).toFixed(4),hipsY:+(TP('Hips').y-TP('LeftFoot').y).toFixed(4)}};
      mx.uncacheRoot(g);g.remove(root);if(old)old.add(root);}
    // ---- K: the kick clip's own path (what in-place playback on a still player takes away) ----
    out.kickPath=lib.kick.path.map((p,k)=>[+(k/60).toFixed(4),+p[0].toFixed(4),+p[1].toFixed(4)]);
    out.kickContact=lib.kick.contact;out.recoverPath=lib.recover.path.map((p,k)=>[+(k/60).toFixed(4),+p[0].toFixed(4),+p[1].toFixed(4)]);
    // ---- E: the stretched edges in millimetres, run clip (the largest stretch seen) ----
    {const c=lib.run,T=[];for(let t=0;t<=c.duration;t+=1/30)T.push(t);const best=new Map();
      PALab.sampleClip(M,c,T,()=>{const u=V();for(let e=0;e<M.edges.length;e++){const [a,b,L]=M.edges[e];PALab.skinned(m,a,w);PALab.skinned(m,b,u);const r=w.distanceTo(u)/L;const o=best.get(e);if(!o||r>o.r)best.set(e,{r,len:w.distanceTo(u)});}});
      const list=[...best.entries()].map(([e,o])=>({e,ratio:+o.r.toFixed(2),restMm:+(M.edges[e][2]*1000).toFixed(2),stretchedMm:+(o.len*1000).toFixed(2),bones:[M.edges[e][0],M.edges[e][1]].map(i=>PALab.short(m.skeleton.bones[M.skin.dom[i]].name))})).sort((a,b)=>b.ratio-a.ratio);
      out.edges={top:list.slice(0,8),over2:list.filter(x=>x.ratio>2).length,over1_5:list.filter(x=>x.ratio>1.5).length,sampled:list.length,
        over2_byBone:list.filter(x=>x.ratio>2).reduce((o,x)=>{const k=x.bones.join('/');o[k]=(o[k]||0)+1;return o;},{}),
        largestAddedMm:+Math.max(...list.map(x=>x.stretchedMm-x.restMm)).toFixed(2)};}
    return out;},KICK);
  await browser.close();

  // ---- from the baseline results (out/check_player_<kick>.json): slide against what the game moved ----
  const runs=(T,s)=>{const o=[];let cur=null;for(const r of T){const v=r.slide&&r.slide[s];if(v!=null){if(!cur)cur={from:r.t,to:r.t,slide:0,state:r.state};cur.to=r.t;cur.slide+=v;}else if(cur){o.push(cur);cur=null;}}if(cur)o.push(cur);return o;};
  const scen={};
  for(const g of GP.scenarios){const B=base.scen[g.name];if(!B)continue;const T=B.ticks,rows=g.rows;
    const moved=(a,b)=>{let s=0;for(let k=Math.round(a*60)+1;k<=Math.round(b*60)&&k<rows.length;k++)s+=Math.hypot(rows[k].x-rows[k-1].x,rows[k].z-rows[k-1].z);return s;};
    const turned=(a,b)=>{let s=0;for(let k=Math.round(a*60)+1;k<=Math.round(b*60)&&k<rows.length;k++)s+=Math.abs(rows[k].yaw-rows[k-1].yaw);return s*180/Math.PI;};
    // the kick clip's own path over the same clip times (phase = clip time at the kick's start)
    const ks=B.plan.kickStart,ph=B.plan.kickPhase,KP=D.kickPath;
    const clipMoved=(a,b)=>{let s=0;for(let k=1;k<KP.length;k++){const t=ks+KP[k][0]-ph;if(t<=a+1e-6||t>b+1e-6)continue;s+=Math.hypot(KP[k][1]-KP[k-1][1],KP[k][2]-KP[k-1][2]);}return s;};
    const kickRuns=['Left','Right'].flatMap(s=>runs(T,s).filter(x=>x.state==='kick'||x.state==='recover').map(x=>({foot:s,from:+x.from.toFixed(3),to:+x.to.toFixed(3),state:x.state,slide:+x.slide.toFixed(4),
      gameMoved:+moved(x.from,x.to).toFixed(4),clipOwnPath:+clipMoved(x.from,x.to).toFixed(4),gameTurnedDeg:+turned(x.from,x.to).toFixed(1)})));
    const pre=['Left','Right'].flatMap(s=>runs(T,s).filter(x=>x.to<=g.press+1e-6&&x.state==='run').map(x=>({foot:s,from:+x.from.toFixed(3),to:+x.to.toFixed(3),slide:+x.slide.toFixed(4),gameTurnedDeg:+turned(x.from,x.to).toFixed(1)})));
    const kc=Math.round(g.lastOwned*60);
    scen[g.name]={press:g.press,contact:g.lastOwned,speedAtPress:g.speedAtPress,speedAtContact:g.speedAtContact,aimDeg:g.aimDeg,yawAtContactDeg:+(rows[kc].yaw*180/Math.PI).toFixed(2),
      yawFirstTicksDeg:rows.slice(0,4).map(r=>+(r.yaw*180/Math.PI).toFixed(1)),ballAhead:g.ballAtContact,ballSide:g.ballLatAtContact,kickRuns,runUp:pre};}
  const diag={kick:KICK,page:D,scen,pageErrors:errors};
  fs.writeFileSync(path.join(OUT,'diag.json'),JSON.stringify(diag,null,1));
  // ---- summary ----
  const G=D.ground;
  console.log('ground (clip alone):');for(const k in G){const g=G[k];console.log(`  ${k.padEnd(8)} deepest ${g.deep.mesh} m (${g.deep.side} ${g.deep.lowBone}, ${g.deep.lowAlongFoot} m along the foot, pitch ${g.deep.pitchDeg}°) at ${g.deep.t}s; ankle ${g.deep.ankle} vs source ${g.deep.src.ankle}; toe ${g.deep.toe} vs ${g.deep.src.toe}; ankle gap range L ${g.ankleGap.Left.min}..${g.ankleGap.Left.max} R ${g.ankleGap.Right.min}..${g.ankleGap.Right.max}; hips-ankle gap range L ${g.hipsToAnkleGap.Left.range} R ${g.hipsToAnkleGap.Right.range}; lift ${g.lift}; frames < -2 cm ${g.framesUnder2cm}/${g.frames}`);}
  console.log('toe',JSON.stringify(D.toe));
  console.log('legs',JSON.stringify(D.legs));
  console.log('edges',JSON.stringify(D.edges));
  for(const [n,s] of Object.entries(scen))console.log(n,JSON.stringify({aim:s.aimDeg,yawC:s.yawAtContactDeg,yaw0:s.yawFirstTicksDeg,kick:s.kickRuns.filter(x=>x.slide>0.15),runUp:s.runUp}));
  console.log('page errors',errors.length);
})();
