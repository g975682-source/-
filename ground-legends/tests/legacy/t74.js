const open=require('./harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const {browser,page,errors,SP}=await open();
  await page.click('#btnClub');await sleep(300);await page.click('#cnGo');await sleep(400);
  // give the club a few 80+ cards with seasons
  await page.evaluate(()=>{const c=JSON.parse(localStorage.getItem('gl-club-v1'));return !!c;});
  await page.click('[data-tab=squad]');await sleep(8000);
  await page.screenshot({path:SP+'/shots/f_squad.png'});
  await page.click('[data-tab=packs]');await sleep(300);
  const btn=await page.$$('[data-pack]');console.log('packs',btn.length);
  await page.evaluate(()=>{});
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
