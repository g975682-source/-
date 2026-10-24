const open=require('./harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const {browser,page,errors,SP}=await open({viewport:{width:1280,height:720}});
  await page.evaluate(()=>{const g=__game;g.startMatch({mode:'play',minutes:12,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(1);});
  const shot=async(name,fn)=>{await page.evaluate(fn);await sleep(900);await page.screenshot({path:SP+'/shots/m2_'+name+'.png'});};
  // line-up of six players side by side: idle, different bodies
  await shot('lineup',()=>{const g=__game,ps=g.players.filter(p=>!p.isGK).slice(0,6);let i=0;for(const p of g.players)p.pos.set(80,0,80);
    for(const p of [...ps,g.players.find(p=>p.isGK)]){p.pos.set(-3+i*1.0,0,0);p.face=0;p.vel.set(0,0,0);p.spd=0;p.visA=0;p.oAnim=null;i++;}
    g.ball.pos.set(0,0.11,4);window.__camOverride={pos:new THREE.Vector3(0,1.2,5.2),look:new THREE.Vector3(0,0.95,0)};});
  // running gait frames
  await shot('run',()=>{const g=__game,p=g.players[9];for(const q of g.players)if(q!==p)q.pos.set(80,0,80);p.pos.set(0,0,0);p.face=Math.PI/2;p.vel.set(7,0,0);p.spd=7;p.visA=1;
    window.__camOverride={pos:new THREE.Vector3(0.2,1.1,3.6),look:new THREE.Vector3(0,0.9,0)};window.__runP=p;});
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
