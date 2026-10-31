'use strict';
// Tuning lab for 143_24 on top of variant F (prototype only; the game does not load this). GLTune.sim is GLDiag.sim
// (diag_lab.js) with the body speed limit generalised: bodyPoints lists which body points the limit holds ('Hips',
// 'Spine2' for the chest, or both). For each tick the whole model is shifted by the smallest horizontal correction
// that keeps every listed point within bodyLimit(k) of where it was shown on the previous tick (the same rule as
// GLDiag's hips-only limit, which it reproduces when bodyPoints is ['Hips']). Everything else is GLDiag.sim's.
window.GLTune=(()=>{
  const V=()=>new THREE.Vector3(),Q=()=>new THREE.Quaternion();
  const upd=i=>{i.root.updateWorldMatrix(true,false);i.root.updateMatrixWorld(true);};
  const arr=v=>[+v.x.toFixed(4),+v.y.toFixed(4),+v.z.toFixed(4)];
  // the point of the disc (centre c, radius r, horizontal) nearest to p
  const toDisc=(p,c,r)=>{const d=V().subVectors(p,c).setY(0),l=d.length();return l<=r?p.clone():c.clone().add(d.multiplyScalar(r/l)).setY(0);};
  function sim(i,cfg){
    const g=GLShot.rig(i),mx=i.mixer,footLow=GLShot.footLow,joint=GLShot.joint;mx.stopAllAction();i.cur=null;
    const prev=mx.clipAction(cfg.prev),kick=mx.clipAction(cfg.kick),back=cfg.back===cfg.prev?prev:mx.clipAction(cfg.back);
    for(const a of new Set([prev,kick,back])){a.reset();a.setEffectiveWeight(1);a.setEffectiveTimeScale(1);}
    prev.setLoop(THREE.LoopRepeat,Infinity);back.setLoop(THREE.LoopRepeat,Infinity);kick.setLoop(THREE.LoopOnce,1);kick.clampWhenFinished=true;
    prev.play();for(let k=0;k<30;k++)mx.update(1/60);
    const H=i.holder,dt=1/60,SUB=4,rows=[],subs=[],G=cfg.game,row=k=>G[Math.min(G.length-1,Math.max(0,k))];
    const pts=(cfg.bodyPoints||[]).map(n=>n==='Spine2'?(g.by.Spine2||g.by.Spine1):g.by[n]);
    let started=false,backed=false,lockP=null,lockC=[0,0],disp=null,corr=V(),infeasible=0;
    const place=(t,k,frac,tick)=>{
      const a=row(k),b=row(k+1),f=frac,lx=a.x+(b.x-a.x)*f,lz=a.z+(b.z-a.z)*f,ly=a.yaw+(b.yaw-a.yaw)*f;
      H.position.set(lx,0,lz);H.rotation.set(0,ly,0);H.updateMatrixWorld(true);
      const wk=kick.isScheduled()?kick.getEffectiveWeight():0,o=cfg.off(t,kick.time,wk);
      i.root.position.set(g.calib.x+o[0],g.calib.y,g.calib.z+o[1]);i.root.quaternion.copy(g.calibQ);
      if(cfg.post){const pp=cfg.post(t,kick.time,wk);i.root.position.x+=pp[0];i.root.position.z+=pp[1];}
      upd(i);
      let c=[0,0];
      if(cfg.lock&&t>=cfg.lock.from-1e-9){const p=g.by.LeftFoot.getWorldPosition(V()),inv=H.matrixWorld.clone().invert();
        if(!lockP)lockP=p.clone();
        if(t<=cfg.lock.to+1e-9){const q=lockP.clone().applyMatrix4(inv),r=p.clone().applyMatrix4(inv);lockC=[q.x-r.x,q.z-r.z];c=lockC;}
        else c=[lockC[0]*wk,lockC[1]*wk];
        i.root.position.x+=c[0];i.root.position.z+=c[1];upd(i);}
      let lift=0;if(cfg.groundClamp){const lo=Math.min(footLow(g.L).low,footLow(g.R).low);if(lo<0){lift=-lo;i.root.position.y+=lift;upd(i);}}
      // the body limit: on whole ticks, the smallest shift that keeps every listed point within the limit of where it was
      // shown last tick (alternating projections onto the discs; between ticks the last tick's shift stays)
      let dc=[0,0];
      if(pts.length&&cfg.bodyLimit){const N=pts.map(p=>p.getWorldPosition(V()));
        if(tick){if(!disp){disp=N.map(p=>p.clone());corr.set(0,0,0);}else{const L=cfg.bodyLimit(k);
          const discs=N.map((p,j)=>{const dy=p.y-disp[j].y;return {c:V().subVectors(disp[j],p).setY(0),r:Math.sqrt(Math.max(0,L*L-dy*dy))};});
          let x=V();for(let it=0;it<40;it++)for(const d of discs)x=toDisc(x,d.c,d.r);
          if(discs.some(d=>V().subVectors(x,d.c).setY(0).length()>d.r+1e-6))infeasible++;
          corr.copy(x).setY(0);disp=N.map(p=>p.clone().add(corr));}}
        const lc=corr.clone().applyQuaternion(H.getWorldQuaternion(Q()).invert());i.root.position.x+=lc.x;i.root.position.z+=lc.z;upd(i);dc=[lc.x,lc.z];}
      return {wk,o,c,lift,dc,ball:V().fromArray(a.ball).lerp(V().fromArray(b.ball),f)};};
    for(let k=0;k*dt<=cfg.tEnd+1e-9;k++){const t=k*dt;
      if(!started&&k>=Math.round(cfg.kickStart*60)){started=true;kick.reset();kick.play();kick.time=cfg.t0-(k>0?dt:0);if(cfg.xfIn>0)prev.crossFadeTo(kick,cfg.xfIn,false);else prev.stop();mx.update(0);}
      if(!backed&&k>=Math.round(cfg.backAt*60)){backed=true;back.reset();back.setEffectiveWeight(1);back.play();if(cfg.xfOut>0)kick.crossFadeTo(back,cfg.xfOut,false);else kick.stop();}
      if(k>0){for(let s=1;s<=SUB;s++){mx.update(dt/SUB);const ts=(k-1)*dt+s*dt/SUB;
        if(cfg.sub&&s<SUB&&ts>=cfg.sub.from-1e-9&&ts<=cfg.sub.to+1e-9){const P=place(ts,k-1,s/SUB,false);
          subs.push({t:+ts.toFixed(5),gap:footLow(g.R,P.ball).gap,rToe:arr(g.by.RightToeBase.getWorldPosition(V())),kickTime:+kick.time.toFixed(4)});}}}
      const P=place(t,k,0,true),ball=P.ball;
      const J=n=>{const p=joint(g,n);return p?arr(p):null;};
      const L=footLow(g.L,ball),R=footLow(g.R,ball);
      const lr=g.by.LeftUpLeg.getWorldPosition(V()).sub(g.by.RightUpLeg.getWorldPosition(V()));
      const r={t:+t.toFixed(4),k,player:[+H.position.x.toFixed(4),+H.position.z.toFixed(4)],yaw:+H.rotation.y.toFixed(4),kickTime:started?+kick.time.toFixed(4):null,kickWeight:+P.wk.toFixed(3),
        off:[+P.o[0].toFixed(4),+P.o[1].toFixed(4)],psi:0,lock:[+P.c[0].toFixed(4),+P.c[1].toFixed(4)],lift:+P.lift.toFixed(4),ball:arr(ball),
        root:arr(i.root.getWorldPosition(V())),hips:J('Hips'),chest:J('Spine2')||J('Spine1'),
        lUp:J('LeftUpLeg'),lKnee:J('LeftLeg'),lAnk:J('LeftFoot'),lToe:J('LeftToeBase'),lToeEnd:J('LeftToe_End'),
        rUp:J('RightUpLeg'),rKnee:J('RightLeg'),rAnk:J('RightFoot'),rToe:J('RightToeBase'),rToeEnd:J('RightToe_End'),L,R,
        pelvisYaw:+Math.atan2(-lr.z,lr.x).toFixed(4),dShift:[+P.dc[0].toFixed(4),+P.dc[1].toFixed(4)]};
      if(cfg.sub&&t>=cfg.sub.from-1e-9&&t<=cfg.sub.to+1e-9)subs.push({t:+t.toFixed(5),gap:R.gap,rToe:r.rToe,kickTime:r.kickTime});
      rows.push(r);}
    mx.stopAllAction();H.position.set(0,0,0);H.rotation.set(0,0,0);i.root.position.copy(g.calib);i.root.quaternion.copy(g.calibQ);upd(i);
    subs.sort((a,b)=>a.t-b.t);
    return {rows,subs,infeasible};
  }
  return {sim};
})();
