const open=require('./harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const {browser,page,errors,SP}=await open({viewport:{width:390,height:844},touch:true});
  await page.tap('#btnClub');await sleep(300);await page.tap('#cnGo');await sleep(400);
  await page.tap('[data-tab=cups]');await sleep(500);
  console.log('overflow',await page.$eval('#club',e=>e.scrollWidth-e.clientWidth));
  await page.screenshot({path:SP+'/shots/cups_m.png',fullPage:false});
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
