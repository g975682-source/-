// How the game's outfield players move in an AI-against-AI match, for comparing with match analyses of real football.
// Development tool; reads the game only.
//   node ground-legends/engine3d/tools/measure_match_motion.js [game minutes, default 20] [out.json]
// The match runs with __game.sim in 0.1 s game-time steps (no drawing); every step each outfield player is sampled:
//  - speed band (m/s): standing < 0.2, walking 0.2-2, jogging 2-4, running 4-5.5, high speed 5.5-7, sprinting > 7
//  - travel against facing, for speeds above 0.5 m/s: forward (< 30 deg), diagonal (30-60), sideways (60-120),
//    backward (> 120)
//  - turns: changes of travel direction of more than 45 deg within 0.5 s at speeds above 1 m/s
//  - what the game is drawing: its animation state (visA) and whether the player is facing the ball
// Real-match references (see engine3d/MOVEMENT_ANALYSIS.md) use other thresholds, so compare shapes, not digits.
const path=require('path'),fs=require('fs');
const GL=path.join(__dirname,'..','..');
const P=require(path.join(GL,'tests','legacy','paths.js'));const {chromium}=require(P.PLAYWRIGHT);
const three=fs.readFileSync(P.THREE_JS,'utf8'),game=fs.readFileSync(path.join(GL,'index.html'),'utf8');
const html='<!doctype html><html><head><meta charset="utf-8"></head><body>'+game+'</body></html>';
const MIN=+(process.argv[2]||20);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const page=await b.newPage({viewport:{width:640,height:360}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{try{localStorage.setItem('gl-tut-v1','1');localStorage.setItem('gl-p3d','0');}catch(e){}});
  await page.route('**/*',r=>{const u=new URL(r.request().url());
    if(u.host==='game.local'&&u.pathname==='/')return r.fulfill({body:html,contentType:'text/html'});
    if(u.href.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'});return r.abort();});
  await page.goto('http://game.local/');await page.waitForFunction(()=>window.__game);
  const R=await page.evaluate(MIN=>{const g=__game;g.startMatch({mode:'watch',minutes:90,home:0,away:2,firstKick:0});window.__freeze=true;
    const sp={stand:0,walk:0,jog:0,run:0,hsr:0,sprint:0},dir={forward:0,diagonal:0,sideways:0,backward:0},vis={},faceBall={moving:0,whileFacingBall:0};
    let turns=0,samples=0,moving=0,n=0;const hist=new Map(),runs=new Map();
    const steps=Math.round(MIN*60/0.1);
    for(let s=0;s<steps;s++){g.sim(0.1);if(g.state!=='play')continue;n++;
      for(const p of g.players){if(p.isGK||p.sentOff)continue;samples++;
        const v=Math.hypot(p.vel.x,p.vel.z);
        sp[v<0.2?'stand':v<2?'walk':v<4?'jog':v<5.5?'run':v<7?'hsr':'sprint']++;
        vis[p.visA]=(vis[p.visA]||0)+1;
        if(v>0.5){moving++;const tr=Math.atan2(p.vel.x,p.vel.z);let d=Math.abs(Math.atan2(Math.sin(tr-p.face),Math.cos(tr-p.face)))*180/Math.PI;
          dir[d<30?'forward':d<60?'diagonal':d<120?'sideways':'backward']++;faceBall.moving++;if(p.faceBall)faceBall.whileFacingBall++;}
        // turns: travel direction now against 0.5 s ago
        const h=hist.get(p)||[];h.push(v>1?Math.atan2(p.vel.x,p.vel.z):null);if(h.length>6)h.shift();hist.set(p,h);
        if(h.length===6&&h[0]!==null&&h[5]!==null){const d=Math.abs(Math.atan2(Math.sin(h[5]-h[0]),Math.cos(h[5]-h[0])));if(d>Math.PI/4){turns++;h.length=0;}}
        // sprint bouts: consecutive samples above 7 m/s
        const r=runs.get(p)||{on:0,bouts:[]};if(v>7)r.on+=0.1;else if(r.on>0){r.bouts.push(r.on);r.on=0;}runs.set(p,r);}}
    const bouts=[...runs.values()].flatMap(r=>r.bouts),pct=o=>{const t=Object.values(o).reduce((a,b)=>a+b,0)||1;return Object.fromEntries(Object.entries(o).map(([k,v])=>[k,+(100*v/t).toFixed(1)]));};
    const playMin=n*0.1/60,players=20;
    return {gameMinutesInPlay:+playMin.toFixed(1),speed:pct(sp),direction:pct(dir),facingBallWhileMoving:+(100*faceBall.whileFacingBall/(faceBall.moving||1)).toFixed(1),
      turnsPerPlayerPer90:+(turns/players/playMin*90).toFixed(0),sprintBoutsPerPlayerPer90:+(bouts.length/players/playMin*90).toFixed(1),meanSprintSeconds:+(bouts.reduce((a,b)=>a+b,0)/(bouts.length||1)).toFixed(2),
      animState:pct(vis),score:g.score,humanTeams:g.teams.map(t=>!!t.human)};},MIN);
  R.pageErrors=errors.length;await b.close();
  console.log(JSON.stringify(R,null,1));if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(R,null,1));
})().catch(e=>{console.error(e);process.exit(1);});
