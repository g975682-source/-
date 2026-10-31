// Close-up frames of the 3D model's standing, walking, jogging, running and a shot out of a run, in the real game page
// with time stepped by this script (as measure_loco.js), for looking at. Development tool.
//   node ground-legends/engine3d/tools/render_loco.js <out folder>
//   SCENE=moves: keeper set, header, jump, standing and poke tackles (the game's poses with the engine's corrections)
//   SCENE=kick: standing shots, right and left foot, with the toe-to-ball distance around the strike (toes.json)
//   SCENE=brake: run, hard stop, push off; SCENE=dribble: on the ball at 3 and 5 m/s; SCENE=contest: jockey, shield and shoulder-to-shoulder against an opponent moved by hand
//   CAM=side|front|hand|both|all (default side; hand: close to the right hand), NEAR=1 for a closer camera, SIZE=<width px>
// One player is moved along +z; the game's camera is placed beside him (a side view following him). Each phase is
// drawn at 60 steps a second and every 3rd step is saved: stand 0.6 s, walk 1.4 m/s, jog 2.8, run 5.5, sprint 8.5,
// then a shot from 6 m/s (the game's kick timeline, the strike at 0.15 s) and standing again.
const fs=require('fs'),path=require('path');
const GL=path.join(__dirname,'..','..');
const P=require(path.join(GL,'tests','legacy','paths.js'));const {chromium}=require(P.PLAYWRIGHT);
const OUT=path.resolve(process.argv[2]||'loco_frames');fs.mkdirSync(OUT,{recursive:true});
const three=fs.readFileSync(P.THREE_JS,'utf8'),game=fs.readFileSync(path.join(GL,'index.html'),'utf8');
const k=game.indexOf('window.__game={');
const INJECT='window.__vis={applyVisual,strideAt,scene,renderer,camera,ballMesh,get players(){return players;},get teams(){return teams;},setVisDt(v){visDt=v;}};\n';
const html='<!doctype html><html><head><meta charset="utf-8"></head><body>'+game.slice(0,k)+INJECT+game.slice(k)+'</body></html>';
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const W=+(process.env.SIZE||480),H=Math.round(W*0.75),CAM=process.env.CAM||'side',NEAR=process.env.NEAR==='1',SCENE=process.env.SCENE||'loco';
  const page=await b.newPage({viewport:{width:W,height:H}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
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
  const frames=await page.evaluate(([CAM,NEAR,SCENE])=>{const V=window.__vis,p=window.__st,dt=1/60,out=[];let i=0;
    p.pos.set(-30,0,-12);p.face=0;V.setVisDt(dt);const hud=document.getElementById('hud');if(hud)hud.style.display='none';
    const step=(a,spd,t,label)=>{if(SCENE!=='contest')p.pos.z+=spd*dt;p.spd=spd;p.visA=a;p.visT=t;p.visPh=(p.visPh||0)+dt*(spd*1.2+(spd>0.3?1.5:0));
      V.applyVisual(p,p.pos.x,p.y||0,p.pos.z,p.face,a,t,p.visPh,spd,window.__side||0);if(SCENE!=='dribble'&&SCENE!=='kick'){const o=__game.ball.owner;if(o)V.ballMesh.position.set(o.pos.x+Math.sin(o.face)*0.6,0.14,o.pos.z+Math.cos(o.face)*0.6);else V.ballMesh.position.set(0,0.14,40);}P3D.frame(V.players,V.scene,V.teams,null,V.ballMesh.position);
      const views=CAM==='both'?['side','front']:CAM==='all'?['side','front','hand']:[CAM],imgs={};
      if(i%3===0)for(const v of views){const d=NEAR?2.4:4.2;
        if(v==='hand'){const h=P3D.bones(p,['RightHand'])['RightHand'];V.camera.position.set(h[0]-0.55,h[1]+0.1,h[2]+0.35);V.camera.lookAt(h[0],h[1]-0.04,h[2]);}
        else{if(v==='side')V.camera.position.set(p.pos.x-d,1.15,p.pos.z+0.2);else V.camera.position.set(p.pos.x-d*0.35,1.2,p.pos.z+d);
        V.camera.lookAt(p.pos.x,0.95,p.pos.z+0.2);}V.camera.fov=NEAR?34:40;V.camera.updateProjectionMatrix();
        V.renderer.render(V.scene,V.camera);imgs[v]=V.renderer.domElement.toDataURL('image/png');}
      if(i%3===0){const m=P3D.measure(p);out.push({label,img:imgs[views[0]],imgs,w:m.weights,tr:m.transfer});}i++;};
    const hold=(a,spd,secs,label)=>{for(let s=0;s<secs;s+=dt)step(a,spd,12+s,label);};
    if(SCENE==='kick'){
      // a standing shot with each foot on the game's kick timeline (visT -0.083 ... 0.133, the strike, 0.167 ... 0.45);
      // the ball 0.5 m ahead (where the game holds it for a standing owner) until the strike, then away at 20 m/s.
      // Records the kicking toe's distance to the ball centre around the strike.
      const B=V.ballMesh,toes=[];
      for(const side of [0,-1]){window.__side=side;const toe=side<0?'LeftToeBase':'RightToeBase',foot=side<0?'LeftFoot':'RightFoot';
        const bx=p.pos.x,bz=p.pos.z+0.5;B.position.set(bx,0.11,bz);
        for(let s2=0;s2<0.5;s2+=dt)step(0,0,12+s2,'stand');
        const T=[];for(let i=1;i<=14;i++)T.push(-0.1+i/60);for(let i=1;i<=18;i++)T.push(0.15+i/60);
        for(const t of T){if(t>0.15)B.position.z=bz+(t-0.15)*20;step(2,0,t,side<0?'shot, left foot':'shot, right foot');
          const b=P3D.bones(p,[toe,foot]);const d=Math.hypot(b[toe][0]-bx,b[toe][1]-0.11,b[toe][2]-bz);if(t>0.05&&t<0.3)toes.push({side,t:+t.toFixed(4),toe:b[toe].map(v=>+v.toFixed(3)),toBall:+d.toFixed(3)});}
        B.position.set(bx,0.11,bz+9);for(let s2=0;s2<0.6;s2+=dt)step(0,0,12+s2,'stand');}
      window.__side=0;window.__toes=toes;return out;}
    if(SCENE==='moves'){
      // the states drawn from the game's own pose: keeper set, header, jump, standing tackle, poke tackle (the game's
      // heights for the header and the jump)
      __game.ball.owner=null;
      const play=(a,dur,label,yf)=>{for(let t=0;t<=dur;t+=dt){p.y=yf?yf(t):0;step(a,0,t,label);}p.y=0;};
      play(6,0.8,'keeper set');play(0,0.4,'stand');
      play(10,0.5,'header',t=>Math.sin(Math.min(1,t/0.5)*Math.PI)*0.38);play(0,0.4,'stand');
      play(17,0.62,'jump',t=>Math.sin(Math.min(1,t/0.62)*Math.PI)*0.5);play(0,0.4,'stand');
      play(13,0.54,'standing tackle');play(0,0.4,'stand');play(11,0.3,'poke tackle');play(0,0.4,'stand');return out;}
    if(SCENE==='brake'){
      // run at 7 m/s, stop in 0.6 s (about -12 m/s2), stand, push off to 7 m/s in 1.2 s
      const ramp=(a0,a1,secs,label)=>{for(let s2=0;s2<secs;s2+=dt){const v=a0+(a1-a0)*s2/secs;step(v>0.05?1:0,v,12+s2,label);}};
      ramp(7,7,0.8,'run 7');ramp(7,0,0.6,'brake');ramp(0,0,0.5,'stopped');ramp(0,7,1.2,'push off');ramp(7,7,0.5,'run 7');return out;}
    if(SCENE==='dribble'){
      // on the ball at 3 and 5 m/s; the ball placed as the game places it for its owner (ball offset from visPh)
      __game.give(p.team,p.slot);const B=__game.ball;
      const drib=(v,secs,label)=>{for(let s2=0;s2<secs;s2+=dt){p.touchPh=(p.touchPh||0)+2*Math.PI*v/V.strideAt(v)*dt;const ph=p.touchPh;
        const off=0.5+v*0.055+Math.max(0,Math.sin(ph))*0.14*Math.min(1,v/4);B.pos.set(p.pos.x,0.11,p.pos.z+v*dt+off);V.ballMesh.position.set(B.pos.x,0.11+0.033,B.pos.z);
        step(1,v,12+s2,label);
        const b=P3D.bones(p,['RightToeBase','LeftToeBase']),k=Math.floor(ph/(2*Math.PI));if(k!==window.__lastTouch){window.__lastTouch=k;(window.__touches=window.__touches||[]).push({v,toeR:b.RightToeBase.map(x=>+x.toFixed(3)),toeL:b.LeftToeBase.map(x=>+x.toFixed(3)),ball:[+B.pos.x.toFixed(3),+B.pos.z.toFixed(3)]});}}};
      drib(3,1.6,'dribble 3');drib(5,1.6,'dribble 5');return out;}
    if(SCENE==='contest'){
      // an opponent from the other team, moved by hand like him
      const q=V.players.find(o=>o.team!==p.team&&!o.isGK),place=(dx,dz)=>{q.pos.set(p.pos.x+dx,0,p.pos.z+dz);q.face=Math.PI;q.spd=p.spd;q.visA=p.spd>0.05?1:0;
        V.applyVisual(q,q.pos.x,0,q.pos.z,q.face,q.visA,12,0,q.spd,0);};
      const sc=(label,secs,fn)=>{for(let s2=0;s2<secs;s2+=dt){fn();step(p.visA,p.spd,12+s2,label);}};
      // jockey: backing off at 2 m/s facing the carrier 2 m ahead
      __game.give(q.team,q.slot);p.faceBall=true;
      sc('jockey',1.6,()=>{p.jockeyT=0.2;p.pos.z-=4*dt;place(0,2.0);p.visA=1;p.spd=2;});p.jockeyT=0;p.faceBall=false;
      // shield: on the ball, an opponent 0.9 m behind
      __game.give(p.team,p.slot);
      sc('shield',1.4,()=>{p.shielding=true;p.pos.z-=0.5*dt;place(0,-0.9);p.visA=1;p.spd=0.5;});p.shielding=false;
      // contact: running with the ball, the opponent 0.85 m to his left, shoulder to shoulder
      sc('contact',1.4,()=>{place(0.85,0);p.visA=1;p.spd=5;});
      return out;}
    __game.ball.owner=null;   // off the ball (at the kick-off it is his)
    hold(0,0,0.6,'stand');hold(1,1.4,1.2,'walk 1.4 m/s');hold(1,2.8,1.2,'jog 2.8 m/s');hold(1,5.5,1.2,'run 5.5 m/s');hold(1,8.5,1.0,'sprint 8.5 m/s');
    hold(1,6,0.4,'run 6 m/s');
    // a shot: the game's kick timeline (visT -0.1 ... 0.13, the strike, 0.15 ... 0.45), slowing down
    for(let j=1;j<=14;j++)step(2,Math.max(0,6-j*0.4),-0.1+j/60,'shot');for(let j=1;j<=18;j++)step(2,0.3,0.15+j/60,'shot');
    hold(0,0,0.8,'stand');
    return out;},[CAM,NEAR,SCENE]);
  frames.forEach((f,n)=>{for(const [v,d] of Object.entries(f.imgs))fs.writeFileSync(path.join(OUT,`${v}_${String(n).padStart(3,'0')}.png`),Buffer.from(d.split(',')[1],'base64'));if(f.imgs.side||f.img)fs.writeFileSync(path.join(OUT,`f_${String(n).padStart(3,'0')}.png`),Buffer.from(f.img.split(',')[1],'base64'));});
  const toes=await page.evaluate(()=>window.__toes||window.__touches||null);if(toes)fs.writeFileSync(path.join(OUT,'toes.json'),JSON.stringify(toes,null,1));
  fs.writeFileSync(path.join(OUT,'frames.json'),JSON.stringify(frames.map((f,n)=>({n,label:f.label,weights:f.w,transfer:f.tr}))));
  console.log('frames',frames.length,'page errors',errors.length);await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
