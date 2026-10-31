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
  const HIDDEN_LAYER=1;
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
    const names={};for(const [k,b] of Object.entries(bone))names[k]=b.name;
    // a loose fist: each finger's joints turned about the axis across the hand (index to little finger knuckles), taken
    // square to that finger so that it bends without twisting; the thumb a little
    const curl={},sign=-1;   // -1 bends towards the palm (checked on renders)
    for(const sd of ['Left','Right']){if(!bone[sd+'HandIndex1']||!bone[sd+'HandPinky1'])continue;
      const k=bone[sd+'HandIndex1'].position.clone().sub(bone[sd+'HandPinky1'].position).normalize();if(sd==='Right')k.negate();
      for(const f of ['Index','Middle','Ring','Pinky','Thumb']){const b2=bone[sd+'Hand'+f+'2'];if(!b2)continue;
        const d=b2.position.clone().normalize(),ax=k.clone().sub(d.clone().multiplyScalar(k.dot(d))).normalize().multiplyScalar(sign);
        (f==='Thumb'?[0.25,0.45,0.35]:[0.8,1.05,0.7]).forEach((a,i)=>{const b=sd+'Hand'+f+(i+1);if(bone[b])curl[b]=new TH.Quaternion().setFromAxisAngle(ax,a);});}}
    return {root,mesh,C,region,hipsRest,standY,verts:n,names,curl};
  }
  // motion clips (anim/clips.json, baked by tools/bake_clips.js): optional; without them every state uses the transfer
  async function loadClips(url,names){
    const r=await fetch(url);if(!r.ok||/html/i.test(r.headers.get('content-type')||''))throw new Error(url+': '+r.status);
    const doc=await r.json(),out={};
    for(const [k,c] of Object.entries(doc.clips)){
      const tracks=c.tracks.filter(t=>names[t.bone]).map(t=>t.prop==='quaternion'?new TH.QuaternionKeyframeTrack(names[t.bone]+'.quaternion',t.times,t.values)
        :new TH.VectorKeyframeTrack(names[t.bone]+'.'+t.prop,t.times,t.values));
      out[k]={clip:new TH.AnimationClip(k,c.duration,tracks),dur:c.duration,loop:c.loop,speed:c.speed,foot:c.footPhase%c.duration,contact:c.contact||null};}
    return out;
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
    const A={p,rig:p.rig,holder,root,mesh,bone,hidden,qa:new TH.Quaternion(),e:new TH.Euler(),
      wp:null,ph:0,it:0,w:{idle:1,walk:0,jog:0,run:0},lean:0,yaw:null,hy:0,back:false,tr:null,st:{jockey:0,shield:0,contact:0,side:1},lq:{},lh:new TH.Vector3()};
    for(const b in MAP)A.lq[b]=new TH.Quaternion();A.lq.Spine2=new TH.Quaternion();A.lq.LeftToeBase=new TH.Quaternion();A.lq.RightToeBase=new TH.Quaternion();
    if(S.clips){A.mixer=new TH.AnimationMixer(root);A.act={};
      for(const k of ['idle','walk','jog','run']){if(!S.clips[k])continue;const a=A.mixer.clipAction(S.clips[k].clip);a.setLoop(TH.LoopRepeat,Infinity);a.setEffectiveWeight(0);a.play();A.act[k]=a;}}
    for(const [b,q] of Object.entries(S.tpl.curl))if(bone[b])bone[b].quaternion.copy(q);
    S.actors.set(p,A);drive(A,0);return A;
  }
  function detach(A,scene){
    for(const [o,m] of A.hidden)o.layers.mask=m;
    if(A.holder.parent)A.holder.parent.remove(A.holder);
    A.mesh.geometry.dispose();A.mesh.material.dispose();S.actors.delete(A.p);S.detached++;
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
    A.it=(A.it+dt)%c.idle.dur;
    A.act.idle.time=A.it;A.act.idle.setEffectiveWeight(w.idle);
    for(const [k] of GAITS)if(A.act[k]){A.act[k].time=(c[k].foot+A.ph*c[k].dur)%c[k].dur;A.act[k].setEffectiveWeight(w[k]);}
    A.w=w;A.mixer.update(0);
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
  // Read from the live game (window.__game: the ball's owner, the players' flags); in a replay or on an online guest
  // these are not known and the players just move.
  function stanceOf(A,s){
    const g=window.__game,p=A.p,ball=g&&g.ball,owner=ball&&ball.owner,ps=S.players||[];
    let opp=null,od=1e9;for(const q of ps){if(q.team===p.team||q.sentOff)continue;const d=Math.hypot(q.pos.x-p.pos.x,q.pos.z-p.pos.z);if(d<od){od=d;opp=q;}}
    const toOwner=owner&&owner.team!==p.team?Math.hypot(owner.pos.x-p.pos.x,owner.pos.z-p.pos.z):1e9;
    const jockey=owner!==p&&((p.jockeyT||0)>0||(p.faceBall&&toOwner<4.5&&s<5));
    const shield=owner===p&&(p.shielding||(od<1.6&&s<3));
    const contact=od<1.0&&!!owner&&(owner===p||owner===opp);
    // which side the nearest opponent is on, in his own frame (+1 left, -1 right)
    let side=1;if(opp){const dx=opp.pos.x-p.pos.x,dz=opp.pos.z-p.pos.z,f=p.face;side=(dx*Math.cos(f)-dz*Math.sin(f))>=0?1:-1;}
    return {jockey,shield,contact,side};
  }
  function stance(A,s,dt){
    const st=stanceOf(A,s),k=dt>0?1-Math.exp(-dt*7):1,W=A.st;
    for(const n of ['jockey','shield','contact'])W[n]+=((st[n]?1:0)-W[n])*k;W.side+=(st.side-W.side)*k;
    const bone=A.bone,c=0.45*W.jockey+0.4*W.shield+0.25*W.contact;
    if(c>1e-3){
      // knees bent, thighs forward, feet flat; the hips come down by what the legs lose in height
      for(const sd of ['Left','Right']){qL.setFromAxisAngle(xAxis,-0.8*c);bone[sd+'UpLeg'].quaternion.multiply(qL);
        qL.setFromAxisAngle(xAxis,1.6*c);bone[sd+'Leg'].quaternion.multiply(qL);qL.setFromAxisAngle(xAxis,-0.8*c);bone[sd+'Foot'].quaternion.multiply(qL);}
      bone.Hips.position.y-=0.92*(1-Math.cos(0.8*c));
      qL.setFromAxisAngle(xAxis,0.35*c);bone.Spine.quaternion.multiply(qL);}
    // jockey: side-on (hips turned 0.45 rad, the trunk turned most of the way back to the ball carrier)
    if(W.jockey>1e-3){const y=0.45*W.jockey*(A.p.slot%2?1:-1);qL.setFromAxisAngle(yAxis,y);bone.Hips.quaternion.premultiply(qL);
      qL.setFromAxisAngle(yAxis,-y*0.35);bone.Spine1.quaternion.multiply(qL);qL.setFromAxisAngle(yAxis,-y*0.35);bone.Spine2.quaternion.multiply(qL);}
    // contact: the trunk leans towards him
    const roll=(0.18*W.contact+0.08*W.shield)*W.side;if(Math.abs(roll)>1e-3){qL.setFromAxisAngle(zAxis,-roll);bone.Spine.quaternion.multiply(qL);}
    return W;
  }
  const xAxis=new TH.Vector3(1,0,0);
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
    const s=r.vspd||0,loco=!!S.clips&&(r.va===0||r.va===1),target=loco?0:1;
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
  }
  const I0=new TH.Quaternion();

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
    frame(players,scene,teams,controlled){
      if(!S.ready||S.mode==='off'||!players)return;
      const t0=performance.now();
      if(players!==S.players){for(const A of [...S.actors.values()])detach(A,scene);S.players=players;}   // a new match
      const want=new Set(targets(players,teams,controlled));
      for(const A of [...S.actors.values()])if(!want.has(A.p)||A.rig!==A.p.rig)detach(A,scene);
      for(const p of want)if(p.rig&&!S.actors.has(p)){const ta=performance.now();attach(p,scene,teams);S.attachMs+=performance.now()-ta;S.attached++;}
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
        transfer:+A.wp.toFixed(3),weights:Object.fromEntries(Object.entries(A.w).map(([k,v])=>[k,+v.toFixed(3)])),phase:+A.ph.toFixed(3),lean:+A.lean.toFixed(3),hipsYaw:+A.hy.toFixed(3),backwards:A.back,stance:Object.fromEntries(Object.entries(A.st).map(([k,v])=>[k,+v.toFixed(2)])),gameState:A.rig.va,gameSpeed:A.rig.vspd};},
    // for checks: world positions of any of the copy's bones (short names)
    bones(p,list){const A=S.actors.get(p);if(!A)return null;A.holder.updateMatrixWorld(true);const o={};for(const b of list)if(A.bone[b])o[b]=A.bone[b].getWorldPosition(new TH.Vector3()).toArray();return o;},
    // for checks: world positions of the copy's toes and feet (bones), and which of the two toes is lower
    feet(p){const A=S.actors.get(p);if(!A)return null;A.holder.updateMatrixWorld(true);const v=()=>new TH.Vector3(),o={};
      for(const b of ['LeftFoot','RightFoot','LeftToeBase','RightToeBase'])o[b]=A.bone[b].getWorldPosition(v()).toArray();return o;},
    // for checks: a fixed time step per frame (seconds) instead of the wall clock; null goes back to the clock
    clock(dt){S.fixedDt=dt;},
    setMode(m){S.mode=m;if(m==='off')for(const A of [...S.actors.values()])detach(A);S.players=null;},
  };
})();
