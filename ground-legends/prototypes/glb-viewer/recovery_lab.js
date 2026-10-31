'use strict';
// Fade-back lab for 143_24 (prototype only; the game does not load this). GLRecovery.sim is GLTune.sim (tune_lab.js)
// line for line, plus:
//   fb {mode:'R1'|'R2'|'R3', order:'p'|'b', from, fadeEnd, end}: a hold of the plant (left) ankle in the world during
//     the fade back, made by moving the whole model sideways (no leg IK, no joint changed):
//       R1  from the first tick the plant foot is on the ground at or after `from` to `fadeEnd`, held in full; the
//           shift then goes back to zero by `end` (smoothstep), so the model is on the player again at the end;
//       R2  the same anchor, the hold's strength the kick's weight (1 at the fade's start, 0 at its end): the shift is
//           gone when the fade is;
//       R3  held only on ticks the plant foot is on the ground (lowest point < `grounded`); when it lifts the shift
//           goes to zero over `airRelease` s, when it lands again it is held where it is shown; after `fadeEnd` as R1.
//     order 'p': applied after the body speed limit (the plant wins), 'b': before it (the body limit sees the hold).
//   per tick records for taking the fade back apart: the holder-frame root and plant ankle, each root shift, and the
//   weights of the kick and of the clip faded back to.
window.GLRecovery=(()=>{
  const V=()=>new THREE.Vector3(),Q=()=>new THREE.Quaternion();
  const upd=i=>{i.root.updateWorldMatrix(true,false);i.root.updateMatrixWorld(true);};
  const arr=v=>[+v.x.toFixed(4),+v.y.toFixed(4),+v.z.toFixed(4)];
  const arr6=v=>[+v.x.toFixed(6),+v.y.toFixed(6),+v.z.toFixed(6)];
  const toDisc=(p,c,r)=>{const d=V().subVectors(p,c).setY(0),l=d.length();return l<=r?p.clone():c.clone().add(d.multiplyScalar(r/l)).setY(0);};
  const smooth=x=>x<=0?0:x>=1?1:x*x*(3-2*x);
  function sim(i,cfg){
    const g=GLShot.rig(i),mx=i.mixer,footLow=GLShot.footLow,joint=GLShot.joint;mx.stopAllAction();i.cur=null;
    const prev=mx.clipAction(cfg.prev),kick=mx.clipAction(cfg.kick),back=cfg.back===cfg.prev?prev:mx.clipAction(cfg.back);
    for(const a of new Set([prev,kick,back])){a.reset();a.setEffectiveWeight(1);a.setEffectiveTimeScale(1);}
    prev.setLoop(THREE.LoopRepeat,Infinity);back.setLoop(THREE.LoopRepeat,Infinity);kick.setLoop(THREE.LoopOnce,1);kick.clampWhenFinished=true;
    prev.play();for(let k=0;k<30;k++)mx.update(1/60);
    const H=i.holder,dt=1/60,SUB=4,rows=[],subs=[],G=cfg.game,row=k=>G[Math.min(G.length-1,Math.max(0,k))];
    const pts=(cfg.bodyPoints||[]).map(n=>n==='Spine2'?(g.by.Spine2||g.by.Spine1):g.by[n]);
    let started=false,backed=false,lockP=null,lockC=[0,0],disp=null,corr=V(),infeasible=0;
    // the fade-back hold: anchor (world, horizontal), the shift now (world), the shift being let go and from when
    const FB=cfg.fb||null;let anchor=null,fbW=V(),relFrom=null,relAt=null,airFrom=null,airAt=null,fbOn=false;
    const fbApply=(t,k,tick,wk)=>{
      if(!FB||t<FB.from-1e-9)return [0,0];
      const p=g.by.LeftFoot.getWorldPosition(V()),low=footLow(g.L).low,grounded=low<FB.grounded,inFade=t<=FB.fadeEnd+1e-9;
      if(tick){
        if(inFade){
          if(FB.mode==='R3'){
            if(grounded){if(!anchor){anchor=p.clone().add(fbW).setY(0);airFrom=null;}fbW=V().subVectors(anchor,p).setY(0);}
            else{if(anchor){anchor=null;airFrom=fbW.clone();airAt=t;}const x=airFrom?smooth((t-airAt)/FB.airRelease):1;fbW=airFrom?airFrom.clone().multiplyScalar(1-x):V();}}
          else{if(!anchor&&grounded)anchor=p.clone().setY(0);
            if(anchor){const s=FB.mode==='R2'?wk:1;fbW=V().subVectors(anchor,p).setY(0).multiplyScalar(s);}}
          fbOn=!!anchor;}
        else{if(!relFrom){relFrom=fbW.clone();relAt=FB.fadeEnd;}const x=smooth((t-relAt)/Math.max(1e-6,FB.end-relAt));fbW=relFrom.clone().multiplyScalar(1-x);fbOn=false;}}
      const lc=fbW.clone().applyQuaternion(H.getWorldQuaternion(Q()).invert());i.root.position.x+=lc.x;i.root.position.z+=lc.z;upd(i);return [lc.x,lc.z];};
    const place=(t,k,frac,tick)=>{
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
      let fbc=[0,0];
      if(FB&&FB.order==='b')fbc=fbApply(t,k,tick,wk);
      let dc=[0,0];
      if(pts.length&&cfg.bodyLimit){const N=pts.map(p=>p.getWorldPosition(V()));
        if(tick){if(!disp){disp=N.map(p=>p.clone());corr.set(0,0,0);}else{const L=cfg.bodyLimit(k);
          const discs=N.map((p,j)=>{const dy=p.y-disp[j].y;return {c:V().subVectors(disp[j],p).setY(0),r:Math.sqrt(Math.max(0,L*L-dy*dy))};});
          let x=V();for(let it=0;it<40;it++)for(const d of discs)x=toDisc(x,d.c,d.r);
          if(discs.some(d=>V().subVectors(x,d.c).setY(0).length()>d.r+1e-6))infeasible++;
          corr.copy(x).setY(0);disp=N.map(p=>p.clone().add(corr));}}
        const lc=corr.clone().applyQuaternion(H.getWorldQuaternion(Q()).invert());i.root.position.x+=lc.x;i.root.position.z+=lc.z;upd(i);dc=[lc.x,lc.z];}
      if(FB&&FB.order==='p')fbc=fbApply(t,k,tick,wk);
      return {wk,o,pp,c,lift,dc,fbc,ball:V().fromArray(a.ball).lerp(V().fromArray(b.ball),f)};};
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
      const ankW=g.by.LeftFoot.getWorldPosition(V()),ankH=H.worldToLocal(ankW.clone()),rAnkW=g.by.RightFoot.getWorldPosition(V());
      const r={t:+t.toFixed(4),k,player:[+H.position.x.toFixed(4),+H.position.z.toFixed(4)],yaw:+H.rotation.y.toFixed(4),kickTime:started?+kick.time.toFixed(4):null,kickWeight:+P.wk.toFixed(3),
        off:[+P.o[0].toFixed(4),+P.o[1].toFixed(4)],psi:0,lock:[+P.c[0].toFixed(4),+P.c[1].toFixed(4)],lift:+P.lift.toFixed(4),ball:arr(ball),
        root:arr(i.root.getWorldPosition(V())),hips:J('Hips'),chest:J('Spine2')||J('Spine1'),
        lUp:J('LeftUpLeg'),lKnee:J('LeftLeg'),lAnk:J('LeftFoot'),lToe:J('LeftToeBase'),lToeEnd:J('LeftToe_End'),
        rUp:J('RightUpLeg'),rKnee:J('RightLeg'),rAnk:J('RightFoot'),rToe:J('RightToeBase'),rToeEnd:J('RightToe_End'),L,R,
        pelvisYaw:+Math.atan2(-lr.z,lr.x).toFixed(4),dShift:[+P.dc[0].toFixed(4),+P.dc[1].toFixed(4)],
        // the fade-back records (full precision for the decomposition)
        X:{px:H.position.x,pz:H.position.z,yaw:H.rotation.y,rootH:arr6(i.root.position),ankH:arr6(ankH),ankW:arr6(ankW),rAnkW:arr6(rAnkW),
          off:[P.o[0],P.o[1]],post:[P.pp[0],P.pp[1]],lock:[P.c[0],P.c[1]],dc:[P.dc[0],P.dc[1]],fb:[P.fbc[0],P.fbc[1]],lift:P.lift,
          wKick:kick.isScheduled()?+kick.getEffectiveWeight().toFixed(4):0,wBack:back.isScheduled()?+back.getEffectiveWeight().toFixed(4):0,wPrev:prev.isScheduled()?+prev.getEffectiveWeight().toFixed(4):0,fbOn}};
      if(cfg.sub&&t>=cfg.sub.from-1e-9&&t<=cfg.sub.to+1e-9)subs.push({t:+t.toFixed(5),gap:R.gap,rToe:r.rToe,kickTime:r.kickTime});
      rows.push(r);}
    mx.stopAllAction();H.position.set(0,0,0);H.rotation.set(0,0,0);i.root.position.copy(g.calib);i.root.quaternion.copy(g.calibQ);upd(i);
    subs.sort((a,b)=>a.t-b.t);
    return {rows,subs,infeasible,anchorSet:!!anchor||!!relFrom};
  }
  return {sim};
})();
