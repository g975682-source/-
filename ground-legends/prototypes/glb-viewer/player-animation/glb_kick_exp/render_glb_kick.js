// The game's procedural kick put on the GLB player (out/mh_player.glb), for two copies of index.html (A as it is, D the
// toe-term candidate). Read only: the copies are loaded in memory with test access injected (as
// ../measure_kick_ground.js), the game's own rig is built off screen and driven with applyVisual frame by frame (60 fps,
// rigLife easing included), and its joint rotations, as the game would draw them, are copied onto the GLB bones.
//   node render_glb_kick.js <A.html> <D.html> <out folder>
//
// Joint map (game rig -> GLB, Mixamo names): hips->Hips (rotation, and height as hipN/0.95 of the standing height),
// torso->Spine, chest->Spine1, neck->Neck, head->Head, shL/R->Left/RightShoulder, armL/R->Arm, elbowL/R->ForeArm,
// wristL/R->Hand, legL/R->UpLeg, kneeL/R->Leg, ankleL/R->Foot; Spine2 and ToeBase stay at rest. Both rigs have no
// rotation at rest, face +z, y up, left on +x; their rest shapes differ (the GLB stands with the legs a little apart and
// the arms in an A pose, the game rig straight down), so each limb bone gets a fixed rest correction c that turns its
// GLB direction onto the game's straight-down one, and a bone's local rotation is c(parent)^-1 * R(game) * c(self). Down
// a chain this gives R1*R2*...*Rn*c(n): the game's rotations, on the game's rest directions. The foot keeps the GLB's
// own rest shape (c = identity), so the ankle angle acts on the GLB foot as it is.
// Standing height: the GLB hips are set so that the game's idle pose (raw) puts the lowest foot vertex on y = 0.
//
// Measured per frame (skinned vertices, SkinnedMesh.boneTransform): lowest vertex of the vertices whose strongest bone
// is the Foot or ToeBase of each side. Pictures: three cameras on the kicking leg's side, as ../toe_visual_exp/.
// Writes <out>/frames/*.png, <out>/frames.json, <out>/glb_measure.json.
const path=require('path'),fs=require('fs');
const P=require(path.join(__dirname,'..','..','..','..','tests','legacy','paths.js'));
const {chromium}=require(P.PLAYWRIGHT);
const three=fs.readFileSync(P.THREE_JS,'utf8'),gltfLoader=fs.readFileSync(path.join(__dirname,'..','..','vendor','GLTFLoader.js'),'utf8');
const glb=fs.readFileSync(path.join(__dirname,'..','out','mh_player.glb'));
const [fa,fd,outDir]=process.argv.slice(2);
if(!outDir){console.error('usage: node render_glb_kick.js <A.html> <D.html> <out folder>');process.exit(2);}
const FR=path.join(outDir,'frames');fs.mkdirSync(FR,{recursive:true});
const INJECT=`window.__kg={A,applyVisual,buildRig,teamMats,TEAMS,ball,setClock(g,v){gtime=g;visDt=v;}};\n`;
const htmlOf=src=>{const k=src.indexOf('window.__game={');if(k<0)throw new Error('anchor');return '<!doctype html><html><head><meta charset="utf-8"></head><body>'+src.slice(0,k)+INJECT+src.slice(k)+'</body></html>';};

