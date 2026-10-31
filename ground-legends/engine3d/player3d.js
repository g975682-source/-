'use strict';
// Ground Legends: the 3D player engine (new player model), kept apart from the game. The game loads this file only when
// the 3D players are switched on (index.html: ?p3d=one|team|all, remembered in localStorage 'gl-p3d'; ?p3d=0 turns it
// off), and calls window.P3D.frame(...) once per drawn frame, after its own players have been posed. Nothing in the
// game's physics, controls, AI, online messages or replay records depends on this file; with it off, or before the
// model has loaded, or if loading fails, the game draws its own procedural players as before.
//
// What it does (stage 1):
// - loads the player model (models/mh_player.glb: MakeHuman CC0 body, 22 Mixamo-named bones, 1.80 m, built by
//   prototypes/glb-viewer/player-animation/build_player.py) once, and gives each chosen player a copy (SkeletonUtils),
//   with the team kit, skin, hair and boots painted into its vertex colours;
// - each frame, places the copy where the game's rig stands (position, facing, the body's size) and poses its bones
//   from the game's rig joints, which the game has just set for the frame (applyVisual: the state's pose, rigLife,
//   easing). So every state the game draws (run, kick, slide, dive, skills, celebrations, replays, an online guest's
//   view) moves the new model too, on the game's own timing;
// - hides the game's own meshes for those players by moving them to camera layer 1 (the rig keeps running and its
//   root stays visible: the online sync reads rig.root.visible), and brings them back when the player is let go.
//
// Pose transfer: both skeletons have no rotation at rest, face +z with y up and the left side on +x. Their rest shapes
// differ (the model stands with the legs a little apart and the arms in an A pose; the game rig hangs straight down),
// so each limb bone has a fixed rest correction c turning its rest direction onto straight down, and a bone's local
// rotation is c(parent)^-1 * R(game joint) * c(self). Down a chain that gives R1*R2*...*Rn*c(n). The feet keep the
// model's own shape. The hips' height is the game's hip fraction (hipN/0.95) of the model's straight-leg standing height.
// This is the stage-1 driver; clip-based motion (prototypes/glb-viewer/player-animation/lab.js) is the next stage.
window.P3D=(()=>{
  const TH=window.THREE;
  const S={mode:'off',ready:false,error:null,base:'engine3d/',tpl:null,actors:new Map(),players:null,frames:0,ms:0,attachMs:0,attached:0,detached:0};
  const MAP={Hips:'hips',Spine:'torso',Spine1:'chest',Neck:'neck',Head:'head',LeftShoulder:'shL',RightShoulder:'shR',LeftArm:'armL',RightArm:'armR',
    LeftForeArm:'elbowL',RightForeArm:'elbowR',LeftHand:'wristL',RightHand:'wristR',LeftUpLeg:'legL',RightUpLeg:'legR',LeftLeg:'kneeL',RightLeg:'kneeR',
    LeftFoot:'ankleL',RightFoot:'ankleR'};
  const PARENT={LeftForeArm:'LeftArm',RightForeArm:'RightArm',LeftHand:'LeftForeArm',RightHand:'RightForeArm',LeftLeg:'LeftUpLeg',RightLeg:'RightUpLeg',
    LeftFoot:'LeftLeg',RightFoot:'RightLeg',LeftToeBase:'LeftFoot',RightToeBase:'RightFoot'};
  const MODEL_H=1.80,GAME_H=1.81;   // the model's height; the game rig's standing height at body scale 1 (bodyOf: 181 cm)
  const HIDDEN_LAYER=1;
  const short=n=>n.replace(/^mixamorig:?/i,'');

  // ---- the model, once ----
  async function load(url){
    const r=await fetch(url);if(!r.ok)throw new Error(url+': '+r.status);
    const buf=await r.arrayBuffer();
    const gltf=await new Promise((res,rej)=>new TH.GLTFLoader().parse(buf,'',res,rej));
    const root=gltf.scene;let mesh=null;const bone={};
    root.traverse(o=>{if(o.isBone)bone[short(o.name)]=o;if(o.isSkinnedMesh&&!mesh)mesh=o;});
    if(!mesh)throw new Error('no skinned mesh in '+url);
    for(const b of Object.keys(MAP))if(!bone[b])throw new Error('bone missing: '+b);
    root.updateMatrixWorld(true);
    // rest corrections: a limb bone's child offset (its rest direction) turned onto straight down
    const DOWN=new TH.Vector3(0,-1,0),C={};
    const corr=child=>new TH.Quaternion().setFromUnitVectors(bone[child].position.clone().normalize(),DOWN);
    for(const s of ['Left','Right']){C[s+'UpLeg']=corr(s+'Leg');C[s+'Leg']=corr(s+'Foot');C[s+'Arm']=corr(s+'ForeArm');C[s+'ForeArm']=corr(s+'Hand');C[s+'Hand']=C[s+'ForeArm'].clone();}
    // body regions from the model's own colours (build_player.py paints shirt and socks the same red: the height tells them apart)
    const col=mesh.geometry.attributes.color,pos=mesh.geometry.attributes.position,n=pos.count,region=new Uint8Array(n);
    const PAL=[['shirt',0xc8102e],['shorts',0xf4f4f4],['boots',0x141414],['skin',0xc99a74],['hair',0x2a1d14]].map(([k,h])=>[k,((h>>16)&255)/255,((h>>8)&255)/255,(h&255)/255]);
    const RIX={shirt:0,shorts:1,socks:2,boots:3,skin:4,hair:5};
    for(let i=0;i<n;i++){const r0=col.getX(i),g0=col.getY(i),b0=col.getZ(i);let best=0,bd=1e9;
      PAL.forEach((p,k)=>{const d=(p[1]-r0)**2+(p[2]-g0)**2+(p[3]-b0)**2;if(d<bd){bd=d;best=k;}});
      let rg=PAL[best][0];if(rg==='shirt'&&pos.getY(i)<0.6)rg='socks';region[i]=RIX[rg];}
    // straight-leg standing height: rest pose with the leg corrections, lowest foot vertex on the ground
    const pose=new Map();for(const [b,q] of Object.entries(C))pose.set(b,bone[b].quaternion.clone());
    for(const s of ['Left','Right']){bone[s+'UpLeg'].quaternion.copy(C[s+'UpLeg']);bone[s+'Leg'].quaternion.copy(C[s+'UpLeg'].clone().invert().multiply(C[s+'Leg']));
      bone[s+'Foot'].quaternion.copy(C[s+'Leg'].clone().invert());}
    root.updateMatrixWorld(true);
    let lo=Infinity;const v=new TH.Vector3();
    for(let i=0;i<n;i++){if(region[i]!==RIX.boots)continue;v.fromBufferAttribute(pos,i);mesh.boneTransform(i,v);v.applyMatrix4(mesh.matrixWorld);if(v.y<lo)lo=v.y;}
    for(const [b,q] of pose)bone[b].quaternion.copy(q);root.updateMatrixWorld(true);
    const hipsRest=bone.Hips.position.clone(),standY=hipsRest.y-lo;
    return {root,mesh,C,region,hipsRest,standY,verts:n};
  }

  // ---- a player's copy ----
  const linear=hex=>{const c=new TH.Color(hex);return [c.r,c.g,c.b];};
  function paint(geom,region,kit){
    const n=region.length,arr=new Float32Array(n*3),cols=[kit.shirt,kit.shorts,kit.socks,kit.boots,kit.skin,kit.hair].map(linear);
    for(let i=0;i<n;i++){const c=cols[region[i]];arr[i*3]=c[0];arr[i*3+1]=c[1];arr[i*3+2]=c[2];}
    geom.setAttribute('color',new TH.BufferAttribute(arr,3));
  }
  function kitFor(p,teams){
    const T=teams&&teams[p.team],pd=p.pd||p;
    const k=p.isGK?{shirt:T&&T.def&&T.def.gk||'#21c879',shorts:'#151515',socks:T&&T.def&&T.def.gk||'#21c879'}:(T&&T.kit)||{shirt:'#c8102e',shorts:'#f4f4f4',socks:'#c8102e'};
    return {shirt:k.shirt,shorts:k.shorts,socks:k.socks||k.shirt,boots:pd.boot||'#141414',skin:pd.skin||'#c99a74',hair:pd.hair||'#2a1d14'};
  }
  function attach(p,scene,teams){
    const t=S.tpl,root=TH.SkeletonUtils.clone(t.root);let mesh=null;const bone={};
    root.traverse(o=>{if(o.isBone)bone[short(o.name)]=o;if(o.isSkinnedMesh&&!mesh)mesh=o;});
    mesh.geometry=mesh.geometry.clone();paint(mesh.geometry,t.region,kitFor(p,teams));
    mesh.material=new TH.MeshLambertMaterial({vertexColors:true,skinning:true});
    mesh.castShadow=true;mesh.frustumCulled=false;
    const holder=new TH.Group();holder.name='p3d:'+(p.short||p.name||'');holder.add(root);scene.add(holder);
    // the game's own meshes for this player go to a layer the camera does not draw
    const hidden=[];p.rig.root.traverse(o=>{if(o!==p.rig.root&&(o.isMesh||o.isSprite||o.isLine)&&o.layers.mask!==0){hidden.push([o,o.layers.mask]);o.layers.set(HIDDEN_LAYER);}});
    const A={p,rig:p.rig,holder,root,mesh,bone,hidden,qa:new TH.Quaternion(),e:new TH.Euler()};S.actors.set(p,A);drive(A);return A;
  }
  function detach(A,scene){
    for(const [o,m] of A.hidden)o.layers.mask=m;
    if(A.holder.parent)A.holder.parent.remove(A.holder);
    A.mesh.geometry.dispose();A.mesh.material.dispose();S.actors.delete(A.p);S.detached++;
  }
  // pose the copy from the game rig as it stands this frame
  function drive(A){
    const t=S.tpl,r=A.rig,C=t.C,{bone,qa,e}=A;
    const k=r.root.scale.x*GAME_H/MODEL_H;
    A.holder.position.copy(r.root.position);A.holder.rotation.set(0,r.root.rotation.y,0);A.holder.scale.setScalar(k);
    A.holder.visible=r.root.visible;
    for(const b in MAP){const o=r[MAP[b]].rotation;e.set(o.x,o.y,o.z,o.order);qa.setFromEuler(e);
      const q=bone[b].quaternion,cp=C[PARENT[b]],cs=C[b];
      if(cp){q.copy(cp).invert().multiply(qa);}else q.copy(qa);
      if(cs)q.multiply(cs);}
    // ToeBase stays at rest: the foot has no rest correction, so its child needs none either
    bone.Hips.position.set(t.hipsRest.x,t.standY*(r.hips.position.y/(r.hipK||1))/0.95,t.hipsRest.z);
  }

  // which players get the model
  function targets(players,teams,controlled){
    if(S.mode==='all')return players.slice();
    const T=(teams||[]).find(x=>x&&x.human)||(teams||[])[0];if(!T)return [];
    if(S.mode==='team')return T.players.slice();
    const st=T.players.find(q=>q.label==='ST')||T.players.find(q=>!q.isGK);return st?[st]:[];
  }

  return {
    get status(){return {mode:S.mode,ready:S.ready,error:S.error,attached:[...S.actors.keys()].map(p=>p.short||p.name),frames:S.frames,msPerFrame:S.frames?+(S.ms/S.frames).toFixed(3):0,msPerAttach:S.attached?+(S.attachMs/S.attached).toFixed(1):0,attachCount:S.attached,detachCount:S.detached,verts:S.tpl&&S.tpl.verts};},
    async init(opt){S.mode=(opt&&opt.mode)||'one';if(opt&&opt.base)S.base=opt.base;
      try{S.tpl=await load(S.base+'models/mh_player.glb');S.ready=true;}catch(err){S.error=String(err&&err.message||err);S.ready=false;console.warn('P3D: 3D players off,',S.error);}
      return this.status;},
    // once per drawn frame, after the game has posed its players
    frame(players,scene,teams,controlled){
      if(!S.ready||S.mode==='off'||!players)return;
      const t0=performance.now();
      if(players!==S.players){for(const A of [...S.actors.values()])detach(A,scene);S.players=players;}   // a new match
      const want=new Set(targets(players,teams,controlled));
      for(const A of [...S.actors.values()])if(!want.has(A.p)||A.rig!==A.p.rig)detach(A,scene);
      for(const p of want)if(p.rig&&!S.actors.has(p)){const ta=performance.now();attach(p,scene,teams);S.attachMs+=performance.now()-ta;S.attached++;}
      const t1=performance.now();
      for(const A of S.actors.values())drive(A);
      S.ms+=performance.now()-t1;S.frames++;},
    // for checks: where a player's copy stands against the game rig, and its lowest boot vertex (skinned, world y)
    measure(p){const A=S.actors.get(p);if(!A)return null;A.holder.updateMatrixWorld(true);
      const m=A.mesh,pos=m.geometry.attributes.position,v=new TH.Vector3();let lo=Infinity;
      for(let i=0;i<pos.count;i++){if(S.tpl.region[i]!==3)continue;v.fromBufferAttribute(pos,i);m.boneTransform(i,v);v.applyMatrix4(m.matrixWorld);if(v.y<lo)lo=v.y;}
      const hiddenOk=A.hidden.every(([o])=>o.layers.mask===1<<HIDDEN_LAYER);
      return {holder:A.holder.position.toArray(),rig:A.rig.root.position.toArray(),face:[A.holder.rotation.y,A.rig.root.rotation.y],scale:A.holder.scale.x,
        lowBoot:lo,hiddenMeshes:A.hidden.length,hiddenOk,rigRootVisible:A.rig.root.visible,inScene:!!A.holder.parent};},
    setMode(m){S.mode=m;if(m==='off')for(const A of [...S.actors.values()])detach(A);S.players=null;},
  };
})();
