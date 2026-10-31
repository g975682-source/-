'use strict';
// Shot lab: a game shot (standing or running) played tick by tick on a retargeted CMU kick, with the holder (the game
// player) where the game itself put him on every tick: position, heading, and the ball. Prototype only: the game does
// not load this file and this file does not change the game. Used by check_shot.js; GLKick (kick_align.js) supplies
// the contact fit and the ground repairs.
// Frame: the holder's frame at the D press (the game's p.pos then): +z the player's heading, +x his left, metres.
window.GLShot=(()=>{
  const BR=0.11,V=()=>new THREE.Vector3(),Q=()=>new THREE.Quaternion(),short=n=>n.replace(/^mixamorig:?/i,'');
  const upd=i=>{i.root.updateWorldMatrix(true,false);i.root.updateMatrixWorld(true);};
  const arr=v=>[+v.x.toFixed(4),+v.y.toFixed(4),+v.z.toFixed(4)];
  const sm=x=>x<=0?0:x>=1?1:x*x*(3-2*x);
  // the skinned vertices that follow one foot most (dominant weight on Foot, ToeBase or Toe_End of that side)
  function footVerts(i,side,max=500){
    const want=new Set([side+'Foot',side+'ToeBase',side+'Toe_End']),out=[],G=['getX','getY','getZ','getW'];
    i.root.traverse(m=>{if(!m.isSkinnedMesh)return;const si=m.geometry.attributes.skinIndex,sw=m.geometry.attributes.skinWeight,ok=m.skeleton.bones.map(b=>want.has(short(b.name)));
      for(let k=0;k<si.count;k++){let b=-1,bw=0;for(let c=0;c<4;c++){const w=sw[G[c]](k);if(w>bw){bw=w;b=si[G[c]](k);}}if(ok[b])out.push([m,k]);}});
    const step=Math.max(1,Math.floor(out.length/max));return out.filter((_,k)=>k%step===0);
  }
  const rigs=new WeakMap();
  function rig(i){let g=rigs.get(i);if(g)return g;
    const by={};i.root.traverse(o=>{if(o.isBone&&!by[short(o.name)])by[short(o.name)]=o;});
    // the calibrated root (kick_align.js keeps the same userData.calib), and its turn (Soldier faces +z by a 180° turn)
    const calib=i.root.userData.calib||(i.root.userData.calib=i.root.position.clone()),calibQ=i.root.userData.calibQ||(i.root.userData.calibQ=i.root.quaternion.clone());
    g={by,R:footVerts(i,'Right'),L:footVerts(i,'Left'),calib:calib.clone(),calibQ:calibQ.clone(),tip:{}};
    // the toe tip: the Toe_End bone, or (Soldier has none) the skinned toe vertex furthest along the foot (ankle -> toe)
    for(const side of ['Left','Right']){if(by[side+'Toe_End'])continue;upd(i);const a=by[side+'Foot'].getWorldPosition(V()),b=by[side+'ToeBase'].getWorldPosition(V()),dir=b.clone().sub(a).normalize(),w=V();
      let best=null,bd=-Infinity;for(const [m,k] of footVerts(i,side,4000)){w.fromBufferAttribute(m.geometry.attributes.position,k);m.boneTransform(k,w);w.applyMatrix4(m.matrixWorld);const d=w.clone().sub(b).dot(dir);if(d>bd){bd=d;best=[m,k];}}
      g.tip[side]=best;}
    rigs.set(i,g);return g;}
  // a joint's world position; a missing toe end comes from its tip vertex
  function joint(g,n){if(g.by[n])return g.by[n].getWorldPosition(V());const m=n.match(/^(Left|Right)Toe_End$/);if(m&&g.tip[m[1]]){const [mesh,k]=g.tip[m[1]],w=V();w.fromBufferAttribute(mesh.geometry.attributes.position,k);mesh.boneTransform(k,w);return w.applyMatrix4(mesh.matrixWorld);}return null;}
  const footLow=(list,ball)=>{let lo=Infinity,gap=Infinity;const w=V();
    for(const [m,j] of list){w.fromBufferAttribute(m.geometry.attributes.position,j);m.boneTransform(j,w);w.applyMatrix4(m.matrixWorld);if(w.y<lo)lo=w.y;if(ball){const d=w.distanceTo(ball)-BR;if(d<gap)gap=d;}}
    return {low:+lo.toFixed(4),gap:ball?+gap.toFixed(4):null};};
  function playAt(i,clip){const mx=i.mixer;mx.stopAllAction();i.cur=null;const a=mx.clipAction(clip);a.reset();a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.play();a.setEffectiveWeight(1);
    return t=>{a.time=t;mx.update(0);upd(i);};}

  // ---- the kicking leg reaching in: the right hip turned about the holder's forward axis, so the right foot moves
  // towards the body's middle line (+x). Only RightUpLeg's rotation changes (knee and ankle angles stay as captured).
  // The turn is full within tc +-hold and fades out over `width` either side (no extra foot speed at the contact).
  function reach(i,clip,tc,amount,ballZ,opt){
    opt=Object.assign({hold:0.06,width:0.2},opt||{});const g=rig(i),bone=g.by.RightUpLeg;
    const w=t=>{const d=Math.abs(t-tc);return d<=opt.hold?1:d>=opt.hold+opt.width?0:1-sm((d-opt.hold)/opt.width);};
    const tr0=clip.tracks.find(t=>t.name===bone.name+'.quaternion'),n=tr0.times.length,axes=[];
    // the axis in the bone's parent frame at every key: world +z (holder at the origin, root turned by its calibration)
    const at=playAt(i,clip);for(let k=0;k<n;k++){at(tr0.times[k]);const pq=bone.parent.getWorldQuaternion(Q());axes.push(V().set(0,0,1).applyQuaternion(pq.invert()).normalize());}
    i.mixer.stopAllAction();
    const make=A=>{const out=clip.clone(),tr=out.tracks.find(t=>t.name===bone.name+'.quaternion'),v=tr.values;
      for(let k=0;k<n;k++){const a=A*w(tr.times[k]);if(a===0)continue;const q=Q().setFromAxisAngle(axes[k],a).multiply(Q().set(v[k*4],v[k*4+1],v[k*4+2],v[k*4+3]));v.set([q.x,q.y,q.z,q.w],k*4);}
      return out;};
    const off0=GLKick.contact(i,clip,tc,'Right',ballZ).offset[0];
    // bisection on the angle: the needed sideways offset shrinks by `amount`
    let lo=0,hi=0.7,best=null;
    for(let s=0;s<22;s++){const mid=(lo+hi)/2,c=GLKick.contact(i,make(mid),tc,'Right',ballZ);if(off0-c.offset[0]<amount)lo=mid;else hi=mid;}
    const A=(lo+hi)/2,out=make(A),c=GLKick.contact(i,out,tc,'Right',ballZ);
    return {clip:out,info:{angleDeg:+(A*180/Math.PI).toFixed(2),offsetBefore:+off0.toFixed(4),offsetAfter:c.offset[0],asked:amount}};
  }

  // ---- one shot, tick by tick ----
  // cfg: prev, kick, back (clips); kickStart (s after the D press, on a whole tick); t0 (kick clip time at kickStart);
  // xfIn, xfOut (s); backAt (s, the fade back starts); tEnd; game: one row per 1/60 s tick from the D press
  // {x, z (player, holder frame), yaw (heading change, rad), ball:[x,y,z]};
  // off(t, kickTime, kickWeight) -> [x,z]: the model's offset from the player in the player's frame;
  // lock {from, to}: the plant (left) ankle kept still in the world from `from` to `to`, the correction then fading with
  // the kick's weight; groundClamp: raise the whole model when a foot goes under the ground; sub {from,to}: the kicking
  // foot's gap to the ball also on 1/240 s steps there (where the contact falls between ticks).
  function sim(i,cfg){
    const g=rig(i),mx=i.mixer;mx.stopAllAction();i.cur=null;
    const prev=mx.clipAction(cfg.prev),kick=mx.clipAction(cfg.kick),back=cfg.back===cfg.prev?prev:mx.clipAction(cfg.back);
    for(const a of new Set([prev,kick,back])){a.reset();a.setEffectiveWeight(1);a.setEffectiveTimeScale(1);}
    prev.setLoop(THREE.LoopRepeat,Infinity);back.setLoop(THREE.LoopRepeat,Infinity);kick.setLoop(THREE.LoopOnce,1);kick.clampWhenFinished=true;
    prev.play();for(let k=0;k<30;k++)mx.update(1/60);
    const H=i.holder,dt=1/60,SUB=4,rows=[],subs=[],G=cfg.game,row=k=>G[Math.min(G.length-1,Math.max(0,k))];
    let started=false,backed=false,lockP=null,lockC=[0,0];
    const place=(t,k,frac)=>{   // holder and model at game time t (tick k, fraction of the way to k+1)
      const a=row(k),b=row(k+1),f=frac,lx=a.x+(b.x-a.x)*f,lz=a.z+(b.z-a.z)*f,ly=a.yaw+(b.yaw-a.yaw)*f;
      H.position.set(lx,0,lz);H.rotation.set(0,ly,0);H.updateMatrixWorld(true);
      const wk=kick.isScheduled()?kick.getEffectiveWeight():0,o=cfg.off(t,kick.time,wk);
      i.root.position.set(g.calib.x+o[0],g.calib.y,g.calib.z+o[1]);i.root.quaternion.copy(g.calibQ);
      // yaw: the whole model turned about a vertical line through `pivot` (the ball at the contact, player frame):
      // the foot that meets the ball there still meets it, the kick now points `psi` further round
      const psi=cfg.yaw?cfg.yaw(t,kick.time,wk):0;
      if(psi){const c=cfg.pivot,dx=i.root.position.x-c[0],dz=i.root.position.z-c[1],cs=Math.cos(psi),sn=Math.sin(psi);
        i.root.position.x=c[0]+dx*cs+dz*sn;i.root.position.z=c[1]-dx*sn+dz*cs;i.root.quaternion.premultiply(Q().setFromAxisAngle(V().set(0,1,0),psi));}
      // post: a shift after the turn (the plant lock's aim, see check_shot.js)
      if(cfg.post){const pp=cfg.post(t,kick.time,wk);i.root.position.x+=pp[0];i.root.position.z+=pp[1];}
      upd(i);
      // the plant ankle kept still: a whole-model shift, in the player's frame
      let c=[0,0];
      if(cfg.lock&&t>=cfg.lock.from-1e-9){const p=g.by.LeftFoot.getWorldPosition(V()),inv=H.matrixWorld.clone().invert();
        if(!lockP)lockP=p.clone();
        if(t<=cfg.lock.to+1e-9){const q=lockP.clone().applyMatrix4(inv),r=p.clone().applyMatrix4(inv);lockC=[q.x-r.x,q.z-r.z];c=lockC;}
        else c=[lockC[0]*wk,lockC[1]*wk];
        i.root.position.x+=c[0];i.root.position.z+=c[1];upd(i);}
      let lift=0;if(cfg.groundClamp){const lo=Math.min(footLow(g.L).low,footLow(g.R).low);if(lo<0){lift=-lo;i.root.position.y+=lift;upd(i);}}
      return {wk,o,c,lift,psi,ball:V().fromArray(a.ball).lerp(V().fromArray(b.ball),f)};};
    for(let k=0;k*dt<=cfg.tEnd+1e-9;k++){const t=k*dt;
      if(!started&&k>=Math.round(cfg.kickStart*60)){started=true;kick.reset();kick.play();kick.time=cfg.t0-(k>0?dt:0);if(cfg.xfIn>0)prev.crossFadeTo(kick,cfg.xfIn,false);else prev.stop();mx.update(0);}
      if(!backed&&k>=Math.round(cfg.backAt*60)){backed=true;back.reset();back.setEffectiveWeight(1);back.play();if(cfg.xfOut>0)kick.crossFadeTo(back,cfg.xfOut,false);else kick.stop();}
      if(k>0){for(let s=1;s<=SUB;s++){mx.update(dt/SUB);const ts=(k-1)*dt+s*dt/SUB;
        if(cfg.sub&&s<SUB&&ts>=cfg.sub.from-1e-9&&ts<=cfg.sub.to+1e-9){const P=place(ts,k-1,s/SUB);
          subs.push({t:+ts.toFixed(5),gap:footLow(g.R,P.ball).gap,rToe:arr(g.by.RightToeBase.getWorldPosition(V())),kickTime:+kick.time.toFixed(4)});}}}
      const P=place(t,k,0),ball=P.ball;
      const J=n=>{const p=joint(g,n);return p?arr(p):null;};
      const L=footLow(g.L,ball),R=footLow(g.R,ball);
      const r={t:+t.toFixed(4),k,player:[+H.position.x.toFixed(4),+H.position.z.toFixed(4)],yaw:+H.rotation.y.toFixed(4),kickTime:started?+kick.time.toFixed(4):null,kickWeight:+P.wk.toFixed(3),
        off:[+P.o[0].toFixed(4),+P.o[1].toFixed(4)],psi:+P.psi.toFixed(4),lock:[+P.c[0].toFixed(4),+P.c[1].toFixed(4)],lift:+P.lift.toFixed(4),ball:arr(ball),
        root:arr(i.root.getWorldPosition(V())),hips:J('Hips'),chest:J('Spine2')||J('Spine1'),
        lUp:J('LeftUpLeg'),lKnee:J('LeftLeg'),lAnk:J('LeftFoot'),lToe:J('LeftToeBase'),lToeEnd:J('LeftToe_End'),
        rUp:J('RightUpLeg'),rKnee:J('RightLeg'),rAnk:J('RightFoot'),rToe:J('RightToeBase'),rToeEnd:J('RightToe_End'),L,R};
      if(cfg.sub&&t>=cfg.sub.from-1e-9&&t<=cfg.sub.to+1e-9)subs.push({t:+t.toFixed(5),gap:R.gap,rToe:r.rToe,kickTime:r.kickTime});
      rows.push(r);
      if(cfg.stopAt!=null&&t>=cfg.stopAt-1e-9)break;}
    if(cfg.stopAt==null){mx.stopAllAction();H.position.set(0,0,0);H.rotation.set(0,0,0);i.root.position.copy(g.calib);i.root.quaternion.copy(g.calibQ);upd(i);}
    subs.sort((a,b)=>a.t-b.t);
    return {rows,subs};
  }
  return {BR,rig,reach,sim,footLow,joint};
})();
