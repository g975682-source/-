// An AI-against-AI match drawn with the 3D players and exported as body-pose keypoints, in the format of SkillCorner's
// body pose from match video (per frame: ball, possession, and per player x, y and joints {name: {xyz}}), so that
// tools/pose_full.py measures the game's 3D motion with the same code as real players. Development tool.
//   [SEED=n] [HOME_T=i] [AWAY=j] node ground-legends/engine3d/tools/export_match_pose.js <game minutes> <out.jsonl>
// Time steps of 2/60 s (30 frames a second; the file says so); the game is simulated and posed (renderVisuals, the
// 3D engine on a fixed clock) without drawing. Coordinates as the real data (right-handed): x along the pitch (the
// game's x), y across (the game's -z), z up.
const path=require('path'),fs=require('fs');
const GL=path.join(__dirname,'..','..');
const P=require(path.join(GL,'tests','legacy','paths.js'));const {chromium}=require(P.PLAYWRIGHT);
const three=fs.readFileSync(P.THREE_JS,'utf8'),game=fs.readFileSync(process.env.GAME||path.join(GL,'index.html'),'utf8');
const k=game.indexOf('window.__game={');if(k<0)throw new Error('anchor');
const html='<!doctype html><html><head><meta charset="utf-8"></head><body>'+game.slice(0,k)+'window.__vis={renderVisuals};\n'+game.slice(k)+'</body></html>';
const MIN=+(process.argv[2]||20),OUT=process.argv[3]||'game_pose.jsonl';
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const page=await b.newPage({viewport:{width:320,height:200}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{try{localStorage.setItem('gl-tut-v1','1');}catch(e){}
    const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(t=>{if(window.__rafPause){window.requestAnimationFrame(cb);return;}cb(t);});});
  if(process.env.SEED)await page.addInitScript(seed=>{let a=seed>>>0;Math.random=()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};},+process.env.SEED);
  await page.route('**/*',r=>{const u=new URL(r.request().url());
    if(u.host==='game.local'&&u.pathname==='/')return r.fulfill({body:html,contentType:'text/html'});
    if(u.href.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'});
    if(u.pathname.startsWith('/engine3d/')){const f=path.join(GL,u.pathname);if(fs.existsSync(f))return r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.json')?'application/json':'model/gltf-binary'});return r.fulfill({status:404,body:''});}
    return r.abort();});
  await page.goto('http://game.local/?p3d=all');await page.waitForFunction(()=>window.P3D&&P3D.status.ready,null,{timeout:60000});
  await page.evaluate(([H,A])=>{__game.startMatch({mode:'watch',minutes:90,home:H,away:A,firstKick:0});window.__freeze=true;window.__rafPause=true;P3D.clock(2/60);},[+(process.env.HOME_T||0),+(process.env.AWAY||2)]);
  const dt=2/60,steps=Math.round(MIN*60/dt),chunk=900;const out=fs.createWriteStream(OUT);out.write(JSON.stringify({meta:{fps:30,source:'game'}})+'\n');
  let poss=null;
  for(let s0=0;s0<steps;s0+=chunk){
    const r=await page.evaluate(([n,dt,s0])=>{const g=__game,L=[];const id=new Map(g.players.map((p,i)=>[p,i]));
      for(let s=0;s<n;s++){g.sim(dt);__vis.renderVisuals(dt);if(g.state==='fulltime'||g.teams.some(t=>t.players.length<7))return {L,end:true};
        if(g.state!=='play')continue;const o=g.ball.owner;
        L.push({frame:s0+s,ball_data:{x:+g.ball.pos.x.toFixed(2),y:+(-g.ball.pos.z).toFixed(2),z:+g.ball.pos.y.toFixed(2)},possession:{player_id:o?id.get(o):null,group:o?(o.team?'away team':'home team'):null},
          player_data:g.players.filter(p=>!p.sentOff).map(p=>{const j=P3D.joints(p),J={};if(j)for(const k in j)J[k]={xyz:[j[k][0],-j[k][2],j[k][1]]};
            return {player_id:id.get(p),team:p.team,gk:p.isGK?1:0,x:+p.pos.x.toFixed(2),y:+(-p.pos.z).toFixed(2),joints:j?J:null};})});}
      return {L,end:false};},[Math.min(chunk,steps-s0),dt,s0]);
    for(const l of r.L)out.write(JSON.stringify(l)+'\n');if(r.end)break;}
  out.end();await new Promise(r=>out.on('finish',r));console.log('page errors',errors.length,errors.slice(0,3));await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
