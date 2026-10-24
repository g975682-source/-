const open=require('./harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const {browser,page,errors,SP}=await open();
  const shot=async(n,ms=1800)=>{await page.evaluate(()=>{window.__freeze=false;});await sleep(ms);await page.evaluate(()=>{window.__freeze=true;});await page.screenshot({path:SP+'/shots/'+n+'.png'});};
  await page.evaluate(()=>{__game.startMatch({mode:'play',minutes:5,home:1,away:5,firstKick:0});window.__freeze=true;__game.sim(1);__game.actDown('pass');__game.actUp('pass');__game.sim(6);});
  await shot('v_play');
  // card: give ball to our winger in their half, force yellow
  const info=await page.evaluate(()=>{const p=__game.give(0,8);p.pos.set(20,0,-10);__game.ball.pos.set(20.6,0.11,-10);const n=__game.foul('yellow');__game.sim(1.6);return [n,__game.state];});
  console.log('foul',info);
  await shot('v_card',1200);
  const r2=await page.evaluate(()=>{__game.sim(3);return [__game.state,__game.sp&&__game.sp.type,!!(__game.sp&&__game.sp.fk)];});console.log('after card',r2);
  // red card -> send off
  const r3=await page.evaluate(()=>{const p=__game.give(0,9);p.pos.set(30,0,2);__game.ball.pos.set(30.6,0.11,2);const n=__game.foul('red');__game.sim(1.7);return n;});
  await shot('v_red',1200);
  const r4=await page.evaluate(()=>{__game.sim(4);const off=__game.players.filter(p=>p.sentOff).map(p=>p.short);return [off,__game.state,__game.sp&&__game.sp.type,__game.sp&&!!__game.sp.fk];});console.log('after red',r4);
  // FK aim mode (direct FK from the red-card foul at x=30)
  await shot('v_fk_aim',1500);
  const r5=await page.evaluate(async()=>{__game.actDown('right');__game.sim(0.4);__game.actUp('right');__game.actDown('shoot');await new Promise(r=>setTimeout(r,550));__game.actUp('shoot');__game.sim(0.1);__game.actDown('left');__game.sim(0.4);
    return [__game.state,__game.sp&&__game.sp.fk&&__game.sp.fk.mode,__game.sp&&__game.sp.fk&&__game.sp.fk.curve];});
  console.log('fk run',r5);
  await page.evaluate(()=>{__game.sim(0.3);__game.actUp('left');});
  await shot('v_fk_flight',700);
  const r6=await page.evaluate(()=>{const out=[];for(let i=0;i<150;i++){__game.sim(1/60);if(i%15==0)out.push([__game.state,__game.ball.pos.x.toFixed(1),__game.ball.pos.y.toFixed(1),__game.ball.pos.z.toFixed(1)]);}return [out,__game.score];});
  console.log('fk flight',JSON.stringify(r6));
  // standing tackle pose close-up
  await page.evaluate(()=>{const ps=__game.players;const p=ps[3];p.pos.set(0,0,0);p.state='tackle';p.stateT=0.25;p.face=Math.PI/2;p.visA=13;p.visT=0.25;window.__freeze=true;
    for(const q of ps)if(q!==p)q.pos.set(80,0,80);const R=__game.officials[0];R.pos.set(2.5,0,-1);R.anim='refCard';R.animT=1;R.card='red';R.face=-Math.PI/2;R.visA=14;R.visT=1;
    window.__camOverride={pos:new THREE.Vector3(1.2,1.4,5.2),look:new THREE.Vector3(1.2,0.9,0)};});
  await sleep(1200);await page.screenshot({path:SP+'/shots/v_tackle.png'});
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
