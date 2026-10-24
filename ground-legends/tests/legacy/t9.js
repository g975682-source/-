const open=require('./harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const {browser,page,errors,SP}=await open();
  const fps=await page.evaluate(()=>new Promise(r=>{let n=0;const t0=performance.now();function f(){n++;if(performance.now()-t0<2000)requestAnimationFrame(f);else r(n/2);}requestAnimationFrame(f);}));
  console.log('headless fps',fps);
  await page.evaluate(()=>{__game.startMatch({mode:'play',minutes:5,diff:'pro',home:0,away:2,firstKick:0});window.__freeze=true;});
  const info=async(tag)=>{const r=await page.evaluate(()=>({st:__game.state,ctrl:__game.controlled&&(__game.controlled.slot+' '+__game.controlled.pos.x.toFixed(1)+','+__game.controlled.pos.z.toFixed(1)),own:__game.ball.owner?(__game.ball.owner.team+':'+__game.ball.owner.slot):'-',ball:__game.ball.pos.x.toFixed(1)+','+__game.ball.pos.z.toFixed(1)+','+__game.ball.pos.y.toFixed(1),score:__game.score,sh:__game.stats.shots}));console.log(tag,JSON.stringify(r));};
  const sim=s=>page.evaluate(s=>__game.sim(s),s);
  const tap=async(a,ms)=>{await page.evaluate(a=>__game.actDown(a),a);await sleep(ms||60);await page.evaluate(a=>__game.actUp(a),a);};
  await sim(1.0);await info('kickoff');
  await tap('pass',120);await sim(0.05);await info('pass fired');await sim(1.4);await info('received');
  await page.evaluate(()=>{__game.actDown('right');__game.actDown('sprint');});
  for(let i=0;i<5;i++){await sim(0.6);await info('dribble '+i);}
  await page.evaluate(()=>{window.__freeze=false;});await sleep(600);await page.screenshot({path:SP+'/shots/dribble.png'});await page.evaluate(()=>{window.__freeze=true;});
  await tap('shoot',450);await page.evaluate(()=>{__game.actUp('right');__game.actUp('sprint');});await sim(0.3);await info('shot');
  await page.evaluate(()=>{window.__freeze=false;});await sleep(500);await page.screenshot({path:SP+'/shots/shot.png'});await page.evaluate(()=>{window.__freeze=true;});
  await sim(2);await info('after');
  // defend: let AI attack, hold S to press
  await page.evaluate(()=>__game.actDown('pass'));
  for(let i=0;i<6;i++){await sim(1);await info('press '+i);}
  await page.evaluate(()=>__game.actUp('pass'));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
