'use strict';
// Measurements for lining a retargeted kick up with the game's ball. Prototype only: the game does not load this.
// Everything is in the holder's frame (the game's player position p.pos and heading: +z forward, +x the player's
// left), in metres. The holder of the first instance sits at the origin facing +z, so this is also the world frame.
// A visual offset moves the whole model (its root, a child of the holder) across the ground; the clip's bones are
// never changed here.
window.GLKick=(()=>{
  const BR=0.11;   // the game's ball radius (index.html: BR=0.11)
  const short=n=>n.replace(/^mixamorig:?/i,'');
  const V=()=>new THREE.Vector3();
  const arr=v=>[+v.x.toFixed(4),+v.y.toFixed(4),+v.z.toFixed(4)];
  // matrices from the scene down to every bone and mesh, whatever holds the model now (the viewer may have built new
  // holders). updateMatrixWorld (not updateWorldMatrix) so that skinned meshes refresh their bind inverse too.
  const upd=i=>{i.root.updateWorldMatrix(true,false);i.root.updateMatrixWorld(true);};

  // the skinned vertices that follow one foot most (dominant weight on Foot, ToeBase or Toe_End of that side)
  function footVerts(i,side,max=500){
    const want=new Set([side+'Foot',side+'ToeBase',side+'Toe_End']),out=[];
    i.root.traverse(m=>{if(!m.isSkinnedMesh)return;const si=m.geometry.attributes.skinIndex,sw=m.geometry.attributes.skinWeight;
      const ok=m.skeleton.bones.map(b=>want.has(short(b.name)));
      const get=['getX','getY','getZ','getW'];   // r128 has no getComponent
      for(let k=0;k<si.count;k++){let best=-1,bw=0;for(let c=0;c<4;c++){const w=sw[get[c]](k);if(w>bw){bw=w;best=si[get[c]](k);}}if(ok[best])out.push([m,k]);}});
    const step=Math.max(1,Math.floor(out.length/max));return out.filter((_,k)=>k%step===0);
  }
  function rig(i){
    const by={};i.root.traverse(o=>{if(o.isBone&&!by[short(o.name)])by[short(o.name)]=o;});
    // the calibrated root position, kept once: a shot stopped half way (screenshots) leaves the root offset
    const calib=i.root.userData.calib||(i.root.userData.calib=i.root.position.clone());
    return {by,R:footVerts(i,'Right'),L:footVerts(i,'Left'),calib:calib.clone()};
  }
  // one frame: joints, the lowest point of each foot, and each foot's nearest point to the ball (gap = distance to the
  // ball's surface; below 0 the foot is inside the ball)
  function frame(i,g,ball){
    const H=i.holder;upd(i);const inv=H.matrixWorld.clone().invert(),w=V();
    const P=n=>g.by[n]?g.by[n].getWorldPosition(V()).applyMatrix4(inv):null;
    const foot=list=>{let lo=Infinity,loP=null,gap=Infinity,gp=null;
      for(const [m,k] of list){w.fromBufferAttribute(m.geometry.attributes.position,k);m.boneTransform(k,w);w.applyMatrix4(m.matrixWorld).applyMatrix4(inv);
        if(w.y<lo){lo=w.y;loP=w.clone();}const d=w.distanceTo(ball)-BR;if(d<gap){gap=d;gp=w.clone();}}
      return {low:+lo.toFixed(4),lowP:arr(loP),gap:+gap.toFixed(4),gapP:arr(gp)};};
    const lu=P('LeftUpLeg'),ru=P('RightUpLeg'),la=P('LeftArm'),ra=P('RightArm');
    const yaw=(l,r)=>{const d=l.clone().sub(r);return +(Math.atan2(-d.z,d.x)*180/Math.PI).toFixed(2);};   // 0 = facing +z
    return {root:arr(i.root.position.clone().sub(g.calib)),hips:arr(P('Hips')),chest:arr(P('Spine2')||P('Spine1')),pelvisYaw:yaw(lu,ru),chestYaw:yaw(la,ra),
      rAnkle:arr(P('RightFoot')),rToe:arr(P('RightToeBase')),rToeEnd:arr(P('RightToe_End')||P('RightToeBase')),lAnkle:arr(P('LeftFoot')),lToe:arr(P('LeftToeBase')),
      R:foot(g.R),L:foot(g.L)};
  }
  // offsets: {times:[...], xz:[[x,z],...]} in clip time; linear between keys, held at the ends
  function offsetAt(off,t){if(!off)return [0,0];const T=off.times,n=T.length;if(t<=T[0])return off.xz[0];if(t>=T[n-1])return off.xz[n-1];
    let k=1;while(T[k]<t)k++;const f=(t-T[k-1])/(T[k]-T[k-1]);return [off.xz[k-1][0]+(off.xz[k][0]-off.xz[k-1][0])*f,off.xz[k-1][1]+(off.xz[k][1]-off.xz[k-1][1])*f];}
  // the clip alone at the given times (weight 1), the model moved by the offset; the ball where the game keeps it
  function series(i,clip,times,off,ballZ){
    const g=rig(i),ball=V().set(0,BR,ballZ),mx=i.mixer;mx.stopAllAction();i.cur=null;
    const a=mx.clipAction(clip);a.reset();a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.play();a.setEffectiveWeight(1);
    const out=[];
    for(const t of times){a.time=t;mx.update(0);const o=offsetAt(off,t);i.root.position.set(g.calib.x+o[0],g.calib.y,g.calib.z+o[1]);out.push(Object.assign({t:+t.toFixed(4)},frame(i,g,ball)));}
    a.stop();i.root.position.copy(g.calib);mx.update(0);
    return out;
  }
  // idle -> kick -> idle with a crossfade of xf seconds, 1/60 s steps; the offset follows the kick's weight (the
  // visual offset belongs to the kick, so it fades in and out with it). Largest change in one step of the model root,
  // the hips and the kicking toe, in the fade into the kick, in the kick, and in the fade back.
  // tc, ballZ (optional): also the kicking foot's gap to the ball at the first step at or past the contact, with the
  // fade as it really is then (a fade still running at the contact mixes the other clip into the strike)
  function transition(i,idleClip,clip,off,xf,tc,ballZ){
    const g=rig(i),mx=i.mixer;mx.stopAllAction();i.cur=null;
    const idle=mx.clipAction(idleClip),k=mx.clipAction(clip);
    for(const a of [idle,k]){a.reset();a.setEffectiveWeight(1);a.setEffectiveTimeScale(1);}
    idle.setLoop(THREE.LoopRepeat,Infinity);k.setLoop(THREE.LoopOnce,1);k.clampWhenFinished=true;
    idle.play();const dt=1/60;
    const seg={into:{root:0,hips:0,toe:0},kick:{root:0,hips:0,toe:0},back:{root:0,hips:0,toe:0}};let prev=null,phase='pre';
    const step=()=>{mx.update(dt);const wk=k.isScheduled()?k.getEffectiveWeight():0,o=offsetAt(off,k.time);   // not playing yet: no offset (enabled alone is true before play)
      i.root.position.set(g.calib.x+o[0]*wk,g.calib.y,g.calib.z+o[1]*wk);upd(i);
      const inv=i.holder.matrixWorld.clone().invert(),cur={root:i.root.position.clone(),hips:g.by.Hips.getWorldPosition(V()).applyMatrix4(inv),toe:g.by.RightToeBase.getWorldPosition(V()).applyMatrix4(inv)};
      if(prev&&seg[phase])for(const n of ['root','hips','toe'])seg[phase][n]=Math.max(seg[phase][n],cur[n].distanceTo(prev[n]));prev=cur;
      if(tc!=null&&!atContact&&phase!=='pre'&&k.time>=tc-1e-6){const kt=k.time;k.time=tc;mx.update(0);const f=frame(i,g,V().set(0,BR,ballZ));atContact={clipTime:+tc.toFixed(4),kickWeight:+wk.toFixed(3),gap:f.R.gap};k.time=kt;mx.update(0);}};   // at the contact itself, the fade weights as they are on this step
    let atContact=null;
    for(let n=0;n<30;n++)step();
    phase='into';k.reset();k.play();if(xf>0)idle.crossFadeTo(k,xf,false);else idle.stop();
    const nIn=Math.max(1,Math.round(xf/dt));for(let n=0;n<nIn;n++)step();
    phase='kick';while(k.time<clip.duration-1e-6&&k.time+dt<clip.duration)step();
    phase='back';idle.reset();idle.setEffectiveWeight(1);idle.play();if(xf>0)k.crossFadeTo(idle,xf,false);else k.stop();
    for(let n=0;n<Math.max(1,Math.round(xf/dt))+2;n++)step();
    mx.stopAllAction();i.root.position.copy(g.calib);mx.update(0);
    for(const s of Object.values(seg))for(const n in s)s[n]=+s[n].toFixed(4);
    if(tc!=null)seg.atContact=atContact;
    return seg;
  }
  // where the kicking foot meets a ball at clip time t: the foot's leading point along its direction of travel (the
  // toe joint's velocity over t +-1/120 s), and the ball centre one radius further on. A whole-model offset that
  // puts the game's ball there makes the foot touch the ball at t (only across the ground: the height stays).
  function contact(i,clip,t,side,ballZ){
    const g=rig(i),mx=i.mixer;mx.stopAllAction();i.cur=null;const a=mx.clipAction(clip);a.reset();a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.play();a.setEffectiveWeight(1);
    const H=i.holder,toe=g.by[side+'ToeBase'],list=side==='Right'?g.R:g.L,at=tt=>{a.time=Math.max(0,Math.min(clip.duration,tt));mx.update(0);upd(i);return H.matrixWorld.clone().invert();};
    let inv=at(t-1/120);const p0=toe.getWorldPosition(V()).applyMatrix4(inv);inv=at(t+1/120);const p1=toe.getWorldPosition(V()).applyMatrix4(inv);
    const vel=p1.clone().sub(p0).multiplyScalar(60),dir=vel.clone().normalize();inv=at(t);
    let best=-Infinity,lead=null;const w=V(),pts=[];
    for(const [m,k] of list){w.fromBufferAttribute(m.geometry.attributes.position,k);m.boneTransform(k,w);w.applyMatrix4(m.matrixWorld).applyMatrix4(inv);pts.push(w.clone());const d=w.dot(dir);if(d>best){best=d;lead=w.clone();}}
    const centre=lead.clone().addScaledVector(dir,BR);a.stop();mx.update(0);
    // the ball lies on the ground (centre at BR), not at the leading point's height: slide it along the foot's
    // direction of travel across the ground until the foot's surface just touches it (gap 0), by bisection
    const h=V().set(dir.x,0,dir.z).normalize(),gapAt=s=>{const B=V().set(centre.x-h.x*s,BR,centre.z-h.z*s);let g=Infinity;for(const p of pts)g=Math.min(g,p.distanceTo(B)-BR);return g;};
    // s<0: the ball further ahead; growing s brings it back towards the foot. The first touch along that path: scan in
    // 1 cm steps, then bisect inside the step
    let touch=null;for(let s0=-0.3;s0<0.5&&!touch;s0+=0.01){if(gapAt(s0+0.01)<=0&&gapAt(s0)>0){let lo=s0,hi=s0+0.01;for(let n=0;n<30;n++){const mid=(lo+hi)/2;if(gapAt(mid)>0)lo=mid;else hi=mid;}touch=V().set(centre.x-h.x*hi,BR,centre.z-h.z*hi);}}
    const B=touch||V().set(centre.x,BR,centre.z);
    return {t,toeVelocity:arr(vel),speed:+vel.length().toFixed(3),lead:arr(lead),ballCentre:arr(B),touchFound:!!touch,offset:[+(0-B.x).toFixed(4),+(ballZ-B.z).toFixed(4)],
      leadAboveBallCentre:+(lead.y-BR).toFixed(4),directionDegFromForward:+(Math.atan2(vel.x,vel.z)*180/Math.PI).toFixed(1),directionUpDeg:+(Math.atan2(vel.y,Math.hypot(vel.x,vel.z))*180/Math.PI).toFixed(1)};
  }
  // the kicking foot's nearest skinned point to a ball at (0, BR, ballZ) in the holder's frame, now (for the viewer)
  const _rigs=new WeakMap();
  function nearest(i,side,ballZ){let g=_rigs.get(i);if(!g){g=rig(i);_rigs.set(i,g);}
    upd(i);const inv=i.holder.matrixWorld.clone().invert(),B=V().set(0,BR,ballZ),w=V();let gap=Infinity,p=null;
    for(const [m,k] of (side==='Right'?g.R:g.L)){w.fromBufferAttribute(m.geometry.attributes.position,k);m.boneTransform(k,w);w.applyMatrix4(m.matrixWorld).applyMatrix4(inv);const d=w.distanceTo(B)-BR;if(d<gap){gap=d;p=w.clone();}}
    return {gap,point:p,ball:B};}
  // ---- ground: toes into the ground at toe-off ----
  // CMU's toe channel points the toes below its own floor (README); the retarget carries that over. Two repairs to
  // compare, both on a copy of the clip, at the clip's own keys, with the model on the ground (y=0 in the holder):
  // fixToes bends each ToeBase up about the foot's left-right axis just enough that the lowest toe point is on the
  // ground (only the toes change); liftHips raises the hips by the depth the lowest foot point is under the ground.
  const smoothKeys=(v,dil=3,avg=2)=>{const n=v.length,d=new Float32Array(n),o=new Float32Array(n);
    for(let k=0;k<n;k++){let m=0;for(let j=Math.max(0,k-dil);j<=Math.min(n-1,k+dil);j++)m=Math.max(m,v[j]);d[k]=m;}
    for(let k=0;k<n;k++){let s=0,c=0;for(let j=Math.max(0,k-avg);j<=Math.min(n-1,k+avg);j++){s+=d[j];c++;}o[k]=s/c;}return o;};
  function playAt(i,clip){const mx=i.mixer;mx.stopAllAction();i.cur=null;const a=mx.clipAction(clip);a.reset();a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.play();a.setEffectiveWeight(1);
    return t=>{a.time=t;mx.update(0);upd(i);return i.holder.matrixWorld.clone().invert();};}
  function fixToes(i,clip){
    const g=rig(i),out=clip.clone(),res={},w=V(),up=V().set(0,1,0);
    for(const side of ['Left','Right']){
      const bone=g.by[side+'ToeBase'];if(!bone)continue;const tr=out.tracks.find(t=>t.name===bone.name+'.quaternion');if(!tr)continue;
      const want=new Set([side+'ToeBase',side+'Toe_End']),verts=[];
      i.root.traverse(m=>{if(!m.isSkinnedMesh)return;const si=m.geometry.attributes.skinIndex,sw=m.geometry.attributes.skinWeight,G=['getX','getY','getZ','getW'],ok=m.skeleton.bones.map(b=>want.has(short(b.name)));
        for(let k=0;k<si.count;k++){let b=-1,bw=0;for(let c=0;c<4;c++){const x=sw[G[c]](k);if(x>bw){bw=x;b=si[G[c]](k);}}if(ok[b])verts.push([m,k]);}});
      const at=playAt(i,clip),n=tr.times.length,need=new Float32Array(n),axes=[];
      const lowest=inv=>{let lo=Infinity;for(const [m,k] of verts){w.fromBufferAttribute(m.geometry.attributes.position,k);m.boneTransform(k,w);w.applyMatrix4(m.matrixWorld).applyMatrix4(inv);if(w.y<lo)lo=w.y;}return lo;};
      for(let k=0;k<n;k++){const inv=at(tr.times[k]);const q0=bone.quaternion.clone();
        // the axis: across the foot (toe direction x up); turning about it by a positive angle lifts the toe tip
        const tip=(g.by[side+'Toe_End']||bone).getWorldPosition(V()),base=bone.getWorldPosition(V()),dir=(g.by[side+'Toe_End']?tip.sub(base):g.by[side+'Foot'].getWorldPosition(V()).negate().add(base)).normalize();
        const axW=V().crossVectors(dir,up).normalize(),bq=bone.getWorldQuaternion(new THREE.Quaternion()),axL=axW.clone().applyQuaternion(bq.invert());axes.push(axL);
        const lo0=lowest(inv);if(lo0>=0)continue;
        const tryA=th=>{bone.quaternion.copy(q0).multiply(new THREE.Quaternion().setFromAxisAngle(axL,th));bone.updateMatrixWorld(true);return lowest(inv);};
        let a0=0,a1=1.2;if(tryA(a1)<0){need[k]=a1;}else{for(let s=0;s<30;s++){const mid=(a0+a1)/2;if(tryA(mid)<0)a0=mid;else a1=mid;}need[k]=a1;}
        bone.quaternion.copy(q0);bone.updateMatrixWorld(true);}
      const th=smoothKeys(need),v=tr.values;let changed=0,maxA=0;
      for(let k=0;k<n;k++){if(th[k]<=1e-6)continue;changed++;maxA=Math.max(maxA,th[k]);const q=new THREE.Quaternion(v[k*4],v[k*4+1],v[k*4+2],v[k*4+3]).multiply(new THREE.Quaternion().setFromAxisAngle(axes[k],th[k]));v.set([q.x,q.y,q.z,q.w],k*4);}
      res[side]={maxDeg:+(maxA*180/Math.PI).toFixed(1),neededMaxDeg:+(Math.max(...need)*180/Math.PI).toFixed(1),keysChanged:changed,keys:n};}
    i.mixer.stopAllAction();return {clip:out,info:res};
  }
  function liftHips(i,clip){
    const g=rig(i),out=clip.clone(),hips=g.by.Hips,tr=out.tracks.find(t=>t.name===hips.name+'.position'),w=V();
    const at=playAt(i,clip),n=tr.times.length,need=new Float32Array(n);
    for(let k=0;k<n;k++){const inv=at(tr.times[k]);let lo=Infinity;for(const [m,j] of g.L.concat(g.R)){w.fromBufferAttribute(m.geometry.attributes.position,j);m.boneTransform(j,w);w.applyMatrix4(m.matrixWorld).applyMatrix4(inv);if(w.y<lo)lo=w.y;}need[k]=Math.max(0,-lo);}
    const lift=smoothKeys(need),m3=new THREE.Matrix3().setFromMatrix4(hips.parent.matrixWorld.clone().invert());   // holder at the origin: world up into the hips' parent
    for(let k=0;k<n;k++){const dv=V().set(0,lift[k],0).applyMatrix3(m3);tr.values[k*3]+=dv.x;tr.values[k*3+1]+=dv.y;tr.values[k*3+2]+=dv.z;}
    i.mixer.stopAllAction();return {clip:out,info:{maxLift:+Math.max(...lift).toFixed(4),keysChanged:[...lift].filter(x=>x>1e-6).length,keys:n}};
  }

  // ---- a game shot, tick by tick ----
  // cfg: {prev, kick, back (clips), kickStart (s after D press), t0 (kick clip time at kickStart), xfIn, xfOut,
  //   backAt (s, when the fade back starts), tEnd, game:[{t, z (player along +z, world), ballAhead, owned}],
  //   off: (t, kickTime, kickWeight) -> [x,z] (holder frame; the model's offset from the player; it is the offset's
  //   own business to follow the kick's weight, so that nothing is put on while the earlier clip still shows)}
  // The holder is the game player: it moves along +z as the game moved him. Everything is recorded in the world.
  function shotSim(i,cfg){
    const g=rig(i),mx=i.mixer;mx.stopAllAction();i.cur=null;
    const prev=mx.clipAction(cfg.prev),kick=mx.clipAction(cfg.kick),back=cfg.back===cfg.prev?prev:mx.clipAction(cfg.back);
    for(const a of new Set([prev,kick,back])){a.reset();a.setEffectiveWeight(1);a.setEffectiveTimeScale(1);}
    prev.setLoop(THREE.LoopRepeat,Infinity);back.setLoop(THREE.LoopRepeat,Infinity);kick.setLoop(THREE.LoopOnce,1);kick.clampWhenFinished=true;
    prev.play();for(let k=0;k<30;k++)mx.update(1/60);   // the earlier clip settles
    const G=t=>{const r=cfg.game;return r[Math.min(r.length-1,Math.max(0,Math.round(t*60)))];};   // one game row per 1/60 s tick, by index (rounded times would skip rows)
    const out=[];let started=false,backed=false,w=V();const H=i.holder,dt=1/60;
    for(let k=0;k*dt<=(cfg.stopAt??cfg.tEnd)+1e-9;k++){const t=k*dt;
      // start and fade back on whole ticks, not on rounded seconds
      if(!started&&k>=Math.round(cfg.kickStart*60)){started=true;kick.reset();kick.play();kick.time=cfg.t0-(k>0?dt:0);if(cfg.xfIn>0)prev.crossFadeTo(kick,cfg.xfIn,false);else prev.stop();mx.update(0);}   // the update below brings the kick to t0; update(0) puts the fade's weights in force now (before it, the kick still reads weight 1)
      if(!backed&&k>=Math.round(cfg.backAt*60)){backed=true;if(back!==prev){back.reset();back.setEffectiveWeight(1);}else{back.reset();back.setEffectiveWeight(1);}back.play();if(cfg.xfOut>0)kick.crossFadeTo(back,cfg.xfOut,false);else kick.stop();}
      if(k>0)mx.update(dt);
      const row=G(t),wk=kick.isScheduled()?kick.getEffectiveWeight():0,o=cfg.off(t,kick.time,wk);
      H.position.set(0,0,row.z);i.root.position.set(g.calib.x+o[0],g.calib.y,g.calib.z+o[1]);upd(i);
      // groundClamp: when the blended pose pushes a foot under the ground, raise the whole model by that much
      let lift=0;if(cfg.groundClamp){let lo=Infinity;for(const [m,j] of g.L.concat(g.R)){w.fromBufferAttribute(m.geometry.attributes.position,j);m.boneTransform(j,w);w.applyMatrix4(m.matrixWorld);if(w.y<lo)lo=w.y;}
        if(lo<0){lift=-lo;i.root.position.y+=lift;upd(i);}}
      const P=n=>g.by[n].getWorldPosition(V());
      const ball=V().set(0,BR,row.z+row.ballAhead);
      const foot=list=>{let lo=Infinity,gap=Infinity;for(const [m,j] of list){w.fromBufferAttribute(m.geometry.attributes.position,j);m.boneTransform(j,w);w.applyMatrix4(m.matrixWorld);if(w.y<lo)lo=w.y;const d=w.distanceTo(ball)-BR;if(d<gap)gap=d;}return {low:+lo.toFixed(4),gap:+gap.toFixed(4)};};
      const rp=i.root.getWorldPosition(V());
      out.push({t:+t.toFixed(4),lift:+lift.toFixed(4),z:row.z,owned:row.owned,ballAhead:row.ballAhead,kickTime:started?+kick.time.toFixed(4):null,kickWeight:+wk.toFixed(3),
        root:arr(rp),hips:arr(P('Hips')),chest:arr(P('Spine2')||P('Spine1')),lAnkle:arr(P('LeftFoot')),rToe:arr(P('RightToeBase')),L:foot(g.L),R:foot(g.R)});}
    if(cfg.stopAt==null){mx.stopAllAction();H.position.set(0,0,0);i.root.position.copy(g.calib);upd(i);}   // stopAt: leave the pose (screenshots)
    return out;
  }
  return {BR,series,transition,offsetAt,contact,nearest,fixToes,liftHips,shotSim};
})();
