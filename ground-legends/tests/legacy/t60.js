const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  const r=await page.evaluate(async()=>{
    const g=__game;g.startMatch({mode:'play',minutes:12,home:0,away:2,firstKick:1});window.__freeze=true;g.sim(1);
    const out=[];
    for(const sc of ['beaten','wide']){
      const car=g.give(1,9);
      const P=g.players,T0=P.filter(p=>p.team===0&&!p.isGK),T1=P.filter(p=>p.team===1);
      for(const p of T0)p.pos.set(30,0,25);for(const p of T1)if(p!==car)p.pos.set(40,0,-25);
      car.pos.set(-20,0,0);car.vel.set(-7,0,0);car.face=-Math.PI/2;g.ball.pos.set(-20.7,0.11,0);
      const A=T0[1],B=T0[2],far=T0[8];
      if(sc==='beaten'){A.pos.set(-17,0,0.5);A.face=-Math.PI/2;B.pos.set(-32,0,4);B.face=Math.PI/2;}
      else{A.pos.set(-22,0,9);A.face=Math.PI;B.pos.set(-30,0,-3);B.face=Math.PI/2;}   // A close but off to the side, B in the lane further away
      for(const p of [A,B])p.vel.set(0,0,0);
      g.setCtl(far);g.sim(1/60);
      const near=[A,B].sort((a,b)=>Math.hypot(a.pos.x-car.pos.x,a.pos.z-car.pos.z)-Math.hypot(b.pos.x-car.pos.x,b.pos.z-car.pos.z))[0];
      const hint=g.players.find(p=>p===window.__hint);
      g.actDown('pass');g.sim(1/60);const pick=g.controlled;g.actUp('pass');g.sim(1/60);
      out.push({sc,nearest:near===A?'A(beaten/side)':'B',picked:pick===A?'A':pick===B?'B':'other '+pick.slot});
    }
    return out;});
  console.log(JSON.stringify(r));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
