// Where the boots go under the ground in the game's procedural kick (index.html as it is, read only, the working
// copy with the left-foot toe fix). Rigs are built and drawn in a detached group with the game's own buildRig and
// applyVisual (applyPose + rigLife), test access injected in memory before window.__game (as tests/anim_kick_sides.js).
// The ground is the grass plane at y = 0 (index.html: the grass mesh is not moved; the rig root sits at p.y = 0 in a
// kick). Measured per frame and foot, from the meshes as they are rendered (every vertex of the boot sphere, the sole
// box and the shin through their world matrices), not from joint angles alone.
//   node measure_kick_ground.js           writes out/kick_ground/measure.json, prints a summary
const path=require('path'),fs=require('fs'),crypto=require('crypto');
const DIR=__dirname,GL=path.join(DIR,'..','..','..');
const P=require(path.join(GL,'tests','legacy','paths.js'));
const {chromium}=require(P.PLAYWRIGHT);
const three=fs.readFileSync(P.THREE_JS,'utf8');
const OUT=path.join(DIR,'out','kick_ground');fs.mkdirSync(OUT,{recursive:true});
const SRCF=path.join(GL,'index.html'),SRC=fs.readFileSync(SRCF,'utf8');
const INJECT=`window.__kg={A,applyVisual,buildRig,teamMats,TEAMS,ball,setClock(g,v){gtime=g;visDt=v;}};\n`;
const k=SRC.indexOf('window.__game={');if(k<0)throw new Error('anchor window.__game not found');
const html='<!doctype html><html><head><meta charset="utf-8"></head><body>'+SRC.slice(0,k)+INJECT+SRC.slice(k)+'</body></html>';

