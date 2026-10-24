const open=require('./harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const {browser,page,errors,SP}=await open();
  await page.screenshot({path:SP+'/shots/f_title.png'});
  await page.click('#btnClub');await sleep(300);await page.click('#cnGo');await sleep(400);
  await page.click('[data-tab=squad]');await sleep(2500);
  await page.screenshot({path:SP+'/shots/f_squad.png'});
  // pack reveal with forced high ovr
  await page.evaluate(()=>{const g=window.__game;});
  await page.click('[data-tab=packs]');await sleep(300);
  await page.screenshot({path:SP+'/shots/f_packs.png'});
  await page.click('[data-tab=market]');await sleep(2500);
  await page.screenshot({path:SP+'/shots/f_market.png'});
  await page.click('[data-tab=enhance]');await sleep(2000);
  await page.screenshot({path:SP+'/shots/f_enh.png'});
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
