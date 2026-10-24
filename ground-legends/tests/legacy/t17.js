const open=require('./harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const {browser,page,errors,SP}=await open();
  await page.evaluate(()=>{__game.startMatch({mode:'play',minutes:5,home:6,away:7,firstKick:1});__game.sim(6);});
  for(const m of [1,2]){await page.evaluate(m=>{__game.setCam(m);},m);await sleep(2500);await page.screenshot({path:SP+'/shots/cam'+m+'.png'});}
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