async function setup(){window.__freeze=true;
  const D=window.__kg,TH=window.THREE,W=360,H=360;
  const ren=new TH.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});ren.setSize(W,H);ren.setPixelRatio(1);ren.setClearColor(0xbcd3e8);
  ren.outputEncoding=TH.sRGBEncoding;
  const scene=new TH.Scene();scene.add(new TH.HemisphereLight(0xffffff,0x40553a,1.0));const sun=new TH.DirectionalLight(0xffffff,0.9);sun.position.set(-3,5,2);scene.add(sun);
  const grass=new TH.Mesh(new TH.PlaneGeometry(30,30),new TH.MeshLambertMaterial({color:0x4f9a4a}));grass.rotation.x=-Math.PI/2;scene.add(grass);
  const grid=new TH.GridHelper(3,30,0x2f6a2c,0x3f7f3b);grid.position.y=0.001;scene.add(grid);
  const ballMat=new TH.MeshLambertMaterial({color:0xffffff,transparent:true,opacity:1});
  const ballM=new TH.Mesh(new TH.SphereGeometry(0.11,24,16),ballMat);ballM.position.set(0,0.11,0.5);scene.add(ballM);
  const buf=await (await fetch('http://game.local/mh_player.glb')).arrayBuffer();
  const gltf=await new Promise((res,rej)=>new TH.GLTFLoader().parse(buf,'',res,rej));
  const model=gltf.scene;scene.add(model);
  const bone={};let mesh=null;model.traverse(o=>{if(o.isBone)bone[o.name.replace('mixamorig','')]=o;if(o.isSkinnedMesh){mesh=o;o.frustumCulled=false;}});
  model.updateMatrixWorld(true);
  const restP={};for(const [n,b] of Object.entries(bone))restP[n]=b.position.clone();
  const DOWN=new TH.Vector3(0,-1,0);
  const corr=(from,to)=>new TH.Quaternion().setFromUnitVectors(bone[to].position.clone().normalize(),DOWN);   // child's rest offset -> down
  const C={};for(const s of ['Left','Right']){
    C[s+'UpLeg']=corr(s+'UpLeg',s+'Leg');C[s+'Leg']=corr(s+'Leg',s+'Foot');C[s+'Foot']=new TH.Quaternion();
    C[s+'Arm']=corr(s+'Arm',s+'ForeArm');C[s+'ForeArm']=corr(s+'ForeArm',s+'Hand');C[s+'Hand']=C[s+'ForeArm'].clone();}
  const MAP={Hips:'hips',Spine:'torso',Spine1:'chest',Neck:'neck',Head:'head',LeftShoulder:'shL',RightShoulder:'shR',LeftArm:'armL',RightArm:'armR',
    LeftForeArm:'elbowL',RightForeArm:'elbowR',LeftHand:'wristL',RightHand:'wristR',LeftUpLeg:'legL',RightUpLeg:'legR',LeftLeg:'kneeL',RightLeg:'kneeR',LeftFoot:'ankleL',RightFoot:'ankleR'};
  const PARENT={LeftForeArm:'LeftArm',RightForeArm:'RightArm',LeftHand:'LeftForeArm',RightHand:'RightForeArm',LeftLeg:'LeftUpLeg',RightLeg:'RightUpLeg',LeftFoot:'LeftLeg',RightFoot:'RightLeg',
    LeftToeBase:'LeftFoot',RightToeBase:'RightFoot'};
  const I=new TH.Quaternion();
  // vertices whose strongest bone is a foot or toe, per side
  const si=mesh.geometry.attributes.skinIndex,sw=mesh.geometry.attributes.skinWeight,bones=mesh.skeleton.bones,feet={Left:[],Right:[]};
  const comp=(a,k,c)=>c===0?a.getX(k):c===1?a.getY(k):c===2?a.getZ(k):a.getW(k);
  for(let k=0;k<si.count;k++){let best=-1,bw=-1;for(let c=0;c<4;c++){const w=comp(sw,k,c);if(w>bw){bw=w;best=comp(si,k,c);}}
    const n=bones[best].name.replace('mixamorig','');if(/^(Left|Right)(Foot|ToeBase)$/.test(n))feet[n.startsWith('Left')?'Left':'Right'].push(k);}
  const mats=D.teamMats(D.TEAMS[0].home,D.TEAMS[0].gk),holder=new TH.Group();
  const pd={name:'Base Striker',short:'BS',label:'ST',num:9,st:{phy:70,pac:82},skin:'#e0ac85',hair:'#2b1d14',hs:0,boot:'#ffd200',h:1.0};
  D.ball.pos.set(0,0.11,0.5);
  window.__gk={D,TH,ren,scene,ballMat,model,bone,mesh,restP,C,MAP,PARENT,I,feet,mats,holder,pd,hipsY0:restP.Hips.y};
  // standing height from the game's idle pose
  const r=D.buildRig(mats,pd,false,{parent:holder}),p={team:0,isOfficial:false,stamina:70,rig:r};
  D.setClock(12,0.25);D.applyVisual(p,0,0,0,0,D.A.idle,12,0.3,0,0);window.__gkCopy(r);
  const lo=window.__gkLow();window.__gk.hipsY0=restP.Hips.y-Math.min(lo.Left,lo.Right);holder.remove(r.root);
  return {footVerts:{Left:feet.Left.length,Right:feet.Right.length},restHips:restP.Hips.y,hipsY0:window.__gk.hipsY0,idleLowBefore:lo};}

