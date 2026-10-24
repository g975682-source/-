const open=require('./harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const {browser,page,errors,SP}=await open({viewport:{width:390,height:844},touch:true});
  await page.tap('#btnClub');await sleep(300);await page.tap('#cnGo');await sleep(400);
  const ov=[];for(const t of ['home','squad','market','packs','facility']){await page.tap(`[data-tab=${t}]`);await sleep(200);ov.push(t+':'+await page.$eval('#club',e=>e.scrollWidth-e.clientWidth));if(t==='home'||t==='squad')await page.screenshot({path:SP+'/shots/m_club_'+t+'.png'});}
  console.log('overflow',ov.join(' '));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
