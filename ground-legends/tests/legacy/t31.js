const open=require('./harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const {browser,page,errors,SP}=await open();
  const S=n=>page.screenshot({path:SP+'/shots/c_'+n+'.png'});
  await page.click('#btnClub');await sleep(300);await S('new');
  await page.fill('#cnName','서울 스타즈');await page.fill('#cnCode','SST');
  await page.click('#cnKits .sw:nth-child(10)');await page.click('#cnGo');await sleep(400);await S('home');
  await page.click('[data-tab=squad]');await sleep(200);
  await page.click('[data-slot="9"]');await sleep(150);
  const pid=await page.$eval('.prow:last-child',e=>e.dataset.pid);await page.click(`.prow[data-pid="${pid}"]`);await sleep(200);await page.click('[data-act=swap]');await sleep(200);
  await page.click('[data-act=trait]');await sleep(200);await S('trait');
  await page.click('[data-trait=acrobatic]');await sleep(200);await S('squad');
  await page.click('[data-tab=market]');await sleep(200);await S('market');
  const bought=await page.$$eval('[data-buy]:not([disabled])',b=>b.length);
  if(bought){await page.click('[data-buy]:not([disabled])');await sleep(200);}
  await page.click('[data-tab=packs]');await sleep(200);await S('packs');
  await page.click('[data-pack=gold]');await sleep(900);await S('pack_mid');await sleep(1800);await S('pack_open');
  await page.click('#pkKeep');await sleep(200);
  const money=await page.$eval('#clubMoney',e=>e.textContent);console.log('money after buys',money,'bought',bought);
  await page.click('[data-tab=home]');await sleep(150);
  await page.click('[data-act=play]');await sleep(1200);await S('match');
  const run=()=>page.evaluate(()=>{window.__freeze=true;let n=0;while(__game.state!=='fulltime'&&__game.state!=='halftime'&&n<60*60*20){__game.sim(1/60);n++;}window.__freeze=false;return [__game.state,__game.score,__game.clock|0];});
  let st=await run();if(st[0]==='halftime'){await page.click('#btnSecond');await sleep(200);st=await run();}
  console.log('club match',st);await sleep(600);await S('result');
  await page.click('#btnRematch');await sleep(500);await S('home2');
  const meta=await page.$eval('#clubMeta',e=>e.textContent);const money2=await page.$eval('#clubMoney',e=>e.textContent);console.log(meta,money2);
  // reload persists
  await page.reload();await sleep(1500);await page.click('#btnClub');await sleep(300);console.log('after reload',await page.$eval('#clubMeta',e=>e.textContent));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