function copyPose(r){const G=window.__gk,{TH,bone,C,MAP,PARENT,I}=G;
  for(const [b,j] of Object.entries(MAP)){const o=r[j].rotation,qg=new TH.Quaternion().setFromEuler(new TH.Euler(o.x,o.y,o.z,o.order));
    const cp=C[PARENT[b]]||I,cs=C[b]||I;bone[b].quaternion.copy(cp.clone().invert().multiply(qg).multiply(cs));}
  for(const t of ['LeftToeBase','RightToeBase'])bone[t].quaternion.copy(C[PARENT[t]].clone().invert());
  bone.Hips.position.set(G.restP.Hips.x,G.hipsY0*(r.hips.position.y/(r.hipK||1))/0.95,G.restP.Hips.z);
  G.model.updateMatrixWorld(true);}
function lowFeet(){const G=window.__gk,{TH,mesh,feet}=G,v=new TH.Vector3(),out={};
  for(const s of ['Left','Right']){let lo=Infinity,at=null;for(const k of feet[s]){v.fromBufferAttribute(mesh.geometry.attributes.position,k);mesh.boneTransform(k,v);v.applyMatrix4(mesh.matrixWorld);if(v.y<lo){lo=v.y;at=v.toArray();}}
    out[s]=lo;out[s+'At']=at.map(x=>+x.toFixed(4));}
  return out;}

function runSide(side,KEY){
  const G=window.__gk,{D,TH,ren,scene,ballMat,holder,mats,pd}=G;
  const r=D.buildRig(mats,pd,false,{parent:holder}),p={team:0,isOfficial:false,stamina:70,rig:r};
  const sx=side<0?1:-1;
  const CAM={side:{pos:[sx*3.6,1.0,0.15],look:[0,0.78,0.15],fov:38},front34:{pos:[sx*2.3,1.1,2.6],look:[0,0.7,0.2],fov:40},foot:{pos:[sx*1.9,0.32,0.35],look:[0,0.2,0.05],fov:46}};
  const cams={};for(const [k,c] of Object.entries(CAM)){const cam=new TH.PerspectiveCamera(c.fov,1,0.02,50);cam.position.set(...c.pos);cam.lookAt(new TH.Vector3(...c.look));cams[k]=cam;}
  const kickT=[];for(let i=1;i<=14;i++)kickT.push(-0.1+i/60);for(let i=1;i<=18;i++)kickT.push(0.15+i/60);
  const seq=[];for(let i=0;i<12;i++)seq.push(['idle before',null]);for(const t of kickT)seq.push(['kick',t]);for(let i=0;i<12;i++)seq.push(['idle after',null]);
  const kick=side<0?'Left':'Right',plant=side<0?'Right':'Left';
  let g=12;const out=[];
  seq.forEach(([label,t],i)=>{g+=1/60;D.setClock(g,1/60);D.applyVisual(p,0,0,0,0,label==='kick'?D.A.kick:D.A.idle,label==='kick'?t:g,0.3,0,side);r.root.updateMatrixWorld(true);
    window.__gkCopy(r);const lo=window.__gkLow();
    ballMat.opacity=(label==='idle after'||(label==='kick'&&t>0.15))?0.25:1;
    const isKey=label==='kick'&&KEY.some(k=>Math.abs(k-t)<1e-3);
    const row={i,label,t:t==null?null:+t.toFixed(4),kickLow:+lo[kick].toFixed(4),kickLowAt:lo[kick+'At'],plantLow:+lo[plant].toFixed(4),
      kickAnkle:+r['ankle'+(side<0?'L':'R')].rotation.x.toFixed(4),img:{}};
    ren.render(scene,cams.side);row.img.side_all=ren.domElement.toDataURL('image/png');
    if(isKey)for(const v of ['side','front34','foot']){ren.render(scene,cams[v]);row.img[v]=ren.domElement.toDataURL('image/png');}
    out.push(row);});
  holder.remove(r.root);return out;}

