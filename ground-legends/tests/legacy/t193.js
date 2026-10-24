const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  const sleep=ms=>page.waitForTimeout(ms);
  await page.click('#btnClub');await sleep(300);await page.click('#cnGo');await sleep(500);
  await page.click('[data-tab=squad]');await sleep(200);
  const lu0=await page.evaluate(()=>JSON.parse(localStorage.getItem('gl-club-v1')).lineup);
  // bench player into slot 9
  await page.click('[data-slot="9"]');await sleep(150);
  const bench=await page.$eval('.prow:last-child',e=>e.dataset.pid);await page.click(`.prow[data-pid="${bench}"]`);await sleep(200);
  const st1=await page.evaluate(()=>({out:document.querySelectorAll('.pcard.swap-out').length,in:document.querySelectorAll('.pcard.swap-in').length,rowOut:document.querySelectorAll('.prow.swap-out').length,rowIn:document.querySelectorAll('.prow.swap-in').length,btn:!document.querySelector('[data-act=swap]').disabled,bar:document.querySelector('.swapbar').innerText.replace(/\n/g,' ')}));
  await page.screenshot({path:'swap1.png'});
  const lu1=await page.evaluate(()=>JSON.parse(localStorage.getItem('gl-club-v1')).lineup);   // nothing moved yet
  await page.click('[data-act=swap]');await sleep(250);
  const lu2=await page.evaluate(()=>JSON.parse(localStorage.getItem('gl-club-v1')).lineup);
  // two starters: slot 1 and slot 4 trade places
  await page.click('[data-slot="1"]');await sleep(120);await page.click('[data-slot="4"]');await sleep(150);
  const st2=await page.evaluate(()=>({out:document.querySelectorAll('.pcard.swap-out').length,in:document.querySelectorAll('.pcard.swap-in').length,bar:document.querySelector('.swapbar').innerText.replace(/\n/g,' ')}));
  await page.screenshot({path:'swap2.png'});
  await page.click('[data-act=swap]');await sleep(250);
  const lu3=await page.evaluate(()=>JSON.parse(localStorage.getItem('gl-club-v1')).lineup);
  // back to the lobby: practice uses the new starters
  await page.click('#btnClubBack');await sleep(600);
  await page.click('#lbCard');await sleep(200);
  const pracNames=await page.$$eval('#lbPickList button',b=>b.map(x=>x.innerText.split('\n')[1]));
  const xiNames=await page.evaluate(()=>{const c=JSON.parse(localStorage.getItem('gl-club-v1'));return c.lineup.map(id=>c.players.find(p=>p.id===id)).filter(p=>p.label!=='GK').map(p=>p.name);});
  const teamName=await page.evaluate(()=>__game.teams[0].def.name);
  console.log(JSON.stringify({st1,movedBeforeButton:JSON.stringify(lu0)!==JSON.stringify(lu1),benchIn:lu2[9]===+bench,st2,swapped:lu3[1]===lu2[4]&&lu3[4]===lu2[1],teamName,pracIsXI:pracNames.every(n=>xiNames.some(x=>x.includes(n)||n.includes(x)))&&pracNames.length===10,pracNames}));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,5).join('\n'));
  await browser.close();
})();
