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
  // motion clips (anim/clips.json, baked by tools/bake_clips.js): optional; without them every state uses the transfer
  async function loadClips(url,names){
    const r=await fetch(url);if(!r.ok||/html/i.test(r.headers.get('content-type')||''))throw new Error(url+': '+r.status);
    const doc=await r.json(),out={};
    for(const [k,c] of Object.entries(doc.clips)){
      const tracks=c.tracks.filter(t=>names[t.bone]).map(t=>t.prop==='quaternion'?new TH.QuaternionKeyframeTrack(names[t.bone]+'.quaternion',t.times,t.values)
        :new TH.VectorKeyframeTrack(names[t.bone]+'.'+t.prop,t.times,t.values));
      out[k]={clip:new TH.AnimationClip(k,c.duration,tracks),dur:c.duration,loop:c.loop,speed:c.speed,foot:c.footPhase%c.duration,contact:c.contact||null};
      // the left-foot kick: the right one mirrored (left and right bones swapped, reflected in the body's middle plane)
      if(k==='kick'){const sw=b=>b.startsWith('Left')?'Right'+b.slice(4):b.startsWith('Right')?'Left'+b.slice(5):b;
        const mt=c.tracks.filter(t=>names[sw(t.bone)]).map(t=>{const v=t.values.slice();
          if(t.prop==='quaternion'){for(let i=0;i<v.length;i+=4){v[i+1]=-v[i+1];v[i+2]=-v[i+2];}return new TH.QuaternionKeyframeTrack(names[sw(t.bone)]+'.quaternion',t.times,v);}
          for(let i=0;i<v.length;i+=3)v[i]=-v[i];return new TH.VectorKeyframeTrack(names[sw(t.bone)]+'.'+t.prop,t.times,v);});
        out.kickL={clip:new TH.AnimationClip('kickL',c.duration,mt),dur:c.duration,loop:false,speed:c.speed,foot:0,contact:c.contact||null};}}
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
      for(const k of ['idle','walk','jog','run']){if(!S.clips[k])continue;const a=A.mixer.clipAction(S.clips[k].clip);a.setLoop(TH.LoopRepeat,Infinity);a.setEffectiveWeight(0);a.play();A.act[k]=a;}
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
  // gaits by speed (m/s, the clips' own: walk 1.45, jog 2.8, run 7.0): [name, fade in from, to, fade out from, to]
  // Bands are narrow: the strides differ about twofold between neighbours, and while two gaits blend the standing foot
  // slides (tools/measure_loco.js), so each gait covers a wide range on its own, played faster or slower.
  const GAITS=[['walk',0.25,0.9,1.9,2.3],['jog',1.9,2.3,4.6,5.2],['run',4.6,5.2,1e9,1e9]];
  function locomotion(A,s,dt,back){
    // backwards: the walk and jog played in reverse (no running backwards: the jog takes the rest)
    const c=S.clips,sg=back?Math.min(s,3.4):s,w={idle:1-smooth(0.25,0.9,s)};let sum=0,stride=0;
    for(const [k,a0,a1,b0,b1] of GAITS){const v=c[k]?smooth(a0,a1,sg)*(1-smooth(b0,b1,sg)):0;w[k]=v;sum+=v;}
    // a gait that is missing (no jog clip) leaves its share to its neighbours
    const mv=1-w.idle;if(sum>0)for(const [k] of GAITS)w[k]*=mv/sum;
    for(const [k] of GAITS)if(w[k]>0)stride+=w[k]*c[k].speed*c[k].dur;
    // one gait phase for all: cycles per second so that the blended stride covers the ground at the game's speed
    if(stride>0)A.ph=((A.ph+(back?-1:1)*dt*s*mv/stride)%1+1)%1;   // stride/mv: the moving gaits' stride, their weights taken to 1
    // Dribbling: the game touches the ball once a stride (p.touchPh, its stride from the same gait blend as here), so
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
    for(const k of ['kick','kickL'])if(A.act[k]){const on=k===(A.kside<0?'kickL':'kick')&&wk>0;A.act[k].setEffectiveWeight(on?wk:0);if(on)A.act[k].time=clampN(A.kt,0,c[k].dur-1e-3);}
    A.w=w;A.mixer.update(0);
  }
  // Kicks (game state kick: shots and passes) play the captured kick (CMU 143_24, right foot; mirrored for the left)
  // timed so that the clip's foot strike (contact) falls on the game's strike: visT 0.15 for a shot (the back-swing
  // shows from visT -0.1), the first kick frame for a pass (the game starts those at the strike). In and out over
  // 0.06 / 0.2 s.
  function kick(A,dt){
    const r=A.rig,c=S.clips&&S.clips.kick;if(!c||!c.contact)return;const inKick=r.va===2;
    if(inKick&&!A.kOn){A.kOn=true;A.k0=r.vt;A.kc=r.vt<0.05?0.15:r.vt;A.kside=r.vside<0?-1:1;}
    if(!inKick)A.kOn=false;
    if(A.kOn)A.kt=c.contact.contact+(r.vt-A.kc);else if(A.kw>0)A.kt=(A.kt||0)+dt;
    const tgt=A.kOn?1:0;A.kw=tgt>A.kw?Math.min(1,A.kw+(dt>0?dt/0.06:1)):Math.max(0,A.kw-(dt>0?dt/0.2:1));
  }
  // Arms while standing, walking and running: drawn here from the gait phase instead of the clips (the captured arms and
  // wrists land on this model folded across the chest). Values from gait studies: walking keeps the elbow nearly straight
  // (about 20 deg, moving 15-30 deg) with the shoulder swinging 20-25 deg in all; running holds the elbow near 90 deg
  // (70-120 over the swing), the hands travelling between hip and chest, further and higher with speed; wrists neutral.
  // Each arm swings against the leg of its side (phase 0: left foot down, left leg ahead, right arm ahead). Angles in the
  // game rig's convention (x < 0: arm or forearm forward; z: away from the body), put on the bones like the transfer.
  //            speed  swing  mean   elbow  elbow+fwd  out   across
  const ARMK=[[0,     0,     0.04,  0.20,  0,         0.07, 0],
              [1.4,   0.20,  0.04,  0.35,  0.20,      0.06, 0.02],
              [1.9,   0.24,  0.02,  0.45,  0.25,      0.07, 0.03],
              [2.3,   0.36,  -0.10, 1.25,  0.35,      0.10, 0.08],
              [2.8,   0.42,  -0.12, 1.35,  0.35,      0.10, 0.10],
              [7.0,   0.70,  -0.18, 1.45,  0.45,      0.12, 0.12],
              [8.5,   0.80,  -0.20, 1.45,  0.50,      0.12, 0.12]];
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
      if(W.dribble>1e-3)z+=sx*0.15*W.dribble;   // dribbling: arms a little out for balance
      // kicking: the arm across from the kicking leg swings out and forward for balance, the other back and in
      const wk=A.kw||0;if(wk>1e-3){const across=(A.kside<0)===(sx<0);   // the right arm when the left foot kicks
        if(across){x+=(-0.35-x)*wk;z+=(sx*0.95-z)*wk;e+=(0.45-e)*wk;}else{x+=(0.25-x)*wk;z+=(sx*0.25-z)*wk;e+=(0.7-e)*wk;}}
      if(wj>1e-3){x+=(-0.25-x)*wj*0.6;z+=(sx*0.5-z)*wj;e+=(0.75-e)*wj;}
      if(ws>1e-3){if(near){x+=(-0.15-x)*ws;z+=(sx*1.0-z)*ws;e+=(0.35-e)*ws;}else{z+=(sx*0.35-z)*ws;e+=(0.9-e)*ws;}}
      if(wc>1e-3&&near){z+=(sx*0.05-z)*wc;e+=(1.2-e)*wc;}
      setArmBone(A,sd+'Shoulder',x*0.06,0,0);
      // the upper arm turns in as the elbow bends, so that a bent arm swings the hand towards the middle, not out to the side
      setArmBone(A,sd+'Arm',x,-sx*0.35*Math.min(1,e/1.4),z);
      setArmBone(A,sd+'ForeArm',-e,0,0);
      setArmBone(A,sd+'Hand',-0.05,0,0);}
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
    let owner=null;if(bp&&bp.y<0.6){let bd=1.0;for(const q of ps){if(q.sentOff||!q.rig)continue;const r=q.rig.root.position,d=Math.hypot(r.x-bp.x,r.z-bp.z);if(d<bd){bd=d;owner=q;}}}
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
    const bone=A.bone,c=0.45*W.jockey+0.4*W.shield+0.25*W.contact+0.3*W.brake;
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
    if(va===6){const c=0.19*w;
      for(const sd of ['Left','Right']){qL.setFromAxisAngle(xAxis,-0.8*c);bone[sd+'UpLeg'].quaternion.multiply(qL);
        qL.setFromAxisAngle(xAxis,1.6*c);bone[sd+'Leg'].quaternion.multiply(qL);qL.setFromAxisAngle(xAxis,-0.8*c);bone[sd+'Foot'].quaternion.multiply(qL);}
      bone.Hips.position.y-=0.92*(1-Math.cos(0.8*c));qL.setFromAxisAngle(xAxis,0.1*w);bone.Spine.quaternion.multiply(qL);}
    if(va===10||va===17){const dur=va===10?0.5:0.62,q=clampN(t/dur,0,1);
      for(const [sd,sx] of [['Left',1],['Right',-1]]){let x,z,e;
        if(q<0.5){const u=q/0.5;x=-0.4-1.3*u;z=sx*(0.25+0.15*u);e=1.1;}else{const v=(q-0.5)/0.5;x=-1.7+(va===10?1.2:1.3)*v;z=sx*(0.4+(va===10?0.4:0.1)*v);e=1.1-0.5*v;}
        blendArm(A,sd,x,z,e,w);}}
    if(va===13||va===11){const dur=va===13?0.34:0.3,q=clampN(t/dur,0,1),e2=Math.sin(Math.min(1,q)*Math.PI*0.5)*w;
      qL.setFromAxisAngle(xAxis,0.18*e2);bone.Spine.quaternion.multiply(qL);
      // stackle tackles with the right leg, tackle pokes with the left: the opposite arm out
      const sd=va===13?'Left':'Right',sx=va===13?1:-1;blendArm(A,sd,-0.3,sx*1.0,0.4,e2);}
  }
  // an arm towards given game-convention angles by weight w, from what the bones hold now
  function blendArm(A,sd,x,z,e,w){const b=A.bone,keep=[b[sd+'Arm'].quaternion.clone(),b[sd+'ForeArm'].quaternion.clone()];
    setArmBone(A,sd+'Arm',x,-(sd==='Left'?1:-1)*0.35*Math.min(1,e/1.4),z);setArmBone(A,sd+'ForeArm',-e,0,0);
    if(w<1){b[sd+'Arm'].quaternion.copy(keep[0].slerp(b[sd+'Arm'].quaternion,w));b[sd+'ForeArm'].quaternion.copy(keep[1].slerp(b[sd+'ForeArm'].quaternion,w));}}
  const BLEND=0.12;   // seconds to go between the clips and the transferred pose
  const qT=new TH.Quaternion(),qL=new TH.Quaternion(),zAxis=new TH.Vector3(0,0,1),yAxis=new TH.Vector3(0,1,0);
  // how the trunk turns back from the hips to the facing, from the bottom up (the head ends about square to the facing)
  const TWIST=[['Spine',0.3],['Spine1',0.3],['Spine2',0.25],['Neck',0.1]];
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
    // facing by at most 50 deg, as players do moving across the pitch while watching the ball; past 115 deg (back under
    // 100) he backs off instead: hips to the facing, the gait in reverse
    const wrap=x=>Math.atan2(Math.sin(x),Math.cos(x)),rel=vm>0.3&&s>0.3?wrap(travel-yaw):0;
    A.back=s<5&&(A.back?Math.abs(rel)>1.75:Math.abs(rel)>2.0);
    const hyT=loco?(A.back?clampN(wrap(rel-Math.PI),-0.9,0.9):clampN(rel,-1.6,1.6)):0;A.hy+=(hyT-A.hy)*kf;
    // lean into turns: how fast the path bends, times speed
    let rate=0;if(A.tr!=null&&dt>0&&vm>0.3)rate=wrap(travel-A.tr)/dt;A.tr=vm>0.3?travel:null;A.yaw=yaw;
    const leanT=loco?clampN(-rate*s*0.035,-0.3,0.3):0;A.lean+=(leanT-A.lean)*(dt>0?1-Math.exp(-dt*10):1);
    kick(A,dt);
    if(A.wp<1){locomotion(A,s,dt,A.back);arms(A,s,(A.T=(A.T||0)+dt));   // arms read A.st as last updated by stance()
      if(Math.abs(A.lean)>1e-4){qL.setFromAxisAngle(zAxis,A.lean);bone.Hips.quaternion.premultiply(qL);}
      if(Math.abs(A.hy)>1e-3){qL.setFromAxisAngle(yAxis,A.hy);bone.Hips.quaternion.premultiply(qL);
        // the clip's hips sway (its in-place leftover) turns with the hips, or the feet would slide along the old line
        const hp=bone.Hips.position,hr=t.hipsRest,dx=hp.x-hr.x,dz=hp.z-hr.z,cs=Math.cos(A.hy),sn=Math.sin(A.hy);hp.x=hr.x+dx*cs+dz*sn;hp.z=hr.z-dx*sn+dz*cs;
        const tw=clampN(A.hy*0.95,-0.87,0.87);for(const [b,f] of TWIST){qL.setFromAxisAngle(yAxis,-tw*f/0.95);bone[b].quaternion.multiply(qL);}}
      stance(A,s,dt);
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

  // which players get the model
  function targets(players,teams,controlled){
    if(S.mode==='all')return players.slice();
    const T=(teams||[]).find(x=>x&&x.human)||(teams||[])[0];if(!T)return [];
    if(S.mode==='team')return T.players.slice();
    const st=T.players.find(q=>q.label==='ST')||T.players.find(q=>!q.isGK);return st?[st]:[];
  }

  return {
    get status(){return {mode:S.mode,ready:S.ready,error:S.error,attached:[...S.actors.keys()].map(p=>p.short||p.name),frames:S.frames,msPerFrame:S.frames?+(S.ms/S.frames).toFixed(3):0,msPerAttach:S.attached?+(S.attachMs/S.attached).toFixed(1):0,attachCount:S.attached,detachCount:S.detached,verts:S.tpl&&S.tpl.verts,clips:S.clips?Object.keys(S.clips):null,clipError:S.clipError||null};},
    async init(opt){S.mode=(opt&&opt.mode)||'one';if(opt&&opt.base)S.base=opt.base;
      try{S.tpl=await load(S.base+'models/mh_player.glb');}catch(err){S.error=String(err&&err.message||err);S.ready=false;console.warn('P3D: 3D players off,',S.error);return this.status;}
      // the clips are optional: without them standing and running use the transfer like every other state
      try{S.clips=await loadClips(S.base+'anim/clips.json',S.tpl.names);}catch(err){S.clips=null;S.clipError=String(err&&err.message||err);console.warn('P3D: no motion clips,',S.clipError);}
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
      S.ms+=performance.now()-t1;S.frames++;},
    // for checks: where a player's copy stands against the game rig, and its lowest boot vertex (skinned, world y)
    measure(p){const A=S.actors.get(p);if(!A)return null;A.holder.updateMatrixWorld(true);
      const m=A.mesh,pos=m.geometry.attributes.position,v=new TH.Vector3();let lo=Infinity;
      for(let i=0;i<pos.count;i++){if(S.tpl.region[i]!==3)continue;v.fromBufferAttribute(pos,i);m.boneTransform(i,v);v.applyMatrix4(m.matrixWorld);if(v.y<lo)lo=v.y;}
      const hiddenOk=A.hidden.every(([o])=>o.layers.mask===1<<HIDDEN_LAYER);
      return {holder:A.holder.position.toArray(),rig:A.rig.root.position.toArray(),face:[A.holder.rotation.y,A.rig.root.rotation.y],scale:A.holder.scale.x,
        lowBoot:lo,hiddenMeshes:A.hidden.length,hiddenOk,rigRootVisible:A.rig.root.visible,inScene:!!A.holder.parent,
        transfer:+A.wp.toFixed(3),weights:Object.fromEntries(Object.entries(A.w).map(([k,v])=>[k,+v.toFixed(3)])),phase:+A.ph.toFixed(3),lean:+A.lean.toFixed(3),hipsYaw:+A.hy.toFixed(3),kick:+(A.kw||0).toFixed(2),kickTime:+(A.kt||0).toFixed(3),backwards:A.back,stance:Object.fromEntries(Object.entries(A.st).map(([k,v])=>[k,+v.toFixed(2)])),gameState:A.rig.va,gameSpeed:A.rig.vspd,look:A.look};},
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
