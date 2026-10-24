const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  const r=await page.evaluate(async()=>{
    const g=__game,wait=ms=>new Promise(r=>setTimeout(r,ms));
    g.startMatch({mode:'play',minutes:12,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(1);
    g.setPiece('penalty',0,41.5,0);g.sim(0.8);const o=[];o.push('sp '+g.sp.type+' bp '+g.ball.pos.x.toFixed(1));
    g.actDown('switch');g.sim(1/60);g.actDown('shoot');await wait(250);g.actUp('shoot');g.actUp('switch');
    for(let i=0;i<70;i++){g.sim(1/60);if(i%5==0)o.push(i+' '+g.state+' v='+g.ball.vel.length().toFixed(1)+' y='+g.ball.pos.y.toFixed(2)+' x='+g.ball.pos.x.toFixed(1)+' fk='+(g.sp&&g.sp.fk?g.sp.fk.mode+(g.sp.fk.chip?'C':''):'-'));}
    return o;});
  console.log(r.join('\n'));
  await browser.close();
})();
