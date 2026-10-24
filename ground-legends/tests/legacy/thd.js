const open=require('./harness.js');
(async()=>{
  const {browser,page}=await open();
  const r=await page.evaluate(()=>{const g=__game;const res={events:0,headAnimWinner:0,jumpersNear:0,both:0};let prevLT=null,k=0;
    g.startMatch({mode:'demo',minutes:12,home:0,away:2});window.__freeze=true;
    for(let i=0;i<60*60*24;i++){if(g.state==='fulltime'){k++;g.startMatch({mode:'demo',minutes:12,home:k%3,away:2});window.__freeze=true;}
      g.sim(1/60);const lt=g.ball.lastTouch;
      if(lt&&lt!==prevLT&&g.ball.pos.y>1.3&&!lt.isGK&&['header','clear','shot','pass'].includes(g.ball.lastKind)&&lt.oAnim==='header'||lt&&lt!==prevLT&&g.ball.pos.y>1.6&&!lt.isGK){
        res.events++;if(lt.oAnim==='header')res.headAnimWinner++;
        const near=g.players.filter(q=>q!==lt&&q.team!==lt.team&&Math.hypot(q.pos.x-lt.pos.x,q.pos.z-lt.pos.z)<2.2);
        if(near.length){const j=near.filter(q=>q.oAnim==='header'||q.oAnim==='jump').length;res.jumpersNear+=j;if(j&&lt.oAnim==='header')res.both++;res.contested=(res.contested||0)+1;}}
      prevLT=lt;}
    return res;});
  console.log(JSON.stringify(r));await browser.close();
})();
