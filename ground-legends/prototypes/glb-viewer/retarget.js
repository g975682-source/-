'use strict';
// BVH motion (CMU mocap, cgspeed's MotionBuilder-friendly conversion) onto a skinned model with Mixamo bone names
// (mixamorigHips ...), and measurements of a kick clip on that model. Prototype only: the game does not load this.
//
// How the motion is moved across: both skeletons are compared in their own rest pose (the BVH's frame 0 is a T-pose
// added by the conversion; the model's bind pose). For each mapped bone, the change of its orientation from the
// source rest, in model space, is applied to the target's rest orientation, after turning the source rest bone
// direction onto the target's (so an A-pose and a T-pose still meet). Bones without a source keep their rest pose.
// The hips position follows the source, scaled by the ratio of hip heights.
window.GLRetarget=(()=>{
  // CMU (cgspeed names) -> target bone name without the 'mixamorig' prefix
  const MAP={Hips:'Hips',LowerBack:'Spine',Spine:'Spine1',Spine1:'Spine2',Neck:'Neck',Head:'Head',
    LeftShoulder:'LeftShoulder',LeftArm:'LeftArm',LeftForeArm:'LeftForeArm',LeftHand:'LeftHand',
    RightShoulder:'RightShoulder',RightArm:'RightArm',RightForeArm:'RightForeArm',RightHand:'RightHand',
    LeftUpLeg:'LeftUpLeg',LeftLeg:'LeftLeg',LeftFoot:'LeftFoot',LeftToeBase:'LeftToeBase',
    RightUpLeg:'RightUpLeg',RightLeg:'RightLeg',RightFoot:'RightFoot',RightToeBase:'RightToeBase'};
  // the mapped child that gives a target bone its direction (none: no direction correction)
  const CHILD={Spine:'Spine1',Spine1:'Spine2',Spine2:'Neck',Neck:'Head',
    LeftShoulder:'LeftArm',LeftArm:'LeftForeArm',LeftForeArm:'LeftHand',RightShoulder:'RightArm',RightArm:'RightForeArm',RightForeArm:'RightHand',
    LeftUpLeg:'LeftLeg',LeftLeg:'LeftFoot',LeftFoot:'LeftToeBase',RightUpLeg:'RightLeg',RightLeg:'RightFoot',RightFoot:'RightToeBase'};
  const short=n=>n.replace(/^mixamorig:?/i,'');
  const V=()=>new THREE.Vector3(),Q=()=>new THREE.Quaternion();

  function parseBVH(text,label){
    const errs=[],orig=console.error;console.error=(...a)=>{errs.push(a.join(' '));orig.apply(console,a);};
    let r;try{r=new THREE.BVHLoader().parse(text);}finally{console.error=orig;}
    if(errs.length)throw new Error(`BVH 해석 오류 (${label}): ${errs[0]}`);
    if(!r||!r.skeleton||!r.skeleton.bones.length||!r.clip||!r.clip.tracks.length)throw new Error(`BVH 에 뼈나 동작이 없습니다 (${label})`);
    return r;
  }
  // world matrices of the source at time t (the BVH root sits in a plain group at the origin)
  function sourceSampler(bvh){
    const group=new THREE.Group();group.add(bvh.skeleton.bones[0]);
    // the loader names its tracks '.bones[Hips].position', which binds only on a SkinnedMesh: bind them by bone name
    const clip=bvh.clip.clone();for(const t of clip.tracks)t.name=t.name.replace(/^\.bones\[([^\]]+)\]/,'$1');
    const mixer=new THREE.AnimationMixer(group),act=mixer.clipAction(clip);act.play();
    const byName={};for(const b of bvh.skeleton.bones)byName[b.name]=b;
    const frameTime=bvh.clip.tracks[0].times.length>1?bvh.clip.tracks[0].times[1]-bvh.clip.tracks[0].times[0]:1/120;
    return {byName,frameTime,duration:bvh.clip.duration,set(t){act.time=t;mixer.update(0);group.updateMatrixWorld(true);},
      pos(n,out){return out.setFromMatrixPosition(byName[n].matrixWorld);},quat(n,out){byName[n].matrixWorld.decompose(_p,out,_s);return out;}};
  }
  const _p=V(),_s=V(),_m=new THREE.Matrix4();

  // the target in model space (the model root's own frame, without its calibration: scale, yaw, ground offset)
  // rest = the bones' transforms as the file gave them (the viewer saves them in userData.rest); skeleton.pose() is
  // not used, see restPose() in index.html
  function toRest(model){model.traverse(o=>{const r=o.isBone&&o.userData.rest;if(r){o.position.fromArray(r.p);o.quaternion.fromArray(r.q);o.scale.fromArray(r.s);}});model.updateMatrixWorld(true);}
  function targetRest(model){
    toRest(model);
    const inv=new THREE.Matrix4().copy(model.matrixWorld).invert(),bones=[],byShort={},rest=new Map();
    model.traverse(o=>{if(o.isBone){bones.push(o);if(!byShort[short(o.name)])byShort[short(o.name)]=o;}});
    const modelOf=o=>{const m=new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld),p=V(),q=Q(),s=V();m.decompose(p,q,s);return {m,p,q};};
    for(const b of bones)rest.set(b,{local:b.quaternion.clone(),localPos:b.position.clone(),localScale:b.scale.clone(),model:modelOf(b),parent:modelOf(b.parent)});
    return {bones,byShort,rest};
  }

  // opts: {name, from, to (seconds, source time), fps, alignAt (source time of the strike), alignFoot ('left'|'right')}
  // Returns the clip as captured (the hips travel from where the window starts) and an in-place copy (the hips lose
  // their smoothed path across the ground, about half a second wide, and keep the sway around it).
  function retarget(model,bvh,opts){
    const T=targetRest(model),S=sourceSampler(bvh);
    const pairs=[],missingTarget=[],missingSource=[];
    for(const [s,t] of Object.entries(MAP)){const tb=T.byShort[t];if(!S.byName[s])missingSource.push(s);else if(!tb)missingTarget.push(t);else pairs.push({s,t,tb});}
    for(const need of ['Hips','LeftUpLeg','LeftLeg','LeftFoot','RightUpLeg','RightLeg','RightFoot'])
      if(!pairs.some(p=>p.t===need))throw new Error(`대상 모델에 ${need} 뼈가 없어 옮길 수 없습니다 (Mixamo 이름 리그가 아닌 것 같습니다)`);
    const srcOf={};for(const p of pairs)srcOf[p.t]=p.s;
    // source rest = frame 0 (the conversion's T-pose)
    S.set(0);
    const sRestQ={},sRestP={};for(const p of pairs){sRestQ[p.s]=S.quat(p.s,Q());sRestP[p.s]=S.pos(p.s,V());}
    const tRP=t=>T.rest.get(T.byShort[t]).model.p;
    // facing: turn the source about y so its left-right line matches the target's
    const sLR=sRestP.LeftUpLeg.clone().sub(sRestP.RightUpLeg),tLR=tRP('LeftUpLeg').clone().sub(tRP('RightUpLeg'));
    const yaw=Math.atan2(tLR.x,tLR.z)-Math.atan2(sLR.x,sLR.z),F=Q().setFromAxisAngle(V().set(0,1,0),yaw),Fi=F.clone().invert();
    // extra turn: the kicking toe's direction of travel at the strike becomes the target's forward (the game turns a
    // player to the direction of the ball)
    let Y=Q(),turn=0;
    if(opts.alignAt!=null){const toe=opts.alignFoot==='left'?'LeftToeBase':'RightToeBase',a=V(),b=V();
      S.set(Math.max(S.frameTime,opts.alignAt-S.frameTime*2));S.pos(toe,a);S.set(Math.min(S.duration,opts.alignAt+S.frameTime*2));S.pos(toe,b);
      const vs=b.sub(a).applyQuaternion(F),fw=V().set(-tLR.z,0,tLR.x);
      if(Math.hypot(vs.x,vs.z)>1e-6){turn=Math.atan2(fw.x,fw.z)-Math.atan2(vs.x,vs.z);Y.setFromAxisAngle(V().set(0,1,0),turn);}
      S.set(0);}
    const YF=Y.clone().multiply(F);
    // floor: the conversion's frame-0 T-pose does not stand on the capture floor. The floor is the lowest foot or toe
    // joint over the whole take, the rest is frame 0's lowest; the hips go down (or up) by the difference
    const feetJ=['LeftFoot','RightFoot','LeftToeBase','RightToeBase'].filter(n=>S.byName[n]);
    let floor=Infinity;{const w=V();for(let t=S.frameTime;t<=S.duration;t+=S.frameTime*4){S.set(t);for(const f of feetJ)floor=Math.min(floor,S.pos(f,w).y);}}
    S.set(0);const restFloor=Math.min(...feetJ.map(f=>S.pos(f,V()).y));
    let floor10;{const all=[],w=V();for(let t=S.frameTime;t<=S.duration;t+=S.frameTime*4){S.set(t);all.push(Math.min(...feetJ.map(f=>S.pos(f,w).y)));}all.sort((a,b)=>a-b);floor10=all[Math.floor(all.length*0.1)];}
    S.set(0);
    // rest direction correction per target bone
    const A={};for(const p of pairs){const c=CHILD[p.t];A[p.t]=Q();if(!c||!srcOf[c])continue;
      const ds=sRestP[srcOf[c]].clone().sub(sRestP[p.s]).applyQuaternion(F).normalize(),dt=tRP(c).clone().sub(tRP(p.t)).normalize();
      if(ds.lengthSq()>0&&dt.lengthSq()>0)A[p.t].setFromUnitVectors(ds,dt).invert();}
    // hips: scale by hip height over the ankles
    const ankle=(P,l,r)=>Math.min(P(l).y,P(r).y);
    const sLeg=sRestP.Hips.y-ankle(n=>sRestP[n],'LeftFoot','RightFoot'),tLeg=tRP('Hips').y-ankle(tRP,'LeftFoot','RightFoot');
    const ratio=tLeg/(sLeg||1),hipsT=T.byShort.Hips,hipsParentInv=new THREE.Matrix4().copy(T.rest.get(hipsT).parent.m).invert();
    const fps=opts.fps||30,from=Math.max(opts.from??S.frameTime,S.frameTime),to=Math.min(opts.to??S.duration,S.duration);
    const n=Math.max(2,Math.round((to-from)*fps)+1),times=new Float32Array(n);
    const qv=new Map(T.bones.map(b=>[b,new Float32Array(n*4)])),hm=new Float32Array(n*3);
    const sq=Q(),sp=V(),d=Q(),modelQ=new Map(),tmp=Q();
    const srcLow=new Float32Array(n);   // the source's lowest foot joint over its floor, in target units: where the take itself leaves the ground
    for(let k=0;k<n;k++){const t=from+(to-from)*k/(n-1);times[k]=t-from;S.set(t);modelQ.clear();
      srcLow[k]=(Math.min(...feetJ.map(f=>S.pos(f,sp).y))-floor10)*ratio;
      for(const b of T.bones){const R=T.rest.get(b),pq=b.parent&&b.parent.isBone?modelQ.get(b.parent):R.parent.q;
        const s=srcOf[short(b.name)];let mq;
        if(s){S.quat(s,sq);d.multiplyQuaternions(sq,tmp.copy(sRestQ[s]).invert());d.premultiply(F).multiply(Fi);   // change since rest, in target facing
          mq=d.clone().premultiply(Y).multiply(A[short(b.name)]).multiply(R.model.q);}
        else mq=pq.clone().multiply(R.local);
        modelQ.set(b,mq);
        const lq=pq.clone().invert().multiply(mq);
        if(k>0){const pr=qv.get(b),o=(k-1)*4;if(lq.x*pr[o]+lq.y*pr[o+1]+lq.z*pr[o+2]+lq.w*pr[o+3]<0)lq.set(-lq.x,-lq.y,-lq.z,-lq.w);}   // keep one hemisphere: no spin through the long way
        qv.get(b).set([lq.x,lq.y,lq.z,lq.w],k*4);}
      S.pos('Hips',sp);sp.sub(sRestP.Hips);sp.y-=floor-restFloor;sp.applyQuaternion(YF).multiplyScalar(ratio);
      hm.set([sp.x,sp.y,sp.z],k*3);}
    // hips in model space -> the hips' parent space; captured: travel from the window's start; in place: minus the
    // moving average of the path (window +-0.25 s)
    const h=Math.max(1,Math.round(0.25*fps)),pv=new Float32Array(n*3),pvIP=new Float32Array(n*3),w=V();let travelMax=0;
    for(let k=0;k<n;k++){let ax=0,az=0,c=0;for(let j=Math.max(0,k-h);j<=Math.min(n-1,k+h);j++){ax+=hm[j*3];az+=hm[j*3+2];c++;}ax/=c;az/=c;
      const x=hm[k*3]-hm[0],z=hm[k*3+2]-hm[2];travelMax=Math.max(travelMax,Math.hypot(x,z));
      w.set(x,hm[k*3+1],z).add(tRP('Hips')).applyMatrix4(hipsParentInv);pv.set([w.x,w.y,w.z],k*3);
      w.set(hm[k*3]-ax,hm[k*3+1],hm[k*3+2]-az).add(tRP('Hips')).applyMatrix4(hipsParentInv);pvIP.set([w.x,w.y,w.z],k*3);}
    const travelNet=Math.hypot(hm[(n-1)*3]-hm[0],hm[(n-1)*3+2]-hm[2]);
    // every bone gets rotation, position and scale, like the file's own clips, so that a blend or a fade never
    // leaves a bone where another clip put it; only the hips move, the rest keep their rest position and scale
    const two=new Float32Array([0,times[n-1]]);
    const build=(name,hipsPos)=>{const tracks=[];
      for(const b of T.bones){const R=T.rest.get(b);tracks.push(new THREE.QuaternionKeyframeTrack(b.name+'.quaternion',times,qv.get(b)));
        tracks.push(b===hipsT?new THREE.VectorKeyframeTrack(b.name+'.position',times,hipsPos):new THREE.VectorKeyframeTrack(b.name+'.position',two,[...R.localPos.toArray(),...R.localPos.toArray()]));
        tracks.push(new THREE.VectorKeyframeTrack(b.name+'.scale',two,[...R.localScale.toArray(),...R.localScale.toArray()]));}
      return new THREE.AnimationClip(name,-1,tracks);};
    const clip=build(opts.name,pv),clipInPlace=build(opts.name,pvIP);
    // ground: the joints do not tell where the soles are, so play the in-place clip on the model and move the hips so
    // that the lowest skinned point is on the ground in most samples (its 20th percentile at 0): stance frames touch,
    // a stride's flight and the follow-through stay in the air
    const lows=[],mixer=new THREE.AnimationMixer(model),act=mixer.clipAction(clipInPlace),inv=new THREE.Matrix4(),w2=V();act.play();
    const meshes=[];model.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});
    for(let k=0;k<=30;k++){act.time=clipInPlace.duration*k/30;mixer.update(0);model.updateMatrixWorld(true);inv.copy(model.matrixWorld).invert();let lo=Infinity;
      for(const m of meshes){const pos=m.geometry.attributes.position,step=Math.max(1,Math.floor(pos.count/2500));
        for(let j=0;j<pos.count;j+=step){w2.fromBufferAttribute(pos,j);m.boneTransform(j,w2);w2.applyMatrix4(m.matrixWorld).applyMatrix4(inv);if(w2.y<lo)lo=w2.y;}}lows.push(lo);}
    act.stop();mixer.uncacheRoot(model);toRest(model);
    const restLow=(()=>{let lo=Infinity;model.updateMatrixWorld(true);inv.copy(model.matrixWorld).invert();for(const m of meshes){const pos=m.geometry.attributes.position,step=Math.max(1,Math.floor(pos.count/2500));
      for(let j=0;j<pos.count;j+=step){w2.fromBufferAttribute(pos,j);m.boneTransform(j,w2);w2.applyMatrix4(m.matrixWorld).applyMatrix4(inv);if(w2.y<lo)lo=w2.y;}}return lo;})();
    const p20=[...lows].sort((a,b)=>a-b)[Math.floor(lows.length*0.2)],lift=restLow-p20;   // model units; the rest pose stands on the ground
    const lin=new THREE.Matrix4().extractRotation(hipsParentInv),sc=V().setFromMatrixScale(hipsParentInv),dv=V().set(0,lift,0).applyMatrix4(lin).multiply(sc);
    for(const c of [clip,clipInPlace]){const tr=c.tracks.find(t=>t.name===hipsT.name+'.position');for(let k=0;k<tr.values.length;k+=3){tr.values[k]+=dv.x;tr.values[k+1]+=dv.y;tr.values[k+2]+=dv.z;}}
    toRest(model);
    return {clip,clipInPlace,info:{sourceFootLow:Array.from(srcLow,x=>+x.toFixed(3)),groundLiftModelUnits:+lift.toFixed(4),strikeTurnDeg:+(turn*180/Math.PI).toFixed(1),floorShiftSourceUnits:+(floor-restFloor).toFixed(3),travelNet:+travelNet.toFixed(3),travelMax:+travelMax.toFixed(3),mappedBones:pairs.length,mapping:pairs.map(p=>p.s+'→'+p.tb.name),sourceUnmapped:Object.keys(S.byName).filter(n=>!MAP[n]&&n!=='ENDSITE'),
      targetWithoutSource:T.bones.filter(b=>!srcOf[short(b.name)]).length,missingTarget,missingSource,facingTurnDeg:+(yaw*180/Math.PI).toFixed(1),hipScale:+ratio.toFixed(5),
      sourceFrameTime:+S.frameTime.toFixed(5),sourceDuration:+S.duration.toFixed(3),from:+from.toFixed(3),to:+to.toFixed(3),fps}};
  }

  // the kick in a source clip: the frame where a toe moves fastest (frames 0-2 left out: frame 0 is the added T-pose)
  function findKick(bvh){
    const S=sourceSampler(bvh),dt=S.frameTime,out={};let best=-1;
    const prev={L:V(),R:V()},cur=V();
    for(let t=dt;t<=S.duration+1e-6;t+=dt){S.set(t);
      for(const [k,n] of [['L','LeftToeBase'],['R','RightToeBase']]){S.pos(n,cur);
        if(t>dt*3){const v=cur.distanceTo(prev[k])/dt;if(v>best){best=v;out.t=t;out.foot=k;}}prev[k].copy(cur);}}
    if(!(best>1e-3))throw new Error('BVH 동작이 움직이지 않습니다 (발끝 속도 0): 트랙이 뼈에 붙지 않았을 수 있습니다');
    return {time:+out.t.toFixed(3),foot:out.foot==='L'?'left':'right',peakToeSpeedSourceUnits:+best.toFixed(2)};
  }

  // measurements of one clip played in place on an instance (holder at its position, facing +z)
  // kickAt: seconds into the clip of the strike (from findKick), foot: 'left'|'right'
  // srcLow (optional): the source's lowest foot joint over its floor per clip frame (retarget info.sourceFootLow)
  function measure(i,clip,kickAt,foot,ballOffset,srcLow){
    const bones=[];i.root.traverse(o=>{if(o.isBone)bones.push(o);});
    const by=n=>bones.find(b=>short(b.name)===n);
    const hips=by('Hips'),chest=by('Spine2')||by('Spine1'),toe=by(foot==='left'?'LeftToeBase':'RightToeBase'),plant=by(foot==='left'?'RightFoot':'LeftFoot');
    const legs=[['LeftUpLeg','LeftLeg','LeftFoot'],['RightUpLeg','RightLeg','RightFoot']].map(a=>a.map(by));
    const meshes=[];i.root.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});
    const mixer=i.mixer;mixer.stopAllAction();i.cur=null;const a=mixer.clipAction(clip);a.reset().play();a.setEffectiveWeight(1);
    const H=i.holder,inv=new THREE.Matrix4(),v=V(),w=V(),u=V();
    const local=(o,out)=>{inv.copy(H.matrixWorld).invert();return o.getWorldPosition(out).applyMatrix4(inv);};
    const sole=()=>{let lo=1e9;for(const m of meshes){const pos=m.geometry.attributes.position,step=Math.max(1,Math.floor(pos.count/2500));
      for(let k=0;k<pos.count;k+=step){w.fromBufferAttribute(pos,k);m.boneTransform(k,w);w.applyMatrix4(m.matrixWorld);if(w.y<lo)lo=w.y;}}return lo;};
    const N=Math.max(20,Math.round(clip.duration*30)),r={samples:N+1,soleMin:1e9,soleMaxOfLowest:-1e9,hipsY:[1e9,-1e9],hipsHorizMax:0,chestTiltMaxDeg:0,kneeBackwardsFrames:0,airborne:[],sourceAirborne:[]};
    const pose=()=>bones.map(b=>b.getWorldPosition(V()));
    let first=null,last=null;
    for(let k=0;k<=N;k++){a.time=clip.duration*k/N;mixer.update(0);H.updateMatrixWorld(true);
      const s=sole();r.soleMin=Math.min(r.soleMin,s);r.soleMaxOfLowest=Math.max(r.soleMaxOfLowest,s);
      if(s>0.05)r.airborne.push(+(clip.duration*k/N).toFixed(2));   // both feet off the ground at this sample
      if(srcLow){const f=k/N*(srcLow.length-1),j=Math.floor(f),sl=srcLow[j]+(srcLow[Math.min(j+1,srcLow.length-1)]-srcLow[j])*(f-j);
        const extra=s-Math.max(0,sl);r.extraFloatMax=Math.max(r.extraFloatMax||0,extra);r.extraSinkMax=Math.min(r.extraSinkMax||0,extra);if(sl>0.05)r.sourceAirborne.push(+(clip.duration*k/N).toFixed(2));}
      local(hips,v);r.hipsY[0]=Math.min(r.hipsY[0],v.y);r.hipsY[1]=Math.max(r.hipsY[1],v.y);r.hipsHorizMax=Math.max(r.hipsHorizMax,Math.hypot(v.x,v.z));
      if(chest){const up=V().set(0,1,0).applyQuaternion(chest.getWorldQuaternion(Q()));r.chestTiltMaxDeg=Math.max(r.chestTiltMaxDeg,Math.acos(Math.min(1,Math.max(-1,up.y)))*180/Math.PI);}
      // a knee bends forward: the knee sits in front of the hip-ankle line (in the holder's frame, +z forward)
      for(const [h,kn,an] of legs){const ph=local(h,V()),pk=local(kn,V()),pa=local(an,V());const ax=pa.clone().sub(ph).normalize(),off=pk.clone().sub(ph);off.sub(ax.multiplyScalar(off.dot(ax)));
        if(off.length()>0.03&&off.z<-0.02){r.kneeBackwardsFrames++;break;}}
      if(k===0)first=pose();if(k===N)last=pose();}
    r.loopSeamMaxBoneMove=+Math.max(...first.map((p,k)=>p.distanceTo(last[k]))).toFixed(3);
    // the strike: kicking toe position and direction of travel, relative to the holder
    const at=t=>{a.time=Math.max(0,Math.min(clip.duration,t));mixer.update(0);H.updateMatrixWorld(true);};
    at(kickAt-1/60);const t0=local(toe,V());at(kickAt+1/60);const t1=local(toe,V());at(kickAt);const tc=local(toe,V()),pc=local(plant,V());
    const dir=t1.clone().sub(t0);
    // where the pelvis faces at the strike (from the left-right line of the thighs), against the kick's +z
    const lr=local(legs[0][0],V()).sub(local(legs[1][0],V())),pelvisYaw=Math.atan2(-lr.z,lr.x)*180/Math.PI;
    r.strike={atSeconds:+kickAt.toFixed(3),foot,toe:[tc.x,tc.y,tc.z].map(x=>+x.toFixed(3)),plantFoot:[pc.x,pc.y,pc.z].map(x=>+x.toFixed(3)),
      toeSpeed:+(dir.length()*30).toFixed(2),directionDegFromForward:+(Math.atan2(dir.x,dir.z)*180/Math.PI).toFixed(1),directionUpDeg:+(Math.atan2(dir.y,Math.hypot(dir.x,dir.z))*180/Math.PI).toFixed(1),pelvisFacingDegFromForward:+pelvisYaw.toFixed(1)};
    if(ballOffset){r.strike.ballInGame=[0,0.11,ballOffset];r.strike.toeToBall=+Math.hypot(tc.x,tc.y-0.11,tc.z-ballOffset).toFixed(3);}
    for(const k of ['soleMin','soleMaxOfLowest','hipsHorizMax','chestTiltMaxDeg','extraFloatMax','extraSinkMax'])if(r[k]!=null)r[k]=+r[k].toFixed(3);r.hipsY=r.hipsY.map(x=>+x.toFixed(3));
    a.stop();   // the action stays cached: the viewer keeps its own reference to it
    return r;
  }
  return {MAP,parseBVH,retarget,findKick,measure};
})();
