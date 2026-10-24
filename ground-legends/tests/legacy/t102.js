const open=require('./harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const {browser,page,errors,SP}=await open();
  await page.click('#btnClub');await sleep(300);await page.click('#cnGo');await sleep(400);
  // make it an old save: keeper with an outfield trait, an outfielder with deadeye
  await page.evaluate(()=>{const k='gl-club-v1',c=JSON.parse(localStorage.getItem(k));const gk=c.players.find(p=>p.label==='GK');gk.trait='fighter';const f=c.players.find(p=>p.label!=='GK');f.trait='deadeye';localStorage.setItem(k,JSON.stringify(c));});
  await page.reload();await sleep(1500);await page.click('#btnClub');await sleep(400);
  const mig=await page.evaluate(()=>{const c=JSON.parse(localStorage.getItem('gl-club-v1'));return 1;});
  await page.click('[data-tab=squad]');await sleep(500);
  const gkSlot=await page.$('.mini-pitch .pcard[data-slot="0"]');await gkSlot.click();await sleep(300);
  const btn=await page.$$('button');let clicked=false;for(const b of btn){const t=await b.textContent();if(t.includes('특성 변경')){await b.click();clicked=true;break;}}
  await sleep(300);
  const list=await page.$$eval('#tpList [data-trait]',bs=>bs.map(b=>b.dataset.trait));
  const who=await page.$eval('#tpWho',e=>e.textContent);
  await page.screenshot({path:SP+'/shots/gk_trait.png'});
  await page.click('#tpClose');
  const outs=await page.evaluate(()=>{const ps=JSON.parse(localStorage.getItem('gl-club-v1')).players;return {gk:ps.filter(p=>p.label==='GK').map(p=>p.trait),fieldDeadeye:ps.filter(p=>p.label!=='GK'&&p.trait==='deadeye').length};});
  console.log(JSON.stringify({clicked,list,who,outs}));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
