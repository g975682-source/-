// Ball and body in the 3D models, in real AI-against-AI play: the game page (all 22 players with the model) is stepped
// by this script at the game's own 60 ticks a second, each tick drawn as the game draws it (renderVisuals: applyVisual,
// P3D.frame with the drawn ball), without putting pixels on the screen. Development tool.
//   [SECS=240] [MATCHES=2] node ground-legends/engine3d/tools/measure_contact.js [out.json]
// Events, from the game's own ball: a kick or touch (its speed changes by more than 2.5 m/s within 1.6 m of a player,
// the ball under 0.9 m), a header (the same, the ball over 1.4 m) and a keeper's catch (the keeper starts holding).
// At each, over the 3 drawn frames before and after: the nearest the kicking toe (or the forehead, or the hands' middle)
// comes to the drawn ball's surface (m) and that toe's speed then (m/s). Every frame: the drawn ball against each
// nearby body (trunk, head, thighs, shins, feet, arms as capsules): how deep it is inside one (m, over 3 cm counts,
// except a keeper holding it), and how far the drawn ball jumps between frames beyond where the game's ball goes
// ("pop", m/s over 3 m/s counts).
const fs=require('fs'),path=require('path');
const GL=path.join(__dirname,'..','..');
const P=require(path.join(GL,'tests','legacy','paths.js'));const {chromium}=require(P.PLAYWRIGHT);
const three=fs.readFileSync(P.THREE_JS,'utf8'),game=fs.readFileSync(process.env.GAME?path.resolve(process.env.GAME):path.join(GL,'index.html'),'utf8');
const k=game.indexOf('window.__game={');if(k<0)throw new Error('anchor');
const INJECT='window.__vis={tick,renderVisuals,ball,ballMesh,get players(){return players;}};\n';
const html='<!doctype html><html><head><meta charset="utf-8"></head><body>'+game.slice(0,k)+INJECT+game.slice(k)+'</body></html>';
const SECS=+(process.env.SECS||240),MATCHES=+(process.env.MATCHES||2);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const page=await b.newPage({viewport:{width:640,height:360}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{try{localStorage.setItem('gl-tut-v1','1');}catch(e){}
    const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(t=>{if(window.__rafPause){window.requestAnimationFrame(cb);return;}cb(t);});});
  await page.route('**/*',r=>{const u=new URL(r.request().url());
    if(u.host==='game.local'&&u.pathname==='/')return r.fulfill({body:html,contentType:'text/html'});
    if(u.href.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'});
    if(u.pathname.startsWith('/engine3d/')){const f=process.env.ENGINE?path.join(path.resolve(process.env.ENGINE),u.pathname.slice(10)):path.join(GL,u.pathname);if(fs.existsSync(f))return r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.json')?'application/json':'model/gltf-binary'});return r.fulfill({status:404,body:''});}
    return r.abort();});
  await page.goto('http://game.local/?p3d=all');await page.waitForFunction(()=>window.P3D&&P3D.status.ready,null,{timeout:60000});
  const all={kicks:[],headers:[],catches:[],frames:0,inside:[],pops:[]};
  for(let m=0;m<MATCHES;m++){
    await page.evaluate(m=>{__game.startMatch({mode:'watch',minutes:90,home:m,away:m+2,firstKick:0});window.__freeze=true;window.__rafPause=true;P3D.clock(1/60);},m);
    await page.waitForFunction(()=>P3D.status.attached.length>=22,null,{timeout:60000}).catch(()=>{});
    // in chunks of 10 game seconds
    for(let c=0;c<SECS/10;c++){
      const r=await page.evaluate(()=>{const V=window.__vis,g=__game,dt=1/60,out={kicks:[],headers:[],catches:[],frames:0,inside:[],pops:[]};
        const BN=['Hips','Neck','Head','LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase','RightUpLeg','RightLeg','RightFoot','RightToeBase','LeftArm','LeftForeArm','LeftHand','RightArm','RightForeArm','RightHand'];
        const SEG=[['Hips','Neck',0.15],['LeftUpLeg','LeftLeg',0.08],['LeftLeg','LeftFoot',0.06],['LeftFoot','LeftToeBase',0.05],['RightUpLeg','RightLeg',0.08],['RightLeg','RightFoot',0.06],['RightFoot','RightToeBase',0.05],
          ['LeftArm','LeftForeArm',0.05],['LeftForeArm','LeftHand',0.045],['RightArm','RightForeArm',0.05],['RightForeArm','RightHand',0.045]];
        const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],len=a=>Math.sqrt(dot(a,a));
        const segD=(p,a,b)=>{const ab=sub(b,a),t=Math.max(0,Math.min(1,dot(sub(p,a),ab)/Math.max(1e-9,dot(ab,ab))));return len(sub(p,[a[0]+ab[0]*t,a[1]+ab[1]*t,a[2]+ab[2]*t]));};
        const hist=window.__hist||(window.__hist=[]);
        for(let i=0;i<600;i++){if(g.state==='fulltime')break;
          const v0=V.ball.vel.clone(),own0=new Map(V.players.map(p=>[p,!!p.holding]));
          V.tick(dt);V.renderVisuals(dt);out.frames++;
          const bp=[V.ballMesh.position.x,V.ballMesh.position.y,V.ballMesh.position.z],gb=[V.ball.pos.x,V.ball.pos.y,V.ball.pos.z];
          // bodies near the drawn ball
          const near=V.players.filter(p=>p.rig&&!p.sentOff&&Math.hypot(p.pos.x-bp[0],p.pos.z-bp[2])<2.2);
          const bodies=near.map(p=>({p,B:P3D.bones(p,BN)})).filter(o=>o.B);
          const fr={bp,gb,bodies:bodies.map(o=>({p:o.p,B:o.B,hold:!!o.p.holding}))};hist.push(fr);if(hist.length>7)hist.shift();
          for(const o of bodies){if(o.p.holding)continue;let dmax=0;
            for(const [a,c,r] of SEG){const d=(r+0.11)-segD(bp,o.B[a],o.B[c]);if(d>dmax)dmax=d;}
            {const d=(0.12+0.11)-len(sub(bp,o.B.Head));if(d>dmax)dmax=d;}
            if(dmax>0.03)out.inside.push(+dmax.toFixed(3));}
          if(hist.length>=2){const a=hist[hist.length-2];const db=len(sub(bp,a.bp))/dt,dg=len(sub(gb,a.gb))/dt;if(db-dg>3)out.pops.push(+(db-dg).toFixed(2));}
          // events from the game's ball
          const dv=V.ball.vel.clone().sub(v0).length();
          let kp=null,kd=1.6;for(const p of V.players){if(!p.rig||p.sentOff)continue;const d=Math.hypot(p.pos.x-gb[0],p.pos.z-gb[2]);if(d<kd){kd=d;kp=p;}}
          if(dv>2.5&&kp&&!kp.holding){fr.ev={kind:gb[1]>1.4?'header':gb[1]<0.9?'kick':null,p:kp,state:kp.visA===2?'kick':kp.visA===1&&kp.touchPh!=null?'dribble':'other '+kp.visA,anim:kp.oAnim||''};}
          for(const p of V.players)if(p.isGK&&p.holding&&!own0.get(p))fr.ev={kind:'catch',p};
          // evaluate the event 3 frames after it (the 3 before and after are in hist)
          const e3=hist.length>=7?hist[3]:null;
          if(e3&&e3.ev&&e3.ev.kind){const ev=e3.ev;let best=1e9,spd=0;
            for(let h=0;h<7;h++){const F=hist[h],o=F.bodies.find(x=>x.p===ev.p);if(!o)continue;
              const pts=ev.kind==='kick'?['LeftToeBase','RightToeBase','LeftFoot','RightFoot']:ev.kind==='header'?['Head']:['hands'];
              for(const n of pts){let q=n==='hands'?[(o.B.LeftHand[0]+o.B.RightHand[0])/2,(o.B.LeftHand[1]+o.B.RightHand[1])/2,(o.B.LeftHand[2]+o.B.RightHand[2])/2]:o.B[n];
                const d=len(sub(F.bp,q))-0.11-(n==='Head'?0.1:0);
                if(d<best){best=d;spd=0;if(h>0){const G=hist[h-1],og=G.bodies.find(x=>x.p===ev.p);if(og&&n!=='hands'&&og.B[n])spd=len(sub(q,og.B[n]))/dt;}}}}
            const rec={kind:ev.kind,dist:+Math.max(0,best).toFixed(3),toeSpeed:+spd.toFixed(2),state:ev.state||'',anim:ev.anim||''};
            (ev.kind==='kick'?out.kicks:ev.kind==='header'?out.headers:out.catches).push(rec);ev.kind=null;}}
        return out;});
      for(const k2 of ['kicks','headers','catches','inside','pops'])all[k2].push(...r[k2]);all.frames+=r.frames;}
    console.log('match',m+1,'frames',all.frames,'kicks',all.kicks.length,'headers',all.headers.length,'catches',all.catches.length);
  }
  const q=(a,p)=>{if(!a.length)return null;const s=a.slice().sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.floor(s.length*p))];},mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
  const summ=(L,f)=>({n:L.length,median:q(L.map(f),0.5),p90:q(L.map(f),0.9),over10cm:L.filter(x=>f(x)>0.10).length});
  const kicksBy={};for(const e of all.kicks){const k2=e.state||'?';(kicksBy[k2]=kicksBy[k2]||[]).push(e);}
  const out={secs:all.frames/60,
    kicks:Object.fromEntries(Object.entries(kicksBy).map(([k2,L])=>[k2,{...summ(L,e=>e.dist),toeSpeedMedian:q(L.map(e=>e.toeSpeed),0.5),toeSpeedP90:q(L.map(e=>e.toeSpeed),0.9)}])),
    headers:summ(all.headers,e=>e.dist),catches:summ(all.catches,e=>e.dist),
    inside:{framesPerMin:+(all.inside.length/(all.frames/3600)).toFixed(2),p90:q(all.inside,0.9),max:all.inside.length?Math.max(...all.inside):0},
    pops:{perMin:+(all.pops.length/(all.frames/3600)).toFixed(2),p90:q(all.pops,0.9),max:all.pops.length?Math.max(...all.pops):0},errors};
  console.log(JSON.stringify(out,null,1));
  await b.close();if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(out,null,1));
})().catch(e=>{console.error(e);process.exit(1);});
