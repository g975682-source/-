const open=require('./harness.js');
(async()=>{
  const {browser,page}=await open();
  const found=await page.evaluate(()=>{const g=__game;g.startMatch({mode:'demo',minutes:12,home:0,away:2});window.__freeze=true;
    for(let i=0;i<60*60*12;i++){g.sim(1/60);if(g.ball.owner||g.ball.pos.y<1.6||g.ball.pos.y>2.6)continue;
      const j=g.players.filter(q=>q.oAnim==='header'&&q.oT>0.12&&q.oT<0.3&&Math.hypot(q.pos.x-g.ball.pos.x,q.pos.z-g.ball.pos.z)<2.2);
      if(j.length>=2&&j[0].team!==j[1].team){return j.map(q=>q.label+' y'+q.y.toFixed(2)).join(' ');}}
    return 'none';});
  console.log(found);await page.waitForTimeout(150);await page.screenshot({path:'hd1.png'});await browser.close();
})();
