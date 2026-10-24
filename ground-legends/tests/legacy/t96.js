const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  const r=await page.evaluate(()=>{
    const g=__game;g.startMatch({mode:'play',minutes:12,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(1);
    const p=g.give(0,9);p.st.dri=96;p.trait='trickster';p.pos.set(-5,0,0);p.face=Math.PI/2;p.vel.set(4,0,0);g.ball.pos.set(-4.5,0.11,0);
    for(const q of g.players)if(q!==p){q.pos.set(q.team?40:-40,0,q.slot*3-15);q.vel.set(0,0,0);}
    g.setCtl(p);g.sim(0.05);const L=g.ctrl[0],log=[];
    g.actDown('skill');g.sim(0.03);g.actDown('up');
    for(let i=0;i<30;i++){g.sim(1/60);if(i%6==0)log.push('hold '+JSON.stringify(L.g&&L.g.toks)+' own '+(g.ball.owner===p)+' st '+g.state);}
    g.actUp('up');g.sim(0.06);g.actDown('right');g.sim(0.08);g.actUp('right');g.sim(0.06);log.push('pre-up '+JSON.stringify(L.g&&L.g.toks)+' inq '+JSON.stringify(L.inq));
    g.sim(0.05);g.actUp('skill');g.sim(1/60);log.push('after '+JSON.stringify(L.g)+' sk '+(p.sk&&p.sk.m.k)+' own '+(g.ball.owner===p)+' cnt '+JSON.stringify(g.skillCount));
    return log;});
  console.log(r.join('\n'));
  await browser.close();
})();
