const open=require('./harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const {browser,page,errors,SP}=await open({viewport:{width:390,height:844},touch:true});
  await page.tap('#btnPlay');await sleep(9000);
  await page.screenshot({path:SP+'/shots/f_quick_m.png'});
  console.log('ov',await page.$eval('#squad',e=>e.scrollWidth-e.clientWidth));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
