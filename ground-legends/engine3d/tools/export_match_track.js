// An AI-against-AI match exported as 10 Hz tracking (every player's and the ball's position, the team in possession
// and the ball carrier), in the format that tools/track_an.py reads, so that the game's movement can be measured with
// the same code as real matches (SkillCorner open data, broadcast tracking). Development tool; reads the game only.
//   [GAME=other.html] [SEED=n] [HOME_T=i] [AWAY=j] node ground-legends/engine3d/tools/export_match_track.js <game minutes> <out.jsonl>
// Coordinates as in the real data: x along the pitch (the game's x), y across (the game's z), metres from the centre.
// Only frames with the ball in play are written, up to full time (or a team below seven players: the game would
// have no outfield player for a kick-off); the last line says where the run stopped.
const path=require('path'),fs=require('fs');
const GL=path.join(__dirname,'..','..');
const P=require(path.join(GL,'tests','legacy','paths.js'));const {chromium}=require(P.PLAYWRIGHT);
const three=fs.readFileSync(P.THREE_JS,'utf8'),game=fs.readFileSync(process.env.GAME||path.join(GL,'index.html'),'utf8');
const html='<!doctype html><html><head><meta charset="utf-8"></head><body>'+game+'</body></html>';
const MIN=+(process.argv[2]||90),OUT=process.argv[3]||'game_track.jsonl';
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const page=await b.newPage({viewport:{width:640,height:360}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{try{localStorage.setItem('gl-tut-v1','1');localStorage.setItem('gl-p3d','0');}catch(e){}});
  if(process.env.SEED)await page.addInitScript(seed=>{let a=seed>>>0;Math.random=()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};},+process.env.SEED);
  await page.route('**/*',r=>{const u=new URL(r.request().url());
    if(u.host==='game.local'&&u.pathname==='/')return r.fulfill({body:html,contentType:'text/html'});
    if(u.href.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'});return r.abort();});
  await page.goto('http://game.local/');await page.waitForFunction(()=>window.__game);
  const lines=await page.evaluate(([MIN,H,A])=>{const g=__game;g.startMatch({mode:'watch',minutes:90,home:H,away:A,firstKick:0});window.__freeze=true;
    const id=new Map(g.players.map((p,i)=>[p,i])),out=[JSON.stringify({meta:g.players.map((p,i)=>[i,p.team,p.isGK?1:0,p.label||''])})];
    let poss=null,f=0;const steps=Math.round(MIN*60/0.1),mode0=g.mode,n0=g.players.length;
    // up to full time (after it the watch mode goes on to other games)
    for(let s=0;s<steps;s++){g.sim(0.1);f++;if(g.state==='fulltime'||g.mode!==mode0||g.players.length!==n0||g.teams.some(t=>t.players.length<7))break;const o=g.ball.owner;if(o)poss=o.team;if(g.state!=='play')continue;
      out.push(JSON.stringify({f,h:g.half||1,b:[+g.ball.pos.x.toFixed(2),+g.ball.pos.z.toFixed(2)],p:poss,c:o?id.get(o):null,
        pl:g.players.filter(p=>!p.sentOff).map(p=>[id.get(p),+p.pos.x.toFixed(2),+p.pos.z.toFixed(2)])}));}
    out.push(JSON.stringify({end:{steps:f,clock:g.clock,state:g.state,score:g.score,sentOff:g.players.filter(p=>p.sentOff).length,yellow:g.players.reduce((a,p)=>a+(p.yellow||0),0),stats:g.stats}}));return out;},[MIN,+(process.env.HOME_T||0),+(process.env.AWAY||2)]);
  fs.writeFileSync(OUT,lines.join('\n')+'\n');console.log('frames',lines.length-1,'page errors',errors.length);await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
