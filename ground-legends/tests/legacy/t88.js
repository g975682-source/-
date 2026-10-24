const open=require('./harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const {browser,page,errors,SP}=await open({viewport:{width:1280,height:800}});
  await page.click('#btnHelp');await sleep(400);
  await page.screenshot({path:SP+'/shots/h_help1.png'});
  await page.evaluate(()=>{const c=document.querySelector('#help .card');c.scrollTop=900;});await sleep(200);
  await page.screenshot({path:SP+'/shots/h_help2.png'});
  console.log(await page.evaluate(()=>{const c=document.querySelector('#help .card');return [c.scrollHeight,c.clientHeight,document.documentElement.scrollWidth];}));
  await page.click('#btnHelpClose');
  await page.setViewportSize({width:390,height:844});await page.click('#btnHelp');await sleep(300);
  console.log('mobile overflow',await page.evaluate(()=>document.querySelector('#help .card').scrollWidth-document.querySelector('#help .card').clientWidth));
  await page.screenshot({path:SP+'/shots/h_help_m.png'});
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
