const open=require('./harness.js');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const {browser,page,errors,SP}=await open();
  await page.evaluate(()=>{const g=__game;g.startMatch({mode:'play',minutes:12,home:0,away:2,firstKick:1});window.__freeze=true;g.sim(1);
    const car=g.give(1,9),P=g.players,T0=P.filter(p=>p.team===0&&!p.isGK);
    car.pos.set(-20,0,0);car.vel.set(-7,0,0);car.face=-Math.PI/2;g.ball.pos.set(-20.7,0.11,0);
    T0[1].pos.set(-17,0,0.5);T0[2].pos.set(-30,0,3);g.setCtl(T0[1]);g.ctrl[0].switchCD=5;g.sim(1/60);window.__freeze=true;});
  await sleep(1500);await page.screenshot({path:SP+'/shots/hint.png',clip:{x:200,y:150,width:880,height:420}});
  await browser.close();
})();
