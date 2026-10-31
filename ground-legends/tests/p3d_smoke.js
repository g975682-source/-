#!/usr/bin/env node
// The new 3D player models (engine3d/) in the real game page: loading, one player in the stadium, following the game,
// keyboard control, the fallback, and the cost with every player on. Asserts; exit code 1 on any failure.
//   node ground-legends/tests/p3d_smoke.js            (screenshots to TEST_OUT or legacy/out/p3d/)
// The page is ground-legends/index.html as it is, served with the engine3d/ files; three.js r128 local, as the other
// tests. Checks:
//   off   ?p3d=0: the engine is not loaded and the game runs as before
//   default  no ?p3d and nothing stored: every player gets the model
//   one   ?p3d=one: the model loads, one player (the human team's striker) gets it, the game's own meshes for him are
//         on the hidden layer while his rig root stays visible (the online sync reads it), the copy stands where the
//         rig stands and faces the same way, the boots stand on the grass when idle
//   play  keyboard: that player, set as the controlled one, runs with the arrow keys; the copy follows him
//   html  the engine's files answered with the game page: not run, no page error
//   json  no .glb served: the model comes from the base64 .json beside it
//   bad   a missing model file: the engine reports the error, no player is changed, no page error
//   all   ?p3d=all: all 22 players, the engine's own time per frame
const fs=require('fs'),path=require('path');
const P=require('./legacy/paths.js');
const {chromium}=require(P.PLAYWRIGHT);
// P3D_SITE=docs checks the website copy (docs/index.html, a whole document, with docs/engine3d/) instead
const GL=process.env.P3D_SITE?path.resolve(process.env.P3D_SITE):path.join(__dirname,'..'),OUT=path.join(process.env.TEST_OUT||path.join(__dirname,'legacy','out'),'p3d');fs.mkdirSync(OUT,{recursive:true});
const three=fs.readFileSync(P.THREE_JS,'utf8'),game=fs.readFileSync(path.join(GL,'index.html'),'utf8');
const html=/^<!doctype/i.test(game)?game:'<!doctype html><html><head><meta charset="utf-8"></head><body>'+game+'</body></html>';
let fails=0;const ok=(c,m)=>{console.log((c?'ok   ':'FAIL ')+m);if(!c)fails++;};

async function open(browser,query,opts={}){
  const page=await browser.newPage({viewport:{width:1100,height:640}});const errors=[];
  await page.addInitScript(()=>{try{localStorage.setItem('gl-tut-v1','1');}catch(e){}});
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  // requests outside the page are refused here (fonts and the like): the browser reports those as console errors, not the game
  page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errors.push('console: '+m.text());});
  await page.route('**/*',r=>{const u=new URL(r.request().url());
    if(u.host==='game.local'&&(u.pathname==='/'||u.pathname==='/index.html'))return r.fulfill({body:html,contentType:'text/html'});
    if(u.href.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'});
    if(u.host==='game.local'&&u.pathname.startsWith('/engine3d/')){
      if(opts.missingModel&&/\.glb(\.json)?$/.test(u.pathname))return r.fulfill({status:404,body:'not found'});
      if(opts.noGlb&&u.pathname.endsWith('.glb'))return r.fulfill({status:404,body:'not found'});   // a host without .glb: the .json copy
      if(opts.htmlForEngine)return r.fulfill({body:html,contentType:'text/html'});   // a server that answers any path with the page
      const f=path.join(GL,decodeURIComponent(u.pathname));if(fs.existsSync(f))return r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.json')?'application/json':'model/gltf-binary'});
      return r.fulfill({status:404,body:'not found'});}
    return r.abort();});
  await page.goto('http://game.local/'+query);
  await page.waitForFunction(()=>window.__game,null,{timeout:30000});
  return {page,errors};
}
const ST=`(()=>{const T=__game.teams.find(t=>t.human)||__game.teams[0];return T.players.find(q=>q.label==='ST');})()`;
const startMatch=page=>page.evaluate(()=>{__game.startMatch({mode:'play',minutes:12,home:0,away:2,firstKick:0});});
const waitReady=page=>page.waitForFunction(()=>window.P3D&&(window.P3D.status.ready||window.P3D.status.error),null,{timeout:60000});

