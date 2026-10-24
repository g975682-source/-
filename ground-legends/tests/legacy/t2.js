const open=require('./harness.js');
(async()=>{
  const {browser,page,errors,SP}=await open();
  await page.evaluate(()=>__game.sim(8));
  await page.waitForTimeout(800);
  await page.screenshot({path:SP+'/shots/title.png'});
  await page.click('#btnPlay'); await page.waitForTimeout(400);
  await page.screenshot({path:SP+'/shots/squad.png'});
  await page.click('#btnKick'); await page.waitForTimeout(1200);
  await page.screenshot({path:SP+'/shots/kickoff.png'});
  // pass
  await page.keyboard.down('KeyS'); await page.waitForTimeout(200); await page.keyboard.up('KeyS');
  await page.waitForTimeout(300);
  await page.evaluate(()=>__game.sim(6));
  await page.waitForTimeout(600);
  await page.screenshot({path:SP+'/shots/play1.png'});
  // state time histogram in human match (idle user)
  const h=await page.evaluate(()=>{const H={};for(let i=0;i<60*120;i++){if(__game.state==='replay'){}const s=__game.state;H[s]=(H[s]||0)+1;__game.sim(1/60);}return {H,score:__game.score,clock:__game.clock,st:__game.stats};});
  console.log(JSON.stringify(h));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
