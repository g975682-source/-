const open=require('./harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const {browser,page,errors,SP}=await open();
  await page.click('#btnClub');await sleep(300);await page.click('#cnGo');await sleep(300);
  await page.click('[data-act=play]');await sleep(800);
  const run=()=>page.evaluate(()=>{window.__freeze=true;let n=0;while(__game.state!=='fulltime'&&__game.state!=='halftime'&&n<60*60*20){__game.sim(1/60);n++;}window.__freeze=false;return __game.state;});
  if(await run()==='halftime'){await page.click('#btnSecond');await sleep(200);await run();}
  for(let i=0;i<6;i++){await sleep(1000);console.log("t",i,await page.$eval("#fade",e=>getComputedStyle(e).opacity+" "+e.className),await page.evaluate(()=>__game.state));}
  console.log('result hidden?',await page.$eval('#result',e=>e.hidden),'fade op',await page.$eval('#fade',e=>getComputedStyle(e).opacity));
  await page.screenshot({path:SP+'/shots/c_result.png'});
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