async function renderBuild(browser,file,tag){
  const html=htmlOf(fs.readFileSync(file,'utf8'));const page=await browser.newPage({viewport:{width:400,height:400}});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{try{localStorage.setItem('gl-tut-v1','1');}catch(e){}});
  await page.route('**/*',r=>{const u=r.request().url();
    if(u==='http://game.local/mh_player.glb')return r.fulfill({body:glb,contentType:'model/gltf-binary'});
    if(u.startsWith('http://game.local'))return r.fulfill({body:html,contentType:'text/html'});
    if(u.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'});return r.abort();});
  await page.goto('http://game.local/');await page.waitForFunction(()=>window.__kg&&window.__game);
  await page.addScriptTag({content:gltfLoader});
  await page.evaluate('window.__gkCopy='+copyPose.toString()+';window.__gkLow='+lowFeet.toString()+';window.runSide='+runSide.toString());
  const info=await page.evaluate(setup);
  const KEY=[0,0.1,0.1333,0.1667,0.2,0.2333,0.25,0.2667,0.2833,0.3,0.4];
  const index={all:{},key:{}},meas={};
  for(const side of [0,-1]){const rows=await page.evaluate(([s,K])=>runSide(s,K),[side,KEY]);index.all[side]=[];index.key[side]=[];meas[side]=[];
    for(const r of rows){const f=`${tag}_s${side}_side_all_${String(r.i).padStart(3,'0')}.png`;fs.writeFileSync(path.join(FR,f),Buffer.from(r.img.side_all.split(',')[1],'base64'));
      index.all[side].push({i:r.i,label:r.label,t:r.t,file:f});
      if(r.img.side){const e={i:r.i,label:r.label,t:r.t,files:{}};for(const v of ['side','front34','foot']){const fk=`${tag}_s${side}_${v}_key_${r.t.toFixed(4)}.png`;fs.writeFileSync(path.join(FR,fk),Buffer.from(r.img[v].split(',')[1],'base64'));e.files[v]=fk;}index.key[side].push(e);}
      meas[side].push({i:r.i,label:r.label,t:r.t,kickLow:r.kickLow,kickLowAt:r.kickLowAt,plantLow:r.plantLow,kickAnkle:r.kickAnkle});}}
  await page.close();return {file:path.relative(process.cwd(),file),errors,info,index,meas};}

(async()=>{const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const out={A:await renderBuild(browser,fa,'A'),D:await renderBuild(browser,fd,'D')};
  const again=await renderBuild(browser,fd,'Drepeat');await browser.close();
  const repeatIdentical=JSON.stringify(again.meas)===JSON.stringify(out.D.meas);
  for(const f of fs.readdirSync(FR))if(f.startsWith('Drepeat_'))fs.unlinkSync(path.join(FR,f));
  fs.writeFileSync(path.join(outDir,'frames.json'),JSON.stringify({A:{file:out.A.file,index:out.A.index},D:{file:out.D.file,index:out.D.index}},null,1));
  fs.writeFileSync(path.join(outDir,'glb_measure.json'),JSON.stringify({ground:'y = 0',model:'out/mh_player.glb',repeatIdentical,A:{file:out.A.file,errors:out.A.errors,info:out.A.info,meas:out.A.meas},D:{file:out.D.file,errors:out.D.errors,info:out.D.info,meas:out.D.meas}},null,1));
  for(const k of ['A','D'])console.log(k,out[k].file,'page errors',out[k].errors.length,JSON.stringify(out[k].info));
  console.log('D drawn twice, identical measurements:',repeatIdentical);
})();
