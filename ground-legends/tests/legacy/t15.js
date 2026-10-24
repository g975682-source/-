const open=require('./harness.js');
(async()=>{
  const {browser,page}=await open();
  const r=await page.evaluate(()=>{window.__dbg=[];
    for(let i=0;i<600&&__game.state!=='play';i++)__game.sim(1/60);
    __game.sim(3);
    const b=__game.ball;b.owner=null;b.pos.set(5,0.11,30);b.vel.set(0,0,12);b.lastTouch=__game.players[3];
    const out=[];for(let i=0;i<120;i++){__game.sim(1/60);if(i%10==0)out.push([__game.state,b.pos.z.toFixed(2),b.owner?b.owner.team+':'+b.owner.slot:'-'].join(' '));}
    return out.concat(window.__dbg.filter(e=>e[0]==='sp'||e[0]==='gain').map(e=>e.join(' ')));});
  console.log(r.join('\n'));
  await browser.close();
})();
