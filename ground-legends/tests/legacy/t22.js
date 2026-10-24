const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  const r=await page.evaluate(async()=>{
    __game.startMatch({mode:'play',minutes:5,home:0,away:4,firstKick:0});window.__freeze=true;__game.sim(1);
    const out=[];const cm=__game.give(0,5);out.push(['after give',__game.state,__game.controlled&&__game.controlled.slot,__game.ball.owner&&__game.ball.owner.slot]);
    __game.actDown('right');__game.actDown('pass');await new Promise(r=>setTimeout(r,120));__game.actUp('pass');__game.actUp('right');
    for(let i=0;i<5;i++){__game.sim(1/60);out.push([__game.state,__game.controlled&&__game.controlled.slot,__game.ball.owner?__game.ball.owner.team+':'+__game.ball.owner.slot:'-',__game.ball.vel.length().toFixed(1)]);}
    return out;});
  console.log(JSON.stringify(r));console.log(errors.filter(e=>!e.includes('ERR_FAILED')).join('\n'));
  await browser.close();
})();
