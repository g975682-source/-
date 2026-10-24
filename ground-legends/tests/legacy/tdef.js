// defending metrics in AI vs AI play
const open=require('./harness.js');
const MIN=+(process.env.MIN||48);
(async()=>{
  const {browser,page,errors}=await open();
  const r=await page.evaluate((MIN)=>{
    const g=__game;const R={m:0,goals:0,shots:0,pass:0,ok:0,tk:0,dSpd:0,dN:0,still:0,close:0,closeN:0,pressT:0};
    let k=0;g.startMatch({mode:'demo',minutes:12,home:0,away:2});window.__freeze=true;
    for(let i=0;i<60*60*MIN;i++){
      if(g.state==='fulltime'){R.m++;const s=g.stats;R.goals+=g.score[0]+g.score[1];R.shots+=s.shots[0]+s.shots[1];R.pass+=s.passes[0]+s.passes[1];R.ok+=s.passOk[0]+s.passOk[1];R.tk+=s.tackles[0]+s.tackles[1];
        k++;g.startMatch({mode:'demo',minutes:12,home:k%3,away:2+k%2});window.__freeze=true;continue;}
      const o=g.ball.owner;
      if(g.state==='play'&&o&&!o.isGK&&!o.holding){const D=g.teams[1-o.team];let near=99;
        for(const p of D.players){if(p.isGK)continue;const v=Math.hypot(p.vel.x,p.vel.z);R.dSpd+=v;R.dN++;if(v<0.8)R.still++;near=Math.min(near,Math.hypot(p.pos.x-o.pos.x,p.pos.z-o.pos.z));}
        R.close+=near;R.closeN++;}
      g.sim(1/60);}
    return {matches:R.m,goalsPerMatch:+(R.goals/R.m).toFixed(2),shotsPerMatch:+(R.shots/R.m).toFixed(1),passCompletion:+(R.ok/R.pass*100).toFixed(1),tacklesPerMatch:+(R.tk/R.m).toFixed(1),
      defenderSpeed:+(R.dSpd/R.dN).toFixed(2),defendersStandingPct:+(R.still/R.dN*100).toFixed(1),nearestDefenderToCarrier:+(R.close/R.closeN).toFixed(2)};
  },MIN);
  console.log(JSON.stringify(r));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
