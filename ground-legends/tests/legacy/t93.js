const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  const r=await page.evaluate(()=>{
    const g=__game;g.startMatch({mode:'play',minutes:12,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(1);
    const out={};
    const park=(keep)=>{for(const q of g.players)if(!keep.includes(q)){q.pos.set(q.team?40:-40,0,q.slot*3-15);q.vel.set(0,0,0);}};
    const tapR=()=>{g.actDown('skill');g.sim(0.03);g.actDown('down');g.sim(0.08);g.actUp('down');g.sim(0.03);g.actUp('skill');g.sim(1/60);};
    // chain: start a roulette, key a body feint while it runs -> it plays right after
    {const p=g.give(0,9);p.st.dri=90;p.pos.set(0,0,0);p.face=Math.PI/2;g.ball.pos.set(0.5,0.11,0);park([p]);g.setCtl(p);g.sim(0.05);
     const c0=Object.assign({},g.skillCount);g.skill(p,'roulette',1);g.sim(0.1);tapR();g.sim(1.5);
     out.chained=Object.keys(g.skillCount).filter(k=>(g.skillCount[k]||0)>(c0[k]||0)).join(',');}
    // first touch: key the move while the pass is on its way
    {const a=g.give(0,6),b=g.players.find(q=>q.team===0&&q.slot===9);a.pos.set(-10,0,0);b.pos.set(2,0,0);b.face=Math.PI/2;g.ball.pos.set(-9.5,0.11,0);park([a,b]);g.setCtl(a);g.sim(0.05);
     g.actDown('pass');g.sim(0.05);g.actUp('pass');g.sim(0.1);   // pass to b; control switches to him
     const c0=Object.assign({},g.skillCount),who=g.controlled===b;tapR();
     let got=false;for(let i=0;i<120;i++){g.sim(1/60);if(g.ball.owner===b)got=true;}
     out.firstTouch={ctlOnReceiver:who,received:got,skills:Object.keys(g.skillCount).filter(k=>(g.skillCount[k]||0)>(c0[k]||0)).join(',')};}
    return out;});
  console.log(JSON.stringify(r));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
