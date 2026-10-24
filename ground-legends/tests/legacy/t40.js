const open=require('./harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const {browser,page,errors,SP}=await open();
  await page.click('#btnClub');await sleep(300);await page.click('#cnGo');await sleep(300);
  // give lots of BP and extra players by buying the market so we have materials
  await page.click('[data-tab=market]');await sleep(150);
  for(let i=0;i<4;i++){const b=await page.$('[data-buy]:not([disabled])');if(b){await b.click();await sleep(120);}}
  await page.click('[data-tab=enhance]');await sleep(200);await page.screenshot({path:SP+'/shots/e_empty.png'});
  // target = highest OVR (last in list sorted ascending), materials = next highest 4
  const ids=await page.$$eval('[data-epid]',els=>els.map(e=>e.dataset.epid));
  await page.click(`[data-epid="${ids[ids.length-1]}"]`);await sleep(120);
  for(let k=2;k<=5;k++){await page.click(`[data-epid="${ids[ids.length-k]}"]`);await sleep(120);}
  const info=await page.$eval('.rate',e=>e.textContent);const gauge=await page.$eval('.gauge2 span',e=>e.textContent);console.log('rate',info,gauge);
  await page.screenshot({path:SP+'/shots/e_ready.png'});
  const before=await page.$eval('#clubMeta',e=>e.textContent);
  await page.click('[data-act=enhgo]');await sleep(700);await page.screenshot({path:SP+'/shots/e_mid.png'});await sleep(1500);await page.screenshot({path:SP+'/shots/e_done.png'});
  console.log('result',await page.$eval('#enText',e=>e.textContent));
  await page.click('#enOk');await sleep(200);console.log(before,'->',await page.$eval('#clubMeta',e=>e.textContent));
  // key mapping: Shift triggers a skill move, E sprints
  const km=await page.evaluate(()=>{__game.startMatch({mode:'play',minutes:5,home:0,away:2,firstKick:0});window.__freeze=true;__game.sim(1);__game.actDown('pass');__game.actUp('pass');__game.sim(2);return true;});
  await page.keyboard.down('ShiftLeft');const sk=await page.evaluate(()=>{const a=__game.act;return [a.skill,a.sprint];});await page.keyboard.up('ShiftLeft');
  await page.keyboard.down('KeyE');const sp=await page.evaluate(()=>{const a=__game.act;return [a.skill,a.sprint];});await page.keyboard.up('KeyE');
  console.log('shift ->[skill,sprint]',sk,' E ->',sp);
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
