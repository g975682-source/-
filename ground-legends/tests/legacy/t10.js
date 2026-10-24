const open=require('./harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const {browser,page,errors,SP}=await open();
  await page.evaluate(()=>{__game.startMatch({mode:'play',minutes:3,diff:'legend',home:5,away:3,firstKick:1});window.__freeze=true;});
  const until=async(st,max)=>page.evaluate(([st,max])=>{for(let i=0;i<max*60;i++){if(__game.state===st)return true;if(__game.state==='replay'&&st!=='replay'){}window.__keepReplay=true;tickOne();}return false;function tickOne(){const s=__game.state;if(s==='replay'&&st!=='replay'){__game.sim(1/60);}else __game.sim(1/60);}},[st,max]);
  let ok=await until('goal',200);console.log('goal',ok,await page.evaluate(()=>__game.score));
  await page.evaluate(()=>__game.sim(0.4));
  await page.evaluate(()=>{window.__freeze=false;});await sleep(700);await page.screenshot({path:SP+'/shots/goal.png'});await page.evaluate(()=>{window.__freeze=true;});
  // advance to replay without skipping: run ticks manually (sim auto-skips replay, so step via frames)
  await page.evaluate(()=>{for(let i=0;i<3.3*60;i++){if(__game.state==='replay')break;__game.sim(1/60);}});
  console.log('state',await page.evaluate(()=>__game.state));
  await page.evaluate(()=>{window.__freeze=false;});await sleep(2500);await page.screenshot({path:SP+'/shots/replay.png'});
  await page.keyboard.press('KeyX');await page.evaluate(()=>{window.__freeze=true;});
  ok=await until('halftime',400);console.log('half',ok,await page.evaluate(()=>[__game.score,__game.state]));
  await page.evaluate(()=>{window.__freeze=false;});await sleep(400);await page.screenshot({path:SP+'/shots/halftime.png'});
  await page.click('#btnSecond');await page.evaluate(()=>{window.__freeze=true;});
  ok=await until('fulltime',400);console.log('full',ok,await page.evaluate(()=>[__game.score,__game.state,__game.half]));
  await page.evaluate(()=>{window.__freeze=false;});await sleep(500);await page.screenshot({path:SP+'/shots/result.png'});
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
