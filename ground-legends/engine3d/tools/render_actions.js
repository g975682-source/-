// Frames of the situational motions (keeper dives and standing saves, volleys, bicycle and scissor kicks, the slide
// finish): one player posed by hand through the game's applyVisual, drawn by the 3D model (MODEL=old: the game's own
// procedural model). Development tool; reads the game only.
//   [MODEL=old] [SEQF=list.json] node ground-legends/engine3d/tools/render_actions.js <out folder>
// The list (default render_actions.seq.json): {name, a: state, side: code, ph: phase (a dive's height), dur, at: [times
// saved], y: the body's height as an expression of t, views: [front|side]}.
const fs=require('fs'),path=require('path');const GL='/home/user/-/ground-legends';
const P=require(path.join(GL,'tests','legacy','paths.js'));const {chromium}=require(P.PLAYWRIGHT);
const OUT=path.resolve(process.argv[2]||'frames');fs.mkdirSync(OUT,{recursive:true});
const three=fs.readFileSync(P.THREE_JS,'utf8'),game=fs.readFileSync(process.env.GAME||path.join(GL,'index.html'),'utf8');
const k=game.indexOf('window.__game={');
const INJECT='window.__vis={applyVisual,A,scene,renderer,camera,ballMesh,setVisDt(v){visDt=v;}};\n';
const html='<!doctype html><html><head><meta charset="utf-8"></head><body>'+game.slice(0,k)+INJECT+game.slice(k)+'</body></html>';
const P3DMODE=process.env.MODEL==='old'?'0':'one';
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const page=await b.newPage({viewport:{width:360,height:300}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{try{localStorage.setItem('gl-tut-v1','1');}catch(e){}
   const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(t=>{if(window.__rafPause){window.requestAnimationFrame(cb);return;}cb(t);});});
 await page.route('**/*',r=>{const u=new URL(r.request().url());
   if(u.host==='game.local'&&u.pathname==='/')return r.fulfill({body:html,contentType:'text/html'});
   if(u.href.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'});
   if(u.pathname.startsWith('/engine3d/')){const f=path.join(GL,u.pathname);if(fs.existsSync(f))return r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.json')?'application/json':'model/gltf-binary'});return r.fulfill({status:404});}
   return r.abort();});
 await page.goto('http://game.local/?p3d='+P3DMODE);
 if(P3DMODE!=='0')await page.waitForFunction(()=>window.P3D&&P3D.status.ready,null,{timeout:60000});
 await page.evaluate(()=>{__game.startMatch({mode:'play',minutes:12,home:0,away:2,firstKick:0});});
 const ST=`(()=>{const T=__game.teams.find(t=>t.human)||__game.teams[0];return T.players.find(q=>q.label==='ST');})()`;
 if(P3DMODE!=='0')await page.waitForFunction('!!P3D.measure('+ST+')',null,{timeout:30000});
 await page.evaluate(()=>{if(window.P3D&&new URL(location.href).searchParams.get('p3d')==='0'&&P3D.setMode)P3D.setMode('off');});console.log('p3d',await page.evaluate(()=>window.P3D?JSON.stringify({mode:P3D.status.mode}):'none'));await page.evaluate('window.__freeze=true;window.__rafPause=true;if(window.P3D)P3D.clock(1/60);window.__st='+ST);
 const SEQ=JSON.parse(fs.readFileSync(process.env.SEQF||path.join(__dirname,'render_actions.seq.json'),'utf8'));
 const frames=await page.evaluate((SEQ)=>{const V=window.__vis,A=V.A,p=window.__st,dt=1/60,out=[];
   p.pos.set(-30,0,-12);p.face=0;V.setVisDt(dt);const hud=document.getElementById('hud');if(hud)hud.style.display='none';__game.ball.owner=null;V.ballMesh.position.set(-30,-5,-12);
   for(const S of SEQ){const a=A[S.a];
     for(let t=0;t<=S.dur+1e-6;t+=dt){const y=S.y?eval(S.y):0;V.applyVisual(p,p.pos.x,y,p.pos.z,p.face,a,t,S.ph||0,0,S.side);
       if(window.P3D)P3D.frame(__game.players,V.scene,__game.teams,null,V.ballMesh.position);
       const ti=Math.round(t/dt);if(S.at.some(x=>Math.abs(x*60-ti)<0.5)){
         for(const v of S.views||['front']){if(v==='side')V.camera.position.set(p.pos.x-4.4,1.1,p.pos.z+0.1);else V.camera.position.set(p.pos.x,1.1,p.pos.z+4.6);
           V.camera.lookAt(p.pos.x,0.85,p.pos.z);V.camera.fov=42;V.camera.updateProjectionMatrix();V.renderer.render(V.scene,V.camera);
           out.push({name:S.name+'_'+v+'_'+t.toFixed(2),img:V.renderer.domElement.toDataURL('image/png')});}}}
     for(let t=0;t<0.25;t+=dt)V.applyVisual(p,p.pos.x,0,p.pos.z,p.face,A.idle,12+t,0,0,0);}
   return out;},SEQ);
 for(const f of frames)fs.writeFileSync(path.join(OUT,f.name+'.png'),Buffer.from(f.img.split(',')[1],'base64'));
 console.log('frames',frames.length,'errors',errors);await b.close();})();
