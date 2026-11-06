// GL-Motion database: bakes engine3d/anim/mm.json, the motion-matching database the engine (player3d.js) searches to
// pick each player's next stretch of captured movement, as EA's FIFA / FC games do for locomotion (motion matching:
// Clavet, GDC 2016; EA, GDC 2021 "Environmental and Motion Matched Interactions; Madden, FIFA and beyond").
// Development tool only: the game never runs this; it reads the JSON.
//   [MM_EXTRA=<folder with S100_*.bvh>] node ground-legends/engine3d/tools/bake_mm.js
// Takes (CMU Graphics Lab motion capture, cgspeed BVH conversion; prototypes/glb-viewer/player-animation/assets/cmu):
// walking, jogging and running with 90-degree turns (subject 16: 16_17, 16_19, 16_41-43, 16_51-53), jogging (16_35),
// walking (35_01), running (127_08), starts and stops (143_01, 143_02, 143_03); with MM_EXTRA, the 100STYLE takes below
// (else CMU's walking forwards, backwards and sideways, 09_12, 41_02, 143_40). Each is retargeted onto models/mh_player.glb with the
// prototype's own code (lab.js makeClip, retarget.js) and sampled 30 times a second.
// Per frame: every bone's rotation (the hips' turned into the frame's root, i.e. without the root's heading) and the
// hips' position relative to the root; the root is the hips' path and heading smoothed over +-0.23 s. Features, in the
// root's frame: where the root is and which way it faces 0.2, 0.4 and 0.6 s on (12), both feet's positions and
// velocities (12), the root's velocity (2). Frames with less than 0.6 s of their take left are not matched (valid 0).
const path=require('path'),fs=require('fs');
const GL=path.join(__dirname,'..','..'),PA=path.join(GL,'prototypes','glb-viewer');
const P=require(path.join(GL,'tests','legacy','paths.js'));
const {chromium}=require(P.PLAYWRIGHT);
const three=fs.readFileSync(P.THREE_JS,'utf8'),model=fs.readFileSync(path.join(GL,'engine3d','models','mh_player.glb'));
const OUT=path.join(GL,'engine3d','anim','mm.json');
// [take, from s, to s]; S100_*: the 100STYLE dataset's Neutral style (Ian Mason, Sebastian Starke, Taku Komura, 2022;
// CC BY 4.0; Xsens, 60 fps): forward walk and run, backward walk and run, sidestep walk and run, idle, transitions.
// Fetched by tools/fetch_100style.sh into a folder given as MM_EXTRA (not kept in the repository), joints renamed to
// the CMU names retarget.js knows. Without MM_EXTRA only the CMU takes are used.
const EXTRA=process.env.MM_EXTRA||'';
const TAKES=[['16_17'],['16_19'],['16_41'],['16_42'],['16_43'],['16_51'],['16_52'],['16_53'],['143_01'],['143_02'],['143_03'],['127_08'],['16_35'],['35_01']]
  .concat(EXTRA?[['S100_FW',10,40],['S100_FR',5,35],['S100_BW',10,35],['S100_BR',5,30],['S100_SW',10,35],['S100_SR',5,30],['S100_ID',2,17],['S100_TR1',0,60]]:[['09_12'],['41_02'],['143_40']]);
