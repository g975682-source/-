const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  await page.waitForTimeout(600);
  await page.keyboard.down('KeyF');await page.keyboard.down('KeyD');await page.waitForTimeout(80);await page.keyboard.up('KeyD');await page.waitForTimeout(250);
  await page.screenshot({path:'p1.png'});const a=await page.$eval('#psGauge',e=>[e.hidden,e.style.left,e.style.top]);
  await page.keyboard.up('KeyF');await page.waitForTimeout(1200);
  await page.evaluate(()=>{const g=__game;g.startMatch({mode:'play',minutes:30,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(1);const T=g.teams[0];const p=g.give(0,T.players.find(q=>q.label==='ST').slot);g.setCtl(p);for(const q of g.teams[1].players)if(!q.isGK)q.pos.x=-40;window.__freeze=false;});
  await page.waitForTimeout(400);
  await page.keyboard.down('KeyF');await page.keyboard.down('KeyD');await page.waitForTimeout(80);await page.keyboard.up('KeyD');await page.waitForTimeout(300);
  await page.screenshot({path:'p2.png'});const b=await page.$eval('#psGauge',e=>[e.hidden,e.style.left,e.style.top]);await page.keyboard.up('KeyF');
  console.log(JSON.stringify({prac:a,match:b}),'ERR',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,3).join('|'));
  await browser.close();
})();
