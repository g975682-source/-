// Close-ups of the 3D players' looks (kit pattern, numbers and names, body build, hair, beard), front and back, in the
// real game page with the game frozen. Development tool.
//   node ground-legends/engine3d/tools/render_look.js <out folder>
//   HOME=<team index> AWAY=<team index> (default 3 and 8: stripes and hoops), N=<players per team> (default 4),
//   SIZE=<width px>, BUILD=1 for the extremes of build (broad and heavy, slim, alternating), HEAD=1 for two players. heads (OFF=<first, in the row>), P3D=0 to draw the game's own players instead (for comparing)
// Writes front.png, back.png and players.json (each player's number, name, hair style, beard and body W/M).
const fs=require('fs'),path=require('path');
const GL=path.join(__dirname,'..','..');
const P=require(path.join(GL,'tests','legacy','paths.js'));const {chromium}=require(P.PLAYWRIGHT);
const OUT=path.resolve(process.argv[2]||'look_frames');fs.mkdirSync(OUT,{recursive:true});
const three=fs.readFileSync(P.THREE_JS,'utf8'),game=fs.readFileSync(path.join(GL,'index.html'),'utf8');
const k=game.indexOf('window.__game={');
const INJECT='window.__vis={applyVisual,scene,renderer,camera,ballMesh,bodyOf,hashStr,get players(){return players;},get teams(){return teams;},setVisDt(v){visDt=v;}};\n';
const html='<!doctype html><html><head><meta charset="utf-8"></head><body>'+game.slice(0,k)+INJECT+game.slice(k)+'</body></html>';
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const W=+(process.env.SIZE||960),H=Math.round(W*0.5),HOME=+(process.env.HOME_T||process.env.HOMETEAM||3),AWAY=+(process.env.AWAY||8),N=+(process.env.N||4);
  const p3d=process.env.P3D==='0'?'0':'all';
  const page=await b.newPage({viewport:{width:W,height:H}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{try{localStorage.setItem('gl-tut-v1','1');}catch(e){}
    const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(t=>{if(window.__rafPause){window.requestAnimationFrame(cb);return;}cb(t);});});
  await page.route('**/*',r=>{const u=new URL(r.request().url());
    if(u.host==='game.local'&&u.pathname==='/')return r.fulfill({body:html,contentType:'text/html'});
    if(u.href.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'});
    if(u.pathname.startsWith('/engine3d/')){const f=path.join(GL,u.pathname);if(fs.existsSync(f))return r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.json')?'application/json':'model/gltf-binary'});return r.fulfill({status:404,body:''});}
    return r.abort();});
  await page.addInitScript(o=>{window.__off=o;},+(process.env.OFF||0));
  await page.goto('http://game.local/?p3d='+p3d);
  if(p3d!=='0')await page.waitForFunction(()=>window.P3D&&P3D.status.ready,null,{timeout:60000});
  await page.evaluate(([h,a])=>{__game.startMatch({mode:'watch',minutes:12,home:h,away:a,firstKick:0});},[HOME,AWAY]);
  await page.waitForTimeout(1500);
  const res=await page.evaluate(([N,p3d,HEAD,BUILD])=>{window.__freeze=true;window.__rafPause=true;if(window.P3D)P3D.clock(1/60);
    const V=window.__vis,dt=1/60,hud=document.getElementById('hud');if(hud)hud.style.display='none';V.setVisDt(dt);
    const T=V.teams,row=[];for(const t of T)row.push(...t.players.filter(q=>!q.isGK).slice(0,N-1),t.players.find(q=>q.isGK));
    V.ballMesh.position.set(0,0.11,40);
    // BUILD=1: the game's extremes of build in turn (broadest and heaviest, slimmest), re-dressed
    if(BUILD&&window.P3D){row.forEach((p,i)=>{const B=p.rig.body;B.W=i%2?0.88:1.14;B.M=i%2?0.86:1.16;});P3D.setMode('all');}
    const place=face=>{row.forEach((p,i)=>{p.pos.set(-30+(i-(row.length-1)/2)*0.95,0,-12);p.face=face;p.vel.set(0,0,0);p.spd=0;});
      for(let s=0;s<40;s++){for(const p of row){p.visT=12+s*dt;p.visPh=(p.visPh||0)+dt*1.5;V.applyVisual(p,p.pos.x,0,p.pos.z,p.face,0,p.visT,p.visPh,0,0);}
        if(window.P3D)P3D.frame(V.players,V.scene,V.teams,null,V.ballMesh.position);}};
    // HEAD=1: the heads of the first two players, close
    const shot=(face,camZ)=>{place(face);if(HEAD){const o=+(window.__off||0),h=[o,o+1].map(i=>{const v=new THREE.Vector3();V.scene.updateMatrixWorld(true);(row[i].rig.head).getWorldPosition(v);return v;}),x=(h[0].x+h[1].x)/2,y=(h[0].y+h[1].y)/2+0.08;
        V.camera.position.set(x,y+0.05,-12+Math.sign(camZ)*1.5);V.camera.lookAt(x,y,-12);V.camera.fov=40;}
      else{V.camera.position.set(-30,1.25,-12+camZ);V.camera.lookAt(-30,1.0,-12);V.camera.fov=Math.min(70,10+row.length*5.2);}V.camera.updateProjectionMatrix();
      V.renderer.render(V.scene,V.camera);return V.renderer.domElement.toDataURL('image/png');};
    const front=shot(0,4.4),back=shot(Math.PI,4.4);
    const info=row.map(p=>{const pd=p.pd||p,B=V.bodyOf(pd);return {name:pd.name,short:pd.short,num:pd.num,label:p.label,hs:pd.hs,hair:pd.hair,skin:pd.skin,beard:V.hashStr(pd.name||'')%3===0,W:+B.W.toFixed(3),M:+B.M.toFixed(3),S:+B.S.toFixed(3)};});
    return {front,back,info,status:window.P3D?P3D.status:null,kits:T.map(t=>t.kit)};},[N,p3d,process.env.HEAD==='1',process.env.BUILD==='1']);
  for(const v of ['front','back'])fs.writeFileSync(path.join(OUT,v+'.png'),Buffer.from(res[v].split(',')[1],'base64'));
  fs.writeFileSync(path.join(OUT,'players.json'),JSON.stringify({players:res.info,kits:res.kits,status:res.status,errors},null,1));
  console.log(JSON.stringify(res.info),'\nkits',JSON.stringify(res.kits),'\nerrors',errors.length);
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
