const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  const r=await page.evaluate(async()=>{
    const g=__game;g.startMatch({mode:'play',minutes:12,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(1);
    const p=g.give(0,9);p.pos.set(0,0,10);p.face=0;p.vel.set(0,0,0);g.ball.pos.set(0,0.11,10.5);
    for(const q of g.players)if(q!==p&&!q.isGK){q.pos.set(q.team?-30:-40,0,q.slot*3-15);}
    g.setCtl(p);g.sim(1/60);g.actDown('switch');g.sim(1/60);g.actUp('switch');const o=[];
    for(let i=0;i<45;i++){g.sim(1/60);if(i%5==0)o.push(i+' f='+p.face.toFixed(2)+' sk='+(p.sk?p.sk.m.k+':'+p.sk.turnOv:'-')+' v='+p.vel.length().toFixed(2));}
    return o;});
  console.log(r.join('\n'));
  await browser.close();
})();
