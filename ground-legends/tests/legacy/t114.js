const open=require('./harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const {browser,page,errors,SP}=await open({viewport:{width:1280,height:720}});
  await page.evaluate(()=>{const g=__game;g.startMatch({mode:'watch',minutes:12,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(14);window.__freeze=false;});
  await sleep(1500);await page.screenshot({path:SP+'/shots/m2_broadcast.png'});
  await page.evaluate(()=>{window.__freeze=true;__game.setCam&&__game.setCam(1);});await sleep(800);
  await page.screenshot({path:SP+'/shots/m2_dynamic.png'});
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
