'use strict';
// Round-2 experiments, loaded after lab.js by check_player.js --variant toes|fade2 (the viewer does not load it).
//
// E1 "toes": diag_v2.js found the kick's deepest sole (-4.0 cm) at the plant foot's toe tip while the heel is up (foot
// pitched -27°) and the toes stay flat (bend -5.5..+0.7°): the source's toe barely turns there, and the MakeHuman foot
// is 31 % longer than the source's, so the toe tip goes into the ground. Hypothesis: bending only the toe joint up
// (about the foot's left-right axis, never past 65° up: check_shot.js's toe range) far enough that no toe vertex is
// under the ground removes the penetration without moving any other joint. The bend is smoothed so that it never
// falls below what each frame needs (max over +-4 frames, then mean over +-2 frames).
// Changes the clips in place (the lib of this page only); returns what it did per clip and side.
window.PAExp=(()=>{
  const V=()=>new THREE.Vector3(),Q=()=>new THREE.Quaternion();
  const TOE_UP_MAX=65;   // check_shot.js LIM.toeUpDeg
  function toeIds(M,side){const m=M.skin.mesh;return M.skin.feet[side].filter(v=>PALab.short(m.skeleton.bones[M.skin.dom[v]].name)===side+'ToeBase');}
  // the front-most toe vertex at rest (for the toe bend angle, as diag_v2.js)
  function tipId(M,side){PALab.toRest(M);const m=M.skin.mesh,w=V();let best=-Infinity,id=-1;for(const v of M.skin.feet[side]){PALab.skinned(m,v,w);if(w.z>best){best=w.z;id=v;}}return id;}
  const pitch=(a,b)=>Math.atan2(b.y-a.y,Math.hypot(b.x-a.x,b.z-a.z))*180/Math.PI;
  function fixToes(M,c){
    const m=M.skin.mesh,w=V(),info={};
    for(const side of ['Left','Right']){
      const toe=M.by[side+'ToeBase'],foot=M.by[side+'Foot'],ids=toeIds(M,side),tip=tipId(M,side);
      const tr=c.clip.tracks.find(t=>t.name===toe.name+'.quaternion');
      const n=tr.times.length,need=new Float64Array(n),axes=[],bend0=new Float64Array(n);let low0=Infinity;
      const lowest=()=>{let lo=Infinity;for(const v of ids){PALab.skinned(m,v,w);if(w.y<lo)lo=w.y;}return lo;};
      PALab.sampleClip(M,c,Array.from(tr.times),t=>{const k=Math.round(t*60);
        const an=foot.getWorldPosition(V()),tj=toe.getWorldPosition(V());PALab.skinned(m,tip,w);bend0[k]=pitch(tj,w.clone())-pitch(an,tj);
        // the foot's left-right axis in the foot's own frame (constant in that frame: the toe hinge)
        const fw=tj.clone().sub(an).normalize(),ax=V().crossVectors(V().set(0,1,0),fw).normalize(),Pw=foot.getWorldQuaternion(Q());
        const axLocal=ax.clone().applyQuaternion(Pw.clone().invert());axes[k]=axLocal;
        const q0=toe.quaternion.clone(),lo=lowest();low0=Math.min(low0,lo);
        if(lo<0){const tryAt=deg=>{toe.quaternion.copy(q0).premultiply(Q().setFromAxisAngle(axLocal,deg*Math.PI/180));toe.updateMatrixWorld(true);return lowest();};
          // which way is up for the toes: the sign that raises the lowest toe vertex
          const sgn=tryAt(5)>lo?1:-1,maxDeg=Math.max(0,TOE_UP_MAX-bend0[k]);let a=0,b=maxDeg;
          if(tryAt(sgn*b)<0)need[k]=sgn*b;else{for(let i=0;i<20;i++){const mid=(a+b)/2;if(tryAt(sgn*mid)<0)a=mid;else b=mid;}need[k]=sgn*b;}
          toe.quaternion.copy(q0);toe.updateMatrixWorld(true);}
        return null;});
      // smooth without going under what any frame needs
      const mx=Float64Array.from(need,(_,k)=>{let v=0;for(let j=Math.max(0,k-4);j<=Math.min(n-1,k+4);j++)if(Math.abs(need[j])>Math.abs(v))v=need[j];return v;});
      const sm=Float64Array.from(mx,(_,k)=>{let s=0,c2=0;for(let j=Math.max(0,k-2);j<=Math.min(n-1,k+2);j++){s+=mx[j];c2++;}return s/c2;});
      // a looped clip: keep its ends the same so the loop seam does not jump
      if(c.loop){const e=Math.abs(sm[0])>Math.abs(sm[n-1])?sm[0]:sm[n-1];sm[0]=sm[n-1]=e;}
      const q=Q();for(let k=0;k<n;k++){if(!sm[k])continue;q.fromArray(tr.values,k*4).premultiply(Q().setFromAxisAngle(axes[k],sm[k]*Math.PI/180));q.toArray(tr.values,k*4);}
      // after: lowest toe vertex and toe bend
      const bend1=new Float64Array(n);let low1=Infinity;
      PALab.sampleClip(M,c,Array.from(tr.times),t=>{const k=Math.round(t*60),an=foot.getWorldPosition(V()),tj=toe.getWorldPosition(V());PALab.skinned(m,tip,w);bend1[k]=pitch(tj,w.clone())-pitch(an,tj);low1=Math.min(low1,lowest());return null;});
      const stepMax=a=>{let s=0;for(let k=1;k<a.length;k++)s=Math.max(s,Math.abs(a[k]-a[k-1]));return +s.toFixed(2);};
      info[side]={framesChanged:Array.from(sm).filter(x=>x).length,frames:n,maxDeg:+Math.max(0,...Array.from(sm).map(Math.abs)).toFixed(1),
        toeLow:{before:+low0.toFixed(4),after:+low1.toFixed(4)},bend:{before:[+Math.min(...bend0).toFixed(1),+Math.max(...bend0).toFixed(1)],after:[+Math.min(...bend1).toFixed(1),+Math.max(...bend1).toFixed(1)]},
        bendStepPerTick:{before:stepMax(bend0),after:stepMax(bend1)}};
    }
    c.clipB=c.clip.clone();c._poses=null;
    return info;
  }
  // E2 "fade2": the fades that ran faster than both clips (hands after idle -> kick, arms in recover -> idle) blend two
  // poses; the added speed is the weight's rate (1 / fade) times the pose gap. Hypothesis: doubling the fades halves
  // that term and brings the hands and arms under the clips' own speed. Kept as they were: the kick -> recover overlap
  // (same take time, seamless), restarts' timing, and the kick's full weight at the game's contact tick (a kick fade
  // is capped there). A fade at a clip's end (-> idle after recover or decel) starts earlier by what it gains, so it
  // still ends where it ended.
  function fade2(plan){
    const ev=plan.events.slice().sort((a,b)=>a.t-b.t),out=[];let prev=null;
    for(const e0 of ev){const e=Object.assign({},e0);
      const overlap=e.state==='recover'&&prev&&prev.state==='kick'&&Math.abs(e.fade-PALab.KICK_OVERLAP)<1e-9;
      if(e.fade>0&&!overlap){let f=e.fade*2;
        if(e.state==='kick'&&plan.tC!=null)f=Math.min(f,Math.max(e.fade,plan.tC-e.t));
        if(e.state==='idle'&&prev&&(prev.state==='recover'||prev.state==='decel'))e.t-=f-e.fade;
        e.why=(e.why||'')+' [fade '+e.fade+' -> '+f.toFixed(3)+']';e.fade=f;
        if(e.state==='kick'&&plan.fadeIn!=null)plan.fadeIn=f;}
      out.push(e);prev=e0;}
    plan.events=out;return plan;
  }
  let applied=null;
  // wrap the viewer's useKick: every clip set it builds gets the variant
  function use(variant){
    if(variant==='fade2'){applied={fade2:true};for(const n of ['planChain','planRepeat','planGame']){const f=PALab[n];PALab[n]=(...a)=>fade2(f(...a));}return true;}
    if(variant!=='toes')throw new Error('unknown variant '+variant);
    const orig=window.__pa.useKick,done=new WeakSet();applied={};
    window.__pa.useKick=async k=>{const lib=await orig(k);if(!done.has(lib)){done.add(lib);applied[k]={};for(const s of ['idle','start','run','decel','kick','recover'])applied[k][s]=fixToes(lib._M,lib[s]);}return lib;};
    return true;
  }
  return {use,fixToes,get applied(){return applied;}};
})();
