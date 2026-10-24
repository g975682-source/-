const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  const th=await page.evaluate(()=>{__game.startMatch({mode:'play',minutes:12,home:2,away:3,firstKick:0});window.__freeze=true;__game.sim(1);
    __game.setPiece('throw',0,50,33.95);__game.sim(0.8);const b=__game.ball,t=__game.sp.taker;
    __game.actDown('pass');__game.actUp('pass');__game.sim(1/60);const flags=[b.noGoal,b.restartBy===t];
    b.owner=null;b.pos.set(51.5,1.2,2);b.vel.set(8,0,0);b.lastTouch=t;
    for(let i=0;i<100;i++)__game.sim(1/60);const r1={flags,score:__game.score.slice(),state:__game.state};for(let i=0;i<120;i++)__game.sim(1/60);r1.next=__game.sp&&__game.sp.type;
    // double touch: ball rebounds to the thrower untouched by anyone else
    __game.setPiece('throw',0,0,33.95);__game.sim(0.8);const t2=__game.sp.taker;__game.actDown('pass');__game.actUp('pass');__game.sim(1/60);
    for(const p of __game.players)if(p!==t2)p.pos.set(p.pos.x,0,-30);
    b.owner=null;b.pos.set(t2.pos.x,0.11,t2.pos.z-0.5);b.vel.set(0,0,0);for(let i=0;i<60;i++)__game.sim(1/60);
    r1.thrower_retouch=b.owner===t2;
    return r1;});
  console.log(JSON.stringify(th));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
