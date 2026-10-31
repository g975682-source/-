// Bakes the motion clips the engine plays (engine3d/anim/clips.json) from the CMU takes, with the prototype's own clip
// code: prototypes/glb-viewer/player-animation/lab.js (PALab.makeClip, buildLib) and ../retarget.js, run unchanged in
// the prototype's viewer page, on the engine's own model (engine3d/models/mh_player.glb). Development tool only: the game
// never runs this; it reads the JSON.
//   node ground-legends/engine3d/tools/bake_clips.js
// Clips (lab.js TAKES and KICKS, all from CMU subject 143, one actor): idle (143_03), start (143_03), run (143_01),
// decel (143_02), kick and recover (143_24, right foot, strike at 5.05 s); walk: one gait cycle of 143_32 (walking), and
// jog: one cycle of 16_35 (a steady jog, CMU subject 16), each found here from the left foot's lowest points. All in place (lab.js takes the hips'
// path out), facing +z, 22 bones (rotations, and the hips' position), sampled at 30 per second.
// Per clip: duration, loop, speed (m/s of the path taken out), footPhase (seconds into the clip where the left foot is
// lowest, to line up walk and run when they blend), contact (kick: the toe's strike time in clip seconds).
const path=require('path'),fs=require('fs');
const GL=path.join(__dirname,'..','..'),PA=path.join(GL,'prototypes','glb-viewer');
const P=require(path.join(GL,'tests','legacy','paths.js'));
const {chromium}=require(P.PLAYWRIGHT);
const three=fs.readFileSync(P.THREE_JS,'utf8'),model=fs.readFileSync(path.join(GL,'engine3d','models','mh_player.glb'));
const OUT=path.join(GL,'engine3d','anim','clips.json');fs.mkdirSync(path.dirname(OUT),{recursive:true});
(async()=>{
  const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>{const u=r.request().url();
    if(u.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'});
    if(u==='http://viewer.local/engine_model.glb')return r.fulfill({body:model,contentType:'model/gltf-binary'});
    if(u.startsWith('http://viewer.local/')){const f=path.join(PA,decodeURIComponent(u.slice(20).split('?')[0]));
      if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.html')?'text/html':'text/plain'});
      return r.fulfill({status:404,body:'not found'});}
    return r.abort();});
  await page.goto('http://viewer.local/player-animation/index.html?autoload=0');
  await page.waitForFunction(()=>window.PALab&&window.GLRetarget);
  const res=await page.evaluate(async()=>{
    const L=PALab,M=await L.loadModel('http://viewer.local/engine_model.glb'),base='http://viewer.local/player-animation/assets/cmu/';
    const lib=await L.buildLib(M,base,'143_24');
    // walk and jog: one gait cycle each, between two lowest points of the left foot in the steady part of the take
    const foot=M.by.LeftFoot;
    const cycle=async(name,take,from,to,pick)=>{const bv=await L.loadTake(base+take+'.bvh'),probe=L.makeClip(M,bv,{name:name+'Probe',from,to,face:'travel',pad:0});
      const T=[];for(let t=0;t<=probe.duration;t+=1/60)T.push(t);
      const ys=L.sampleClip(M,probe,T,()=>foot.getWorldPosition(new THREE.Vector3()).y),lo=Math.min(...ys),mins=[];
      for(let k=3;k<ys.length-3;k++)if(ys[k]<=Math.min(...ys.slice(k-3,k+4))&&ys[k]<lo+0.03)if(!mins.length||k-mins[mins.length-1]>12)mins.push(k);
      if(mins.length<pick+2)throw new Error(name+': no gait cycle found');
      const a=from+mins[pick]/60,b2=from+mins[pick+1]/60;cyc[name]=[a,b2];
      return L.makeClip(M,bv,{name,from:a,to:b2,loop:true,face:'travel'});};
    const cyc={};
    lib.walk=await cycle('walk','143_32',1.0,4.0,1);   // walking, subject 143 (the same actor as the run)
    lib.jog=await cycle('jog','16_35',0.02,1.33,0);    // a steady jog at about 2.8 m/s, subject 16
    const keep=new Set(M.bones.map(b=>b.name));
    const lowestLeft=c=>{const TT=[];for(let t=0;t<=c.duration;t+=1/60)TT.push(t);const y=L.sampleClip(M,c,TT,()=>foot.getWorldPosition(new THREE.Vector3()).y);let k=0;y.forEach((v,i)=>{if(v<y[k])k=i;});return TT[k];};
    const out={};
    for(const k of ['idle','start','walk','jog','run','decel','kick','recover']){const c=lib[k],tr=[];
      for(const t of c.clip.tracks){const [bone,prop]=t.name.split('.');if(!keep.has(bone))continue;
        if(prop==='scale'||(prop==='position'&&!/Hips$/.test(bone)))continue;   // rotations, and the hips' height and sway
        const n=t.getValueSize(),times=[],vals=[];
        // 30 per second: every other key of the 60 per second retarget, and always the last one
        for(let i=0;i<t.times.length;i++){if(i%2&&i!==t.times.length-1)continue;times.push(+t.times[i].toFixed(4));for(let j=0;j<n;j++)vals.push(+t.values[i*n+j].toFixed(prop==='position'?4:5));}
        tr.push({bone:bone.replace(/^mixamorig:?/,''),prop,times,values:vals});}
      out[k]={duration:+c.duration.toFixed(4),loop:!!c.loop,speed:+c.speed.toFixed(3),footPhase:+lowestLeft(c).toFixed(4),from:c.from,to:c.to,take:c.take.split('/').pop(),tracks:tr};
      if(k==='kick')out[k].contact=c.contact;}
    return {clips:out,bones:M.bones.length,cycles:cyc};});
  await browser.close();
  if(errors.length)console.log('page errors:',errors);
  const doc={about:'Motion clips for engine3d/player3d.js, baked by engine3d/tools/bake_clips.js from CMU Graphics Lab motion capture (subject 143, cgspeed BVH conversion) retargeted onto models/mh_player.glb. See engine3d/LICENSES.md.',
    fps:30,bones:res.bones,clips:res.clips};
  fs.writeFileSync(OUT,JSON.stringify(doc));
  console.log('wrote',path.relative(process.cwd(),OUT),fs.statSync(OUT).size,'bytes; cycles (take seconds)',JSON.stringify(res.cycles));
  for(const [k,c] of Object.entries(res.clips))console.log(k.padEnd(8),'dur',c.duration,'loop',c.loop,'speed',c.speed,'m/s footPhase',c.footPhase,'tracks',c.tracks.length,c.contact?'contact '+JSON.stringify(c.contact):'');
})().catch(e=>{console.error(e);process.exit(1);});
