'use strict';
// Recovery-step lab for 143_24 (prototype only; the game does not load this). GLStep.sim is GLRecovery.sim
// (recovery_lab.js) without the hold, i.e. R0 of recovery_143.js, plus cfg.step: from the fade back on, instead of the
// crossfade kick -> idle, a recovery made of real clip poses only (no IK, no joint set by hand):
//   the kick clip keeps playing (its own follow-through), a swing source clip (walk or run, in place) is blended in
//   so that the feet step as that clip steps (the plant foot is lifted by the clip itself), then idle comes in;
//   the weights follow the plan: the swing source up to `wMax` from tick `nA` over `nUp` ticks, its phase starting at
//   `phA` and running at `rate` x real time, idle from tick `nB` over `nDown` ticks; kick = the rest;
//   the whole model follows the feet on the ground ("stance"): each foot is anchored in the world where it touches
//   down (lowest point < `grounded`); one foot down: the model is moved so that it stays; both down: the move that keeps
//   them nearest their anchors (whatever they still slide is measured); none down: no move;
//   after the step (tick `tr`) the model's remaining offset from the game player goes to zero by the end of the shot
//   (smoothstep): a slide, measured like any other.
// GLStep.plan: the shot run to the fade back once, then each candidate plan of a grid played from that state (same
// code as the sim), scored by the feet's slide on the ground, their drag, the body's per-tick steps; the best is run.
window.GLStep=(()=>{
  const V=()=>new THREE.Vector3(),Q=()=>new THREE.Quaternion();
  const upd=i=>{i.root.updateWorldMatrix(true,false);i.root.updateMatrixWorld(true);};
  const arr=v=>[+v.x.toFixed(4),+v.y.toFixed(4),+v.z.toFixed(4)];
  const arr6=v=>[+v.x.toFixed(6),+v.y.toFixed(6),+v.z.toFixed(6)];
  const toDisc=(p,c,r)=>{const d=V().subVectors(p,c).setY(0),l=d.length();return l<=r?p.clone():c.clone().add(d.multiplyScalar(r/l)).setY(0);};
  const smooth=x=>x<=0?0:x>=1?1:x*x*(3-2*x);
  const mod=(a,b)=>((a%b)+b)%b;
  // the plan's weights at recovery tick n: the swing source comes in from tick nA over nUp ticks (to wMax, its phase
  // running from phA at `rate` x real time), idle comes in from tick nB over nDown ticks; kick = the rest
  function weights(p,n){
    const u=n<p.nA?0:smooth((n-p.nA+1)/Math.max(1,p.nUp)),I=n<p.nB?0:smooth((n-p.nB+1)/Math.max(1,p.nDown)),x=(1-I)*(p.wMax||0)*u;
    const xt=p.phA+p.rate*Math.max(0,n-p.nA)/60;
    return {K:(1-I)*(1-(p.wMax||0)*u),I,X:x,xt:mod(xt,p.srcDur)};}
  const releaseAt=(p,N)=>Math.min(N-3,p.nB+p.nDown);
  // one recovery tick (shared by the sim and the planner): pose from the plan, then the model placed by the stance
  function recPlace(S,n){
    const i=S.i,g=S.g,H=S.H,mx=i.mixer,footLow=GLShot.footLow,k=S.k0+n,a=S.row(k);
    H.position.set(a.x,0,a.z);H.rotation.set(0,a.yaw,0);H.updateMatrixWorld(true);
    const w=weights(S.plan,n);
    const set=(act,t,wt)=>{if(!act)return;act.enabled=true;act.paused=false;act.time=t;act.setEffectiveWeight(wt);};
    for(const act of S.others)act.setEffectiveWeight(0);
    set(S.kick,Math.min(S.kdur-1e-4,S.kt0+n/60),w.K);set(S.idle,n/60,w.I);if(S.X&&S.X!==S.idle&&S.X!==S.kick)set(S.X,w.xt,w.X);
    mx.update(0);
    i.root.position.set(g.calib.x+S.O[0],g.calib.y,g.calib.z+S.O[1]);i.root.quaternion.copy(g.calibQ);upd(i);
    // the feet's lowest points once (the lift moves them up by exactly the lift; the horizontal moves do not change them)
    let lowL=footLow(g.L).low,lowR=footLow(g.R).low,lift=0;
    if(S.clamp){const lo=Math.min(lowL,lowR);if(lo<0){lift=-lo;i.root.position.y+=lift;upd(i);lowL+=lift;lowR+=lift;}}
    let d=V(),mode='none';
    if(n<S.tr){const L=g.by.LeftFoot.getWorldPosition(V()).setY(0),R=g.by.RightFoot.getWorldPosition(V()).setY(0),gl=lowL<S.grounded,gr=lowR<S.grounded;
      if(gl&&!S.anch.L)S.anch.L=L.clone();if(!gl)S.anch.L=null;if(gr&&!S.anch.R)S.anch.R=R.clone();if(!gr)S.anch.R=null;
      if(gl&&gr){d=V().subVectors(S.anch.L,L).add(V().subVectors(S.anch.R,R)).multiplyScalar(0.5);mode='both';}
      else if(gl){d=V().subVectors(S.anch.L,L);mode='L';}else if(gr){d=V().subVectors(S.anch.R,R);mode='R';}
      const lc=d.clone().applyQuaternion(H.getWorldQuaternion(Q()).invert());S.O=[S.O[0]+lc.x,S.O[1]+lc.z];}
    else{if(!S.Otr)S.Otr=S.O.slice();const r=smooth((n-S.tr+1)/Math.max(1,S.N-S.tr+1));S.O=[S.Otr[0]*(1-r),S.Otr[1]*(1-r)];mode='release';}
    i.root.position.x=g.calib.x+S.O[0];i.root.position.z=g.calib.z+S.O[1];upd(i);
    return {w,lift,mode,lowL,lowR,ball:V().fromArray(a.ball)};}
  function newState(i,g,cfg,acts,k0,kt0,O0){
    const others=[...new Set([acts.prev,acts.back,acts.kick,acts.X].filter(Boolean))].filter(x=>x!==acts.kick&&x!==acts.back&&x!==acts.X);
    for(const act of [acts.kick,acts.back,acts.X].filter(Boolean)){act.stopFading();act.stopWarping();act.enabled=true;act.paused=false;act.setEffectiveTimeScale(0);if(!act.isRunning())act.play();}
    for(const act of others){act.stopFading();act.setEffectiveTimeScale(0);}
    const G=cfg.game,N=Math.round(cfg.lastT*60)-k0;
    return {i,g,H:i.holder,row:k=>G[Math.min(G.length-1,Math.max(0,k))],plan:cfg.step,k0,kt0,kdur:acts.kick.getClip().duration,kick:acts.kick,idle:acts.back,X:acts.X,others,
      O:O0.slice(),anch:{L:null,R:null},clamp:!!cfg.groundClamp,grounded:cfg.grounded,N,tr:releaseAt(cfg.step,N),Otr:null};}
  function sim(i,cfg){
    const g=GLShot.rig(i),mx=i.mixer,footLow=GLShot.footLow,joint=GLShot.joint;mx.stopAllAction();i.cur=null;
    const prev=mx.clipAction(cfg.prev),kick=mx.clipAction(cfg.kick),back=cfg.back===cfg.prev?prev:mx.clipAction(cfg.back);
    const X=cfg.step&&cfg.step.src?mx.clipAction(cfg.step.src):null;
    for(const a of new Set([prev,kick,back,X].filter(Boolean))){a.reset();a.setEffectiveWeight(1);a.setEffectiveTimeScale(1);}
    if(X&&X!==prev&&X!==back){X.setLoop(THREE.LoopRepeat,Infinity);X.setEffectiveWeight(0);}
    prev.setLoop(THREE.LoopRepeat,Infinity);back.setLoop(THREE.LoopRepeat,Infinity);kick.setLoop(THREE.LoopOnce,1);kick.clampWhenFinished=true;
    prev.play();for(let k=0;k<30;k++)mx.update(1/60);
    const H=i.holder,dt=1/60,SUB=4,rows=[],subs=[],G=cfg.game,row=k=>G[Math.min(G.length-1,Math.max(0,k))];
    const pts=(cfg.bodyPoints||[]).map(n=>n==='Spine2'?(g.by.Spine2||g.by.Spine1):g.by[n]);
    let started=false,backed=false,lockP=null,lockC=[0,0],disp=null,corr=V(),infeasible=0;
    const k0=Math.round(cfg.backAt*60);let S=null;
    const place=(t,k,frac,tick)=>{
      if(S&&k>k0){const P=recPlace(S,k-k0);return {wk:P.w.K,o:[0,0],pp:[0,0],c:[0,0],lift:P.lift,dc:[0,0],ball:P.ball,rec:P};}
      const a=row(k),b=row(k+1),f=frac,lx=a.x+(b.x-a.x)*f,lz=a.z+(b.z-a.z)*f,ly=a.yaw+(b.yaw-a.yaw)*f;
      H.position.set(lx,0,lz);H.rotation.set(0,ly,0);H.updateMatrixWorld(true);
      const wk=kick.isScheduled()?kick.getEffectiveWeight():0,o=cfg.off(t,kick.time,wk);
      i.root.position.set(g.calib.x+o[0],g.calib.y,g.calib.z+o[1]);i.root.quaternion.copy(g.calibQ);
      let pp=[0,0];if(cfg.post){pp=cfg.post(t,kick.time,wk);i.root.position.x+=pp[0];i.root.position.z+=pp[1];}
      upd(i);
      let c=[0,0];
      if(cfg.lock&&t>=cfg.lock.from-1e-9){const p=g.by.LeftFoot.getWorldPosition(V()),inv=H.matrixWorld.clone().invert();
        if(!lockP)lockP=p.clone();
        if(t<=cfg.lock.to+1e-9){const q=lockP.clone().applyMatrix4(inv),r=p.clone().applyMatrix4(inv);lockC=[q.x-r.x,q.z-r.z];c=lockC;}
        else c=[lockC[0]*wk,lockC[1]*wk];
        i.root.position.x+=c[0];i.root.position.z+=c[1];upd(i);}
      let lift=0;if(cfg.groundClamp){const lo=Math.min(footLow(g.L).low,footLow(g.R).low);if(lo<0){lift=-lo;i.root.position.y+=lift;upd(i);}}
      let dc=[0,0];
      if(pts.length&&cfg.bodyLimit){const N=pts.map(p=>p.getWorldPosition(V()));
        if(tick){if(!disp){disp=N.map(p=>p.clone());corr.set(0,0,0);}else{const L=cfg.bodyLimit(k);
          const discs=N.map((p,j)=>{const dy=p.y-disp[j].y;return {c:V().subVectors(disp[j],p).setY(0),r:Math.sqrt(Math.max(0,L*L-dy*dy))};});
          let x=V();for(let it=0;it<40;it++)for(const d of discs)x=toDisc(x,d.c,d.r);
          if(discs.some(d=>V().subVectors(x,d.c).setY(0).length()>d.r+1e-6))infeasible++;
          corr.copy(x).setY(0);disp=N.map(p=>p.clone().add(corr));}}
        const lc=corr.clone().applyQuaternion(H.getWorldQuaternion(Q()).invert());i.root.position.x+=lc.x;i.root.position.z+=lc.z;upd(i);dc=[lc.x,lc.z];}
      return {wk,o,pp,c,lift,dc,ball:V().fromArray(a.ball).lerp(V().fromArray(b.ball),f)};};
    for(let k=0;k*dt<=cfg.tEnd+1e-9;k++){const t=k*dt;
      if(!started&&k>=Math.round(cfg.kickStart*60)){started=true;kick.reset();kick.play();kick.time=cfg.t0-(k>0?dt:0);if(cfg.xfIn>0)prev.crossFadeTo(kick,cfg.xfIn,false);else prev.stop();mx.update(0);}
      // with a step the crossfade back is not started: the recovery takes over after this tick
      if(!backed&&k>=k0){backed=true;if(!cfg.step){back.reset();back.setEffectiveWeight(1);back.play();if(cfg.xfOut>0)kick.crossFadeTo(back,cfg.xfOut,false);else kick.stop();}}
      if(k>0){for(let s=1;s<=SUB;s++){mx.update(dt/SUB);const ts=(k-1)*dt+s*dt/SUB;
        if(cfg.sub&&s<SUB&&ts>=cfg.sub.from-1e-9&&ts<=cfg.sub.to+1e-9){const P=place(ts,k-1,s/SUB,false);
          subs.push({t:+ts.toFixed(5),gap:footLow(g.R,P.ball).gap,rToe:arr(g.by.RightToeBase.getWorldPosition(V())),kickTime:+kick.time.toFixed(4)});}}}
      const P=place(t,k,0,true),ball=P.ball;
      // the state at the fade back tick: the recovery starts from here (the model's offset from the game player as R0 has it)
      if(cfg.step&&k===k0&&!S){const inv=H.matrixWorld.clone().invert(),rl=i.root.position.clone();S=newState(i,g,cfg,{prev,back,kick,X},k0,kick.time,[rl.x-g.calib.x,rl.z-g.calib.z]);
        if(cfg.stopAt==='back')return {state:S};}
      const J=n=>{const p=joint(g,n);return p?arr(p):null;};
      const L=footLow(g.L,ball),R=footLow(g.R,ball);
      const lr=g.by.LeftUpLeg.getWorldPosition(V()).sub(g.by.RightUpLeg.getWorldPosition(V()));
      const ankW=g.by.LeftFoot.getWorldPosition(V()),rAnkW=g.by.RightFoot.getWorldPosition(V());
      const r={t:+t.toFixed(4),k,player:[+H.position.x.toFixed(4),+H.position.z.toFixed(4)],yaw:+H.rotation.y.toFixed(4),kickTime:started?+kick.time.toFixed(4):null,kickWeight:+P.wk.toFixed(3),
        off:[+P.o[0].toFixed(4),+P.o[1].toFixed(4)],psi:0,lock:[+P.c[0].toFixed(4),+P.c[1].toFixed(4)],lift:+P.lift.toFixed(4),ball:arr(ball),
        root:arr(i.root.getWorldPosition(V())),hips:J('Hips'),chest:J('Spine2')||J('Spine1'),
        lUp:J('LeftUpLeg'),lKnee:J('LeftLeg'),lAnk:J('LeftFoot'),lToe:J('LeftToeBase'),lToeEnd:J('LeftToe_End'),
        rUp:J('RightUpLeg'),rKnee:J('RightLeg'),rAnk:J('RightFoot'),rToe:J('RightToeBase'),rToeEnd:J('RightToe_End'),L,R,
        pelvisYaw:+Math.atan2(-lr.z,lr.x).toFixed(4),dShift:[+P.dc[0].toFixed(4),+P.dc[1].toFixed(4)],
        X:{ankW:arr6(ankW),rAnkW:arr6(rAnkW),wKick:+(P.rec?P.rec.w.K:(kick.isScheduled()?kick.getEffectiveWeight():0)).toFixed(4),wIdle:+(P.rec?P.rec.w.I:(back.isScheduled()?back.getEffectiveWeight():0)).toFixed(4),wSwing:P.rec?+P.rec.w.X.toFixed(4):0,
          swingTime:P.rec?+P.rec.w.xt.toFixed(4):null,stance:P.rec?P.rec.mode:null,offset:S&&k>k0?[+S.O[0].toFixed(5),+S.O[1].toFixed(5)]:null}};
      if(cfg.sub&&t>=cfg.sub.from-1e-9&&t<=cfg.sub.to+1e-9)subs.push({t:+t.toFixed(5),gap:R.gap,rToe:r.rToe,kickTime:r.kickTime});
      rows.push(r);}
    mx.stopAllAction();H.position.set(0,0,0);H.rotation.set(0,0,0);i.root.position.copy(g.calib);i.root.quaternion.copy(g.calibQ);upd(i);
    for(const a of [prev,kick,back,X].filter(Boolean))a.setEffectiveTimeScale(1);
    subs.sort((a,b)=>a.t-b.t);
    return {rows,subs,infeasible};
  }
  // a plan played from the fade-back state: per tick the feet (world, horizontal), their lowest points, hips and chest
  function evalPlan(i,base,plan){
    const g=GLShot.rig(i),footLow=GLShot.footLow;
    const S=Object.assign({},base,{plan,O:base.O0.slice(),anch:{L:null,R:null},Otr:null,tr:releaseAt(plan,base.N)});
    S.X=plan.src?i.mixer.clipAction(plan.src):null;if(S.X&&S.X!==S.idle&&S.X!==S.kick){S.X.setLoop(THREE.LoopRepeat,Infinity);S.X.stopFading();S.X.setEffectiveTimeScale(0);if(!S.X.isRunning())S.X.play();}
    S.others=base.allActs.filter(a=>a!==S.kick&&a!==S.idle&&a!==S.X);
    const out=[];for(let n=1;n<=S.N;n++){const P=recPlace(S,n);
      const L=g.by.LeftFoot.getWorldPosition(V()),R=g.by.RightFoot.getWorldPosition(V()),h=g.by.Hips.getWorldPosition(V()),c=(g.by.Spine2||g.by.Spine1).getWorldPosition(V());
      out.push({n,L:[L.x,L.z],R:[R.x,R.z],lowL:+P.lowL.toFixed(4),lowR:+P.lowR.toFixed(4),hips:h.toArray(),chest:c.toArray(),player:[S.H.position.x,S.H.position.z],O:S.O.slice(),mode:P.mode,w:P.w});}
    return out;}
  // the planner: the grid's candidates scored from the fade-back state; returns the best and the scores
  function plan(i,cfg,grid,score){
    const st=sim(i,Object.assign({},cfg,{stopAt:'back'})).state;
    const base={i,g:st.g,H:st.H,row:st.row,k0:st.k0,kt0:st.kt0,kdur:st.kdur,kick:st.kick,idle:st.idle,O0:st.O.slice(),clamp:st.clamp,grounded:st.grounded,N:st.N,
      allActs:[...new Set(i.mixer._actions)]};
    // the state's own first tick (n = 0): the feet as R0 places them at the fade back
    const g=st.g,L0=g.by.LeftFoot.getWorldPosition(V()),R0=g.by.RightFoot.getWorldPosition(V()),h0=g.by.Hips.getWorldPosition(V()),c0=(g.by.Spine2||g.by.Spine1).getWorldPosition(V());
    const first={n:0,L:[L0.x,L0.z],R:[R0.x,R0.z],lowL:GLShot.footLow(g.L).low,lowR:GLShot.footLow(g.R).low,hips:h0.toArray(),chest:c0.toArray()};
    let best=null;const scores=[];
    for(const p of grid){const rows=[first,...evalPlan(i,base,p)];const s=score(rows,p);scores.push(s.cost);if(!best||s.cost<best.s.cost)best={p,s};}
    i.mixer.stopAllAction();for(const a of base.allActs)a.setEffectiveTimeScale(1);
    i.holder.position.set(0,0,0);i.holder.rotation.set(0,0,0);i.root.position.copy(g.calib);i.root.quaternion.copy(g.calibQ);upd(i);
    return {best:best.p,bestScore:best.s,n:grid.length,costs:scores.slice().sort((a,b)=>a-b).slice(0,5)};}
  return {sim,plan,evalPlan,weights};
})();
