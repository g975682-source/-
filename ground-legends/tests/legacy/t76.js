const open=require('./harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const {browser,page,errors,SP}=await open();
  await page.click('#btnClub');await sleep(300);await page.click('#cnGo');await sleep(400);
  await page.evaluate(()=>{const k='gl-club-v1',c=JSON.parse(localStorage.getItem(k));const codes=['EG','GE','IML','PDY','UIC','TMS','AEL','WCD','IFS','SPL'];
    c.players.forEach((p,i)=>{if(i<11){p.ovr=80+i;p.season=codes[i%10];}});localStorage.setItem(k,JSON.stringify(c));});
  await page.reload();await sleep(1500);
  await page.click('#btnClub');await sleep(400);
  await page.click('[data-tab=squad]');await sleep(9000);
  await page.screenshot({path:SP+'/shots/f_squad3.png'});
  await page.click('.mini-pitch .pcard[data-slot="9"]');await sleep(2500);
  await page.evaluate(()=>window.scrollTo(0,9999));await sleep(300);
  await page.screenshot({path:SP+'/shots/f_detail.png'});
  // gallery of all ten season big cards
  await page.evaluate(()=>{});
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