const FPS=30,H=[6,12,18];
(async()=>{
  const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>{const u=r.request().url();
    if(u.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'});
    if(u==='http://viewer.local/engine_model.glb')return r.fulfill({body:model,contentType:'model/gltf-binary'});
    if(EXTRA&&u.startsWith('http://viewer.local/extra/')){const f=path.join(EXTRA,path.basename(decodeURIComponent(u.split('?')[0])));
      if(fs.existsSync(f))return r.fulfill({body:fs.readFileSync(f),contentType:'text/plain'});return r.fulfill({status:404,body:'not found'});}
    if(u.startsWith('http://viewer.local/')){const f=path.join(PA,decodeURIComponent(u.slice(20).split('?')[0]));
      if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.html')?'text/html':'text/plain'});
      return r.fulfill({status:404,body:'not found'});}
    return r.abort();});
  await page.goto('http://viewer.local/player-animation/index.html?autoload=0');
  await page.waitForFunction(()=>window.PALab&&window.GLRetarget);
  const raw=await page.evaluate(async([TAKES,FPS])=>{
    const L=PALab,M=await L.loadModel('http://viewer.local/engine_model.glb'),base='http://viewer.local/player-animation/assets/cmu/';
    const bones=M.bones,names=bones.map(b=>b.name.replace(/^mixamorig:?/,'')),hips=M.by.Hips,fl=M.by.LeftFoot,fr=M.by.RightFoot,V=()=>new THREE.Vector3(),Q=()=>new THREE.Quaternion();
    const pq=Q();hips.parent.getWorldQuaternion(pq);const ps=V();hips.parent.getWorldScale(ps);
    const takes=[];
    for(const [take,a,b] of TAKES){const bv=await L.loadTake((take.startsWith('S100_')?'http://viewer.local/extra/':base)+take+'.bvh'),dur=bv.clip.duration;
      const c=L.makeClip(M,bv,{name:take,from:a!=null?a:0.05,to:b!=null?Math.min(b,dur-0.05):dur-0.05,pad:0});
      const T=[];for(let t=0;t<=c.duration+1e-6;t+=1/FPS)T.push(t);
      const fr2=L.sampleClip(M,c,T,t=>{const pa=L.pathAt(c,t),hw=V(),hq=Q(),a=V(),b=V();hips.getWorldPosition(hw);hips.getWorldQuaternion(hq);fl.getWorldPosition(a);fr.getWorldPosition(b);
        const f=V().set(0,0,1).applyQuaternion(hq);
        return {h:[hw.x+pa[0],hw.y,hw.z+pa[1]],y:Math.atan2(f.x,f.z),fl:[a.x+pa[0],a.y,a.z+pa[1]],fr:[b.x+pa[0],b.y,b.z+pa[1]],
          q:bones.map(o=>[o.quaternion.x,o.quaternion.y,o.quaternion.z,o.quaternion.w]),hp:[hips.position.x,hips.position.y,hips.position.z]};});
      takes.push({take,frames:fr2});}
    return {names,parentQ:[pq.x,pq.y,pq.z,pq.w],parentS:[ps.x,ps.y,ps.z],takes};},[TAKES,FPS]);
  await browser.close();
  if(errors.length)console.log('page errors:',errors);
  // ---- root, local pose and features
  const nb=raw.names.length,hi=raw.names.indexOf('Hips'),PS=raw.parentS[0];
  const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
  const Qs=[],HP=[],F=[],valid=[],take=[],speed=[];const ranges=[];
  for(const tk of raw.takes){const fr=tk.frames,n=fr.length,K=7;
    // root: the hips' path and heading, smoothed (the heading as a mean of unit vectors)
    const rx=[],rz=[],ry=[];
    for(let i=0;i<n;i++){let x=0,z=0,sx=0,cz=0,c=0;for(let j=Math.max(0,i-K);j<=Math.min(n-1,i+K);j++){x+=fr[j].h[0];z+=fr[j].h[2];sx+=Math.sin(fr[j].y);cz+=Math.cos(fr[j].y);c++;}
      rx.push(x/c);rz.push(z/c);ry.push(Math.atan2(sx,cz));}
    const loc=(i,x,z)=>{const dx=x-rx[i],dz=z-rz[i],c=Math.cos(-ry[i]),s=Math.sin(-ry[i]);return [dx*c+dz*s,-dx*s+dz*c];};   // into root i's frame (x right-handed: rotate by -yaw about y)
    const start=Qs.length;
    for(let i=0;i<n;i++){const f=fr[i];
      // pose: the hips' rotation without the root's heading (the hips' parent has no rotation in this model)
      const q=f.q.map(a=>a.slice()),y=ry[i],hq=q[hi],cy=Math.cos(-y/2),sy=Math.sin(-y/2);   // Ry(-y) * hq
      const [x,yy,z,w]=hq;q[hi]=[cy*x+sy*z,cy*yy+sy*w,cy*z-sy*x,cy*w-sy*yy];
      Qs.push(q);
      const [lx,lz]=loc(i,f.h[0],f.h[2]);HP.push([lx/PS,f.hp[1],lz/PS]);
      // features
      const ft=[];let ok=i+H[2]<n&&i>0;
      for(const h of H){const j=Math.min(n-1,i+h),[px,pz]=loc(i,rx[j],rz[j]);ft.push(px,pz);}
      for(const h of H){const j=Math.min(n-1,i+h),d=wrap(ry[j]-ry[i]);ft.push(Math.sin(d),Math.cos(d));}
      const j0=Math.max(0,i-1),j1=Math.min(n-1,i+1),dt=(j1-j0)/FPS;
      for(const k of ['fl','fr']){const p=f[k],[px,pz]=loc(i,p[0],p[2]);ft.push(px,p[1],pz);}
      for(const k of ['fl','fr']){const a=fr[j0][k],b=fr[j1][k],vx=(b[0]-a[0])/dt,vy=(b[1]-a[1])/dt,vz=(b[2]-a[2])/dt,c=Math.cos(-ry[i]),s=Math.sin(-ry[i]);ft.push(vx*c+vz*s,vy,-vx*s+vz*c);}
      {const vx=(rx[j1]-rx[j0])/dt,vz=(rz[j1]-rz[j0])/dt,c=Math.cos(-ry[i]),s=Math.sin(-ry[i]);ft.push(vx*c+vz*s,-vx*s+vz*c);speed.push(Math.hypot(vx,vz));}
      F.push(ft);valid.push(ok?1:0);take.push(ranges.length);}
    ranges.push({take:tk.take,start,end:Qs.length,dur:+(n/FPS).toFixed(3)});}
  // standardise each group by its spread; group weights
  const D=F[0].length,G=[[0,6,1.0],[6,12,1.2],[12,18,0.6],[18,24,0.8],[24,26,1.0]],mean=new Array(D).fill(0),std=new Array(D).fill(0);
  const N=F.length;for(const f of F)for(let d=0;d<D;d++)mean[d]+=f[d]/N;
  for(const [a,b,w] of G){let v=0,c=0;for(const f of F)for(let d=a;d<b;d++){v+=(f[d]-mean[d])**2;c++;}const s=Math.sqrt(v/c)||1;for(let d=a;d<b;d++)std[d]=s/w;}
  const b64=(T,arr)=>Buffer.from(new T(arr).buffer).toString('base64');
  // only the bones that move somewhere in the database (the fingers and the like keep their rest pose)
  const keep=raw.names.map((n,j)=>{let mx=0;for(const q of Qs)for(let c=0;c<4;c++)mx=Math.max(mx,Math.abs(q[j][c]-Qs[0][j][c]));return mx>1e-3||j===hi;});
  const qflat=[];for(const q of Qs)q.forEach((a,j)=>{if(!keep[j])return;const s=a[3]<0?-1:1;for(const c of a)qflat.push(Math.round(c*s*32767));});
  const doc={about:'GL-Motion motion-matching database for engine3d/player3d.js, baked by engine3d/tools/bake_mm.js from CMU Graphics Lab motion capture (cgspeed BVH conversion) retargeted onto models/mh_player.glb. See engine3d/LICENSES.md.',
    fps:FPS,horizon:H,bones:raw.names.filter((n,j)=>keep[j]),frames:N,dims:D,takes:ranges,mean:mean.map(v=>+v.toFixed(5)),std:std.map(v=>+v.toFixed(5)),
    q:b64(Int16Array,qflat),hp:b64(Int16Array,HP.flat().map(v=>Math.round(v*1000))),
    feat:b64(Float32Array,F.flat()),valid:b64(Uint8Array,valid),take:b64(Uint8Array,take),speed:b64(Float32Array,speed)};
  fs.writeFileSync(OUT,JSON.stringify(doc));
  console.log('wrote',path.relative(process.cwd(),OUT),fs.statSync(OUT).size,'bytes; frames',N,'valid',valid.reduce((a,b)=>a+b,0),'bones',nb,'parentQ',raw.parentQ.map(v=>+v.toFixed(3)),'parentS',raw.parentS.map(v=>+v.toFixed(3)));
  console.log('bones kept',keep.filter(Boolean).length,'of',nb);
  for(const r of ranges)console.log(r.take.padEnd(9),'frames',r.end-r.start,'dur',r.dur,'mean speed',(speed.slice(r.start,r.end).reduce((a,b)=>a+b,0)/(r.end-r.start)).toFixed(2));
})().catch(e=>{console.error(e);process.exit(1);});
