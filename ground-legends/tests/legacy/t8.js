const open=require('./harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const {browser,page,errors,SP}=await open();
  await page.evaluate(()=>__game.startMatch({mode:'play',minutes:5,diff:'pro',home:0,away:2}));
  await page.waitForTimeout(1500);
  const info=async(tag)=>{const r=await page.evaluate(()=>({st:__game.state,ctrl:__game.controlled&&__game.controlled.slot,own:__game.ball.owner?(__game.ball.owner.team+':'+__game.ball.owner.slot):'-',bx:__game.ball.pos.x.toFixed(1),bz:__game.ball.pos.z.toFixed(1),score:__game.score}));console.log(tag,JSON.stringify(r));};
  await info('kickoff');
  await page.keyboard.down('KeyS');await sleep(250);await page.keyboard.up('KeyS');
  await sleep(1500); await info('after pass');
  // the user dribbles right with sprint
  await page.keyboard.down('ArrowRight');await page.keyboard.down('KeyE');
  await sleep(2500); await info('dribble');
  await page.screenshot({path:SP+'/shots/dribble.png'});
  await page.keyboard.down('KeyD');await sleep(500);await page.keyboard.up('KeyD');
  await page.keyboard.up('ArrowRight');await page.keyboard.up('KeyE');
  await sleep(300); await page.screenshot({path:SP+'/shots/shot.png'});
  await sleep(1500); await info('after shot');
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
