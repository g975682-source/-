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
// Stage 2: standing, walking and running play motion-capture clips instead (anim/clips.json: CMU subject 143 retargeted
// onto this model with the prototype's lab.js, baked by tools/bake_clips.js), blended by the game's speed, with a lean
// into turns; every other state (kicks, tackles, slides, dives, skills, celebrations) keeps the transfer above, and the
// two are cross-faded over BLEND seconds. The game state and speed come from the rig (applyVisual writes r.va, r.vspd),
// so replays and an online guest's view follow too.
window.P3D=(()=>{
  const TH=window.THREE;
  const S={mode:'off',ready:false,error:null,base:'engine3d/',tpl:null,clips:null,clipError:null,last:0,actors:new Map(),players:null,frames:0,ms:0,attachMs:0,attached:0,detached:0};
  const MAP={Hips:'hips',Spine:'torso',Spine1:'chest',Neck:'neck',Head:'head',LeftShoulder:'shL',RightShoulder:'shR',LeftArm:'armL',RightArm:'armR',
    LeftForeArm:'elbowL',RightForeArm:'elbowR',LeftHand:'wristL',RightHand:'wristR',LeftUpLeg:'legL',RightUpLeg:'legR',LeftLeg:'kneeL',RightLeg:'kneeR',
    LeftFoot:'ankleL',RightFoot:'ankleR'};
  const PARENT={LeftForeArm:'LeftArm',RightForeArm:'RightArm',LeftHand:'LeftForeArm',RightHand:'RightForeArm',LeftLeg:'LeftUpLeg',RightLeg:'RightUpLeg',
    LeftFoot:'LeftLeg',RightFoot:'RightLeg',LeftToeBase:'LeftFoot',RightToeBase:'RightFoot'};
  const MODEL_H=1.80,GAME_H=1.81;   // the model's height; the game rig's standing height at body scale 1 (bodyOf: 181 cm)
  const HIDDEN_LAYER=1,ATTACH_MS=12;
  const short=n=>n.replace(/^mixamorig:?/i,'');

  // ---- the model, once ----
  // the model file: the .glb itself, or (where .glb files are not served, as on claude.ai artifacts) the same bytes in
  // base64 in a .json beside it ({glb:"..."}); a page answering for a missing file is skipped
  async function fetchModel(url){
    const tried=[];
    for(const [u,kind] of [[url,'glb'],[url+'.json','json']]){
      try{const r=await fetch(u);if(!r.ok||/html/i.test(r.headers.get('content-type')||'')){tried.push(u+': '+r.status);continue;}
        if(kind==='glb')return await r.arrayBuffer();
        const s=atob((await r.json()).glb),a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a.buffer;}
      catch(e){tried.push(u+': '+(e&&e.message||e));}}
    throw new Error(tried.join('; '));
  }
  async function load(url){
    const buf=await fetchModel(url);
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
    const ankleY=bone.LeftFoot.getWorldPosition(new TH.Vector3()).y-lo;   // the ankle's height above the sole, standing
    const toeY=bone.LeftToeBase.getWorldPosition(new TH.Vector3()).y-lo;   // the ball of the foot's, standing
    const names={};for(const [k,b] of Object.entries(bone))names[k]=b.name;
    // a loose fist: each finger's joints turned about the axis across the hand (index to little finger knuckles), taken
    // square to that finger so that it bends without twisting; the thumb a little
    const curl={},sign=-1;   // -1 bends towards the palm (checked on renders)
    for(const sd of ['Left','Right']){if(!bone[sd+'HandIndex1']||!bone[sd+'HandPinky1'])continue;
      const k=bone[sd+'HandIndex1'].position.clone().sub(bone[sd+'HandPinky1'].position).normalize();if(sd==='Right')k.negate();
      for(const f of ['Index','Middle','Ring','Pinky','Thumb']){const b2=bone[sd+'Hand'+f+'2'];if(!b2)continue;
        const d=b2.position.clone().normalize(),ax=k.clone().sub(d.clone().multiplyScalar(k.dot(d))).normalize().multiplyScalar(sign);
        (f==='Thumb'?[0.25,0.45,0.35]:[0.8,1.05,0.7]).forEach((a,i)=>{const b=sd+'Hand'+f+(i+1);if(bone[b])curl[b]=new TH.Quaternion().setFromAxisAngle(ax,a);});}}
    const look=lookData(mesh,bone,region);
    return {root,mesh,C,region,hipsRest,standY,ankleY,toeY,verts:n,names,curl,look};
  }
  // ---- the player's looks (stage 4): what is worked out once from the model, at rest ----
  // Per vertex: its main bone; torso shirt (for the kit pattern); the kit's trim rings (shirt next to skin: collar and
  // cuffs; sock tops: one ring of vertices); hair masks for the game's three hair styles (hs 0 normal, 1 short, 2 tied back with a bun) and a
  // beard mask, from the head's shape (hairline by the angle round the head: low at the nape, higher at the temples,
  // highest at the forehead; the ears kept bare). Body build: per bone, how its vertices widen (W, shoulders and hips)
  // and thicken (M, torso depth, limbs round their bone). Number decals: grids laid on the back (number and name) and
  // on the left chest, each grid point tied to the three nearest shirt vertices, so that they follow the body's shape
  // and are skinned with it.
  const ARMB=/^(Left|Right)(Arm|ForeArm)$/,HANDB=/^(Left|Right)Hand/;
  function lookData(mesh,bone,region){
    const g=mesh.geometry,pos=g.attributes.position,nrm=g.attributes.normal,si=g.attributes.skinIndex,sw=g.attributes.skinWeight,n=pos.count;
    const bn=mesh.skeleton.bones.map(b=>short(b.name)),toMesh=new TH.Matrix4().copy(mesh.matrixWorld).invert();
    const bw=bn.map(nm=>bone[nm].getWorldPosition(new TH.Vector3()).applyMatrix4(toMesh));
    const SI=i=>[si.getX(i),si.getY(i),si.getZ(i),si.getW(i)],SW=i=>[sw.getX(i),sw.getY(i),sw.getZ(i),sw.getW(i)];
    const dom=new Uint8Array(n);for(let i=0;i<n;i++){const a=SI(i),w=SW(i);let k=0;for(let j=1;j<4;j++)if(w[j]>w[k])k=j;dom[i]=a[k];}
    const R={shirt:0,shorts:1,socks:2,boots:3,skin:4,hair:5},isArm=dom.map(b=>ARMB.test(bn[b])?1:0),isHand=dom.map(b=>HANDB.test(bn[b])?1:0);
    const isHead=dom.map(b=>bn[b]==='Head'?1:0),torso=new Uint8Array(n);
    for(let i=0;i<n;i++)torso[i]=region[i]===R.shirt&&!isArm[i]?1:0;
    // trim rings: shirt or sock vertices sharing a triangle with skin (1: collar, 2: cuff, 3: sock top)
    const ring=new Uint8Array(n),idx=g.index?g.index.array:null;
    if(idx){const kind=i=>region[i]===R.socks?3:isArm[i]?2:1;
      const pass=(test)=>{const add=[];for(let t=0;t<idx.length;t+=3){const a=idx[t],b=idx[t+1],c=idx[t+2];
          if(![a,b,c].some(test))continue;for(const v of [a,b,c])if((region[v]===R.shirt||region[v]===R.socks)&&!ring[v])add.push(v);}
        for(const v of add)ring[v]=kind(v);};
      pass(v=>region[v]===R.skin);}
    // hair: head vertices above the hairline (y by the angle round the head from the front), not the ears
    let H0=-1e9,fz=-1e9,bz=1e9;for(let i=0;i<n;i++)if(isHead[i]){H0=Math.max(H0,pos.getY(i));fz=Math.max(fz,pos.getZ(i));bz=Math.min(bz,pos.getZ(i));}
    const cz=(fz+bz)/2;   // the head's top; its middle front to back (between the back of the skull and the nose tip)
    const LINES=[[0.048,0.095,0.175],[0.042,0.085,0.155],[0.048,0.095,0.175]];   // forehead, temples, nape: below the top
    const hair=LINES.map(()=>new Uint8Array(n)),beard=new Uint8Array(n);
    const sm=(a,b,x)=>{const u=Math.min(1,Math.max(0,(x-a)/(b-a)));return u*u*(3-2*u);};
    for(let i=0;i<n;i++){if(!isHead[i]||(region[i]!==R.skin&&region[i]!==R.hair))continue;
      const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),th=Math.atan2(Math.abs(x),z-cz),d=H0-y;
      const ear=Math.abs(x)>0.072&&d>0.088&&d<0.17&&z>cz-0.065&&z<cz+0.03;
      LINES.forEach(([f,t,b],k)=>{const line=f+(t-f)*sm(0.35,1.45,th)+(b-t)*sm(1.6,2.7,th);if(d<line&&!ear)hair[k][i]=1;});
      // beard: below the nose base on the front of the face (not the lips), and up the jaw to the sideburns
      const dn=fz-z,lips=Math.abs(x)<0.028&&d>0.18&&d<0.215&&dn<0.045;
      if(!ear&&z>cz-0.03&&((d>0.168&&dn<0.11)||(Math.abs(x)>0.055&&d>0.12&&z<cz+0.06))&&!lips)beard[i]=1;}
    // body build per bone: [kind, centre z (torso) or segment (limbs)]
    const cen=bn.map(()=>[0,0]);for(let i=0;i<n;i++){cen[dom[i]][0]+=pos.getZ(i);cen[dom[i]][1]++;}
    const SEG={LeftArm:'LeftForeArm',LeftForeArm:'LeftHand',RightArm:'RightForeArm',RightForeArm:'RightHand',LeftUpLeg:'LeftLeg',LeftLeg:'LeftFoot',
      RightUpLeg:'RightLeg',RightLeg:'RightFoot',Neck:'Head'};
    const build=bn.map((nm,b)=>{const czb=cen[b][1]?cen[b][0]/cen[b][1]:bw[b].z;
      if(nm==='Hips')return {k:'hips',cz:czb};if(/^Spine/.test(nm))return {k:'torso',cz:czb};
      if(/Shoulder$/.test(nm))return {k:'shoulder',cz:cen[bn.indexOf('Spine2')][0]/Math.max(1,cen[bn.indexOf('Spine2')][1]),x:bw[b].x};
      if(SEG[nm])return {k:'limb',a:bw[b].clone(),b:bw[bn.indexOf(SEG[nm])].clone(),neck:nm==='Neck'};return null;});
    // number decals: [centre x, centre y, width, height, side (-1 back, +1 front)]
    const decal=(cx,cy,w,h,side,nx,ny)=>{
      const cand=[];for(let i=0;i<n;i++)if(torso[i]&&nrm.getZ(i)*side>0.25&&Math.abs(pos.getX(i)-cx)<w&&Math.abs(pos.getY(i)-cy)<h)cand.push(i);
      const verts=[],uv=[],index=[],skinI=[],skinW=[];
      for(let r=0;r<=ny;r++)for(let c=0;c<=nx;c++){const u=c/nx,v=r/ny,x=cx+(side<0?w/2-u*w:-w/2+u*w),y=cy-h/2+v*h;
        const near=[];for(const i of cand){const d=(pos.getX(i)-x)**2+(pos.getY(i)-y)**2;if(near.length<3||d<near[2][1]){near.push([i,d]);near.sort((a,b)=>a[1]-b[1]);if(near.length>3)near.pop();}}
        const ws=near.map(([,d])=>1/(Math.sqrt(d)+1e-4)),tw=ws.reduce((a,b)=>a+b,0);
        verts.push({i:near.map(q=>q[0]),w:ws.map(q=>q/tw),x,y});uv.push(u,v);
        const a=SI(near[0][0]),wt=SW(near[0][0]);skinI.push(...a);skinW.push(...wt);}
      for(let r=0;r<ny;r++)for(let c=0;c<nx;c++){const a=r*(nx+1)+c,b=a+1,d=a+nx+1,e=d+1;
        if(side<0)index.push(a,d,b,b,d,e);else index.push(a,b,d,b,e,d);}
      const G=new TH.BufferGeometry();G.setAttribute('uv',new TH.Float32BufferAttribute(uv,2));G.setIndex(index);
      G.setAttribute('skinIndex',new TH.Uint16BufferAttribute(skinI,4));G.setAttribute('skinWeight',new TH.Float32BufferAttribute(skinW,4));
      return {G,verts,side};};
    const decals=[decal(0,1.395,0.235,0.258,-1,8,8),decal(0.082,1.455,0.075,0.082,1,3,3)];
    // hoops counted down from just under the front of the collar (a shirt-coloured band there, then the trim)
    let neck=-1e9;for(let i=0;i<n;i++)if(torso[i]&&nrm.getZ(i)>0.5)neck=Math.max(neck,pos.getY(i));const hem=neck-0.065;
    // the bun (hair style 2): a ball at the upper back of the head, in the head bone's frame
    const hb=bone.Head,hs=hb.getWorldScale(new TH.Vector3()).x||1;
    const bun={pos:hb.worldToLocal(new TH.Vector3(0,H0-0.045,bz+0.004).applyMatrix4(mesh.matrixWorld)),r:0.046/hs};
    const kp=new Float32Array(n*3);for(let i=0;i<n;i++){kp[i*3]=pos.getX(i);kp[i*3+1]=pos.getY(i);kp[i*3+2]=torso[i]&&!ring[i]?1:0;}
    g.setAttribute('kpat',new TH.BufferAttribute(kp,3));   // read by kitShader; each copy's geometry clone carries it
    return {dom,bn,torso,ring,hair,beard,build,decals,isArm,isHand,R,cz,H0,hem,bun};
  }
  const MIRROR={kick:'kickL',side:'sideR'};
  // a clip's mean thigh rotation per side (sign-aligned average of its keys), the centre its hip swing is scaled about
  function hipMean(tracks){const o={};for(const sd of ['Left','Right']){const t=tracks.find(x=>x.bone===sd+'UpLeg'&&x.prop==='quaternion');if(!t)continue;
      const v=t.values,q=new TH.Quaternion(0,0,0,0),r=new TH.Quaternion(v[0],v[1],v[2],v[3]);
      for(let i=0;i<v.length;i+=4){const sg=(v[i]*r.x+v[i+1]*r.y+v[i+2]*r.z+v[i+3]*r.w)<0?-1:1;q.x+=sg*v[i];q.y+=sg*v[i+1];q.z+=sg*v[i+2];q.w+=sg*v[i+3];}o[sd]=q.normalize();}
    return o;}
  // motion clips (anim/clips.json, baked by tools/bake_clips.js): optional; without them every state uses the transfer
  async function loadClips(url,names){
    const r=await fetch(url);if(!r.ok||/html/i.test(r.headers.get('content-type')||''))throw new Error(url+': '+r.status);
    const doc=await r.json(),out={};
    for(const [k,c] of Object.entries(doc.clips)){
      const tracks=c.tracks.filter(t=>names[t.bone]).map(t=>t.prop==='quaternion'?new TH.QuaternionKeyframeTrack(names[t.bone]+'.quaternion',t.times,t.values)
        :new TH.VectorKeyframeTrack(names[t.bone]+'.'+t.prop,t.times,t.values));
      out[k]={clip:new TH.AnimationClip(k,c.duration,tracks),dur:c.duration,loop:c.loop,speed:c.speed,foot:c.footPhase%c.duration,contact:c.contact||null,dir:c.dir||[0,1],
        hip:hipMean(c.tracks)};
      // mirrored: the left-foot kick from the right one, walking sideways to the right from the walk to the left (left
      // and right bones swapped, reflected in the body's middle plane)
      const m=MIRROR[k];if(m){const sw=b=>b.startsWith('Left')?'Right'+b.slice(4):b.startsWith('Right')?'Left'+b.slice(5):b;
        const mtr=c.tracks.map(t=>{const v=t.values.slice();if(t.prop==='quaternion'){for(let i=0;i<v.length;i+=4){v[i+1]=-v[i+1];v[i+2]=-v[i+2];}}else for(let i=0;i<v.length;i+=3)v[i]=-v[i];return {bone:sw(t.bone),prop:t.prop,times:t.times,values:v};});
        const mt=mtr.filter(t=>names[t.bone]).map(t=>t.prop==='quaternion'?new TH.QuaternionKeyframeTrack(names[t.bone]+'.quaternion',t.times,t.values):new TH.VectorKeyframeTrack(names[t.bone]+'.'+t.prop,t.times,t.values));
        out[m]={clip:new TH.AnimationClip(m,c.duration,mt),dur:c.duration,loop:c.loop,speed:c.speed,foot:k==='kick'?0:c.footPhase%c.duration,contact:c.contact||null,dir:[-(c.dir||[0,1])[0],(c.dir||[0,1])[1]],hip:hipMean(mtr)};}}
    return out;
  }

  // GL-Motion (motion matching, as EA's FIFA / FC locomotion): anim/mm.json (tools/bake_mm.js) holds 2577 frames of
  // captured walking, jogging and running with turns, starts, stops, side and back steps, each with features (where the
  // root goes and faces 0.2/0.4/0.6 s on, the feet, the root's velocity). Below about 3.5 m/s and off the ball, every
  // 0.1 s a player's wanted path (from the game's velocity and the velocity it is steering to) is matched against them
  // and the best frame faded in over 0.2 s; faster, dribbling or kicking, the gait clips take over as before.
  async function loadMM(url,names){
    const r=await fetch(url);if(!r.ok||/html/i.test(r.headers.get('content-type')||''))throw new Error(url+': '+r.status);
    const d=await r.json(),dec=(T,b)=>{const s=atob(b),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return new T(u.buffer);};
    const N=d.frames,D=d.dims,nb=d.bones.length,q=dec(Int16Array,d.q),hp=dec(Int16Array,d.hp),feat=dec(Float32Array,d.feat),valid=dec(Uint8Array,d.valid),take=dec(Uint8Array,d.take),speed=dec(Float32Array,d.speed);
    const fn=new Float32Array(N*D);for(let i=0;i<N;i++)for(let k=0;k<D;k++)fn[i*D+k]=(feat[i*D+k]-d.mean[k])/d.std[k];
    const times=new Float32Array(N);for(let i=0;i<N;i++)times[i]=i/d.fps;
    const tracks=[];
    d.bones.forEach((b,j)=>{if(!names[b])return;const v=new Float32Array(N*4);for(let i=0;i<N;i++)for(let c=0;c<4;c++)v[i*4+c]=q[(i*nb+j)*4+c]/32767;tracks.push(new TH.QuaternionKeyframeTrack(names[b]+'.quaternion',times,v));});
    if(names.Hips){const v=new Float32Array(N*3);for(let i=0;i<N*3;i++)v[i]=hp[i]/1000;tracks.push(new TH.VectorKeyframeTrack(names.Hips+'.position',times,v));}
    const clip=new TH.AnimationClip('mm',(N-1)/d.fps,tracks);
    const end=new Int32Array(N);for(const t of d.takes)for(let i=t.start;i<t.end;i++)end[i]=t.end;
    return {N,D,fps:d.fps,fn,valid,take,speed,end,mean:d.mean,std:d.std,clips:[clip,clip.clone()],takes:d.takes,bones:d.bones.filter(b=>names[b])};
  }
  const MM={on:true,max:1.9,fade:0.2,every:0.1,tau:0.25,stay:0.75,half:0.1,full:false};   // half: inertialization half-life (s); full: everywhere (tests)   // max: full below max-0.4 m/s, gone above max+0.4
  // the wanted path in the root's frame (as the features): positions 0.2/0.4/0.6 s on, the facing then, the velocity
  function mmQuery(A,dt){
    const M=S.mm,p=A.p,yaw=A.holder.rotation.y,c=Math.cos(-yaw),sn=Math.sin(-yaw),Q=A.mmQ||(A.mmQ=new Float32Array(M.D));
    // now: the drawn movement (so a replay or an online guest's view works too); where it is going: the velocity the game
    // is steering him to, in live play
    const g=window.__game,live=(window.__mmLive||g&&g.state==='play'&&!window.__freeze)&&p.state==='normal'&&p.wantVel;
    const v0x=A.vx||0,v0z=A.vz||0,vtx=live?p.wantVel.x:v0x,vtz=live?p.wantVel.z:v0z,tau=MM.tau;
    const yr=clampN(A.yrate||0,-3,3);
    [0.2,0.4,0.6].forEach((t,i)=>{const e=tau*(1-Math.exp(-t/tau)),x=vtx*t+(v0x-vtx)*e,z=vtz*t+(v0z-vtz)*e;Q[i*2]=x*c+z*sn;Q[i*2+1]=-x*sn+z*c;
      const dy=clampN(yr*t*(1-t/1.5),-1.6,1.6);Q[6+i*2]=Math.sin(dy);Q[6+i*2+1]=Math.cos(dy);});
    // the feet as the frame now playing has them
    const f=Math.min(M.N-1,Math.max(0,Math.round(A.mmF[A.mmC]||0)));for(let k=12;k<24;k++)Q[k]=M.fn[f*M.D+k]*M.std[k]+M.mean[k];
    Q[24]=v0x*c+v0z*sn;Q[25]=-v0x*sn+v0z*c;
    for(let k=0;k<M.D;k++)Q[k]=(Q[k]-M.mean[k])/M.std[k];
    return Q;
  }
  function mmSearch(A,Q){
    const M=S.mm,D=M.D,fn=M.fn;let best=-1,bc=1e9;
    for(let i=0;i<M.N;i++){if(!M.valid[i])continue;let c=0,o=i*D;for(let k=0;k<D;k++){const d=fn[o+k]-Q[k];c+=d*d;if(c>=bc)break;}if(c<bc){bc=c;best=i;}}
    return [best,bc];
  }
  function mmCost(Q,i){const M=S.mm,D=M.D,o=i*D;let c=0;for(let k=0;k<D;k++){const d=M.fn[o+k]-Q[k];c+=d*d;}return c;}
  // advance the two streams, search now and then, set the weights (wm: how much of the gait is GL-Motion)
  function mmStep(A,s,dt,wm){
    const M=S.mm;if(!A.mmA){A.mmA=[A.mixer.clipAction(M.clips[0]),A.mixer.clipAction(M.clips[1])];for(const a of A.mmA){a.setLoop(TH.LoopRepeat,Infinity);a.setEffectiveWeight(0);a.play();}
      A.mmF=[0,0];A.mmC=0;A.mmX=1;A.mmT=Math.random()*MM.every;A.mmNew=true;}
    if(wm<1e-3){A.mmNew=true;for(const a of A.mmA)a.setEffectiveWeight(0);return;}
    // playback: at the game's pace against the frame's own (0.8-1.25), within the frame's take
    for(const j of [0,1]){const f=Math.round(A.mmF[j]),sp=M.speed[Math.min(M.N-1,Math.max(0,f))],rate=sp>0.3&&s>0.3?clampN(s/sp,0.8,1.25):1;
      A.mmF[j]=Math.min(M.end[Math.max(0,f)]-1,A.mmF[j]+dt*M.fps*rate);}
    A.mmT-=dt;const cur=Math.round(A.mmF[A.mmC]),atEnd=cur>=M.end[cur]-2;
    if(A.mmNew||A.mmT<=0||atEnd){A.mmT=MM.every;const Q=mmQuery(A,dt),[b,bc]=mmSearch(A,Q);
      const same=M.take[b]===M.take[cur]&&Math.abs(b-cur)<8;
      if(b>=0&&(A.mmNew||atEnd||(!same&&bc<mmCost(Q,cur)*MM.stay))){const n=1-A.mmC;A.mmF[n]=b;A.mmC=n;A.mmX=1;if(!A.mmNew)A.mmJ=true;A.mmNew=false;}}
    A.mmX=Math.min(1,A.mmX+dt/MM.fade);
    const wc=wm*A.mmX,wo=wm*(1-A.mmX);
    A.mmA[A.mmC].time=A.mmF[A.mmC]/M.fps;A.mmA[A.mmC].setEffectiveWeight(wc);
    A.mmA[1-A.mmC].time=A.mmF[1-A.mmC]/M.fps;A.mmA[1-A.mmC].setEffectiveWeight(wo);
  }
  // Inertialization: a switch to another frame happens at once; what the body was off the new frame's pose (each
  // bone's turn, the hips' place) is carried over and dies away (half-life MM.half), so no two gaits are ever mixed
  function mmInert(A,dt,wm){
    const B=A.mmB||(A.mmB=S.mm.bones.map(n=>A.bone[n]).filter(Boolean)),hips=A.bone.Hips;
    if(!A.mmL){A.mmL=B.map(b=>b.quaternion.clone());A.mmLp=hips.position.clone();A.mmO=B.map(()=>new TH.Quaternion());A.mmOp=new TH.Vector3();A.mmIt=9;}
    if(A.mmJ){A.mmJ=false;A.mmIt=0;B.forEach((b,i)=>{A.mmO[i].copy(b.quaternion).invert().premultiply(A.mmL[i]);});A.mmOp.copy(A.mmLp).sub(hips.position);}
    if(A.mmIt<1){const d=Math.pow(0.5,A.mmIt/MM.half);
      B.forEach((b,i)=>{qL.copy(I0).slerp(A.mmO[i],d);b.quaternion.premultiply(qL);});hips.position.addScaledVector(A.mmOp,d);}
    A.mmIt+=dt;
    B.forEach((b,i)=>A.mmL[i].copy(b.quaternion));A.mmLp.copy(hips.position);
  }
  // each gait clip's own trunk lean (deg, the neck over the hips' middle, forward +), averaged over its cycle, on the
  // model at rest (its pose put back afterwards)
  function clipLean(){
    const t=S.tpl,root=t.root,bones=[];root.traverse(o=>{if(o.isBone)bones.push([o,o.quaternion.clone(),o.position.clone()]);});
    const by={};for(const [o] of bones)by[short(o.name)]=o;const mx=new TH.AnimationMixer(root),out={},v=new TH.Vector3(),u=new TH.Vector3(),n=new TH.Vector3();
    for(const k of ['idle','walk','jog','run','side','sideR']){const c=S.clips[k];if(!c)continue;const a=mx.clipAction(c.clip);a.play();a.setEffectiveWeight(1);let sum=0;
      for(let i=0;i<12;i++){a.time=c.dur*i/12;mx.update(0);root.updateMatrixWorld(true);
        by.LeftUpLeg.getWorldPosition(v);by.RightUpLeg.getWorldPosition(u);v.add(u).multiplyScalar(0.5);by.Neck.getWorldPosition(n);
        sum+=Math.atan2(n.z-v.z,n.y-v.y)*180/Math.PI;}
      out[k]=sum/12;a.stop();mx.uncacheAction(c.clip);}
    // where the kicking toe is at the clip's foot strike (root frame): the ball is drawn there for the strike
    S.kickSpot={};
    for(const [k,toe] of [['kick','RightToeBase'],['kickL','LeftToeBase']]){const c=S.clips[k];if(!c||!c.contact)continue;const a=mx.clipAction(c.clip);a.play();a.setEffectiveWeight(1);
      a.time=c.contact.contact;mx.update(0);root.updateMatrixWorld(true);by[toe].getWorldPosition(v);S.kickSpot[k]=v.clone();a.stop();mx.uncacheAction(c.clip);}
    mx.uncacheRoot(root);for(const [o,q,p] of bones){o.quaternion.copy(q);o.position.copy(p);}root.updateMatrixWorld(true);
    return out;
  }
  // ---- a player's copy ----
  const linear=hex=>{const c=new TH.Color(hex);return [c.r,c.g,c.b];};
  const mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
  const hashStr=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};   // the game's
  // the colours: team kit by region and its trim on the collar, cuffs and sock tops (the torso's pattern is drawn by
  // kitShader); the player's skin, boots and hair (by style), a beard for
  // the players the game gives one (a third, by name); keepers in long sleeves and gloves
  function paint(geom,t,kit,lk){
    const L=t.look,region=t.region,n=region.length,arr=new Float32Array(n*3);
    const cols=[kit.shirt,kit.shorts,kit.socks,kit.boots,kit.skin,kit.hair].map(linear),trim=linear(kit.trim),skin=cols[4];
    const hairC=lk.hs===1?mix(cols[5],skin,0.3):cols[5],beardC=mix(cols[5],skin,0.3),glove=linear('#e9edf2');
    const hm=L.hair[lk.hs]||L.hair[0];
    for(let i=0;i<n;i++){const rg=region[i];let c=cols[rg];
      if(L.ring[i]&&!(lk.gk&&L.ring[i]===2))c=trim;
      if(rg===L.R.hair||(rg===L.R.skin&&hm[i]))c=hairC;
      else if(rg===L.R.skin){if(lk.beard&&L.beard[i])c=beardC;else if(lk.gk&&L.isArm[i])c=cols[0];else if(lk.gk&&L.isHand[i])c=glove;}
      arr[i*3]=c[0];arr[i*3+1]=c[1];arr[i*3+2]=c[2];}
    geom.setAttribute('color',new TH.BufferAttribute(arr,3));
  }
  // the kit's pattern on the torso (the game's own: stripes, hoops, a centre band), drawn per pixel from the rest
  // position (attribute kpat: x, y, and 1 on the torso's shirt), so the edges stay straight and follow the body as it
  // moves; soft over about 7 mm. One function for every player: the program is shared, the colours are each material's.
  function kitShader(sh){const k=this.userData.kit;
    sh.uniforms.kShirt={value:new TH.Color(k.shirt)};sh.uniforms.kTrim={value:new TH.Color(k.trim)};
    sh.uniforms.kPat={value:{stripes:1,hoops:2,band:3}[k.pat]||0};sh.uniforms.kHem={value:k.hem};
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 kpat;\nvarying vec3 vKpat;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvKpat=kpat;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform vec3 kShirt;\nuniform vec3 kTrim;\nuniform float kPat;\nuniform float kHem;\nvarying vec3 vKpat;')
      .replace('#include <color_fragment>',['#include <color_fragment>',
        'if(vKpat.z>0.5&&kPat>0.5){float m=0.0;',
        ' if(kPat<1.5)m=smoothstep(0.15,-0.15,sin(6.2832*(vKpat.x+0.0375)/0.15));',
        ' else if(kPat<2.5)m=smoothstep(0.15,-0.15,sin(6.2832*(vKpat.y-kHem)/0.14));',
        ' else m=smoothstep(0.06,0.05,abs(vKpat.x));',
        ' diffuseColor.rgb=mix(kShirt,kTrim,m);}'].join('\n'));
  }
  // the body's build (the game's bodyOf: W shoulders and hips, M muscle) moved into the copy's rest shape: the torso
  // widened and deepened, the limbs and neck thickened round their bones, the shoulder joints moved out with the
  // torso; the hair lifted off the scalp a little. Returns the shaped rest positions (for the number decals).
  function shapeBody(A,t,W,M,lk){
    const L=t.look,g=A.mesh.geometry,src=t.mesh.geometry.attributes.position,nrm=t.mesh.geometry.attributes.normal;
    const si=t.mesh.geometry.attributes.skinIndex,sw=t.mesh.geometry.attributes.skinWeight,n=src.count,out=new Float32Array(n*3);
    const Wt=1+(W-1)*0.8,Wh=1+(W-1)*0.5,Mt=1+(M-1)*0.8,Ml=1+(M-1)*0.9,hm=L.hair[lk.hs]||L.hair[0],push=[0.006,0.0025,0.005][lk.hs]||0.006;
    const I=[0,0,0,0],Wg=[0,0,0,0];
    for(let i=0;i<n;i++){const x=src.getX(i),y=src.getY(i),z=src.getZ(i);let dx=0,dy=0,dz=0,ws=0;
      I[0]=si.getX(i);I[1]=si.getY(i);I[2]=si.getZ(i);I[3]=si.getW(i);Wg[0]=sw.getX(i);Wg[1]=sw.getY(i);Wg[2]=sw.getZ(i);Wg[3]=sw.getW(i);
      for(let k=0;k<4;k++){const w=Wg[k];if(!(w>0))continue;ws+=w;const B=L.build[I[k]];if(!B)continue;
        if(B.k==='torso'){dx+=w*(Wt-1)*x;dz+=w*(Mt-1)*(z-B.cz);}
        else if(B.k==='hips'){dx+=w*(Wh-1)*x;dz+=w*(Mt-1)*(z-B.cz);}
        else if(B.k==='shoulder'){dx+=w*(Wt-1)*(x-B.x);dz+=w*(Mt-1)*(z-B.cz);}
        else{const a=B.a,b=B.b,ex=b.x-a.x,ey=b.y-a.y,ez=b.z-a.z,l2=ex*ex+ey*ey+ez*ez,u=clampN(((x-a.x)*ex+(y-a.y)*ey+(z-a.z)*ez)/l2,-0.3,1.3);
          const m=(B.neck?Mt:Ml)-1;dx+=w*m*(x-a.x-ex*u);dy+=w*m*(y-a.y-ey*u);dz+=w*m*(z-a.z-ez*u);}}
      if(ws>0){dx/=ws;dy/=ws;dz/=ws;}
      if(t.region[i]===L.R.hair||(t.region[i]===L.R.skin&&hm[i])){dx+=nrm.getX(i)*push;dy+=nrm.getY(i)*push;dz+=nrm.getZ(i)*push;}
      out[i*3]=x+dx;out[i*3+1]=y+dy;out[i*3+2]=z+dz;}
    g.setAttribute('position',new TH.BufferAttribute(out,3));
    for(const sd of ['Left','Right'])for(const b of [sd+'Shoulder',sd+'Arm'])if(A.bone[b])A.bone[b].position.x*=Wt;
    return out;
  }
  // number and name on the back, the small number on the chest: the game's own number texture (rig.numMat), on grids
  // laid on the shaped shirt and skinned with the body
  function numberDecals(A,t,shaped,map){
    const L=t.look,nrm=t.mesh.geometry.attributes.normal,out=[];
    const mat=new TH.MeshBasicMaterial({map,transparent:true,depthWrite:false,skinning:true,side:TH.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
    for(const D of L.decals){const G=D.G.clone(),P=new Float32Array(D.verts.length*3);
      D.verts.forEach((v,j)=>{let x=0,y=0,z=0,nx=0,ny=0,nz=0;v.i.forEach((i,q)=>{const w=v.w[q];x+=w*shaped[i*3];y+=w*shaped[i*3+1];z+=w*shaped[i*3+2];nx+=w*nrm.getX(i);ny+=w*nrm.getY(i);nz+=w*nrm.getZ(i);});
        const l=Math.hypot(nx,ny,nz)||1,off=0.004;P[j*3]=x+nx/l*off;P[j*3+1]=y+ny/l*off;P[j*3+2]=z+nz/l*off;});
      G.setAttribute('position',new TH.BufferAttribute(P,3));
      const m=new TH.SkinnedMesh(G,mat);m.frustumCulled=false;m.castShadow=false;m.position.copy(A.mesh.position);m.quaternion.copy(A.mesh.quaternion);m.scale.copy(A.mesh.scale);
      A.mesh.parent.add(m);m.bind(A.mesh.skeleton,A.mesh.bindMatrix);out.push(m);}
    return out;
  }
  function kitFor(p,teams){
    const T=teams&&teams[p.team],pd=p.pd||p;
    const k=p.isGK?{shirt:T&&T.def&&T.def.gk||'#21c879',shorts:'#151515',socks:T&&T.def&&T.def.gk||'#21c879',trim:'#111111',pat:'solid'}:(T&&T.kit)||{shirt:'#c8102e',shorts:'#f4f4f4',socks:'#c8102e'};
    return {shirt:k.shirt,shorts:k.shorts,socks:k.socks||k.shirt,trim:k.trim||k.shirt,pat:k.pat||'solid',boots:pd.boot||'#141414',skin:pd.skin||'#c99a74',hair:pd.hair||'#2a1d14'};
  }
  function attach(p,scene,teams){
    const t=S.tpl,root=TH.SkeletonUtils.clone(t.root);let mesh=null;const bone={};
    root.traverse(o=>{if(o.isBone)bone[short(o.name)]=o;if(o.isSkinnedMesh&&!mesh)mesh=o;});
    const pd=p.pd||p,body=p.rig&&p.rig.body||{W:1,M:1};
    const lk={hs:clampN(pd.hs|0,0,2),beard:hashStr(pd.name||'')%3===0,gk:!!p.isGK,W:+(body.W||1).toFixed(3),M:+(body.M||1).toFixed(3),pat:null,decals:0};
    const kit=kitFor(p,teams);lk.pat=kit.pat;
    mesh.geometry=mesh.geometry.clone();paint(mesh.geometry,t,kit,lk);
    mesh.material=new TH.MeshLambertMaterial({vertexColors:true,skinning:true});
    if(kit.pat!=='solid'){mesh.material.userData.kit={shirt:kit.shirt,trim:kit.trim,pat:kit.pat,hem:t.look.hem};mesh.material.onBeforeCompile=kitShader;}
    mesh.castShadow=true;mesh.frustumCulled=false;
    const shaped=shapeBody({mesh,bone},t,lk.W,lk.M,lk);
    const extra=[];
    if(p.rig&&p.rig.numMat&&p.rig.numMat.map)extra.push(...numberDecals({mesh},t,shaped,p.rig.numMat.map));
    if(lk.hs===2&&bone.Head){const m=new TH.Mesh(S.bunGeo||(S.bunGeo=new TH.SphereGeometry(1,10,8)),new TH.MeshLambertMaterial({color:kit.hair}));
      m.position.copy(t.look.bun.pos);m.scale.set(1,0.9,1).multiplyScalar(t.look.bun.r);m.castShadow=true;bone.Head.add(m);extra.push(m);}
    lk.decals=extra.length;
    const holder=new TH.Group();holder.name='p3d:'+(p.short||p.name||'');holder.add(root);scene.add(holder);
    // the game's own meshes for this player go to a layer the camera does not draw
    const hidden=[];p.rig.root.traverse(o=>{if(o!==p.rig.root&&(o.isMesh||o.isSprite||o.isLine)&&o.layers.mask!==0){hidden.push([o,o.layers.mask]);o.layers.set(HIDDEN_LAYER);}});
    const A={p,rig:p.rig,holder,root,mesh,bone,hidden,extra,look:lk,qa:new TH.Quaternion(),e:new TH.Euler(),
      wp:null,ph:0,it:0,kw:0,kt:0,kOn:false,kside:1,w:{idle:1,walk:0,jog:0,run:0},lean:0,yaw:null,hy:0,back:false,tr:null,st:{jockey:0,shield:0,contact:0,dribble:0,brake:0,push:0,side:1},acc:0,sp0:null,lq:{},lh:new TH.Vector3()};
    for(const b in MAP)A.lq[b]=new TH.Quaternion();A.lq.Spine2=new TH.Quaternion();A.lq.LeftToeBase=new TH.Quaternion();A.lq.RightToeBase=new TH.Quaternion();
    if(S.clips){A.mixer=new TH.AnimationMixer(root);A.act={};
      for(const k of ['idle','walk','jog','run','side','sideR']){if(!S.clips[k])continue;const a=A.mixer.clipAction(S.clips[k].clip);a.setLoop(TH.LoopRepeat,Infinity);a.setEffectiveWeight(0);a.play();A.act[k]=a;}
      for(const k of ['kick','kickL']){if(!S.clips[k])continue;const a=A.mixer.clipAction(S.clips[k].clip);a.setLoop(TH.LoopOnce,1);a.clampWhenFinished=true;a.setEffectiveWeight(0);a.play();A.act[k]=a;}}
    for(const [b,q] of Object.entries(S.tpl.curl))if(bone[b])bone[b].quaternion.copy(q);
    S.actors.set(p,A);drive(A,0);return A;
  }
  function detach(A,scene){
    for(const [o,m] of A.hidden)o.layers.mask=m;
    if(A.holder.parent)A.holder.parent.remove(A.holder);
    A.mesh.geometry.dispose();A.mesh.material.dispose();
    for(const m of A.extra||[]){if(m.geometry!==S.bunGeo)m.geometry.dispose();m.material.dispose();}   // not the game's number texture
    S.actors.delete(A.p);S.detached++;
  }
  // standing, walking and running from the clips: weights by the game's speed, walk and run on one gait phase (left foot
  // down at phase 0 in both) so that they blend foot for foot, each played at the speed that matches its stride to the
  // ground speed. Leaves the pose on the bones.
  const smooth=(a,b,x)=>{const u=Math.min(1,Math.max(0,(x-a)/(b-a)));return u*u*(3-2*u);};
  const clampN=(v,a,b)=>Math.min(b,Math.max(a,v));
  // gaits by speed (m/s, the clips' own: walk 1.21, jog 2.84, run 4.27): [name, fade in from, to, fade out from, to]
  // Bands are narrow: while two gaits blend the standing foot slides (tools/measure_loco.js), so each gait covers a wide
  // range on its own, played faster or slower and with its stride scaled (below).
  const GAITS=[['walk',0.25,0.9,1.9,2.3],['jog',1.9,2.3,3.6,4.0],['run',3.6,4.0,1e9,1e9]];
  // Gait cycle length (two steps, m) by speed, from real players: SkillCorner body pose from match video, two full
  // matches (MOVEMENT_ANALYSIS.md section 7). It sets the steps a second (speed / length) as real players take them:
  // 2.0 a second walking at 1.25 m/s, 2.9 at 3 m/s, 3.3 at 5, 3.8 at 7.
  const CYC=[[0,0.8],[0.75,1.0],[1.25,1.38],[1.75,1.56],[2.25,1.72],[2.75,1.95],[3.25,2.24],[3.75,2.52],[4.25,2.77],[4.75,2.98],
    [5.25,3.17],[5.75,3.33],[6.25,3.42],[6.75,3.58],[7.25,3.77],[7.75,3.83],[8.25,3.94],[10,4.1]];
  const interp=(T,x)=>{if(x<=T[0][0])return T[0][1];for(let i=1;i<T.length;i++)if(x<=T[i][0]){const [a0,b0]=T[i-1],[a1,b1]=T[i];return b0+(b1-b0)*(x-a0)/(a1-a0);}return T[T.length-1][1];};
  const qM=new TH.Quaternion(),qS=new TH.Quaternion();
  function locomotion(A,s,dt,back){
    // backwards: the walk and jog played in reverse (no running backwards: the jog takes the rest)
    const c=S.clips,sg=back?Math.min(s,3.4):s,w={idle:1-smooth(0.25,0.9,s)};let sum=0,nat=0;
    for(const [k,a0,a1,b0,b1] of GAITS){const v=c[k]?smooth(a0,a1,sg)*(1-smooth(b0,b1,sg)):0;w[k]=v;sum+=v;}
    // a gait that is missing (no jog clip) leaves its share to its neighbours
    const mv=1-w.idle;if(sum>0)for(const [k] of GAITS)w[k]*=mv/sum;
    // walking sideways (A.sw, from drive: travel square to the facing, slowly): the side clip, mirrored for the right
    const ws=c.side&&c.sideR&&!back?A.sw||0:0;
    for(const [k] of GAITS)w[k]*=1-ws;w.side=ws*mv*(A.sd>0?1:0);w.sideR=ws*mv*(A.sd>0?0:1);
    for(const [k] of GAITS)if(w[k]>0)nat+=w[k]*c[k].speed*c[k].dur;
    // stretched past about 1.25 (jog, run) the hip swing no longer carries the standing foot as far as the ground goes
    // and the foot lock lets go (the foot pops): the cycle is held to that, a little shorter than real. Dribbling, the
    // clips keep their own stride (players take shorter, quicker steps on the ball; the game's touches, index.html
    // STRIDES, come once a cycle of that). Shortened by more than 5% the feet slide (the jog and
    // run clips are faster than the slow end of their bands), so below that the gait keeps the clips' own stride. The
    // walk clip (short steps) pops at any stretch, so it keeps its own stride (2.5 steps a second at 1.4 m/s; real 2.0)
    const fw=mv*(1-ws),Lc=fw>1e-3?nat/fw:1,kmax=fw>1e-3?((w.walk||0)*1.0+((w.jog||0)*1.25+(w.run||0)*1.18)+((w.jog||0)+(w.run||0))*(1-((w.jog||0)*1.25+(w.run||0)*1.18)/Math.max(1e-3,(w.jog||0)+(w.run||0)))*Math.min(1,A.st.dribble*1.5))/fw:1,L=clampN(interp(CYC,sg),Lc*0.95,Lc*Math.max(0.95,kmax));
    // one gait phase for the forward gaits: cycles a second as real players at this speed (speed / CYC, as held above);
    // the side clip keeps its own pace (its steps cover the ground at its own speed)
    A.ph=((A.ph+(back?-1:1)*dt*s/L)%1+1)%1;
    if(ws>0)A.phS=((A.phS||0)+dt*s/(c.side.speed*c.side.dur))%1;
    // stride: the clips' hip swing scaled to that cycle (against the blend's own stride)
    const kT=fw>1e-3?L/Lc:1;A.ks=A.ks==null?kT:A.ks+(kT-A.ks)*(dt>0?1-Math.exp(-dt*6):1);
    // Dribbling: the game touches the ball once a stride (p.touchPh, its stride from the same table as CYC), so
    // the gait only has to be put in step: the right foot coming through low towards the ball as it goes out (touchPh 0;
    // gait phase 0.3 at 3 m/s, 0.2 at 5 m/s, found on renders: the right toe then 0.4-0.6 m behind the ball's centre,
    // which the game keeps 0.6-0.9 m ahead of the carrier).
    // Live game only (a replay or an online guest has no touch phase; the feet then just run).
    const p=A.p,wd=A.st.dribble;
    // only while that phase is moving (a replay or a paused game keeps a stale owner and a still touch phase)
    const g=window.__game,moving=p.touchPh!=null&&p.touchPh!==A.tp0&&!(g&&g.state==='replay');A.tp0=p.touchPh;
    if(wd>0.05&&!back&&moving){const tgt=((p.touchPh/(2*Math.PI)+clampN(0.45-0.05*s,0.15,0.35))%1+1)%1;let d=tgt-A.ph;d-=Math.round(d);A.ph=((A.ph+d*wd*Math.min(1,dt*5))%1+1)%1;}
    A.it=(A.it+dt)%c.idle.dur;
    // a kick (kick()) takes its share from the gaits
    const wk=A.kw||0,rest=1-wk;
    A.act.idle.time=A.it;A.act.idle.setEffectiveWeight(w.idle*rest);
    for(const [k] of GAITS)if(A.act[k]){A.act[k].time=(c[k].foot+A.ph*c[k].dur)%c[k].dur;A.act[k].setEffectiveWeight(w[k]*rest);}
    for(const k of ['side','sideR'])if(A.act[k]){A.act[k].time=(c[k].foot+(A.phS||0)*c[k].dur)%c[k].dur;A.act[k].setEffectiveWeight((w[k]||0)*rest);}
    for(const k of ['kick','kickL'])if(A.act[k]){const on=k===(A.kside<0?'kickL':'kick')&&wk>0;A.act[k].setEffectiveWeight(on?wk:0);if(on)A.act[k].time=clampN(A.kt,0,c[k].dur-1e-3);}
    // GL-Motion's share: walking and jogging speeds, off the ball, not kicking (the clips keep the dribble in step with
    // the touches and the sprint's stretched stride)
    // Which system drives the gait, never a mix of the two (mixed, two gaits' steps fall out of step): GL-Motion at a walk
    // (up to MM.max m/s, any direction), the clips faster, on the ball, kicking or turning fast (the clips' hips turn
    // with the travel). Hysteresis keeps it from flickering; each change is smoothed like a frame switch (mmInert).
    let wm=0;
    if(S.mm&&MM.on&&!A.p.isOfficial){const yr=Math.abs(A.yrate||0),was=!!A.mmOn;
      const on=was?s<MM.max+0.25&&yr<2.5&&A.st.dribble<0.3&&wk<0.05:s<MM.max-0.25&&yr<1.5&&A.st.dribble<0.15&&wk<0.01;
      if(on!==was){A.mmOn=on;A.mmJ=true;if(on)A.mmNew=true;}wm=on?1:0;}
    A.mmw=wm;
    if(S.mm){if(wm>0){A.act.idle.setEffectiveWeight(w.idle*rest*(1-wm));for(const [k] of GAITS)if(A.act[k])A.act[k].setEffectiveWeight(w[k]*rest*(1-wm));
      for(const k of ['side','sideR'])if(A.act[k])A.act[k].setEffectiveWeight((w[k]||0)*rest*(1-wm));}
      mmStep(A,s,dt,wm);}
    A.w=w;A.mixer.update(0);
    if(S.mm)mmInert(A,dt,wm);
    // the stride scaled: each thigh's rotation pushed out from (or drawn in to) the gaits' mean thigh rotation
    const kk=1+(A.ks-1)*(fw/Math.max(mv,1e-3))*rest*(1-(A.mmw||0));   // (GL-Motion's frames keep their own stride)
    if(Math.abs(kk-1)>0.01&&fw>0.05)for(const sd of ['Left','Right']){qM.set(0,0,0,0);let ref=null;
      for(const [k] of GAITS){const h=c[k].hip&&c[k].hip[sd];if(!(w[k]>0)||!h)continue;if(!ref)ref=h;const sg2=h.dot(ref)<0?-w[k]:w[k];qM.x+=sg2*h.x;qM.y+=sg2*h.y;qM.z+=sg2*h.z;qM.w+=sg2*h.w;}
      if(!ref)continue;qM.normalize();const q=A.bone[sd+'UpLeg'].quaternion;qS.copy(qM).slerp(q,kk);q.copy(qS);}
  }
  // Kicks (game state kick: shots and passes) play the captured kick (CMU 143_24, right foot; mirrored for the left)
  // timed so that the clip's foot strike (contact) falls on the game's strike: visT 0.15 for a shot (the back-swing
  // shows from visT -0.1), the first kick frame for a pass (the game starts those at the strike). In and out over
  // 0.06 / 0.2 s.
  function kick(A,dt){
    const r=A.rig,c=S.clips&&S.clips.kick;if(!c||!c.contact)return;const inKick=r.va===2;
    if(inKick&&!A.kOn){A.kOn=true;A.k0=r.vt;A.kc=r.vt<0.05?0.15:r.vt;A.kside=r.vside<0?-1:1;}
    if(!inKick)A.kOn=false;
    // before the strike the clip runs 1.35 times as fast, so that a shot's 0.25 s wind-up shows the clip from its plant
    // step (0.24 s in) rather than only the swing; after it, at its own pace
    if(A.kOn){const d=r.vt-A.kc;A.kt=c.contact.contact+(d<0?d*1.35:d);}else if(A.kw>0)A.kt=(A.kt||0)+dt;
    const tgt=A.kOn?1:0;A.kw=tgt>A.kw?Math.min(1,A.kw+(dt>0?dt/0.06:1)):Math.max(0,A.kw-(dt>0?dt/0.2:1));
  }
  // The kicking leg as real players swing it (SkillCorner body pose, 59 shots and 1,644 passes, MOVEMENT_ANALYSIS.md
  // 8-9): the knee folded to about 110 deg 0.12 s before the strike and 95 at it, the thigh no higher than about 16 deg
  // at the strike and 40-48 deg in the follow-through. The captured kick lifted the leg to 70-80 deg (into the air) and
  // kept the knee straight in the back-swing; this holds it to those curves (t: seconds from the strike).
  const KICKHIP=[[-0.4,-5],[-0.12,-4],[-0.04,4],[0,16],[0.08,40],[0.2,48],[0.45,30]];
  const KICKKNEE=[[-0.4,125],[-0.2,126],[-0.12,110],[-0.04,95],[0,98]];
  const vk1=new TH.Vector3(),vk2=new TH.Vector3(),vk3=new TH.Vector3();
  function kickShape(A){
    const kw=A.kw||0,c=S.clips&&S.clips.kick;if(kw<0.05||!c||!c.contact)return;const t=(A.kt||0)-c.contact.contact,sd=A.kside<0?'Left':'Right',B=A.bone;
    A.holder.updateMatrixWorld(true);B[sd+'UpLeg'].getWorldPosition(vk1);B[sd+'Leg'].getWorldPosition(vk2);B[sd+'Foot'].getWorldPosition(vk3);
    const yw=A.holder.rotation.y,fx=Math.sin(yw),fz=Math.cos(yw),tx=vk2.x-vk1.x,ty=vk2.y-vk1.y,tz=vk2.z-vk1.z;
    const flex=Math.atan2(tx*fx+tz*fz,-ty)*180/Math.PI,lim=interp(KICKHIP,t)+8;
    // around the strike (-0.03..+0.03 s) the capture is left as it is: the toe meets the ball where the drawn ball waits
    // (S.kickSpot, measured on the capture); the back-swing knee before it, the follow-through after it
    const wf=smooth(0.03,0.08,t);
    if(flex>lim&&wf>0){qL.setFromAxisAngle(xAxis,Math.min(0.9,(flex-lim)*1.5*Math.PI/180)*kw*wf);B[sd+'UpLeg'].quaternion.multiply(qL);}   // 1.5: the bone's own axis carries about 2/3 of it
    // the standing leg takes the weight after the strike: knee bent to about 115 deg, the hips down by what it loses
    // (the capture straightened it to 160-175); and the trunk a little less forward in the wind-up (8-10 deg, not 13-16)
    const pl=sd==='Left'?'Right':'Left',cp=0.42*kw*smooth(0,0.08,t)*(1-smooth(0.35,0.6,t));
    if(cp>1e-3){qL.setFromAxisAngle(xAxis,-0.8*cp);B[pl+'UpLeg'].quaternion.multiply(qL);qL.setFromAxisAngle(xAxis,1.6*cp);B[pl+'Leg'].quaternion.multiply(qL);
      qL.setFromAxisAngle(xAxis,-0.8*cp);B[pl+'Foot'].quaternion.multiply(qL);B.Hips.position.y-=0.92*(1-Math.cos(0.8*cp));}
    const lb=0.09*kw*(1-smooth(-0.06,0,t));if(lb>1e-3){qL.setFromAxisAngle(xAxis,-lb);B.Spine.quaternion.multiply(qL);}
    const wb=1-smooth(-0.08,-0.03,t);
    if(wb>0){const u1=vk1.sub(vk2),u2=vk3.sub(vk2),kn=u1.angleTo(u2)*180/Math.PI,tk=interp(KICKKNEE,t)+5;
      if(kn>tk){qL.setFromAxisAngle(xAxis,(kn-tk)*Math.PI/180*kw*wb);B[sd+'Leg'].quaternion.multiply(qL);}
      else if(kn<tk-15){qL.setFromAxisAngle(xAxis,-(tk-15-kn)*Math.PI/180*kw*wb);B[sd+'Leg'].quaternion.multiply(qL);}}   // nor folded much past it
  }
  // Arms while standing, walking and running: drawn here from the gait phase instead of the clips (the captured arms and
  // wrists land on this model folded across the chest). Values from gait studies: walking keeps the elbow nearly straight
  // (about 20 deg, moving 15-30 deg) with the shoulder swinging 20-25 deg in all; running holds the elbow near 90 deg
  // (70-120 over the swing), the hands travelling between hip and chest, further and higher with speed; wrists neutral.
  // Each arm swings against the leg of its side (phase 0: left foot down, left leg ahead, right arm ahead). Angles in the
  // game rig's convention (x < 0: arm or forearm forward; z: away from the body), put on the bones like the transfer.
  //            speed  swing  mean   elbow  elbow+fwd  out   across
  // Refitted to real players (MOVEMENT_ANALYSIS.md section 7): walking, the elbow bent about 45 deg and the hand
  // swinging about 0.38 m; jogging, about 90 deg and a small swing (0.16-0.2 m); faster, the arm opens (about 75 deg at
  // 7 m/s) and swings further (0.4-0.47 m).
  const ARMK=[[0,     0,     0.10,  0.62,  0,         0.24, 0],
              [1.4,   0.30,  0.13,  0.70,  0.20,      0.25, 0.01],
              [1.9,   0.32,  0.18,  0.80,  0.25,      0.28, 0.02],
              [2.3,   0.30,  0.42,  1.38,  0.30,      0.38, 0.03],
              [2.8,   0.30,  0.50,  1.48,  0.30,      0.40, 0.03],
              [4.75,  0.50,  0.65,  1.30,  0.35,      0.42, 0.03],
              [7.0,   0.85,  0.62,  1.20,  0.40,      0.44, 0.03],
              [8.5,   0.95,  0.60,  1.32,  0.40,      0.45, 0.03]];
  // (section 8: the upper arm hangs 16-25 deg out to the side and swings about 10-18 deg behind the body on average;
  // the mean and out columns above were moved from 4-7 deg out and forward of the body)
  function armParams(s){let i=0;while(i<ARMK.length-2&&s>ARMK[i+1][0])i++;const a=ARMK[i],b=ARMK[i+1],u=clampN((s-a[0])/(b[0]-a[0]),0,1);return a.map((v,k)=>v+(b[k]-v)*u);}
  const eA=new TH.Euler(),qA=new TH.Quaternion(),qB=new TH.Quaternion();
  function setArmBone(A,b,x,y,z){eA.set(x,y,z,'XYZ');qA.setFromEuler(eA);const C=S.tpl.C,cp=C[PARENT[b]],cs=C[b],q=A.bone[b].quaternion;
    if(cp){q.copy(cp).invert().multiply(qA);}else q.copy(qA);if(cs)q.multiply(cs);}
  function arms(A,s,T){
    const [,swing,mean,el,elF,out,across]=armParams(s),c=Math.cos(2*Math.PI*A.ph),moving=1-(A.w.idle||0),W=A.st;
    for(const [sd,sx,sg] of [['Left',1,1],['Right',-1,-1]]){
      // forwardness of this arm, 0 back .. 1 ahead (the right arm is ahead at phase 0)
      const f=0.5-0.5*sg*c*moving;let x=mean+swing*sg*c*moving+0.03*Math.sin(T*0.8+sx),z=sx*(out-across*f),e=el+elF*f;
      // stances: jockey arms out and a little forward; shield: the arm on the opponent's side out to the side, the other
      // for balance; contact: elbows in
      const near=(W.side>0)===(sx>0),wj=W.jockey,ws=W.shield,wc=W.contact*(1-ws);
      if(W.dribble>1e-3){z+=sx*0.15*W.dribble;e-=0.35*W.dribble;}   // on the ball: arms out and straighter for balance (elbow 115-126 deg)
      // kicking: the arm across from the kicking leg swings out and forward for balance, the other back and in
      const wk=A.kw||0;if(wk>1e-3){const across=(A.kside<0)===(sx<0);   // the right arm when the left foot kicks
        const ck=S.clips.kick&&S.clips.kick.contact?S.clips.kick.contact.contact:0.575,pk=Math.exp(-Math.pow(((A.kt||0)-ck+0.1)/0.16,2));   // out most 0.1 s before the strike
        if(across){x+=(-0.35-x)*wk;z+=(sx*(0.3+0.45*pk)-z)*wk;e+=(0.6-e)*wk;}else{x+=(0.25-x)*wk;z+=(sx*0.25-z)*wk;e+=(0.7-e)*wk;}}
      if(wj>1e-3){x+=(-0.25-x)*wj*0.6;z+=(sx*0.5-z)*wj;e+=(0.75-e)*wj;}
      if(ws>1e-3){if(near){x+=(-0.15-x)*ws;z+=(sx*1.0-z)*ws;e+=(0.35-e)*ws;}else{z+=(sx*0.35-z)*ws;e+=(0.9-e)*ws;}}
      if(wc>1e-3&&near){z+=(sx*0.05-z)*wc;e+=(1.2-e)*wc;}
      setArmBone(A,sd+'Shoulder',x*0.06,0,0);
      // the upper arm turns in as the elbow bends, so that a bent arm swings the hand towards the middle, not out to the side
      setArmBone(A,sd+'Arm',x,-sx*0.35*Math.min(1,e/1.4),z);
      setArmBone(A,sd+'ForeArm',-e,0,0);
      setArmBone(A,sd+'Hand',-0.17,0,0);gesture(A,sd,sx);}   // wrist bent about 10 deg (section 8)
  }
  // Contest stances, from what the game already decides (sources in MOVEMENT_ANALYSIS.md):
  //  jockey  defending in front of the ball carrier: side-on, knees bent about 40 deg, arms out for balance
  //  shield  on the ball with an opponent at the back: low, the arm on his side out to hold him off (not a push)
  //  contact shoulder to shoulder for the ball: lean into him, elbows in
  // Read from what is drawn (stanceOf), so a replay and an online guest's view show them too.
  function stanceOf(A,s){
    // from what is drawn (the rigs' places and facings, the drawn ball), so that replays and an online guest's view show
    // the same; in the live game the game's own flags count too (the jockey key, the shield key)
    const g=window.__game,live=!!g&&g.state!=='replay'&&!(g.net&&g.net.role==='guest'),p=A.p,ps=S.players||[],me=A.rig.root.position,bp=S.ballPos;
    // the ball carrier: the game's own in the live game (a dribbler pushes the ball up to 2 m ahead), else the nearest to
    // the drawn ball within 2.5 m
    let owner=null;if(live&&g.ball&&g.ball.owner)owner=g.ball.owner;
    else if(bp&&bp.y<0.6){let bd=2.5;for(const q of ps){if(q.sentOff||!q.rig)continue;const r=q.rig.root.position,d=Math.hypot(r.x-bp.x,r.z-bp.z);if(d<bd){bd=d;owner=q;}}}
    let opp=null,od=1e9;for(const q of ps){if(q.team===p.team||q.sentOff||!q.rig)continue;const r=q.rig.root.position,d=Math.hypot(r.x-me.x,r.z-me.z);if(d<od){od=d;opp=q;}}
    const wrap=x=>Math.atan2(Math.sin(x),Math.cos(x)),face=A.rig.root.rotation.y;
    let toOwner=1e9,facing=false;if(owner&&owner.team!==p.team){const r=owner.rig.root.position;toOwner=Math.hypot(r.x-me.x,r.z-me.z);facing=Math.abs(wrap(Math.atan2(r.x-me.x,r.z-me.z)-face))<1.05;}
    const jockey=owner!==p&&((live&&(p.jockeyT||0)>0)||(facing&&toOwner<4.5&&s<5));
    const shield=owner===p&&((live&&p.shielding)||(od<1.6&&s<3));
    const contact=od<1.0&&!!owner&&(owner===p||owner===opp);
    const dribble=owner===p&&s>0.8&&!shield;
    // which side the nearest opponent is on, in his own frame (+1 left, -1 right)
    let side=1;if(opp){const r=opp.rig.root.position,dx=r.x-me.x,dz=r.z-me.z;side=(dx*Math.cos(face)-dz*Math.sin(face))>=0?1:-1;}
    return {jockey,shield,contact,dribble,side};
  }
  function stance(A,s,dt){
    const st=stanceOf(A,s),k=dt>0?1-Math.exp(-dt*7):1,W=A.st;
    for(const n of ['jockey','shield','contact','dribble'])W[n]+=((st[n]?1:0)-W[n])*k;W.side+=(st.side-W.side)*k;
    // braking and pushing off, from the change of the game's speed, smoothed. The trunk leans with the acceleration
    // as real players' do (SkillCorner body pose from broadcast video, MOVEMENT_ANALYSIS.md section 6: about 3 deg per
    // m/s2 either way, from about 9 deg running at an even pace to about 25 deg pushing off hard and -3 deg braking);
    // hard braking (past 2 m/s2, full at 6) also lowers him
    if(dt>0&&A.sp0!=null)A.acc+=((s-A.sp0)/dt-A.acc)*(1-Math.exp(-dt*8));A.sp0=s;
    const wb=clampN((-A.acc-2)/4,0,1)*(1-W.shield),wa=clampN((A.acc-1)/4,0,1)*smooth(0.5,2,s);W.brake+=(wb-W.brake)*k*1.5;W.push+=(wa-W.push)*k*1.5;
    // (no knee bend for dribbling: bending the clip's legs at running speed changes the foot path and slides the feet)
    const bone=A.bone,c=0.52*W.jockey+0.4*W.shield+0.25*W.contact+0.3*W.brake;   // jockeying: hips about 8 cm down (section 8)
    if(c>1e-3){
      // knees bent, thighs forward, feet flat; the hips come down by what the legs lose in height
      for(const sd of ['Left','Right']){qL.setFromAxisAngle(xAxis,-0.8*c);bone[sd+'UpLeg'].quaternion.multiply(qL);
        qL.setFromAxisAngle(xAxis,1.6*c);bone[sd+'Leg'].quaternion.multiply(qL);qL.setFromAxisAngle(xAxis,-0.8*c);bone[sd+'Foot'].quaternion.multiply(qL);}
      bone.Hips.position.y-=0.92*(1-Math.cos(0.8*c));
      qL.setFromAxisAngle(xAxis,0.35*c);bone.Spine.quaternion.multiply(qL);}
    // the whole body pitched about the hips forward when dribbling; the trunk with the acceleration (above)
    const pitch=0.08*W.dribble;if(Math.abs(pitch)>1e-3){qL.setFromAxisAngle(xAxis,pitch);bone.Hips.quaternion.premultiply(qL);}
    const lean=clampN(0.052*A.acc,-0.26,0.42)*smooth(0.3,1.5,s)*(1-W.shield);if(Math.abs(lean)>1e-3){qL.setFromAxisAngle(xAxis,lean);bone.Spine.quaternion.multiply(qL);}
    // jockey: side-on (hips turned 0.45 rad, the trunk turned most of the way back to the ball carrier)
    if(W.jockey>1e-3){const y=0.45*W.jockey*(A.p.slot%2?1:-1);qL.setFromAxisAngle(yAxis,y);bone.Hips.quaternion.premultiply(qL);
      qL.setFromAxisAngle(yAxis,-y*0.35);bone.Spine1.quaternion.multiply(qL);qL.setFromAxisAngle(yAxis,-y*0.35);bone.Spine2.quaternion.multiply(qL);}
    // contact: the trunk leans towards him
    const roll=(0.18*W.contact+0.08*W.shield)*W.side;if(Math.abs(roll)>1e-3){qL.setFromAxisAngle(zAxis,-roll);bone.Spine.quaternion.multiply(qL);}
    return W;
  }
  const xAxis=new TH.Vector3(1,0,0);
  // Corrections on top of the transferred game pose, for states the clips do not cover (sources in MOVEMENT_ANALYSIS.md):
  //  keeper set (gkready 6): elite keepers stand with the knee bent about 62 deg and the hip about 63 deg (the game's pose
  //    has 45 and about 43): knees bent further, trunk a little more forward, hips lower;
  //  header (10) and jump (17): the arms drive the jump, swinging forward and up as he rises, and pull down as he meets
  //    the ball (header) or as he lands;
  //  tackles (stackle 13, tackle 11): the trunk leans into the tackle and the arm away from the tackling leg goes out
  //    for balance.
  // Scaled by how much the transfer is showing (A.wp).
  function gamePoseFix(A){
    const r=A.rig,va=r.va,t=r.vt||0,w=A.wp,bone=A.bone;if(!(w>0))return;
    if(va===6&&Math.abs(r.vside||0)<2){const c=0.19*w;   // (side codes 2-4: a save standing up, posed in full by the game)
      for(const sd of ['Left','Right']){qL.setFromAxisAngle(xAxis,-0.8*c);bone[sd+'UpLeg'].quaternion.multiply(qL);
        qL.setFromAxisAngle(xAxis,1.6*c);bone[sd+'Leg'].quaternion.multiply(qL);qL.setFromAxisAngle(xAxis,-0.8*c);bone[sd+'Foot'].quaternion.multiply(qL);}
      bone.Hips.position.y-=0.92*(1-Math.cos(0.8*c));qL.setFromAxisAngle(xAxis,0.1*w);bone.Spine.quaternion.multiply(qL);}
    if((va===10&&Math.abs(r.vside||0)<2)||va===17){const dur=va===10?0.5:0.62,q=clampN(t/dur,0,1);
      for(const [sd,sx] of [['Left',1],['Right',-1]]){let x,z,e;
        if(q<0.5){const u=q/0.5;x=-0.4-1.3*u;z=sx*(0.25+0.15*u);e=1.1;}else{const v=(q-0.5)/0.5;x=-1.7+(va===10?1.2:1.3)*v;z=sx*(0.4+(va===10?0.4:0.1)*v);e=1.1-0.5*v;}
        blendArm(A,sd,x,z,e,w);}}
    if((va===13&&Math.abs(r.vside||0)<2)||va===11){const dur=va===13?0.34:0.3,q=clampN(t/dur,0,1),e2=Math.sin(Math.min(1,q)*Math.PI*0.5)*w;
      qL.setFromAxisAngle(xAxis,0.18*e2);bone.Spine.quaternion.multiply(qL);
      // stackle tackles with the right leg, tackle pokes with the left: the opposite arm out
      const sd=va===13?'Left':'Right',sx=va===13?1:-1;blendArm(A,sd,-0.3,sx*1.0,0.4,e2);}
  }
  // Reactions over standing and running (the game's side codes 2-8 on states 0 and 1: hands on head or hips, arms up
  // appealing, a fist pump, clapping, hands cupped in a wall, arms out): the clips keep the legs and trunk, the arms are
  // taken from the game rig, which the game posed for the reaction, faded in and out over about 0.15 s.
  function reactArms(A,dt){
    const r=A.rig,on=(r.va===0||r.va===1)&&Math.abs(r.vside||0)>=2;
    A.rxw=(A.rxw||0)+((on?1:0)-(A.rxw||0))*(dt>0?1-Math.exp(-dt*14):1);if(on)A.gest=null;
    if(A.rxw<0.01)return;
    for(const [sd,a,e] of [['Left',r.armL,r.elbowL],['Right',r.armR,r.elbowR]])blendArm(A,sd,a.rotation.x,a.rotation.z,-e.rotation.x,A.rxw);
  }
  // an arm towards given game-convention angles by weight w, from what the bones hold now
  function blendArm(A,sd,x,z,e,w){const b=A.bone,keep=[b[sd+'Arm'].quaternion.clone(),b[sd+'ForeArm'].quaternion.clone()];
    setArmBone(A,sd+'Arm',x,-(sd==='Left'?1:-1)*0.35*Math.min(1,e/1.4),z);setArmBone(A,sd+'ForeArm',-e,0,0);
    if(w<1){b[sd+'Arm'].quaternion.copy(keep[0].slerp(b[sd+'Arm'].quaternion,w));b[sd+'ForeArm'].quaternion.copy(keep[1].slerp(b[sd+'ForeArm'].quaternion,w));}}
  const BLEND=0.12;   // seconds to go between the clips and the transferred pose
  const qT=new TH.Quaternion(),qL=new TH.Quaternion(),zAxis=new TH.Vector3(0,0,1),yAxis=new TH.Vector3(0,1,0);
  // how the trunk turns back from the hips to the facing, from the bottom up (the head ends about square to the facing)
  const TWIST=[['Spine',0.3],['Spine1',0.3],['Spine2',0.25],['Neck',0.1]];
  // The trunk as real players carry it (SkillCorner body pose from match video, MOVEMENT_ANALYSIS.md section 7): leaning
  // forward (the neck over the hips' middle) about 3 deg walking, 7-9 jogging, 10-12 running; the clips' own lean
  // (S.clipLean, measured once at start) is set to that. Running, the shoulders turn against the hips with each stride
  // (about 13 deg seen; the right shoulder forward as the left leg goes forward).
  const TLEAN=[[0,4.2],[1.25,4.4],[2.25,6.2],[3,8.1],[4.75,10.1],[6.25,11.8],[8,12.4]];   // section 8: standing 4, walking 4, jogging 8, running 10-12
  const TWOSC=[[0,0],[1.5,0.04],[2.5,0.1],[4,0.14],[9,0.14]];
  function trunk(A,s){
    const w=A.w,L=S.clipLean;if(!L)return;let fw=0,cl=0;
    for(const k of ['idle','walk','jog','run'])if(w[k]>0&&L[k]!=null){fw+=w[k];cl+=w[k]*L[k];}
    if(fw<1e-3)return;cl/=fw;
    // (the spine turned alone carries about 3/4 of a turn to the line from the hips to the neck: 1.35 makes it up)
    const tgt=A.back?2:interp(TLEAN,s),corr=(tgt-cl)*1.35*Math.PI/180*fw*(1-(A.kw||0));
    // the neck takes most of it back, so the eyes stay level (raising the trunk would tip the head up to the sky)
    if(Math.abs(corr)>1e-3){qL.setFromAxisAngle(xAxis,corr);A.bone.Spine.quaternion.multiply(qL);qL.setFromAxisAngle(xAxis,-corr*0.7);A.bone.Neck.quaternion.multiply(qL);}
    const tw=interp(TWOSC,s)*fw*Math.cos(2*Math.PI*A.ph)*(1-(A.kw||0));
    if(Math.abs(tw)>1e-3){qL.setFromAxisAngle(yAxis,tw*0.5);A.bone.Spine1.quaternion.multiply(qL);A.bone.Spine2.quaternion.multiply(qL);}
  }
  // Legs (section 8): standing feet about 0.29 m apart (keepers 0.42) and walking 0.21, the thighs turned out to the
  // side; walking, jogging and running the feet point a little out (6, 4, 3 deg; the clips' toes pointed 0 to 9 deg in)
  const LEGS={stand:0.065,standGK:0.13,walk:0.05,toeOut:0.08,toeOutWalk:0.1};
  function legs(A){
    const w=A.w,ab=(w.idle||0)*(A.p.isGK?LEGS.standGK:LEGS.stand)+(w.walk||0)*LEGS.walk,to=((w.jog||0)+(w.run||0))*LEGS.toeOut+(w.walk||0)*LEGS.toeOutWalk;
    for(const [sd,sg] of [['Left',1],['Right',-1]]){
      if(ab>1e-3){qL.setFromAxisAngle(zAxis,sg*ab);A.bone[sd+'UpLeg'].quaternion.premultiply(qL);qL.setFromAxisAngle(zAxis,-sg*ab);A.bone[sd+'Foot'].quaternion.multiply(qL);}
      if(to>1e-3){const ax=vAx.copy(A.bone[sd+'Foot'].position).normalize();qL.setFromAxisAngle(ax,-sg*to);A.bone[sd+'Foot'].quaternion.premultiply(qL);}}
  }
  const vAx=new TH.Vector3();
  // Gestures (section 8): short moves laid over the arms now and then, at about the rates real players show them:
  // standing players raise an arm (calling for the ball, 1.7% of the time), put an arm out (1%) or point (0.25%);
  // keepers standing put an arm out (4.5%), raise one (2.4%) or point (0.8%). One at a time, 0.8-1.2 s, one arm.
  const GEST={field:[['up',0.017],['out',0.010],['point',0.0025]],gk:[['out',0.045],['up',0.024],['point',0.008]]};
  function gestureTick(A,s,dt){
    const g=A.gest;if(g){g.t+=dt;if(g.t>=g.dur)A.gest=null;return;}
    if(!(dt>0)||s>1.2||(A.kw||0)>0.01||A.st.jockey>0.2||A.st.shield>0.2||A.st.contact>0.2||A.st.dribble>0.2)return;
    for(const [kind,rate] of (A.p.isGK?GEST.gk:GEST.field))if(Math.random()<rate*dt/(1+s)){A.gest={kind,t:0,dur:0.8+Math.random()*0.4,side:Math.random()<0.5?'Left':'Right'};break;}
  }
  function gesture(A,sd,sx){
    const g=A.gest;if(!g||g.side!==sd)return;const u=g.t/g.dur,w=Math.sin(Math.PI*clampN(u,0,1))**0.6;if(w<1e-3)return;
    const bA=A.bone[sd+'Arm'].quaternion.clone(),bF=A.bone[sd+'ForeArm'].quaternion.clone();
    if(g.kind==='up'){setArmBone(A,sd+'Arm',-2.5,0,sx*0.25);setArmBone(A,sd+'ForeArm',-0.35,0,0);}
    else if(g.kind==='out'){setArmBone(A,sd+'Arm',-0.25,0,sx*1.35);setArmBone(A,sd+'ForeArm',-0.2,0,0);}
    else{setArmBone(A,sd+'Arm',-1.45,-sx*0.2,sx*0.35);setArmBone(A,sd+'ForeArm',-0.05,0,0);}
    A.bone[sd+'Arm'].quaternion.copy(bA.slerp(A.bone[sd+'Arm'].quaternion,w));A.bone[sd+'ForeArm'].quaternion.copy(bF.slerp(A.bone[sd+'ForeArm'].quaternion,w));
  }
  // The head turned towards the ball (half the way, up to 34 deg; not for a ball behind him): real players keep it in
  // view (head within 45 deg of it about 75% of the time running, against 50-75% before; turning three quarters of the
  // way made it 90%)
  function look(A,yaw,dt){
    const b=S.ballPos;let t=0;
    if(b){const ang=Math.atan2(Math.sin(Math.atan2(b.x-A.holder.position.x,b.z-A.holder.position.z)-yaw),Math.cos(Math.atan2(b.x-A.holder.position.x,b.z-A.holder.position.z)-yaw));
      const q=A.p,runner=q.runT>0&&q.runKind&&q.runKind!=='support',k=q.isGK?0.8:runner?0.75:0.5,cap=q.isGK?0.9:runner?1.05:0.6;
      t=Math.abs(ang)<(runner?2.6:1.9)?clampN(ang*k,-cap,cap):0;}   // keepers face it; runners look over the shoulder (section 8)
    A.lk=(A.lk||0)+(t-(A.lk||0))*(dt>0?1-Math.exp(-dt*6):1);
    if(Math.abs(A.lk)>1e-3){qL.setFromAxisAngle(yAxis,A.lk*0.4);A.bone.Neck.quaternion.multiply(qL);qL.setFromAxisAngle(yAxis,A.lk*0.6);A.bone.Head.quaternion.multiply(qL);}
  }
  // pose the copy from the game rig as it stands this frame (dt: seconds since the last drawn frame)
  function drive(A,dt){
    const t=S.tpl,r=A.rig,C=t.C,{bone,qa,e}=A;
    const k=r.root.scale.x*GAME_H/MODEL_H;
    A.holder.position.copy(r.root.position);A.holder.rotation.set(0,r.root.rotation.y,0);A.holder.scale.setScalar(k);
    A.holder.visible=r.root.visible;
    // which source: the clips for standing and running (game states idle 0 and run 1), the transfer for the rest
    const s=r.vspd||0,loco=!!S.clips&&(r.va===0||r.va===1||(r.va===2&&!!S.clips.kick)),target=loco?0:1;
    if(A.wp===null||!(dt>0))A.wp=target;else A.wp=target>A.wp?Math.min(target,A.wp+dt/BLEND):Math.max(target,A.wp-dt/BLEND);
    // where he is going: the drawn position's change, smoothed (a jump of more than 2 m, a reset, starts over)
    const yaw=r.root.rotation.y,pos=r.root.position,kf=dt>0?1-Math.exp(-dt*12):1;
    if(!A.pp||!(dt>0)||Math.hypot(pos.x-A.pp.x,pos.z-A.pp.z)>2){A.pp={x:pos.x,z:pos.z};A.vx=0;A.vz=0;}
    else{A.vx+=((pos.x-A.pp.x)/dt-A.vx)*kf;A.vz+=((pos.z-A.pp.z)/dt-A.vz)*kf;A.pp.x=pos.x;A.pp.z=pos.z;}
    const vm=Math.hypot(A.vx,A.vz),travel=vm>0.3?Math.atan2(A.vx,A.vz):yaw;
    // travel against facing: the hips and legs turn to the travel (up to 90 deg) and the trunk turns back towards the
    // facing by at most 50 deg, as players do moving across the pitch while watching the ball. Square to the facing
    // (60-130 deg) and slowly (under about 2 m/s) he walks sideways instead, hips to the facing (real players do so 17%
    // of the time they walk, MOVEMENT_ANALYSIS.md section 7); past 132 deg (back under 115) he backs off: hips to the
    // facing, the gait in reverse
    const wrap=x=>Math.atan2(Math.sin(x),Math.cos(x)),rel=vm>0.3&&s>0.3?wrap(travel-yaw):0,ar=Math.abs(rel);
    A.back=s<5&&(A.back?ar>2.0:ar>2.3);
    // 70-120 deg in open play (real players 21% of walking); 60-130 on the ball and for keepers (41%, 37%)
    const wide=A.st.dribble>0.3||A.p.isGK,swT=loco&&!A.back&&S.clips&&S.clips.side?smooth(wide?0.8:1.05,wide?1.05:1.25,ar)*(1-smooth(wide?2.05:1.95,wide?2.3:2.15,ar))*(1-smooth(1.9,2.4,s)):0;
    A.sw=(A.sw||0)+(swT-(A.sw||0))*kf;if(ar>0.3)A.sd=rel>0?1:-1;
    const msT=loco&&vm>0.3?smooth(1.0,1.25,ar)*(1-smooth(1.95,2.2,ar)):0;A.mmSide=(A.mmSide||0)+(msT-(A.mmSide||0))*kf;   // GL-Motion's part: walking sideways
    // the side clip goes off square (its own travel, dir): the hips turn by what is left over
    const sc=S.clips&&S.clips.side,sideAng=sc?Math.atan2(sc.dir[0],sc.dir[1]):Math.PI/2,sideYaw=clampN(wrap(rel-(A.sd>0?1:-1)*sideAng),-0.6,0.6);
    const hyF=A.back?clampN(wrap(rel-Math.PI),-0.9,0.9):clampN(rel,-1.6,1.6);
    const hyT=(loco?hyF*(1-A.sw)+sideYaw*A.sw:0)*(1-(A.mmw||0));A.hy+=(hyT-A.hy)*kf;   // GL-Motion's frames carry their own
    // lean into turns: how fast the path bends, times speed
    let rate=0;if(A.tr!=null&&dt>0&&vm>0.3)rate=wrap(travel-A.tr)/dt;A.tr=vm>0.3?travel:null;
    A.yrate=(A.yrate||0)+((A.yaw!=null&&dt>0?wrap(yaw-A.yaw)/dt:0)-(A.yrate||0))*kf;A.yaw=yaw;   // facing turn rate (GL-Motion's query)
    // (0.07 rad, about 4 deg, per m/s2 of the bend's pull on the hips: the trunk then leans about 2 deg per m/s2 as real
    // players' do, MOVEMENT_ANALYSIS.md section 7)
    const leanT=loco?clampN(-rate*s*0.07,-0.35,0.35):0;A.lean+=(leanT-A.lean)*(dt>0?1-Math.exp(-dt*10):1);
    kick(A,dt);
    if(A.wp<1){locomotion(A,s,dt,A.back);gestureTick(A,s,dt);arms(A,s,(A.T=(A.T||0)+dt));   // arms read A.st as last updated by stance()
      trunk(A,s);legs(A);kickShape(A);reactArms(A,dt);
      if(Math.abs(A.lean)>1e-4){qL.setFromAxisAngle(zAxis,A.lean);bone.Hips.quaternion.premultiply(qL);}
      if(Math.abs(A.hy)>1e-3){qL.setFromAxisAngle(yAxis,A.hy);bone.Hips.quaternion.premultiply(qL);
        // the clip's hips sway (its in-place leftover) turns with the hips, or the feet would slide along the old line
        const hp=bone.Hips.position,hr=t.hipsRest,dx=hp.x-hr.x,dz=hp.z-hr.z,cs=Math.cos(A.hy),sn=Math.sin(A.hy);hp.x=hr.x+dx*cs+dz*sn;hp.z=hr.z-dx*sn+dz*cs;
        const tw=clampN(A.hy*0.95,-0.87,0.87);for(const [b,f] of TWIST){qL.setFromAxisAngle(yAxis,-tw*f/0.95);bone[b].quaternion.multiply(qL);}}
      stance(A,s,dt);look(A,yaw,dt);
      for(const b in A.lq)A.lq[b].copy(bone[b].quaternion);A.lh.copy(bone.Hips.position);}
    if(A.wp>0){
      for(const b in MAP){const o=r[MAP[b]].rotation;e.set(o.x,o.y,o.z,o.order);qa.setFromEuler(e);
        const cp=C[PARENT[b]],cs=C[b];
        if(cp){qT.copy(cp).invert().multiply(qa);}else qT.copy(qa);
        if(cs)qT.multiply(cs);
        if(A.wp<1)bone[b].quaternion.copy(A.lq[b]).slerp(qT,A.wp);else bone[b].quaternion.copy(qT);}
      // Spine2 and the toes are at rest in the transfer (the foot has no rest correction, so its child needs none)
      for(const b of ['Spine2','LeftToeBase','RightToeBase'])if(A.wp<1)bone[b].quaternion.copy(A.lq[b]).slerp(I0,A.wp);else bone[b].quaternion.identity();
      const hy=t.standY*(r.hips.position.y/(r.hipK||1))/0.95;
      if(A.wp<1)bone.Hips.position.set(t.hipsRest.x+(A.lh.x-t.hipsRest.x)*(1-A.wp),A.lh.y+(hy-A.lh.y)*A.wp,t.hipsRest.z+(A.lh.z-t.hipsRest.z)*(1-A.wp));
      else bone.Hips.position.set(t.hipsRest.x,hy,t.hipsRest.z);}
    gamePoseFix(A);
    footLock(A,dt,!!S.clips&&A.wp<0.5&&S.footLock!==false);
  }
  const I0=new TH.Quaternion();
  // Foot lock: the ball of a foot on the ground (its height within 3 cm of standing and moving slower than 80% of the
  // body) is held where it came down, and the leg is bent so that the ankle sits where that takes it (two-bone IK: thigh
  // and shin, the knee kept bending the way it was, the foot keeping its own orientation, so heel and toe still roll).
  // Released when the ball of the foot lifts or is more than 35 cm from its spot; in and out over 0.04 / 0.08 s. Only
  // while the clips drive the body. This takes out what the clips' blending and the speed matching leave of the
  // standing foot sliding.
  const vA=new TH.Vector3(),vB=new TH.Vector3(),vC=new TH.Vector3(),vT=new TH.Vector3(),vU=new TH.Vector3(),vK=new TH.Vector3(),qW=new TH.Quaternion(),qP=new TH.Quaternion(),qF=new TH.Quaternion(),qD=new TH.Quaternion();
  function setWorldQuat(b,qw){b.parent.getWorldQuaternion(qP);b.quaternion.copy(qP.invert().multiply(qw));b.updateMatrixWorld(true);}
  function twoBone(up,leg,foot,t){
    up.getWorldPosition(vA);leg.getWorldPosition(vB);foot.getWorldPosition(vC);foot.getWorldQuaternion(qF);
    const l1=vB.distanceTo(vA),l2=vC.distanceTo(vB);vU.subVectors(t,vA);let d=vU.length();if(d<1e-6)return;vU.divideScalar(d);
    d=clampN(d,Math.abs(l1-l2)+1e-3,l1+l2-1e-3);
    vK.subVectors(vB,vA);vK.addScaledVector(vU,-vK.dot(vU));if(vK.lengthSq()<1e-10)return;vK.normalize();
    const ca=clampN((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1),sa=Math.sqrt(1-ca*ca);
    const nb=vT.copy(vA).addScaledVector(vU,l1*ca).addScaledVector(vK,l1*sa);
    qD.setFromUnitVectors(vB.sub(vA).normalize(),nb.clone().sub(vA).normalize());up.getWorldQuaternion(qW);setWorldQuat(up,qD.multiply(qW));
    leg.getWorldPosition(vB);foot.getWorldPosition(vC);
    qD.setFromUnitVectors(vC.sub(vB).normalize(),vT.copy(t).sub(vB).normalize());leg.getWorldQuaternion(qW);setWorldQuat(leg,qD.multiply(qW));
    setWorldQuat(foot,qF);
  }
  function footLock(A,dt,on){
    if(!on||!(dt>0)){A.lock=null;return;}
    const k=A.holder.scale.x,ground=(S.tpl.toeY+0.03)*k,s=A.rig.vspd||0;A.holder.updateMatrixWorld(true);
    A.lock=A.lock||{Left:{pin:null,w:0,off:new TH.Vector3(),prev:null},Right:{pin:null,w:0,off:new TH.Vector3(),prev:null}};
    for(const sd of ['Left','Right']){const L=A.lock[sd],up=A.bone[sd+'UpLeg'],leg=A.bone[sd+'Leg'],foot=A.bone[sd+'Foot'],toe=A.bone[sd+'ToeBase'];
      const tw=toe.getWorldPosition(new TH.Vector3()),sp=L.prev?Math.hypot(tw.x-L.prev.x,tw.z-L.prev.z)/dt:0;L.prev=tw.clone();
      const planted=tw.y<ground&&sp<0.8*s+0.6;
      if(planted&&!L.pin)L.pin=tw.clone();
      if(!planted)L.pin=null;
      if(L.pin&&Math.hypot(L.pin.x-tw.x,L.pin.z-tw.z)>0.35)L.pin=tw.clone();
      if(L.pin)L.off.set(L.pin.x-tw.x,0,L.pin.z-tw.z);
      L.w=L.pin?Math.min(1,L.w+dt/0.04):Math.max(0,L.w-dt/0.08);
      // the ankle moved by what the ball of the foot is off its spot
      if(L.w>1e-3&&L.off.lengthSq()>1e-8){const t=foot.getWorldPosition(new TH.Vector3()).addScaledVector(L.off,L.w);twoBone(up,leg,foot,t);}}
  }

  // The ball as the players handle it: the drawn ball (the game's ball mesh; the game's own ball, its physics, online
  // messages and replay records are not touched) is put where the foot or the hands meet it, as football games do.
  //  - dribbling: at each touch (the game's p.touchPh at 0, which the gait is locked to) the ball sits just in front of
  //    the touching (right) toe, then it rolls out to where the game has it and comes back for the next touch;
  //  - a kick: from 0.3 s before the clip's foot strike the ball waits where the toe will strike it (S.kickSpot), so the
  //    foot meets it and it leaves from the foot; the game starts the ball off at that moment;
  //  - a header: the ball at the forehead at the top of the jump;
  //  - a keeper holding the ball: between his hands; diving, his hands reach for it (IK).
  // Only for a player with the 3D model, the ball within 1.6 m of where it is put.
  const vK1=new TH.Vector3(),vK2=new TH.Vector3();
  function ballContact(bp,dt){
    let best=null,bd=2.5;for(const A of S.actors.values()){const d=Math.hypot(A.holder.position.x-bp.x,A.holder.position.z-bp.z);if(d<bd){bd=d;best=A;}}
    const A=best;if(!A){S.bw=0;return;}
    A.holder.updateMatrixWorld(true);const yaw=A.holder.rotation.y,fx=Math.sin(yaw),fz=Math.cos(yaw),p=A.p;let w=0;
    if(p.holding&&p.isGK){A.bone.LeftHand.getWorldPosition(vK1);A.bone.RightHand.getWorldPosition(vK2);vK1.add(vK2).multiplyScalar(0.5);vK1.x+=fx*0.08;vK1.z+=fz*0.08;w=1;}
    else if((A.kw||0)>0.05&&S.kickSpot){const k=A.kside<0?'kickL':'kick',sp=S.kickSpot[k],c=S.clips[k];
      if(sp&&c&&c.contact){const ct=c.contact.contact,kt=A.kt||0;w=smooth(ct-0.3,ct-0.05,kt)*(1-smooth(ct,ct+0.05,kt))*Math.min(1,A.kw*1.5);
        vK1.copy(sp);A.root.localToWorld(vK1);vK1.x+=fx*0.1;vK1.z+=fz*0.1;vK1.y=0.11;}}
    else if(p.oAnim==='header'&&p.oT>0.08&&p.oT<0.45){   // a header: the ball meets the forehead at the top of the jump
      w=Math.exp(-Math.pow((p.oT-0.25)/0.08,2));A.bone.Head.getWorldPosition(vK1);vK1.x+=fx*0.15;vK1.z+=fz*0.15;vK1.y+=0.04;}
    else if(A.st.dribble>0.3&&(p.tchU!=null||p.touchPh!=null)){const u=p.tchU!=null?p.tchU:((p.touchPh/(2*Math.PI))%1+1)%1,c=0.5+0.5*Math.cos(2*Math.PI*u);w=Math.pow(c,6)*Math.min(1,(A.st.dribble-0.3)/0.4);   // the game's touches (tchU), else every stride
      A.bone.RightToeBase.getWorldPosition(vK1);vK1.x+=fx*0.13;vK1.z+=fz*0.13;vK1.y=0.11;}
    if(w>1e-3&&Math.hypot(vK1.x-bp.x,vK1.z-bp.z)<1.6&&Math.abs(vK1.y-bp.y)<1.2){bp.x+=(vK1.x-bp.x)*w;bp.z+=(vK1.z-bp.z)*w;bp.y+=(vK1.y-bp.y)*w;}
    S.bw=w;
    // a diving keeper reaches for the ball: both hands drawn to its sides (two-bone IK on each arm) as it comes within
    // 1.6 m of them, fully from 0.6 m
    for(const G of S.actors.values()){const q=G.p;if(!q.isGK||q.state!=='dive')continue;G.holder.updateMatrixWorld(true);
      const B=G.bone;B.LeftHand.getWorldPosition(vK1);B.RightHand.getWorldPosition(vK2);const mx=(vK1.x+vK2.x)/2,my=(vK1.y+vK2.y)/2,mz=(vK1.z+vK2.z)/2;
      const d=Math.hypot(bp.x-mx,bp.y-my,bp.z-mz),wk=1-smooth(0.6,1.6,d);if(wk<1e-3)continue;
      const yw=G.holder.rotation.y,lx=Math.cos(yw)*0.12,lz=-Math.sin(yw)*0.12;
      for(const [sd,sg] of [['Left',1],['Right',-1]]){const h=B[sd+'Hand'].getWorldPosition(new TH.Vector3()),t=new TH.Vector3(bp.x+sg*lx,bp.y,bp.z+sg*lz);
        twoBone(B[sd+'Arm'],B[sd+'ForeArm'],B[sd+'Hand'],h.lerp(t,wk));}}
  }
  // which players get the model
  function targets(players,teams,controlled){
    if(S.mode==='all')return players.slice();
    const T=(teams||[]).find(x=>x&&x.human)||(teams||[])[0];if(!T)return [];
    if(S.mode==='team')return T.players.slice();
    const st=T.players.find(q=>q.label==='ST')||T.players.find(q=>!q.isGK);return st?[st]:[];
  }

  return {
    mm(on){if(on!=null){MM.on=!!on;try{localStorage.setItem('gl-mm',on?'1':'0');}catch(e){}}return {on:MM.on,loaded:!!S.mm,frames:S.mm?S.mm.N:0,error:S.mmError||null};},
    get status(){return {gm:S.mm?{on:MM.on,frames:S.mm.N}:null,clipLean:S.clipLean,mode:S.mode,ready:S.ready,error:S.error,attached:[...S.actors.keys()].map(p=>p.short||p.name),frames:S.frames,msPerFrame:S.frames?+(S.ms/S.frames).toFixed(3):0,msPerAttach:S.attached?+(S.attachMs/S.attached).toFixed(1):0,attachCount:S.attached,detachCount:S.detached,verts:S.tpl&&S.tpl.verts,clips:S.clips?Object.keys(S.clips):null,clipError:S.clipError||null};},
    async init(opt){S.mode=(opt&&opt.mode)||'one';if(opt&&opt.base)S.base=opt.base;
      try{S.tpl=await load(S.base+'models/mh_player.glb');}catch(err){S.error=String(err&&err.message||err);S.ready=false;console.warn('P3D: 3D players off,',S.error);return this.status;}
      // the clips are optional: without them standing and running use the transfer like every other state
      try{S.clips=await loadClips(S.base+'anim/clips.json',S.tpl.names);S.clipLean=clipLean();}catch(err){S.clips=null;S.clipError=String(err&&err.message||err);console.warn('P3D: no motion clips,',S.clipError);}
      // GL-Motion: optional, and only with the clips (it shares their mixer); ?mm=0 / ?mm=1 switches it (remembered)
      try{const q=new URLSearchParams(location.search).get('mm');if(q==='0'||q==='1')localStorage.setItem('gl-mm',q);MM.on=localStorage.getItem('gl-mm')!=='0';MM.full=localStorage.getItem('gl-mm-full')==='1';}catch(e){}
      if(S.clips)try{S.mm=await loadMM(S.base+'anim/mm.json',S.tpl.names);}catch(err){S.mm=null;S.mmError=String(err&&err.message||err);console.warn('P3D: no GL-Motion database,',S.mmError);}
      S.ready=true;
      return this.status;},
    // once per drawn frame, after the game has posed its players
    frame(players,scene,teams,controlled,ballPos){
      S.ballPos=ballPos||null;
      if(!S.ready||S.mode==='off'||!players)return;
      const t0=performance.now();
      if(players!==S.players){for(const A of [...S.actors.values()])detach(A,scene);S.players=players;}   // a new match
      const want=new Set(targets(players,teams,controlled));
      for(const A of [...S.actors.values()])if(!want.has(A.p)||A.rig!==A.p.rig)detach(A,scene);
      // dressing a player takes a few ms (colours, build, numbers): at most ATTACH_MS per frame, the rest on the next
      // frames (they show the game's own model until then)
      for(const p of want)if(p.rig&&!S.actors.has(p)){if(performance.now()-t0>ATTACH_MS)break;const ta=performance.now();attach(p,scene,teams);S.attachMs+=performance.now()-ta;S.attached++;}
      const t1=performance.now(),dt=S.fixedDt!=null?S.fixedDt:S.last?Math.min(0.1,(t1-S.last)/1000):0;S.last=t1;
      for(const A of S.actors.values())drive(A,dt);
      if(ballPos)ballContact(ballPos,dt);
      S.ms+=performance.now()-t1;S.frames++;},
    // for checks: where a player's copy stands against the game rig, and its lowest boot vertex (skinned, world y)
    measure(p){const A=S.actors.get(p);if(!A)return null;A.holder.updateMatrixWorld(true);
      const m=A.mesh,pos=m.geometry.attributes.position,v=new TH.Vector3();let lo=Infinity;
      for(let i=0;i<pos.count;i++){if(S.tpl.region[i]!==3)continue;v.fromBufferAttribute(pos,i);m.boneTransform(i,v);v.applyMatrix4(m.matrixWorld);if(v.y<lo)lo=v.y;}
      const hiddenOk=A.hidden.every(([o])=>o.layers.mask===1<<HIDDEN_LAYER);
      return {holder:A.holder.position.toArray(),rig:A.rig.root.position.toArray(),face:[A.holder.rotation.y,A.rig.root.rotation.y],scale:A.holder.scale.x,
        lowBoot:lo,hiddenMeshes:A.hidden.length,hiddenOk,rigRootVisible:A.rig.root.visible,inScene:!!A.holder.parent,
        ballHold:+(S.bw||0).toFixed(2),transfer:+A.wp.toFixed(3),weights:Object.fromEntries(Object.entries(A.w).map(([k,v])=>[k,+v.toFixed(3)])),phase:+A.ph.toFixed(3),lean:+A.lean.toFixed(3),hipsYaw:+A.hy.toFixed(3),kick:+(A.kw||0).toFixed(2),kickTime:+(A.kt||0).toFixed(3),backwards:A.back,stance:Object.fromEntries(Object.entries(A.st).map(([k,v])=>[k,+v.toFixed(2)])),gameState:A.rig.va,gameSpeed:A.rig.vspd,look:A.look};},
    // for checks: world positions of any of the copy's bones (short names)
    bones(p,list){const A=S.actors.get(p);if(!A)return null;A.holder.updateMatrixWorld(true);const o={};for(const b of list)if(A.bone[b])o[b]=A.bone[b].getWorldPosition(new TH.Vector3()).toArray();return o;},
    // for checks: world positions of the copy's toes and feet (bones), and which of the two toes is lower
    feet(p){const A=S.actors.get(p);if(!A)return null;A.holder.updateMatrixWorld(true);const v=()=>new TH.Vector3(),o={};
      for(const b of ['LeftFoot','RightFoot','LeftToeBase','RightToeBase'])o[b]=A.bone[b].getWorldPosition(v()).toArray();return o;},
    // for checks: the copy's joints as the keypoints of body-pose data from match video (SkillCorner: midHip, hips,
    // knees, ankles, big toes, neck, nose, shoulders, elbows, wrists), world metres, y up. midHip is between the hip
    // joints; nose is 0.1 m in front of the head bone.
    joints(p){const A=S.actors.get(p);if(!A)return null;A.holder.updateMatrixWorld(true);const B=A.bone,w=b=>B[b].getWorldPosition(new TH.Vector3()),o={};
      const M={lHip:'LeftUpLeg',rHip:'RightUpLeg',lKnee:'LeftLeg',rKnee:'RightLeg',lAnkle:'LeftFoot',rAnkle:'RightFoot',lBigToe:'LeftToeBase',rBigToe:'RightToeBase',
        neck:'Neck',lShoulder:'LeftArm',rShoulder:'RightArm',lElbow:'LeftForeArm',rElbow:'RightForeArm',lWrist:'LeftHand',rWrist:'RightHand'};
      for(const [k,b] of Object.entries(M))o[k]=w(b);o.midHip=o.lHip.clone().add(o.rHip).multiplyScalar(0.5);
      const h=w('Head'),q=B.Head.getWorldQuaternion(new TH.Quaternion());o.nose=h.add(new TH.Vector3(0,0,0.1).applyQuaternion(q));
      for(const k in o)o[k]=[+o[k].x.toFixed(3),+o[k].y.toFixed(3),+o[k].z.toFixed(3)];return o;},
    // for checks: a fixed time step per frame (seconds) instead of the wall clock; null goes back to the clock
    clock(dt){S.fixedDt=dt;},
    // for checks: foot lock on (default) or off
    footLock(on){S.footLock=on;},
    setMode(m){S.mode=m;if(m==='off')for(const A of [...S.actors.values()])detach(A);S.players=null;},
  };
})();
