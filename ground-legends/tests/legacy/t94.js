const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  const r=await page.evaluate(()=>{
    const g=__game;g.startMatch({mode:'play',minutes:12,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(1);
    const o=g.give(1,9);o.pos.set(0,0,0);g.ball.pos.set(0.5,0.11,0);
    const T0=g.players.filter(p=>p.team===0&&!p.isGK);T0.forEach((p,i)=>{p.pos.set(-10,0,-20+i*4);});
    const cur=T0[5];g.setCtl(cur);g.sim(1/60);const L=g.ctrl[0];const log=[];
    g.actDown('skill');g.sim(0.03);log.push('g '+JSON.stringify(L.g&&L.g.toks));g.actDown('down');g.sim(1/60);log.push('g2 '+JSON.stringify(L.g&&L.g.toks)+' inq '+JSON.stringify(L.inq)+' ctl '+(g.controlled===cur));g.sim(0.04);g.actUp('down');g.actUp('skill');g.sim(0.05);
    log.push('ctl '+(g.controlled===cur)+' ball '+(g.ball.owner&&g.ball.owner.team));return log;});
  console.log(r.join('\n'));
  await browser.close();
})();
