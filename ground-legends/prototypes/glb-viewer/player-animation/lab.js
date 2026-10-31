'use strict';
// Player model + CMU motion lab: the MakeHuman player (out/mh_player.glb, build_player.py) with CMU takes moved onto
// it by ../retarget.js (used as it is), a small state machine (idle, start, run, decel, kick, recover) on three.js
// crossfades, and the measurements the checks read (feet, ball, joints, mesh, steps). Prototype only: the game does not
// load this file.
//
// Two ways to move the player: 'root' (the holder follows the clips' own path over the ground, weighted like the
// clips) and 'game' (the holder follows positions given per tick, e.g. the game's own player; the clips play in place).
window.PALab=(()=>{
  const V=()=>new THREE.Vector3(),Q=()=>new THREE.Quaternion(),short=n=>n.replace(/^mixamorig:?/i,'');
  const BALL_R=0.11;   // the game's ball radius (check_shot.js puts the ball centre 0.11 m up)
  const PARENT={Spine:'Hips',Spine1:'Spine',Spine2:'Spine1',Neck:'Spine2',Head:'Neck',
    LeftShoulder:'Spine2',LeftArm:'LeftShoulder',LeftForeArm:'LeftArm',LeftHand:'LeftForeArm',
    RightShoulder:'Spine2',RightArm:'RightShoulder',RightForeArm:'RightArm',RightHand:'RightForeArm',
    LeftUpLeg:'Hips',LeftLeg:'LeftUpLeg',LeftFoot:'LeftLeg',LeftToeBase:'LeftFoot',
    RightUpLeg:'Hips',RightLeg:'RightUpLeg',RightFoot:'RightLeg',RightToeBase:'RightFoot'};
  const JOINTS=['Hips','Spine2','Head','LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase','RightUpLeg','RightLeg','RightFoot','RightToeBase',
    'LeftArm','LeftForeArm','LeftHand','RightArm','RightForeArm','RightHand'];

  // ---- model ----
  async function loadModel(url){
    const r=await fetch(url);if(!r.ok)throw new Error(url+': '+r.status);
    const buf=await r.arrayBuffer(),gltf=await new Promise((res,rej)=>new THREE.GLTFLoader().parse(buf,'',res,rej));
    const root=gltf.scene,holder=new THREE.Group();holder.name='playerHolder';holder.add(root);
    const bones=[],meshes=[];
    root.traverse(o=>{if(o.isBone){bones.push(o);o.userData.rest={p:o.position.toArray(),q:o.quaternion.toArray(),s:o.scale.toArray()};}
      if(o.isSkinnedMesh){meshes.push(o);o.frustumCulled=false;}});
    const by={};for(const b of bones)by[short(b.name)]=b;
    holder.updateMatrixWorld(true);
    const M={url,root,holder,bones,meshes,by,mixer:new THREE.AnimationMixer(root),fileClips:gltf.animations.map(c=>c.name)};
    M.skin=skinInfo(M);M.check=checkModel(M);M.edges=edgeSample(M);
    return M;
  }
  const comp=(a,k,c)=>c===0?a.getX(k):c===1?a.getY(k):c===2?a.getZ(k):a.getW(k);   // r128 has no getComponent
  // per vertex of the (single) skinned mesh: its strongest joint; the foot vertices of each side
  function skinInfo(M){
    const m=M.meshes[0],si=m.geometry.attributes.skinIndex,sw=m.geometry.attributes.skinWeight,sk=m.skeleton,n=si.count;
    const dom=new Int16Array(n),feet={Left:[],Right:[]},sums=[];let badIndex=0,zero=0,sumErr=0;
    for(let k=0;k<n;k++){let best=-1,bw=-1,s=0;for(let c=0;c<4;c++){const j=comp(si,k,c),w=comp(sw,k,c);s+=w;if(w>0&&j>=sk.bones.length)badIndex++;if(w>bw){bw=w;best=j;}}
      if(s<=0)zero++;sumErr=Math.max(sumErr,Math.abs(s-1));dom[k]=best;
      const nm=short(sk.bones[best].name),side=/^Left(Foot|ToeBase)$/.test(nm)?'Left':/^Right(Foot|ToeBase)$/.test(nm)?'Right':null;if(side)feet[side].push(k);}
    return {mesh:m,dom,feet,badIndex,zero,sumErr,vertexCount:n};
  }
  function toRest(M){for(const b of M.bones){const r=b.userData.rest;b.position.fromArray(r.p);b.quaternion.fromArray(r.q);b.scale.fromArray(r.s);}M.holder.updateMatrixWorld(true);}
  function checkModel(M){
    toRest(M);const m=M.skin.mesh,sk=m.skeleton,c={};
    c.bones=M.bones.length;c.skeletonBones=sk.bones.length;c.meshes=M.meshes.length;c.vertices=M.skin.vertexCount;
    c.triangles=m.geometry.index?m.geometry.index.count/3:M.skin.vertexCount/3;c.fileClips=M.fileClips;
    c.missing=Object.values(GLRetarget.MAP).filter(n=>!M.by[n]);
    c.wrongParent=Object.entries(PARENT).filter(([k,p])=>M.by[k]&&!(M.by[k].parent&&short(M.by[k].parent.name)===p)).map(([k,p])=>k+'<-'+(M.by[k].parent?short(M.by[k].parent.name):'none')+' (expected '+p+')');
    c.skinBadIndex=M.skin.badIndex;c.skinZeroWeight=M.skin.zero;c.skinWeightSumMaxError=+M.skin.sumErr.toFixed(6);
    c.footVertices={Left:M.skin.feet.Left.length,Right:M.skin.feet.Right.length};
    // bind: every joint's world matrix times its inverse bind matrix gives the mesh's bind matrix in the rest pose
    let bindErr=0;const t=new THREE.Matrix4();sk.bones.forEach((b,k)=>{t.multiplyMatrices(b.matrixWorld,sk.boneInverses[k]);for(let e=0;e<16;e++)bindErr=Math.max(bindErr,Math.abs(t.elements[e]-m.bindMatrix.elements[e]));});
    c.bindMatrixMaxError=+bindErr.toExponential(2);
    const box=new THREE.Box3(),w=V();for(let k=0;k<M.skin.vertexCount;k+=3){skinned(m,k,w);box.expandByPoint(w);}
    c.restBox={min:box.min.toArray().map(x=>+x.toFixed(3)),max:box.max.toArray().map(x=>+x.toFixed(3))};
    const p=n=>M.by[n].getWorldPosition(V());
    c.leftOnPlusX=p('LeftUpLeg').x>p('RightUpLeg').x;c.facesPlusZ=p('LeftToeBase').z>p('LeftFoot').z&&p('RightToeBase').z>p('RightFoot').z;
    c.hipsHeight=+p('Hips').y.toFixed(3);c.legLength=+(p('LeftUpLeg').distanceTo(p('LeftLeg'))+p('LeftLeg').distanceTo(p('LeftFoot'))).toFixed(3);
    c.ok=!c.missing.length&&!c.wrongParent.length&&!c.skinBadIndex&&!c.skinZeroWeight&&c.skinWeightSumMaxError<1e-3&&bindErr<1e-4&&c.leftOnPlusX&&c.facesPlusZ&&Math.abs(box.min.y)<0.01;
    return c;
  }
  const skinned=(m,k,out)=>{out.fromBufferAttribute(m.geometry.attributes.position,k);m.boneTransform(k,out);return out.applyMatrix4(m.matrixWorld);};
  // a sample of the mesh's edges (about 1500), their rest lengths: stretch and squash under the motion
  function edgeSample(M){
    toRest(M);const m=M.skin.mesh,idx=m.geometry.index,nt=idx.count/3,step=Math.max(1,Math.floor(nt/1500)),E=[],w=V(),u=V();
    for(let t=0;t<nt;t+=step){const a=idx.getX(t*3),b=idx.getX(t*3+1);skinned(m,a,w);skinned(m,b,u);const L=w.distanceTo(u);if(L>1e-4)E.push([a,b,L]);}
    return E;
  }

  // ---- takes and clips ----
  async function loadTake(url){const r=await fetch(url);if(!r.ok)throw new Error(url+': '+r.status);const b=GLRetarget.parseBVH(await r.text(),url);b.url=url;return b;}
  // source positions over time (cgspeed units), for choosing windows: hips, feet, toes, thighs
  function sourceSeries(bvh,dt){
    const g=new THREE.Group(),root=bvh.skeleton.bones[0],old=root.parent;g.add(root);
    const clip=bvh.clip.clone();for(const t of clip.tracks)t.name=t.name.replace(/^\.bones\[([^\]]+)\]/,'$1');
    const mx=new THREE.AnimationMixer(g),a=mx.clipAction(clip);a.play();const by={};for(const b of bvh.skeleton.bones)by[b.name]=b;
    const out=[],ft=clip.tracks[0].times[1]-clip.tracks[0].times[0];
    for(let t=ft;t<=clip.duration+1e-6;t+=dt||ft){a.time=t;mx.update(0);g.updateMatrixWorld(true);const P=n=>new THREE.Vector3().setFromMatrixPosition(by[n].matrixWorld).toArray();
      out.push({t,hips:P('Hips'),lUp:P('LeftUpLeg'),rUp:P('RightUpLeg'),lFoot:P('LeftFoot'),rFoot:P('RightFoot'),lToe:P('LeftToeBase'),rToe:P('RightToeBase')});}
    mx.uncacheRoot(g);g.remove(root);if(old)old.add(root);
    return {rows:out,frameTime:ft,duration:clip.duration};
  }
  // the take turned about the vertical (all frames after frame 0, the conversion's T-pose): retarget.js faces the model
  // by frame 0, so this is how a take whose actor moves along another direction is made to move along the model's +z
  function turnTake(bvh,yaw){
    if(!yaw)return bvh;const Y=Q().setFromAxisAngle(V().set(0,1,0),yaw),clip=bvh.clip.clone(),root=bvh.skeleton.bones[0].name,q=Q(),p=V();
    for(const tr of clip.tracks){const m=tr.name.match(/^\.bones\[([^\]]+)\]\.(position|quaternion)$/);if(!m||m[1]!==root)continue;
      tr.values=tr.values.slice();
      for(let k=0;k<tr.times.length;k++){if(tr.times[k]<=1e-6)continue;
        if(m[2]==='position'){p.fromArray(tr.values,k*3).applyQuaternion(Y);p.toArray(tr.values,k*3);}
        else{q.fromArray(tr.values,k*4).premultiply(Y);q.toArray(tr.values,k*4);}}}
    return {skeleton:bvh.skeleton,clip,url:bvh.url,turned:yaw};
  }
  // the yaw that turns the actor's travel between two times (or the pelvis facing, face:'pelvis') onto frame 0's facing
  function facingYaw(bvh,from,to,how){
    const S=sourceSeries(bvh,1/60),r0=S.rows[0],near=t=>S.rows.reduce((a,b)=>Math.abs(b.t-t)<Math.abs(a.t-t)?b:a);
    // frame 0 forward: left-right line x up
    const fwd=r=>{const lr=V().fromArray(r.lUp).sub(V().fromArray(r.rUp));return V().crossVectors(lr,V().set(0,1,0)).setY(0).normalize();};
    // frame 0 is the conversion's T-pose: take its facing from the first sample (time 0)
    const g=new THREE.Group(),root=bvh.skeleton.bones[0],old=root.parent;g.add(root);const clip=bvh.clip.clone();for(const t of clip.tracks)t.name=t.name.replace(/^\.bones\[([^\]]+)\]/,'$1');
    const mx=new THREE.AnimationMixer(g),a=mx.clipAction(clip);a.play();a.time=0;mx.update(0);g.updateMatrixWorld(true);const by={};for(const b of bvh.skeleton.bones)by[b.name]=b;
    const f0=fwd({lUp:new THREE.Vector3().setFromMatrixPosition(by.LeftUpLeg.matrixWorld).toArray(),rUp:new THREE.Vector3().setFromMatrixPosition(by.RightUpLeg.matrixWorld).toArray()});
    mx.uncacheRoot(g);g.remove(root);if(old)old.add(root);
    let d;if(how==='pelvis'){d=V();for(const r of S.rows)if(r.t>=from&&r.t<=to)d.add(fwd(r));d.normalize();}
    else{const a1=near(from),b1=near(to);d=V().fromArray(b1.hips).sub(V().fromArray(a1.hips)).setY(0).normalize();}
    return Math.atan2(f0.x,f0.z)-Math.atan2(d.x,d.z);
  }
  // one clip: retargeted, then split into the hips' own path over the ground (root motion, holder space) and the
  // motion about that path (the clip that plays). retarget.js's own in-place copy smooths the path over a window cut
  // at the clip's ends, so a clip's ends keep part of its travel (143_01: 4.75 m/s left instead of 6.9 m/s); here the
  // take is retargeted with up to `pad` s more on both sides, the path smoothed there (centred moving average +-0.25 s) and the
  // clip cut back to [from, to]. A looped clip's path is a straight line at its mean velocity over the cycle.
  // o: {name, from, to (source seconds), loop, face:'travel'|'pelvis'|null, faceFrom, faceTo, pad}
  // o.parts: several clips cut from the one retarget (kick and recover): at the same source time they hold the same
  // pose at the same place over the holder, so a fade between them where they overlap is seamless
  function makeClip(M,bvh,o){return makeClips(M,bvh,o)[0];}
  function makeClips(M,bvh,o){
    const parts=o.parts||[{name:o.name,from:o.from,to:o.to}],lo=Math.min(...parts.map(p=>p.from)),hi=Math.max(...parts.map(p=>p.to));
    const yaw=o.face?facingYaw(bvh,o.faceFrom??lo,o.faceTo??hi,o.face):0,src=turnTake(bvh,yaw);
    const pad=o.pad??0.35,ft=bvh.clip.tracks[0].times[1],from=Math.max(ft,lo-pad),to=Math.min(bvh.clip.duration,hi+pad);
    toRest(M);const r=GLRetarget.retarget(M.root,src,{name:parts[0].name,from,to,fps:60});toRest(M);
    const clav=o.clavicle===false?null:clavicleRelative(M,src,r);
    const hips=M.by.Hips,hn=hips.name+'.position',cap=r.clip.tracks.find(t=>t.name===hn);
    const n=cap.times.length,K=t=>Math.max(0,Math.min(n-1,Math.round((t-from)*60))),kA=K(parts[0].from),h=15;
    // path in hips-parent space at every key of the padded clip
    const P=new Float64Array(n*2);
    if(o.loop){const k0=K(parts[0].from),k1=K(parts[0].to),vx=(cap.values[k1*3]-cap.values[k0*3])/(k1-k0),vz=(cap.values[k1*3+2]-cap.values[k0*3+2])/(k1-k0);
      for(let k=0;k<n;k++){P[k*2]=cap.values[k0*3]+vx*(k-k0);P[k*2+1]=cap.values[k0*3+2]+vz*(k-k0);}}
    // centred window; where the take itself ends inside +-0.25 s the window shrinks on both sides (a one-sided window
    // would put the path ahead of or behind a moving body: 143_02 starts running at its first frame)
    else for(let k=0;k<n;k++){const hr=Math.min(h,k,n-1-k);let ax=0,az=0,c=0;for(let j=k-hr;j<=k+hr;j++){ax+=cap.values[j*3];az+=cap.values[j*3+2];c++;}P[k*2]=ax/c;P[k*2+1]=az/c;}
    const lin=new THREE.Matrix4().copy(M.holder.matrixWorld).invert().multiply(hips.parent.matrixWorld);lin.setPosition(0,0,0);
    // in place: the hips minus their path, shifted so the first part starts with the hips over the holder (as at rest)
    const rest=V().fromArray(hips.userData.rest.p),sx=cap.values[kA*3]-rest.x,sz=cap.values[kA*3+2]-rest.z;
    return parts.map(pt=>{const k0=K(pt.from),k1=K(pt.to),m=k1-k0+1,times=new Float32Array(m),path=[];for(let k=0;k<m;k++)times[k]=k/60;
      const tracks=[];
      for(const tr of r.clip.tracks){const sz2=tr.getValueSize();
        if(tr.times.length===2){tracks.push(new tr.constructor(tr.name,[0,times[m-1]],tr.values.slice()));continue;}
        const vals=new Float32Array(m*sz2);for(let k=0;k<m;k++)for(let c=0;c<sz2;c++)vals[k*sz2+c]=tr.values[(k0+k)*sz2+c];
        if(tr.name===hn)for(let k=0;k<m;k++){vals[k*3]-=P[(k0+k)*2]-P[kA*2]+sx;vals[k*3+2]-=P[(k0+k)*2+1]-P[kA*2+1]+sz;}
        tracks.push(new tr.constructor(tr.name,times,vals));}
      for(let k=0;k<m;k++){const d=V().set(P[(k0+k)*2]-P[k0*2],0,P[(k0+k)*2+1]-P[k0*2+1]).applyMatrix4(lin);path.push([d.x,d.z]);}
      const clip=new THREE.AnimationClip(pt.name,times[m-1],tracks),dur=clip.duration,len=path.reduce((s2,p,k)=>k?s2+Math.hypot(p[0]-path[k-1][0],p[1]-path[k-1][1]):0,0);
      const hv=tracks.find(t=>t.name===hn);
      return {name:pt.name,clip,clipB:clip.clone(),path,times:Array.from(times),duration:dur,loop:!!o.loop,
        speed:len/dur,net:Math.hypot(path[m-1][0],path[m-1][1]),from:pt.from,to:pt.to,take:bvh.url,yawDeg:+(yaw*180/Math.PI).toFixed(1),info:r.info,clavicle:clav,
        hipsStartOffset:[+(hv.values[0]-rest.x).toFixed(4),+(hv.values[2]-rest.z).toFixed(4)]};});
  }
  // clavicles: retarget.js turns each target bone's rest direction onto the source's rest direction and then copies
  // the source's motion, so a bone ends up pointing where the source's does. That is right for limbs, not for the
  // clavicles: the cgspeed T-pose's clavicle (LeftShoulder -> LeftArm) points 34 degrees up, the MakeHuman A-pose's
  // 25 degrees down, and copying the direction shrugs the target's shoulders by about 56 degrees (the mesh bulges up
  // around the shoulders). Keeping only the source's change from its rest does not work either: the source clavicle
  // turns a lot about its own axis, which swings a bone pointing elsewhere (it ended pointing straight down). So the
  // clavicles keep their rest pose on the chest (the shrug is not moved across) and each upper arm's track takes the
  // clavicle's turn over, so the arm still points where the source's does. Needs identity rest rotations
  // (build_player.py writes the joints translation-only); otherwise nothing is changed and the reason is returned.
  function clavicleRelative(M,bvh,r){
    for(const b of M.bones){const q=b.userData.rest.q;if(Math.abs(q[3])<0.999999)return {changed:false,why:'rest rotations are not identity'};}
    const out={changed:true,how:'clavicle at rest on the chest, its turn moved into the upper arm'},q=Q(),c0=Q();
    for(const side of ['Left','Right']){const cl=M.by[side+'Shoulder'],arm=M.by[side+'Arm'];if(!cl||!arm)continue;let maxDeg=0;
      for(const c of [r.clip,r.clipInPlace]){const tc=c.tracks.find(t=>t.name===cl.name+'.quaternion'),ta=c.tracks.find(t=>t.name===arm.name+'.quaternion');
        for(let k=0;k<tc.times.length;k++){c0.fromArray(tc.values,k*4);maxDeg=Math.max(maxDeg,2*Math.acos(Math.min(1,Math.abs(c0.w)))*180/Math.PI);
          q.fromArray(ta.values,k*4).premultiply(c0);q.toArray(ta.values,k*4);tc.values.set([0,0,0,1],k*4);}}
      out[side]={clavicleTurnRemovedMaxDeg:+maxDeg.toFixed(1)};}
    return out;
  }
  // the clip's own path at clip time t (looped clips: whole cycles added)
  function pathAt(c,t){
    const n=c.times.length,D=c.duration;let cyc=0;
    if(c.loop){cyc=Math.floor(t/D);t-=cyc*D;}else t=Math.max(0,Math.min(D,t));
    const f=t/D*(n-1),j=Math.min(n-2,Math.floor(f)),u=f-j,a=c.path[j],b=c.path[j+1],e=c.path[n-1];
    return [a[0]+(b[0]-a[0])*u+cyc*e[0],a[1]+(b[1]-a[1])*u+cyc*e[1]];
  }
  // the clip's speed over the ground near clip time t (+-0.1 s)
  function speedAt(c,t){const h=0.1,a=pathAt(c,t-h),b=pathAt(c,t+h),dt=c.loop?2*h:Math.min(c.duration,t+h)-Math.max(0,t-h);return dt>0?Math.hypot(b[0]-a[0],b[1]-a[1])/dt:0;}
  // phase in a clip where its speed is closest to v (decel: start where the take is as fast as the player)
  function phaseForSpeed(c,v,from,to){let best=from||0,bd=Infinity;for(let t=from||0;t<=(to??c.duration);t+=1/120){const d=Math.abs(speedAt(c,t)-v);if(d<bd){bd=d;best=t;}}return best;}

  // ---- player: a state machine on crossfades ----
  // lib: {idle, start, run, decel, kick, recover} built with makeClip. Each state keeps two copies of its clip so that a
  // state can restart into itself with a fade (a second kick while the first fades out). The fades are linear weight
  // ramps kept here rather than three.js's crossFadeTo, whose fadeOut always starts from weight 1: a fade that
  // interrupts another fade starts from the weight each clip has at that moment. The mixer normalises the weights.
  function Player(M,lib,opt){
    this.M=M;this.lib=lib;this.mode=(opt&&opt.mode)||'root';this.layers=[];this.t=0;this.flip={};this.log=[];
    this.yaw=0;this.pos=[0,0];M.mixer.stopAllAction();M.mixer.uncacheRoot(M.root);M.mixer.setTime(0);toRest(M);
  }
  const ramp=(L,t)=>L.dur>0?L.from+(L.to-L.from)*Math.max(0,Math.min(1,(t-L.t0)/L.dur)):L.to;
  Player.prototype.play=function(state,o){
    o=o||{};const c=this.lib[state];if(!c)throw new Error('no clip for state '+state);
    const top=this.layers[this.layers.length-1],same=!!top&&top.state===state;
    // a restart takes the other copy; a copy still fading out is cut (restarts closer together than one fade)
    if(same)this.flip[state]=!this.flip[state];
    const clip=this.flip[state]?c.clipB:c.clip,a=this.M.mixer.clipAction(clip),fade=o.fade??0.2;
    const outgoing=this.layers.map(L=>({state:L.state,time:+L.action.time.toFixed(4),weight:+ramp(L,this.t).toFixed(4),clipB:L.action.getClip()===L.c.clipB}));
    const cut=this.layers.filter(L=>L.action===a);this.layers=this.layers.filter(L=>L.action!==a);
    for(const L of this.layers){L.from=ramp(L,this.t);L.to=0;L.t0=this.t;L.dur=fade;if(!(fade>0)){L.action.stop();}}
    if(!(fade>0))this.layers=[];
    a.stop();a.reset();a.setLoop(c.loop?THREE.LoopRepeat:THREE.LoopOnce,Infinity);a.clampWhenFinished=true;a.time=o.phase||0;a.timeScale=o.timeScale??1;
    const L={state,c,action:a,from:this.layers.length?0:1,to:1,t0:this.t,dur:fade,since:this.t,lastTime:a.time,speedSync:!!o.speedSync};
    a.setEffectiveWeight(L.from);a.play();this.layers.push(L);
    this.log.push({t:+this.t.toFixed(4),state,phase:+(o.phase||0).toFixed(4),timeScale:+(o.timeScale??1).toFixed(4),fade,from:top?top.state:null,restart:same,cutCopy:cut.length>0,why:o.why||null,outgoing});
    return a;
  };
  Object.defineProperty(Player.prototype,'cur',{get(){return this.layers[this.layers.length-1]||null;}});
  // dt: seconds; game: {x,z,yaw,speed} for the holder in 'game' mode
  Player.prototype.step=function(dt,game){
    const cur=this.cur;if(cur&&cur.speedSync&&game)cur.action.timeScale=Math.max(0.05,game.speed/cur.c.speed);
    const t1=this.t+dt;for(const L of this.layers){L.lastTime=L.action.time;L.action.setEffectiveWeight(ramp(L,t1));}
    this.M.mixer.update(dt);this.t=t1;
    if(this.mode==='root'){let dx=0,dz=0,ws=0;for(const L of this.layers)ws+=ramp(L,t1);
      for(const L of this.layers){const w=ramp(L,t1)/(ws||1);if(!(w>0))continue;let a0=L.lastTime,a1=L.action.time;
        if(L.c.loop&&a1<a0-1e-9)a1+=L.c.duration;   // wrapped this step
        const a=pathAt(L.c,a0),b=pathAt(L.c,a1);dx+=w*(b[0]-a[0]);dz+=w*(b[1]-a[1]);}
      const c=Math.cos(this.yaw),sn=Math.sin(this.yaw);this.pos[0]+=dx*c+dz*sn;this.pos[1]+=-dx*sn+dz*c;}
    else if(game){this.pos=[game.x,game.z];this.yaw=game.yaw;}
    this.layers=this.layers.filter(L=>{const done=L.to===0&&t1>=L.t0+L.dur-1e-9;if(done)L.action.stop();return !done;});
    const H=this.M.holder;H.position.set(this.pos[0],0,this.pos[1]);H.rotation.set(0,this.yaw,0);H.updateMatrixWorld(true);
  };
  Player.prototype.weights=function(){const o={};let ws=0;for(const L of this.layers)ws+=ramp(L,this.t);for(const L of this.layers)o[L.state]=+((o[L.state]||0)+ramp(L,this.t)/(ws||1)).toFixed(4);return o;};

  // ---- clips in isolation: poses and the kick's contact ----
  // one clip alone on the model, holder at the origin facing +z: f(t) gets called with the pose at clip time t
  function sampleClip(M,c,times,f){
    M.mixer.stopAllAction();const H=M.holder,p=H.position.clone(),r=H.rotation.clone();H.position.set(0,0,0);H.rotation.set(0,0,0);
    const a=M.mixer.clipAction(c.clip);a.reset();a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.setEffectiveWeight(1);a.play();
    const out=times.map(t=>{a.time=Math.max(0,Math.min(c.duration,t));M.mixer.update(0);H.updateMatrixWorld(true);return f(t);});
    a.stop();M.mixer.uncacheAction(c.clip);H.position.copy(p);H.rotation.copy(r);toRest(M);return out;
  }
  // joint positions relative to the hips' ground point, every 1/60 s (cached): what a fade has to bridge
  function poseTable(M,c){
    if(c._poses)return c._poses;const T=[];for(let t=0;t<=c.duration+1e-6;t+=1/60)T.push(t);
    c._poses=sampleClip(M,c,T,()=>{const h=M.by.Hips.getWorldPosition(V());return JOINTS.map(n=>{const p=M.by[n].getWorldPosition(V());return [p.x-h.x,p.y,p.z-h.z];});});
    return c._poses;
  }
  const poseDiff=(A,B)=>{let m=0;for(let k=0;k<A.length;k++)m=Math.max(m,Math.hypot(A[k][0]-B[k][0],A[k][1]-B[k][1],A[k][2]-B[k][2]));return m;};
  // the kick in a kick clip (clip seconds): the kicking toe's fastest moment, then the bottom of its arc within
  // -0.03..+0.145 s of it at 1/240 s (the estimate check_shot.js uses: the source has no ball)
  function kickContact(M,c,side){
    side=side||'Right';const toe=M.by[side+'ToeBase'],T=[];for(let t=0;t<=c.duration+1e-6;t+=1/240)T.push(t);
    const P=sampleClip(M,c,T,t=>toe.getWorldPosition(V()));let vmax=-1,ts=0;
    for(let k=1;k<P.length;k++){const v=P[k].distanceTo(P[k-1])*240;if(v>vmax){vmax=v;ts=T[k];}}
    let tc=ts,lo=Infinity;for(let k=0;k<T.length;k++)if(T[k]>=ts-0.03&&T[k]<=ts+0.145&&P[k].y<lo){lo=P[k].y;tc=T[k];}
    // the kicking foot's landing after the contact and the plant foot's (other side) last landing before it
    const other=side==='Right'?'Left':'Right',S=sampleClip(M,c,T.filter((_,k)=>k%4===0),t=>{const pr=probe(M,{});return {t,k:pr.feet[side].low,p:pr.feet[other].low};});
    let down=null,plant=null;for(let j=1;j<S.length;j++){if(down==null&&S[j].t>tc+0.05&&S[j].k<0.02)down=S[j].t;if(S[j].t<tc&&S[j].p<0.02&&S[j-1].p>=0.02)plant=S[j].t;}
    return {fastest:+ts.toFixed(4),toeSpeed:+vmax.toFixed(2),contact:+tc.toFixed(4),toeLow:+lo.toFixed(4),kickFootDown:down,plantLands:plant};
  }

  // ---- the clip set ----
  // locomotion from CMU subject 143 (one actor); kicks from 143_24 or subjects 10 / 11 (right-foot kicks). Windows in
  // source seconds, chosen from the takes' own hips speed and foot heights (README: 클립 구간). Each kick take gives
  // the kick (0.6 s before the strike to 0.4 s after) and the recovery after it (from 0.25 s to 1.0 s after), cut from one
  // retarget so that they overlap by KICK_OVERLAP.
  const TAKES={idle:{take:'143_03',from:0.05,to:0.80,loop:true,face:'travel',faceFrom:1.3,faceTo:1.98},
    start:{take:'143_03',from:0.80,to:1.98,face:'travel',faceFrom:1.3,faceTo:1.98},
    run:{take:'143_01',from:1/60,to:0.7417,loop:true,face:'travel'},
    decel:{take:'143_02',from:0.03,to:1.50,face:'travel',faceFrom:0.03,faceTo:0.8}};
  const KICK_OVERLAP=0.15;
  const KICKS={'143_24':5.05,'11_01':3.375,'10_01':4.983,'10_02':2.925,'10_03':1.142,'10_05':2.533,'10_06':3.433};   // GLRetarget.findKick
  async function buildLib(M,base,kick,opt){
    opt=opt||{};const cache=opt.cache||{},take=async n=>cache[n]||(cache[n]=await loadTake(base+n+'.bvh'));const lib={_M:M,kickTake:kick};
    for(const [k,o] of Object.entries(TAKES))lib[k]=makeClip(M,await take(o.take),Object.assign({name:k},o));
    const st=KICKS[kick],kb=await take(kick),face={face:'travel',faceFrom:st-0.4,faceTo:st};
    // the recovery starts 0.15 s before the kick's end (KICK_OVERLAP): the kick fades into it at the same take time
    [lib.kick,lib.recover]=makeClips(M,kb,Object.assign({parts:[{name:'kick',from:st-0.6,to:st+0.4},{name:'recover',from:st+0.4-KICK_OVERLAP,to:st+1.0}]},face));
    lib.kick.contact=kickContact(M,lib.kick,'Right');
    for(const k of ['idle','start','run','decel','kick','recover'])lib[k].take=k==='kick'||k==='recover'?kick:TAKES[k].take;
    return lib;
  }

  // ---- plans: the events of each scenario (shared by the viewer and check_player.js) ----
  // the phase of `to` (lo..hi s, where ok(phase)) whose pose is closest to `from` at time tf
  function pickPhase(M,from,tf,to,lo,hi,ok){
    const A=poseTable(M,from),pa=A[Math.max(0,Math.min(A.length-1,Math.round(tf*60)))],B=poseTable(M,to);let best={phase:lo||0,diff:Infinity};
    for(let k=Math.round((lo||0)*60);k<=Math.min(B.length-1,Math.round((hi??to.duration)*60));k++){if(ok&&!ok(k/60))continue;const d=poseDiff(pa,B[k]);if(d<best.diff)best={phase:k/60,diff:d};}
    return best;
  }
  // after a kick, by the player's speed when it ends: running on -> run (phase by pose), slowing -> decel (phase by
  // pose among those within 1 m/s of the player), standing -> recover (it overlaps the kick's end: same take time)
  function afterKick(lib,ev,tKickEnd,kickTimeAtEnd,speedAt0,o){
    const M=lib._M,K=lib.kick;
    let t=tKickEnd-o.fadeOut,speed=speedAt0(t),kt=kickTimeAtEnd-o.fadeOut;
    if(speed>2.5){const pm=pickPhase(M,K,kt,lib.run,0,lib.run.duration);ev.push({t,state:'run',fade:o.fadeOut,phase:pm.phase,speedSync:true,why:'speed '+speed.toFixed(2)+' > 2.5; run phase by pose ('+pm.diff.toFixed(3)+' m)'});return null;}
    if(speed>0.3){let pm=pickPhase(M,K,kt,lib.decel,0,lib.decel.duration-0.3,ph=>Math.abs(speedAt(lib.decel,ph)-speed)<=1);
      if(!(pm.diff<Infinity))pm={phase:phaseForSpeed(lib.decel,speed,0,lib.decel.duration-0.3),diff:NaN};
      ev.push({t,state:'decel',fade:o.fadeOut,phase:pm.phase,why:'speed '+speed.toFixed(2)+'; decel phase by pose within 1 m/s ('+(+pm.diff).toFixed(3)+' m)'});
      const te=t+lib.decel.duration-pm.phase;ev.push({t:te-0.3,state:'idle',fade:0.3,why:'decel ends'});return te;}
    t=tKickEnd-KICK_OVERLAP;speed=speedAt0(t);
    ev.push({t,state:'recover',fade:KICK_OVERLAP,phase:0,why:'speed '+speed.toFixed(2)+' <= 0.3; recover overlaps the kick (same take time)'});
    const te=t+lib.recover.duration;ev.push({t:te-0.3,state:'idle',fade:0.3,why:'recover ends'});return te;
  }
  // a game shot: g = one probe scenario (rows every 1/60 s from the D press, lastOwned = the contact tick)
  function planGame(lib,g,o){
    o=Object.assign({fadeIn:0.15,fadeOut:0.25},o||{});const K=lib.kick,tc=K.contact.contact,tC=g.lastOwned;
    const ev=[{t:0,state:g.running?'run':'idle',fade:0,speedSync:!!g.running,phase:0,why:'before the press'}];
    // the kick cannot start before the D press (g.press: the run-up recorded before it)
    const t0=g.press||0,ts=Math.max(t0,tC-tc),phase=Math.max(0,tc-(tC-t0)),fade=Math.min(o.fadeIn,Math.max(0,tC-ts));
    ev.push({t:ts,state:'kick',fade,phase,why:'contact at the game\'s contact tick'+(phase>0?' (the kick\'s first '+phase.toFixed(3)+' s skipped: the press comes later than that)':'')});
    const tEndKick=ts+K.duration-phase;
    const te=afterKick(lib,ev,tEndKick,K.duration,t=>speedOfRows(g.rows,t),o);
    return {mode:'game',events:ev,tEnd:Math.min(g.rows.length-1,Math.round(((te||tEndKick)+1.0)*60))/60,game:g.rows.map(r=>({x:r.x,z:r.z,yaw:r.yaw,speed:r.speed,ball:r.ball})),
      sub:{from:tC-0.1,to:tC+0.1},tC,press:t0,kickStart:ts,kickPhase:phase,fadeIn:fade,ballLeaves:g.ballLeaves,edges:true};
  }
  const speedOfRows=(rows,t)=>{const r=rows[Math.max(0,Math.min(rows.length-1,Math.round(t*60)))];return r.speed;};
  // run -> decel: the moment within the next run cycle and the decel phase (within 1.5 m/s of the run) whose poses match
  function runToDecel(M,run,runPhaseAt,decel){
    let best={delay:0,phase:0,diff:Infinity};const v=run.speed;
    for(let d=0;d<run.duration;d+=1/60){const rt=(runPhaseAt+d)%run.duration;const pm=pickPhase(M,run,rt,decel,0,decel.duration*0.5,ph=>Math.abs(speedAt(decel,ph)-v)<=1.5);
      if(pm.diff<best.diff)best={delay:d,phase:pm.phase,diff:pm.diff};}
    return best;
  }
  // the chain without the game: idle -> start -> run -> decel -> idle -> kick -> recover -> idle (root motion)
  function planChain(lib,o){
    o=Object.assign({fade:0.25},o||{});const ev=[],L=lib,M=L._M;let t=0;
    ev.push({t:0,state:'idle',fade:0,phase:0,why:'start'});t=1.0;
    ev.push({t,state:'start',fade:o.fade,phase:0,why:'go'});
    const runIn=L.start.duration-0.25,pm=pickPhase(M,L.start,runIn,L.run,0,L.run.duration);
    t+=runIn;const tRun=t;ev.push({t,state:'run',fade:0.25,phase:pm.phase,why:'start ends; run phase by pose ('+pm.diff.toFixed(3)+' m)'});
    t+=1.6;const rd=runToDecel(M,L.run,(pm.phase+(t-tRun))%L.run.duration,L.decel);t+=rd.delay;
    ev.push({t,state:'decel',fade:0.25,phase:rd.phase,why:'stop asked '+rd.delay.toFixed(3)+' s earlier; switch where run and decel poses match ('+rd.diff.toFixed(3)+' m)'});
    t+=L.decel.duration-rd.phase-0.3;ev.push({t,state:'idle',fade:0.3,phase:0,why:'decel ends'});
    t+=1.0;ev.push({t,state:'kick',fade:0.2,phase:0,why:'kick from standing'});
    t+=L.kick.duration-KICK_OVERLAP;ev.push({t,state:'recover',fade:KICK_OVERLAP,phase:0,why:'kick ends (recover overlaps it)'});
    t+=L.recover.duration-0.3;ev.push({t,state:'idle',fade:0.3,phase:0,why:'recover ends'});
    return {mode:'root',events:ev,tEnd:t+1.5,edges:true,baseFrom:t+0.3};
  }
  // kicks again and again: during the kick, during the recovery, and a run restarted into itself
  function planRepeat(lib){
    const L=lib,M=L._M,K=L.kick,tc=K.contact.contact,ev=[{t:0,state:'idle',fade:0,phase:0,why:'start'}];let t=0.6;
    ev.push({t,state:'kick',fade:0.2,phase:0,why:'kick 1'});
    t+=tc+0.15;ev.push({t,state:'kick',fade:0.2,phase:0,why:'kick 2 restarts kick 1 just after its contact'});
    t+=K.duration-KICK_OVERLAP;ev.push({t,state:'recover',fade:KICK_OVERLAP,phase:0,why:'kick 2 ends'});
    t+=L.recover.duration*0.4;ev.push({t,state:'kick',fade:0.2,phase:0,why:'kick 3 from the recovery'});
    t+=K.duration-KICK_OVERLAP;ev.push({t,state:'recover',fade:KICK_OVERLAP,phase:0,why:'kick 3 ends'});
    t+=L.recover.duration-0.3;ev.push({t,state:'idle',fade:0.3,phase:0,why:'recover ends'});
    t+=0.8;ev.push({t,state:'start',fade:0.25,phase:0,why:'go'});
    const pm=pickPhase(M,L.start,L.start.duration-0.25,L.run,0,L.run.duration);
    t+=L.start.duration-0.25;const tRun=t;ev.push({t,state:'run',fade:0.25,phase:pm.phase,why:'start ends'});
    t+=0.9;ev.push({t,state:'run',fade:0.2,phase:0,why:'run restarted at phase 0 (restart into itself)'});
    t+=0.9;ev.push({t,state:'kick',fade:0.15,phase:0,why:'kick 4 from running (root motion: the kick\'s own speed)'});
    t+=K.duration-KICK_OVERLAP;ev.push({t,state:'recover',fade:KICK_OVERLAP,phase:0,why:'kick 4 ends'});
    t+=L.recover.duration-0.3;ev.push({t,state:'idle',fade:0.3,phase:0,why:'recover ends'});
    return {mode:'root',events:ev,tEnd:t+1.2,edges:true,baseFrom:t+0.3};
  }

  // ---- measurements of the current pose ----
  // feet: lowest point and the touching vertices of each foot; ball: gap from each foot to the ball's surface
  function probe(M,opt){
    opt=opt||{};const m=M.skin.mesh,w=V(),out={t:opt.t,feet:{}};
    for(const side of ['Left','Right']){const ids=M.skin.feet[side],pos=new Float32Array(ids.length*3);let low=Infinity,gap=Infinity;
      for(let k=0;k<ids.length;k++){skinned(m,ids[k],w);pos[k*3]=w.x;pos[k*3+1]=w.y;pos[k*3+2]=w.z;if(w.y<low)low=w.y;
        if(opt.ball){const g=Math.hypot(w.x-opt.ball[0],w.y-opt.ball[1],w.z-opt.ball[2])-BALL_R;if(g<gap)gap=g;}}
      out.feet[side]={low,gap:opt.ball?gap:null,pos};}
    const J={};for(const n of JOINTS)J[n]=M.by[n].getWorldPosition(V()).toArray();out.j=J;
    out.q={};for(const n of JOINTS)out.q[n]=M.by[n].getWorldQuaternion(Q());
    out.holder=[M.holder.position.x,M.holder.position.z,M.holder.rotation.y];
    if(opt.edges){let lo=Infinity,hi=0,at=null;const u=V();for(const [a,b,L] of M.edges){skinned(m,a,w);skinned(m,b,u);const r=w.distanceTo(u)/L;if(r<lo)lo=r;if(r>hi){hi=r;at=a;}}
      out.edge={min:lo,max:hi,maxAt:at==null?null:short(m.skeleton.bones[M.skin.dom[at]].name)};}
    let sole=Infinity;for(const s in out.feet)sole=Math.min(sole,out.feet[s].low);
    // the whole body's lowest point (sampled): hands or knees on the ground count too
    if(opt.body){const pa=m.geometry.attributes.position;for(let k=0;k<pa.count;k+=7){skinned(m,k,w);if(w.y<sole)sole=w.y;}}
    out.sole=sole;
    return out;
  }
  // per foot, between two probes: how far the vertices that touch the ground (< touch m) in both moved across it
  function slide(a,b,touch){
    const o={};for(const s of ['Left','Right']){const A=a.feet[s].pos,B=b.feet[s].pos;let sum=0,n=0;
      for(let k=0;k<A.length/3;k++)if(A[k*3+1]<touch&&B[k*3+1]<touch){sum+=Math.hypot(B[k*3]-A[k*3],B[k*3+2]-A[k*3+2]);n++;}
      o[s]=n?{d:sum/n,n}:null;}
    return o;
  }
  const roundJ=J=>{const o={};for(const k in J)o[k]=J[k].map(x=>+x.toFixed(5));return o;};
  // largest turn (degrees) of any joint's world orientation since the previous tick, by body part (legs, arms, spine)
  const PART=n=>/Leg|Foot|Toe/.test(n)?'legs':/Arm|Hand/.test(n)?'arms':'spine';
  function rotSteps(a,b){const o={legs:0,arms:0,spine:0};for(const n of JOINTS){const d=2*Math.acos(Math.min(1,Math.abs(a[n].dot(b[n]))))*180/Math.PI;const p=PART(n);if(d>o[p])o[p]=d;}
    for(const k in o)o[k]=+o[k].toFixed(3);return o;}

  // ---- a scenario: events on a timeline, sampled every 1/60 s (and 1/240 s inside sub) ----
  // sc: {mode, events:[{t,state,fade,phase,timeScale,speedSync}], tEnd, game:[{x,z,yaw,speed,ball}] per 1/60 s,
  //      ball:[x,y,z] fixed (no game), sub:{from,to} (fine samples for the contact), edges:true}
  // The model is left in the pose of tEnd (the viewer's screenshots use that).
  function runScenario(M,lib,sc){
    const P=new Player(M,lib,{mode:sc.mode}),dt=1/240,N=Math.round(sc.tEnd/dt),ev=sc.events.slice().sort((a,b)=>a.t-b.t);let ei=0;
    if(sc.start){P.pos=sc.start.slice(0,2);P.yaw=sc.start[2]||0;}
    const gameAt=t=>{if(!sc.game)return null;const f=t*60,j=Math.min(sc.game.length-2,Math.max(0,Math.floor(f))),u=Math.max(0,Math.min(1,f-j)),a=sc.game[j],b=sc.game[j+1];
      let dy=b.yaw-a.yaw;while(dy>Math.PI)dy-=2*Math.PI;while(dy<-Math.PI)dy+=2*Math.PI;
      return {x:a.x+(b.x-a.x)*u,z:a.z+(b.z-a.z)*u,yaw:a.yaw+dy*u,speed:a.speed+(b.speed-a.speed)*u,ball:a.ball&&b.ball?a.ball.map((v,k)=>v+(b.ball[k]-v)*u):null};};
    const ticks=[],subs=[];let prev=null;
    const take=(k,t)=>{const g=gameAt(t),ball=g&&g.ball?g.ball:sc.ball||null;
      const fine=sc.sub&&t>=sc.sub.from-1e-9&&t<=sc.sub.to+1e-9,tick=k%4===0;
      if(!tick&&!fine)return;
      const pr=probe(M,{t,ball,edges:tick&&sc.edges&&(k%8===0),body:tick&&(k%8===0)});
      const feet={};for(const s of ['Left','Right'])feet[s]={low:+pr.feet[s].low.toFixed(5),gap:pr.feet[s].gap==null?null:+pr.feet[s].gap.toFixed(5)};
      if(fine)subs.push({t:+t.toFixed(5),feet,j:{RightToeBase:pr.j.RightToeBase,RightFoot:pr.j.RightFoot,LeftToeBase:pr.j.LeftToeBase,LeftFoot:pr.j.LeftFoot},ball});
      if(!tick)return;
      const rec={t:+t.toFixed(5),state:P.cur?P.cur.state:null,w:P.weights(),ball,feet,j:roundJ(pr.j),rot:prev?rotSteps(prev.q,pr.q):null,holder:pr.holder.map(x=>+x.toFixed(5)),
        edge:pr.edge||null,sole:+pr.sole.toFixed(5),speed:g?g.speed:null,times:P.layers.map(L=>[L.state,+L.action.time.toFixed(4)])};
      if(prev){const s=slide(prev,pr,sc.touch||0.02);rec.slide={Left:s.Left?+s.Left.d.toFixed(5):null,Right:s.Right?+s.Right.d.toFixed(5):null};}
      prev=pr;ticks.push(rec);};
    for(let k=0;k<=N;k++){const t=k*dt;
      while(ei<ev.length&&ev[ei].t<=t+1e-9){const e=ev[ei++];P.play(e.state,e);}
      if(k===0)P.step(0,gameAt(0));
      take(k,t);
      if(k<N)P.step(dt,gameAt(t+dt));}
    return {ticks,subs,log:P.log};
  }
  return {loadModel,loadTake,sourceSeries,makeClip,pathAt,speedAt,phaseForSpeed,Player,probe,slide,runScenario,sampleClip,poseTable,poseDiff,pickPhase,kickContact,KICK_OVERLAP,planGame,planChain,planRepeat,buildLib,TAKES,KICKS,toRest,skinned,short,BALL_R,JOINTS};
})();
