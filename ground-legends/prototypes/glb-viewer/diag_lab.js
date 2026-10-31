'use strict';
// Diagnosis lab for one take (prototype only; the game does not load this). GLDiag.sim is GLShot.sim (shot_lab.js)
// line for line, plus three switches the shot lab does not have, each off unless asked for:
//   bodyLimit(k) -> m: D, the hips kept from moving further in one tick than that (horizontally, a whole-model shift
//     that follows the natural hips at that speed and lets go when they slow down);
//   plantIK {S:[x,z], w(t)}: the plant (left) ankle moved by w(t)*S in the player's frame with a two-bone leg IK (thigh
//     and knee turned, the foot's own orientation kept): only that leg changes;
//   shiftAll(t) -> [x,z]: the whole model moved (for measuring what a body shift would cost, not a candidate).
// It also records the pelvis heading (from the hip joints). With none of the switches it gives what GLShot.sim gives
// (check: diag_143.js compares the two on the same shot).
window.GLDiag=(()=>{
  const V=()=>new THREE.Vector3(),Q=()=>new THREE.Quaternion();
  const upd=i=>{i.root.updateWorldMatrix(true,false);i.root.updateMatrixWorld(true);};
  const arr=v=>[+v.x.toFixed(4),+v.y.toFixed(4),+v.z.toFixed(4)];
  // two-bone IK on one leg: the ankle to `T` (world), the foot keeps its world orientation
  function legIK(g,side,T){
    const up=g.by[side+'UpLeg'],kn=g.by[side+'Leg'],ft=g.by[side+'Foot'];
    const qF=ft.getWorldQuaternion(Q()),h=up.getWorldPosition(V()),k=kn.getWorldPosition(V()),a=ft.getWorldPosition(V());
    const l1=k.distanceTo(h),l2=a.distanceTo(k),d=Math.max(Math.abs(l1-l2)+1e-4,Math.min(l1+l2-1e-4,T.distanceTo(h)));
    // knee: change the angle between thigh and shin so that hip-to-ankle is d (about the knee's own bending axis)
    const n=V().crossVectors(V().subVectors(h,k),V().subVectors(a,k));
    if(n.lengthSq()>1e-12){n.normalize();const th=V().subVectors(h,k).angleTo(V().subVectors(a,k)),want=Math.acos(Math.max(-1,Math.min(1,(l1*l1+l2*l2-d*d)/(2*l1*l2))));
      const q0=kn.quaternion.clone(),pq=kn.parent.getWorldQuaternion(Q()),axL=n.clone().applyQuaternion(pq.clone().invert());let best=null;
      for(const s of [1,-1]){kn.quaternion.copy(q0).premultiply(Q().setFromAxisAngle(axL,s*(want-th)));kn.updateMatrixWorld(true);const e=Math.abs(ft.getWorldPosition(V()).distanceTo(h)-d);if(!best||e<best.e)best={e,q:kn.quaternion.clone()};}
      kn.quaternion.copy(best.q);kn.updateMatrixWorld(true);}
    // thigh: turn hip-to-ankle onto hip-to-target
    const a2=ft.getWorldPosition(V()),q=Q().setFromUnitVectors(V().subVectors(a2,h).normalize(),V().subVectors(T,h).normalize()),pq=up.parent.getWorldQuaternion(Q());
    up.quaternion.premultiply(pq.clone().invert().multiply(q).multiply(pq));up.updateMatrixWorld(true);
    // foot: back to its world orientation
    ft.quaternion.copy(kn.getWorldQuaternion(Q()).invert().multiply(qF));ft.updateMatrixWorld(true);
    return ft.getWorldPosition(V()).distanceTo(T);
  }
  function sim(i,cfg){
    const g=GLShot.rig(i),mx=i.mixer,footLow=GLShot.footLow,joint=GLShot.joint;mx.stopAllAction();i.cur=null;
    const prev=mx.clipAction(cfg.prev),kick=mx.clipAction(cfg.kick),back=cfg.back===cfg.prev?prev:mx.clipAction(cfg.back);
    for(const a of new Set([prev,kick,back])){a.reset();a.setEffectiveWeight(1);a.setEffectiveTimeScale(1);}
    prev.setLoop(THREE.LoopRepeat,Infinity);back.setLoop(THREE.LoopRepeat,Infinity);kick.setLoop(THREE.LoopOnce,1);kick.clampWhenFinished=true;
    prev.play();for(let k=0;k<30;k++)mx.update(1/60);
    const H=i.holder,dt=1/60,SUB=4,rows=[],subs=[],G=cfg.game,row=k=>G[Math.min(G.length-1,Math.max(0,k))];
    let started=false,backed=false,lockP=null,lockC=[0,0];
    let dDisp=null,dCorr=V(),ikErr=0;   // D: the hips shown last tick, and the shift that keeps them there (world)
    const place=(t,k,frac,tick)=>{
      const a=row(k),b=row(k+1),f=frac,lx=a.x+(b.x-a.x)*f,lz=a.z+(b.z-a.z)*f,ly=a.yaw+(b.yaw-a.yaw)*f;
      H.position.set(lx,0,lz);H.rotation.set(0,ly,0);H.updateMatrixWorld(true);
      const wk=kick.isScheduled()?kick.getEffectiveWeight():0,o=cfg.off(t,kick.time,wk);
      i.root.position.set(g.calib.x+o[0],g.calib.y,g.calib.z+o[1]);i.root.quaternion.copy(g.calibQ);
      const psi=cfg.yaw?cfg.yaw(t,kick.time,wk):0;
      if(psi){const c=cfg.pivot,dx=i.root.position.x-c[0],dz=i.root.position.z-c[1],cs=Math.cos(psi),sn=Math.sin(psi);
        i.root.position.x=c[0]+dx*cs+dz*sn;i.root.position.z=c[1]-dx*sn+dz*cs;i.root.quaternion.premultiply(Q().setFromAxisAngle(V().set(0,1,0),psi));}
      if(cfg.post){const pp=cfg.post(t,kick.time,wk);i.root.position.x+=pp[0];i.root.position.z+=pp[1];}
      if(cfg.shiftAll){const pp=cfg.shiftAll(t,kick.time,wk);i.root.position.x+=pp[0];i.root.position.z+=pp[1];}
      upd(i);
      let c=[0,0];
      if(cfg.lock&&t>=cfg.lock.from-1e-9){const p=g.by.LeftFoot.getWorldPosition(V()),inv=H.matrixWorld.clone().invert();
        if(!lockP)lockP=p.clone();
        if(t<=cfg.lock.to+1e-9){const q=lockP.clone().applyMatrix4(inv),r=p.clone().applyMatrix4(inv);lockC=[q.x-r.x,q.z-r.z];c=lockC;}
        else c=[lockC[0]*wk,lockC[1]*wk];
        i.root.position.x+=c[0];i.root.position.z+=c[1];upd(i);}
      let lift=0;if(cfg.groundClamp){const lo=Math.min(footLow(g.L).low,footLow(g.R).low);if(lo<0){lift=-lo;i.root.position.y+=lift;upd(i);}}
      // D: on whole ticks, the hips follow their natural place at no more than bodyLimit(k) per tick (horizontally);
      // between ticks (the contact samples) the last tick's shift stays
      let dc=[0,0];
      if(cfg.bodyLimit){const N=g.by.Hips.getWorldPosition(V());
        if(tick){if(!dDisp){dDisp=N.clone();dCorr.set(0,0,0);}else{const L=cfg.bodyLimit(k),dy=N.y-dDisp.y,Lh=Math.sqrt(Math.max(0,L*L-dy*dy)),d=V().subVectors(N,dDisp).setY(0);
          if(d.length()>Lh)d.setLength(Lh);const disp=dDisp.clone().add(d);disp.y=N.y;dCorr.subVectors(disp,N).setY(0);dDisp=disp;}}
        const lc=dCorr.clone().applyQuaternion(H.getWorldQuaternion(Q()).invert());i.root.position.x+=lc.x;i.root.position.z+=lc.z;upd(i);dc=[lc.x,lc.z];}
      // plant IK: the plant ankle moved by w*S (player frame) with the leg alone
      let ik=0;
      if(cfg.plantIK){const w=cfg.plantIK.w(t);if(w>0){const s=V().set(cfg.plantIK.S[0]*w,0,cfg.plantIK.S[1]*w).applyQuaternion(H.getWorldQuaternion(Q())),T=g.by.LeftFoot.getWorldPosition(V()).add(s);
        ik=legIK(g,'Left',T);upd(i);if(tick)ikErr=Math.max(ikErr,ik);}}
      return {wk,o,c,lift,psi,dc,ik,ball:V().fromArray(a.ball).lerp(V().fromArray(b.ball),f)};};
    for(let k=0;k*dt<=cfg.tEnd+1e-9;k++){const t=k*dt;
      if(!started&&k>=Math.round(cfg.kickStart*60)){started=true;kick.reset();kick.play();kick.time=cfg.t0-(k>0?dt:0);if(cfg.xfIn>0)prev.crossFadeTo(kick,cfg.xfIn,false);else prev.stop();mx.update(0);}
      if(!backed&&k>=Math.round(cfg.backAt*60)){backed=true;back.reset();back.setEffectiveWeight(1);back.play();if(cfg.xfOut>0)kick.crossFadeTo(back,cfg.xfOut,false);else kick.stop();}
      if(k>0){for(let s=1;s<=SUB;s++){mx.update(dt/SUB);const ts=(k-1)*dt+s*dt/SUB;
        if(cfg.sub&&s<SUB&&ts>=cfg.sub.from-1e-9&&ts<=cfg.sub.to+1e-9){const P=place(ts,k-1,s/SUB,false);
          subs.push({t:+ts.toFixed(5),gap:footLow(g.R,P.ball).gap,rToe:arr(g.by.RightToeBase.getWorldPosition(V())),kickTime:+kick.time.toFixed(4)});}}}
      const P=place(t,k,0,true),ball=P.ball;
      const J=n=>{const p=joint(g,n);return p?arr(p):null;};
      const L=footLow(g.L,ball),R=footLow(g.R,ball);
      const lu=g.by.LeftUpLeg.getWorldPosition(V()),ru=g.by.RightUpLeg.getWorldPosition(V()),lr=lu.sub(ru);
      const r={t:+t.toFixed(4),k,player:[+H.position.x.toFixed(4),+H.position.z.toFixed(4)],yaw:+H.rotation.y.toFixed(4),kickTime:started?+kick.time.toFixed(4):null,kickWeight:+P.wk.toFixed(3),
        off:[+P.o[0].toFixed(4),+P.o[1].toFixed(4)],psi:+P.psi.toFixed(4),lock:[+P.c[0].toFixed(4),+P.c[1].toFixed(4)],lift:+P.lift.toFixed(4),ball:arr(ball),
        root:arr(i.root.getWorldPosition(V())),hips:J('Hips'),chest:J('Spine2')||J('Spine1'),
        lUp:J('LeftUpLeg'),lKnee:J('LeftLeg'),lAnk:J('LeftFoot'),lToe:J('LeftToeBase'),lToeEnd:J('LeftToe_End'),
        rUp:J('RightUpLeg'),rKnee:J('RightLeg'),rAnk:J('RightFoot'),rToe:J('RightToeBase'),rToeEnd:J('RightToe_End'),L,R,
        // extra: the pelvis heading (0 = facing +z, as the player's yaw), D's shift, the leg IK's miss
        pelvisYaw:+Math.atan2(-lr.z,lr.x).toFixed(4),dShift:[+P.dc[0].toFixed(4),+P.dc[1].toFixed(4)],ikMiss:+P.ik.toFixed(4)};
      if(cfg.sub&&t>=cfg.sub.from-1e-9&&t<=cfg.sub.to+1e-9)subs.push({t:+t.toFixed(5),gap:R.gap,rToe:r.rToe,kickTime:r.kickTime});
      rows.push(r);
      if(cfg.stopAt!=null&&t>=cfg.stopAt-1e-9)break;}
    if(cfg.stopAt==null){mx.stopAllAction();H.position.set(0,0,0);H.rotation.set(0,0,0);i.root.position.copy(g.calib);i.root.quaternion.copy(g.calibQ);upd(i);}
    subs.sort((a,b)=>a.t-b.t);
    return {rows,subs,ikMissMax:+ikErr.toFixed(4)};
  }
  return {sim,legIK};
})();
