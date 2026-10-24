const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  const r=await page.evaluate(async()=>{
    const g=__game,wait=ms=>new Promise(r=>setTimeout(r,ms));
    g.startMatch({mode:'play',minutes:30,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(1);
    const out={};
    const gk=g.players.find(q=>q.team===0&&q.isGK);out.gkTrait=gk.trait;out.aiGkTrait=g.players.find(q=>q.team===1&&q.isGK).trait;
    // keeper walks with the ball, stops at the box edge, passes on the move
    const hold=()=>{g.give(0,gk.slot);gk.pos.set(-50,0,0);gk.holding=true;gk.holdT=0;g.setCtl(gk);g.sim(1/60);};
    hold();const x0=gk.pos.x;g.actDown('right');g.sim(1.0);const x1=gk.pos.x;g.sim(3.5);const x2=gk.pos.x;
    out.walk={moved:+(x1-x0).toFixed(2),stillHolding:gk.holding,stopsAtBox:+x2.toFixed(2),boxEdge:-(52.5-16.5)};
    hold();g.sim(0.5);const sp=Math.hypot(gk.vel.x,gk.vel.z);g.actDown('pass');await wait(200);g.actUp('pass');g.sim(1/60);out.passOnTheMove={speedWhenPassing:+sp.toFixed(2),released:!g.ball.owner};g.actUp('right');g.sim(1);
    hold();g.actDown('through');g.sim(1/60);g.actUp('through');g.sim(0.1);out.wDrop={holding:gk.holding,feet:g.ball.owner===gk};
    // shots through the real keys
    const shot=async(pre,second)=>{g.startMatch({mode:'play',minutes:30,home:0,away:2,firstKick:0});g.sim(0.5);const p=g.give(0,9);p.pos.set(30,0,0);p.face=Math.PI/2;g.ball.pos.set(30.5,0.11,0);
      for(const q of g.players)if(q!==p&&!q.isGK)q.pos.set(-30,0,q.slot*3-15);g.setCtl(p);g.sim(1/60);
      for(const k of pre)g.actDown(k);g.sim(1/60);g.actDown('shoot');await wait(300);g.actUp('shoot');g.sim(1/60);
      if(second){g.sim(second);g.actDown('shoot');g.sim(1/60);g.actUp('shoot');}for(const k of pre)g.actUp(k);
      let peak=0,v0=0,y12=null;for(let i=0;i<70;i++){g.sim(1/60);if(!g.ball.owner&&!v0)v0=Math.hypot(g.ball.vel.x,g.ball.vel.z);peak=Math.max(peak,g.ball.pos.y);if(y12==null&&g.ball.pos.x>42)y12=g.ball.pos.y;}
      return {peak:+peak.toFixed(2),speed:+v0.toFixed(1),heightAt12m:y12!=null?+y12.toFixed(2):null,curve:+g.ball.sp.s.toFixed(1)};};
    out.normalD=await shot([]);
    out.finesseZD=await shot(['z']);
    out.lobQD=await shot(['switch']);
    out.lowDD_fast=await shot([],0.08);
    out.lowDD_slowTap=await shot([],0.16);
    return out;});
  console.log(JSON.stringify(r,null,1));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
