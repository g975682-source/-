const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  await page.waitForTimeout(700);
  const before=await page.evaluate(()=>__game.controlled.label+' '+__game.controlled.short);
  await page.click('#lbCard');await page.waitForTimeout(200);
  const rows=await page.$$eval('#lbPickList button',b=>b.map(x=>x.innerText.replace(/\n/g,' ')));
  await page.screenshot({path:'pick1.png'});
  await page.click('#lbPickList button:nth-child(7)');await page.waitForTimeout(400);
  const after=await page.evaluate(()=>({ctl:__game.controlled.label+' '+__game.controlled.short,vis:__game.players.filter(p=>p.rig.root.visible).length,owner:__game.ball.owner===__game.controlled,listHidden:document.getElementById('lbPickList').hidden,card:document.getElementById('lbCard').innerText.replace(/\n/g,' ')}));
  // keys still drive him
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(500);await page.keyboard.up('ArrowRight');
  const moved=await page.evaluate(()=>Math.hypot(__game.controlled.vel.x,__game.controlled.vel.z).toFixed(1));
  await page.reload();await page.waitForTimeout(1500);
  const reload=await page.evaluate(()=>__game.controlled.label+' '+__game.controlled.short);
  console.log(JSON.stringify({before,rows,after,moved,reload}));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,5).join('\n'));
  await browser.close();
})();
