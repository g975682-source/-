// Close-up frames of the 3D model's standing, walking, jogging, running and a shot out of a run, in the real game page
// with time stepped by this script (as measure_loco.js), for looking at. Development tool.
//   node ground-legends/engine3d/tools/render_loco.js <out folder>      then: python3 sheet_gif.py <out folder>
// One player is moved along +z; the game's camera is placed beside him (a side view following him). Each phase is
// drawn at 60 steps a second and every 3rd step is saved: stand 0.6 s, walk 1.4 m/s, jog 2.8, run 5.5, sprint 8.5,
// then a shot from 6 m/s (the game's kick timeline, the strike at 0.15 s) and standing again.
const fs=require('fs'),path=require('path');
const GL=path.join(__dirname,'..','..');
const P=require(path.join(GL,'tests','legacy','paths.js'));const {chromium}=require(P.PLAYWRIGHT);
const OUT=path.resolve(process.argv[2]||'loco_frames');fs.mkdirSync(OUT,{recursive:true});
const three=fs.readFileSync(P.THREE_JS,'utf8'),game=fs.readFileSync(path.join(GL,'index.html'),'utf8');
const k=game.indexOf('window.__game={');
const INJECT='window.__vis={applyVisual,scene,renderer,camera,get players(){return players;},get teams(){return teams;},setVisDt(v){visDt=v;}};\n';
const html='<!doctype html><html><head><meta charset="utf-8"></head><body>'+game.slice(0,k)+INJECT+game.slice(k)+'</body></html>';
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const page=await b.newPage({viewport:{width:480,height:360}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{try{localStorage.setItem('gl-tut-v1','1');}catch(e){}
    const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(t=>{if(window.__rafPause){window.requestAnimationFrame(cb);return;}cb(t);});});
  await page.route('**/*',r=>{const u=new URL(r.request().url());
    if(u.host==='game.local'&&u.pathname==='/')return r.fulfill({body:html,contentType:'text/html'});
    if(u.href.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'});
    if(u.pathname.startsWith('/engine3d/')){const f=path.join(GL,u.pathname);if(fs.existsSync(f))return r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.json')?'application/json':'model/gltf-binary'});return r.fulfill({status:404,body:''});}
    return r.abort();});
  await page.goto('http://game.local/?p3d=one');await page.waitForFunction(()=>window.P3D&&P3D.status.ready,null,{timeout:60000});
  await page.evaluate(()=>{__game.startMatch({mode:'play',minutes:12,home:0,away:2,firstKick:0});});
  const ST=`(()=>{const T=__game.teams.find(t=>t.human)||__game.teams[0];return T.players.find(q=>q.label==='ST');})()`;
  await page.waitForFunction('!!P3D.measure('+ST+')',null,{timeout:30000});
  await page.evaluate('window.__freeze=true;window.__rafPause=true;P3D.clock(1/60);window.__st='+ST);
  const frames=await page.evaluate(()=>{const V=window.__vis,p=window.__st,dt=1/60,out=[];let i=0;
    p.pos.set(-30,0,-12);p.face=0;V.setVisDt(dt);const hud=document.getElementById('hud');if(hud)hud.style.display='none';
    const step=(a,spd,t,label)=>{p.pos.z+=spd*dt;p.spd=spd;p.visA=a;p.visT=t;p.visPh=(p.visPh||0)+dt*(spd*1.2+(spd>0.3?1.5:0));
      V.applyVisual(p,p.pos.x,p.y,p.pos.z,p.face,a,t,p.visPh,spd,0);P3D.frame(V.players,V.scene,V.teams,null);
      V.camera.position.set(p.pos.x-4.2,1.25,p.pos.z+0.3);V.camera.lookAt(p.pos.x,0.85,p.pos.z+0.3);V.camera.fov=40;V.camera.updateProjectionMatrix();
      V.renderer.render(V.scene,V.camera);
      if(i%3===0){const m=P3D.measure(p);out.push({label,img:V.renderer.domElement.toDataURL('image/png'),w:m.weights,tr:m.transfer});}i++;};
    const hold=(a,spd,secs,label)=>{for(let s=0;s<secs;s+=dt)step(a,spd,12+s,label);};
    hold(0,0,0.6,'stand');hold(1,1.4,1.2,'walk 1.4 m/s');hold(1,2.8,1.2,'jog 2.8 m/s');hold(1,5.5,1.2,'run 5.5 m/s');hold(1,8.5,1.0,'sprint 8.5 m/s');
    hold(1,6,0.4,'run 6 m/s');
    // a shot: the game's kick timeline (visT -0.1 ... 0.13, the strike, 0.15 ... 0.45), slowing down
    for(let j=1;j<=14;j++)step(2,Math.max(0,6-j*0.4),-0.1+j/60,'shot');for(let j=1;j<=18;j++)step(2,0.3,0.15+j/60,'shot');
    hold(0,0,0.8,'stand');
    return out;});
  frames.forEach((f,n)=>fs.writeFileSync(path.join(OUT,`f_${String(n).padStart(3,'0')}.png`),Buffer.from(f.img.split(',')[1],'base64')));
  fs.writeFileSync(path.join(OUT,'frames.json'),JSON.stringify(frames.map((f,n)=>({n,label:f.label,weights:f.w,transfer:f.tr}))));
  console.log('frames',frames.length,'page errors',errors.length);await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
