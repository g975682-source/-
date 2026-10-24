const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  const r=await page.evaluate(async()=>{
    __game.startMatch({mode:'play',minutes:12,home:0,away:2,firstKick:1,diff:'pro'});window.__freeze=true;__game.sim(1);
    const out={};
    // let the AI have the ball, then press S: we should switch to the best-placed defender, and its release must not pass
    let tries=0;while(!(__game.ball.owner&&__game.ball.owner.team===1)&&tries<600){__game.sim(1/60);tries++;}
    const T0=__game.players.filter(p=>p.team===0&&!p.isGK);
    const far=T0.slice().sort((a,b)=>Math.hypot(b.pos.x-__game.ball.pos.x,b.pos.z-__game.ball.pos.z)-Math.hypot(a.pos.x-__game.ball.pos.x,a.pos.z-__game.ball.pos.z))[0];
    __game.give(1,__game.ball.owner.slot);
    // force the cursor onto the farthest player first
    window.__setCtl=far;
    return {owner:__game.ball.owner.team,far:far.slot};
  });
  console.log(JSON.stringify(r));
  // set cursor via Q cycling until it is the far player is awkward; use a hook instead
  const r2=await page.evaluate(async()=>{
    const g=__game;const far=window.__setCtl;
    g.setCtl(far);const before=g.controlled.slot;
    g.actDown('pass');g.sim(1/60);const afterDown=g.controlled.slot;await new Promise(r=>setTimeout(r,80));g.actUp('pass');g.sim(1/60);
    const passes0=g.stats.passes[0];g.sim(0.5);
    // Space: standing tackle
    g.actDown('tackle');g.sim(1/60);const st=g.controlled.state;g.actUp('tackle');
    // D while defending: no tackle and no queued shot
    g.sim(1);g.actDown('shoot');g.sim(1/60);const st2=g.controlled.state;g.actUp('shoot');g.sim(1/60);
    return {before,afterDown,switched:before!==afterDown,passesAfterSRelease:g.stats.passes[0]-passes0,spaceState:st,dState:st2};
  });
  console.log(JSON.stringify(r2));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
