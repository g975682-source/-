const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  await page.evaluate(()=>{const g=__game;g.startMatch({mode:'play',minutes:12,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(1);
    const p=g.give(0,9);p.pos.set(32,0,-6);p.face=Math.PI/2;g.ball.pos.set(32.5,0.11,-6);g.setCtl(p);g.sim(0.1);
    g.actDown('f');g.actDown('shoot');g.sim(1/60);g.actUp('shoot');g.sim(0.4);});
  await page.waitForTimeout(400);
  await page.screenshot({path:'ps1.png'});
  await page.evaluate(()=>{const g=__game;while(g.ps&&g.ps.t/0.8<g.ps.c)g.sim(1/60);g.actDown('shoot');g.sim(1/60);g.actUp('shoot');g.actUp('f');g.sim(0.25);});
  await page.waitForTimeout(200);
  await page.screenshot({path:'ps2.png'});
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
