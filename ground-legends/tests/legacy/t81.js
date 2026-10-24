const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  const r=await page.evaluate(()=>{
    const g=__game;g.startMatch({mode:'play',minutes:12,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(1);
    const p=g.give(0,9);p.st.dri=96;p.trait='trickster';p.pos.set(-5,0,0);p.face=Math.PI/2;p.vel.set(4,0,0);g.ball.pos.set(-4.5,0.11,0);
    for(const q of g.players)if(q!==p){q.pos.set(q.team?40:-40,0,q.slot*3-15);q.vel.set(0,0,0);}
    g.setCtl(p);g.skill(p,'advrainbow',1);const out=[];
    for(let i=0;i<150;i++){g.sim(1/60);if(i%8==0)out.push([i,g.ball.pos.x.toFixed(1),g.ball.pos.y.toFixed(2),p.pos.x.toFixed(1),p.vel.x.toFixed(1),p.wantVel.x.toFixed(1),g.ball.owner?g.ball.owner.short:'-',p.sk?'sk':'',p.state,p.noTouch.toFixed(2)].join(' '));}
    return out;});
  console.log(r.join('\n'));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