(async()=>{
  const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const page=await browser.newPage({viewport:{width:640,height:360}});const errors=[];
  await page.addInitScript(()=>{try{localStorage.setItem('gl-tut-v1','1');}catch(e){}});page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>{const u=r.request().url();
    if(u.startsWith('http://game.local'))return r.fulfill({body:html,contentType:'text/html'});
    if(u.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'});
    return r.abort();});
  await page.goto('http://game.local/');await page.waitForFunction(()=>window.__kg&&window.__game);
  const R=await page.evaluate(()=>{window.__freeze=true;
    const D=window.__kg,TH=window.THREE,V=()=>new TH.Vector3(),holder=new TH.Group(),mats=D.teamMats(D.TEAMS[0].home,D.TEAMS[0].gk);
    const PD=[
      {name:'Base Striker',short:'BS',label:'ST',num:9,st:{phy:70,pac:82},skin:'#e0ac85',hair:'#2b1d14',hs:0,boot:'#111111',h:1.0},
      {name:'Tall Stopper',short:'TS',label:'CB',num:4,st:{phy:88,pac:60},skin:'#9b6847',hair:'#16120f',hs:1,boot:'#f4f4f4',h:1.03},
      {name:'Quick Winger',short:'QW',label:'RW',num:7,st:{phy:55,pac:92},skin:'#f1c9a5',hair:'#d8b46a',hs:2,boot:'#ff3d7f',h:0.96},
      {name:'Base Keeper',short:'BK',label:'GK',num:1,st:{phy:75,pac:60},skin:'#c68b62',hair:'#5a3a22',hs:0,boot:'#111111',h:1.01,gk:true}];
    D.ball.pos.set(3,0.11,2);
    // the meshes under an ankle: the boot (scaled sphere) and the sole (box); the shin hangs under the knee
    const meshesOf=(r,s)=>{const an=r['ankle'+s],kn=r['knee'+s];const ms=an.children.filter(c=>c.isMesh);
      const boot=ms.find(m=>m.geometry.type==='SphereGeometry'),sole=ms.find(m=>m.geometry.type==='BoxGeometry'),shin=kn.children.filter(c=>c.isMesh&&c.geometry.type==='LatheGeometry');return {an,kn,boot,sole,shin};};
    const lowestOf=m=>{const pa=m.geometry.attributes.position,w=V();let lo=Infinity,at=null;for(let i=0;i<pa.count;i++){w.fromBufferAttribute(pa,i).applyMatrix4(m.matrixWorld);if(w.y<lo){lo=w.y;at=w.clone();}}return {y:lo,at};};
    // the game's kick timeline: D let go at visT -0.1, the strike sets oT to 0.15 when the 0.24 s back-swing ends,
    // the kick ends past oDur 0.5 (measure_procedural.js showed visT -0.083 ... 0.133, then 0.167 ... 0.45)
    const kickT=[];for(let i=1;i<=14;i++)kickT.push(-0.1+i/60);for(let i=1;i<=18;i++)kickT.push(0.15+i/60);
    const out={timeline:kickT.map(t=>+t.toFixed(4)),rigs:[]};
    for(let ri=0;ri<PD.length;ri++){const rg={name:PD[ri].name,sides:{}};
      for(const side of [0,-1]){const r=D.buildRig(mats,PD[ri],!!PD[ri].gk,{parent:holder}),p={team:0,isOfficial:false,stamina:70,rig:r};
        const kickLeg=side<0?'L':'R',plantLeg=side<0?'R':'L',frames=[];let g=12;
        const draw=(aid,t,clock)=>{g+=1/60;D.setClock(g,clock);D.applyVisual(p,0,0,0,0,aid,t,0.3,0,side);r.root.updateMatrixWorld(true);};
        const measure=(label,t)=>{const f={label,t:+t.toFixed(4),hipsY:+r.hips.getWorldPosition(V()).y.toFixed(4),pelvisX:+r.hips.rotation.x.toFixed(4)};
          for(const s of ['L','R']){const M=meshesOf(r,s),aw=M.an.getWorldPosition(V()),b=lowestOf(M.boot),so=lowestOf(M.sole),sh=Math.min(...M.shin.map(m=>lowestOf(m).y));
            const loc=(so.y<=b.y?so.at:b.at).clone();M.an.worldToLocal(loc);
            // the sole's long axis in the world: its pitch (toe down < 0) and the ankle's roll
            const toe=M.sole.localToWorld(V().set(0,0,0.1275)),heel=M.sole.localToWorld(V().set(0,0,-0.1275)),pitch=Math.atan2(toe.y-heel.y,Math.hypot(toe.x-heel.x,toe.z-heel.z))*180/Math.PI;
            f[s]={thighX:+r['leg'+s].rotation.x.toFixed(4),thighZ:+r['leg'+s].rotation.z.toFixed(4),kneeX:+r['knee'+s].rotation.x.toFixed(4),ankleX:+M.an.rotation.x.toFixed(4),ankleZ:+M.an.rotation.z.toFixed(4),
              ankleY:+aw.y.toFixed(4),soleLow:+so.y.toFixed(4),bootLow:+b.y.toFixed(4),shinLow:+sh.toFixed(4),low:+Math.min(so.y,b.y).toFixed(4),lowPart:so.y<=b.y?'sole':'boot',
              lowLocal:loc.toArray().map(x=>+x.toFixed(4)),ankleToLow:+(aw.y-Math.min(so.y,b.y)).toFixed(4),solePitchDeg:+pitch.toFixed(2)};}
          return f;};
        // standing: 12 idle frames, the kick, 12 idle frames; the game's 60 fps clock (rigLife eases the joints)
        for(let i=0;i<12;i++){draw(D.A.idle,g,1/60);}frames.push(measure('idle before',0));
        for(const t of kickT){draw(D.A.kick,t,1/60);frames.push(measure('kick',t));}
        for(let i=0;i<12;i++){draw(D.A.idle,g,1/60);frames.push(measure('idle after',i/60));}
        // the same kick unsmoothed (rigLife's reset past 0.2 s): the authored pose itself, frame by frame
        const raw=[];for(const t of kickT){draw(D.A.kick,t,0.25);raw.push(measure('kick raw',t));}
        // what the toe term alone does at the deepest raw kick-leg frame: the same frame with the ankle's +0.5 taken
        // away in this test rig only (a counterfactual for attribution; the game is not changed)
        const dk=raw.reduce((a,b)=>b[kickLeg].low<a[kickLeg].low?b:a);draw(D.A.kick,dk.t,0.25);const an=r['ankle'+kickLeg];const ax0=an.rotation.x;an.rotation.x=Math.max(-0.75,Math.min(1.0,ax0-0.5));r.root.updateMatrixWorld(true);
        const M=meshesOf(r,kickLeg),noToe=Math.min(lowestOf(M.sole).y,lowestOf(M.boot).y);an.rotation.x=ax0;r.root.updateMatrixWorld(true);
        // per raw frame, the kicking ankle set to what rigLife's formula gives with the toe term (a) as it is, (b) taken
        // away, (c) scaled by the leg's swing factor; test rig only, for attributing the depth (the game is not changed)
        const cf=[];for(const t of kickT){draw(D.A.kick,t,0.25);const L=r['leg'+kickLeg],K=r['knee'+kickLeg],a=r['ankle'+kickLeg],tX=r.hips.rotation.x;
          const sw=Math.max(0,Math.min(1,(K.rotation.x-0.45)/0.6)),base=(1-sw)*-(tX+L.rotation.x+K.rotation.x)*0.9+sw*0.45,cl=v=>Math.max(-0.75,Math.min(1.0,v));
          const lowAt=ax=>{const a0=a.rotation.x;a.rotation.x=ax;r.root.updateMatrixWorld(true);const M=meshesOf(r,kickLeg),lo=Math.min(lowestOf(M.sole).y,lowestOf(M.boot).y);a.rotation.x=a0;r.root.updateMatrixWorld(true);return +lo.toFixed(4);};
          cf.push({t:+t.toFixed(4),swing:+sw.toFixed(3),asIs:lowAt(cl(base+0.5)),noToe:lowAt(cl(base)),toeTimesSwing:lowAt(cl(base+0.5*sw)),ankleY:+r['ankle'+kickLeg].getWorldPosition(V()).y.toFixed(4)});}
        // and the rest pose: the authored standing reference
        draw(D.A.idle,g,0.25);const rest=measure('idle raw',0);
        rg.sides[side]={kickLeg,plantLeg,frames,raw,rest,perFrameToe:cf,counterfactual:{t:dk.t,ankleX:+ax0.toFixed(4),low:dk[kickLeg].low,lowWithoutToeTerm:+noToe.toFixed(4)}};holder.remove(r.root);}
      rg.scale=+D.buildRig(mats,PD[ri],!!PD[ri].gk,{parent:holder}).root.scale.x.toFixed(4);out.rigs.push(rg);}
    return out;});
  await browser.close();
  const hash=crypto.createHash('sha256').update(SRC).digest('hex');
  fs.writeFileSync(path.join(OUT,'measure.json'),JSON.stringify({source:'ground-legends/index.html',sourceSha256:hash,ground:'y = 0 (grass plane)',pageErrors:errors,...R},null,1));
  console.log('index.html sha256',hash.slice(0,16),'page errors',errors.length);
  for(const rg of R.rigs){console.log(`\n${rg.name} (scale ${rg.scale})`);
    for(const [side,S] of Object.entries(rg.sides)){const K=S.kickLeg,Pl=S.plantLeg;
      const deep=(arr,s)=>arr.reduce((a,b)=>b[s].low<a[s].low?b:a);
      const kd=deep(S.frames.filter(f=>f.label==='kick'),K),pd=deep(S.frames.filter(f=>f.label==='kick'),Pl),ad=deep(S.frames.filter(f=>f.label==='idle after'),K);
      console.log(` side ${side} kick ${K}: kick foot min ${kd[K].low} (${kd[K].lowPart}, local ${kd[K].lowLocal}) at t=${kd.t} | ankle y ${kd[K].ankleY} ankleX ${kd[K].ankleX} knee ${kd[K].kneeX} thigh ${kd[K].thighX} pitch ${kd[K].solePitchDeg}° ankle-to-low ${kd[K].ankleToLow}`);
      console.log(`   plant ${Pl}: min ${pd[Pl].low} at t=${pd.t} (ankle y ${pd[Pl].ankleY}, ankleX ${pd[Pl].ankleX}, pitch ${pd[Pl].solePitchDeg}°) | after the kick (idle) kick foot min ${ad[K].low} at +${ad.t}s | rest: ankle y ${S.rest[K].ankleY} sole low ${S.rest[K].low} ankle-to-low ${S.rest[K].ankleToLow}`);
      console.log(`   counterfactual at raw t=${S.counterfactual.t}: kick foot ${S.counterfactual.low} with the toe term, ${S.counterfactual.lowWithoutToeTerm} without it (ankleX ${S.counterfactual.ankleX})`);}}
})();
