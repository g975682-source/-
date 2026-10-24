const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  await page.waitForTimeout(800);
  await page.screenshot({path:'lobby1.png'});
  const st=await page.evaluate(()=>({mode:__game.mode,state:__game.state,ctl:__game.controlled&&__game.controlled.label,vis:__game.players.filter(p=>p.rig.root.visible).length}));
  console.log(JSON.stringify(st));
  // move and shoot with the real keys
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(900);await page.keyboard.down('KeyD');await page.waitForTimeout(250);await page.keyboard.up('KeyD');await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(500);await page.screenshot({path:'lobby2.png'});
  await page.waitForTimeout(2500);
  console.log(JSON.stringify(await page.evaluate(()=>({state:__game.state,shots:__game.stats.shots[0],owner:__game.ball.owner&&__game.ball.owner.label,card:document.getElementById('lbCard').innerText}))));
  await page.keyboard.press('BracketRight');await page.waitForTimeout(600);
  console.log('pen',JSON.stringify(await page.evaluate(()=>({state:__game.state,sp:__game.sp&&__game.sp.type}))));
  await page.screenshot({path:'lobby3.png'});
  await page.keyboard.press('Escape');await page.waitForTimeout(800);
  console.log('esc',JSON.stringify(await page.evaluate(()=>({mode:__game.mode,hint:document.getElementById('lbHint').innerText,vis:__game.players.filter(p=>p.rig.root.visible).length}))));
  await page.screenshot({path:'lobby4.png'});
  await page.keyboard.press('Enter');await page.waitForTimeout(500);
  console.log('enter',JSON.stringify(await page.evaluate(()=>({vis:__game.players.filter(p=>p.rig.root.visible).length,hint:document.getElementById('lbHint').innerText}))));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