(async()=>{
  const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  try{
    // off
    {const {page,errors}=await open(browser,'?p3d=0');await startMatch(page);await page.waitForTimeout(1500);
      const r=await page.evaluate(()=>({p3d:!!window.P3D,state:__game.state,n:__game.players.length}));
      ok(!r.p3d&&r.n===22&&errors.length===0,`off: ?p3d=0, engine not loaded (${r.p3d}), match ${r.state} with ${r.n} players, page errors ${errors.length}`);
      await page.screenshot({path:path.join(OUT,'off.png')});await page.close();}
    // one + play
    {const {page,errors}=await open(browser,'?p3d=one');await waitReady(page);await startMatch(page);
      // the title screen's demo match has its own striker of the same name: wait for this match's own player
      await page.waitForFunction('!!P3D.measure('+ST+')',null,{timeout:20000});
      const st=await page.evaluate(()=>P3D.status);
      ok(st.ready&&!st.error,`one: model loaded (${st.verts} vertices), error ${st.error}`);
      const who=await page.evaluate(()=>{const T=__game.teams.find(t=>t.human)||__game.teams[0];const p=T.players.find(q=>q.label==='ST');return {short:p.short,label:p.label,team:p.team};});
      ok(st.attached.length===1&&st.attached[0]===who.short,`one: one player has the model: ${JSON.stringify(st.attached)} (striker ${who.short}, team ${who.team})`);
      // idle: stand still a moment
      await page.evaluate(()=>{window.__freeze=true;});await page.waitForTimeout(300);
      const m0=await page.evaluate('P3D.measure('+ST+')');
      if(!m0)console.log('  status when the striker has no copy:',JSON.stringify(await page.evaluate(()=>P3D.status)));
      ok(m0.hiddenOk&&m0.hiddenMeshes>10&&m0.rigRootVisible,`one: game meshes hidden (${m0.hiddenMeshes} on layer 1), rig root still visible ${m0.rigRootVisible}`);
      const dpos=Math.hypot(m0.holder[0]-m0.rig[0],m0.holder[1]-m0.rig[1],m0.holder[2]-m0.rig[2]);
      ok(dpos<1e-6&&Math.abs(m0.face[0]-m0.face[1])<1e-6,`one: copy at the rig's place (|d| ${dpos.toExponential(1)} m) and facing (${m0.face.map(x=>x.toFixed(3)).join(' / ')}), scale ${m0.scale.toFixed(3)}`);
      ok(Math.abs(m0.lowBoot)<0.03,`one: lowest boot vertex standing at the kick-off ${(m0.lowBoot*100).toFixed(1)} cm (|x| < 3 cm)`);
      await page.screenshot({path:path.join(OUT,'one_kickoff.png')});
      // close view of him: move the game camera's focus is the game's job; take the page view, then a play view
      // out of the kick-off: open play, the ball with someone else on his team so that he runs free
      await page.evaluate(()=>{window.__freeze=false;const T=__game.teams.find(t=>t.human)||__game.teams[0];const p=T.players.find(q=>q.label==='ST');__game.give(T.idx,T.players.find(q=>q.label==='CB'||q.isGK).slot);__game.setCtl(p);});
      const before=await page.evaluate(()=>{const p=__game.controlled;return {x:p.pos.x,z:p.pos.z,short:p.short};});
      // SwiftShader draws slowly and the game runs at most 4 steps a drawn frame, so game time here runs well under real time
      ok(before.short===who.short,`play: the 3D player is the controlled one (${before.short})`);
      await page.keyboard.down('ArrowUp');await page.keyboard.down('ArrowRight');await page.waitForTimeout(1200);
      const mid=await page.evaluate('(p=>({x:p.pos.x,z:p.pos.z,spd:p.spd,visA:p.visA,m:P3D.measure(p)}))('+ST+')');
      await page.screenshot({path:path.join(OUT,'one_running.png')});
      await page.keyboard.up('ArrowUp');await page.keyboard.up('ArrowRight');await page.waitForTimeout(800);
      const moved=Math.hypot(mid.x-before.x,mid.z-before.z),dm=Math.hypot(mid.m.holder[0]-mid.m.rig[0],mid.m.holder[2]-mid.m.rig[2]);
      ok(moved>0.3&&mid.spd>1&&mid.visA===1&&dm<1e-6,`play: arrows moved him ${moved.toFixed(2)} m (speed ${mid.spd.toFixed(2)} m/s, anim ${mid.visA}); copy follows (|d| ${dm.toExponential(1)} m)`);
      const after=await page.evaluate('(p=>({spd:p.spd,m:P3D.measure(p)}))('+ST+')');
      await page.screenshot({path:path.join(OUT,'one_after.png')});
      ok(after.m.inScene,`play: still drawn after stopping (speed ${after.spd.toFixed(2)})`);
      // shoot: D held briefly
      await page.evaluate('(p=>{__game.give(p.team,p.slot);__game.setCtl(p);})('+ST+')');
      await page.keyboard.down('d');await page.waitForTimeout(200);await page.keyboard.up('d');
      let kicked=false,shots=[];for(let i=0;i<12;i++){await page.waitForTimeout(60);const s=await page.evaluate('(p=>({a:p.visA,t:p.visT,ball:__game.ball.vel.length()}))('+ST+')');shots.push(s);if(s.a===2)kicked=true;
        if(i===4)await page.screenshot({path:path.join(OUT,'one_kick.png')});}
      ok(kicked,`play: the shot plays the kick on him (anim 2 seen: ${kicked}; ball speed after ${shots[shots.length-1].ball.toFixed(1)} m/s)`);
      ok(errors.length===0,`one/play: page errors ${errors.length}${errors.length?' '+errors.slice(0,3).join(' | '):''}`);
      await page.close();}
    // bad
    {const {page,errors}=await open(browser,'?p3d=one',{missingModel:true});await waitReady(page);await startMatch(page);await page.waitForTimeout(1500);
      const st=await page.evaluate(()=>P3D.status);
      const hidden=await page.evaluate(()=>__game.players.some(p=>{let h=false;p.rig.root.traverse(o=>{if(o.layers&&o.layers.mask!==1)h=true;});return h;}));
      ok(!st.ready&&!!st.error&&st.attached.length===0&&!hidden&&errors.filter(e=>!/404|Failed to load/.test(e)).length===0,`bad: model missing -> error "${st.error}", nothing attached, no game mesh hidden (${hidden}), page errors ${errors.filter(e=>!/404|Failed to load/.test(e)).length}`);
      await page.close();}
    // html: the engine's files answered with the game page (as the legacy test harness and some servers do)
    {const {page,errors}=await open(browser,'?p3d=all',{htmlForEngine:true});await startMatch(page);await page.waitForTimeout(2000);
      const r=await page.evaluate(()=>({p3d:!!window.P3D,state:__game.state}));
      ok(!r.p3d&&errors.length===0,`html: engine files answered with a page -> engine not started (${r.p3d}), match ${r.state}, page errors ${errors.length}${errors.length?' '+errors[0]:''}`);
      await page.close();}
    // json: no .glb served, the base64 copy instead
    {const {page,errors}=await open(browser,'?p3d=one',{noGlb:true});await waitReady(page);await startMatch(page);
      await page.waitForFunction('!!P3D.measure('+ST+')',null,{timeout:20000});const st=await page.evaluate(()=>P3D.status);
      ok(st.ready&&st.attached.length===1&&errors.length===0,`json: .glb not served -> model from mh_player.glb.json, ready ${st.ready}, ${st.attached.length} player, page errors ${errors.length}`);
      await page.close();}
    // default: no parameter and nothing stored means every player
    {const {page,errors}=await open(browser,'');await waitReady(page);await startMatch(page);
      await page.waitForFunction(()=>P3D.status.attached.length===22,null,{timeout:30000});
      const st=await page.evaluate(()=>P3D.status);ok(st.mode==='all'&&st.attached.length===22&&errors.length===0,`default: no ?p3d -> mode ${st.mode}, ${st.attached.length} players, page errors ${errors.length}`);
      await page.close();}
    // all
    {const {page,errors}=await open(browser,'?p3d=all');await waitReady(page);await startMatch(page);
      await page.waitForFunction(()=>P3D.status.attached.length===22,null,{timeout:30000});await page.waitForTimeout(5000);
      const st=await page.evaluate(()=>P3D.status);await page.screenshot({path:path.join(OUT,'all.png')});
      ok(st.attached.length===22&&errors.length===0,`all: ${st.attached.length} players with the model, engine ${st.msPerFrame} ms per frame over ${st.frames} frames, ${st.msPerAttach} ms per player to set up (CPU side; skinning runs on the GPU), page errors ${errors.length}`);
      await page.close();}
    // and back off: ?p3d=0 is remembered
    {const {page}=await open(browser,'?p3d=0');await page.waitForTimeout(800);const r=await page.evaluate(()=>({p3d:!!window.P3D,stored:localStorage.getItem('gl-p3d')}));
      ok(!r.p3d&&r.stored==='0',`off again: ?p3d=0 stored (${r.stored}), engine not loaded`);await page.close();}
  }finally{await browser.close();}
  console.log(fails?`RESULT: FAIL (${fails})`:'RESULT: PASS');process.exitCode=fails?1:0;
})().catch(e=>{console.error(e);process.exit(2);});
