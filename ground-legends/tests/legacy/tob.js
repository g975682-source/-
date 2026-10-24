// off-the-ball metrics in AI vs AI play
const open=require('./harness.js');
const MIN=+(process.env.MIN||36);
(async()=>{
  const {browser,page,errors}=await open();
  const r=await page.evaluate((MIN)=>{
    const g=__game,HL=52.5,HW=34;const R={frames:0,offSpd:0,offN:0,sprintN:0,runners:0,crosses:0,boxAtCross:0,boxSpdAtCross:0,boxAfter:0,goals:0,shots:0,passes:0,through:0,goalKinds:{},matches:0};
    let prevOwner=null,pend=[];
    g.startMatch({mode:'demo',minutes:12,home:0,away:2});window.__freeze=true;
    for(let i=0;i<60*60*MIN;i++){
      const st=g.state;
      if(st==='fulltime'){R.matches++;const s=g.score;R.goals+=s[0]+s[1];R.shots+=g.stats.shots[0]+g.stats.shots[1];g.startMatch({mode:'demo',minutes:12,home:i%3,away:2+i%2});window.__freeze=true;prevOwner=null;continue;}
      const o=g.ball.owner;
      if(st==='play'&&o&&!o.isGK){const T=g.teams[o.team],dir=T.dir;
        if(o.pos.x*dir/HL>0){R.frames++;
          for(const p of T.players){if(p===o||p.isGK||p.line<2)continue;const v=Math.hypot(p.vel.x,p.vel.z);R.offSpd+=v;R.offN++;if(v>6.3)R.sprintN++;}}}
      // a cross: the owner lets go of the ball from a wide, advanced spot and it rises
      if(st==='play'&&prevOwner&&!o&&g.ball.vel.y>3&&g.ball.lastKind==='pass'){const p=prevOwner,T=g.teams[p.team],dir=T.dir;
        if(p.pos.x*dir/HL>0.55&&Math.abs(p.pos.z)>HW*0.3){R.crosses++;let n=0,sp=0;for(const m of T.players){if(m===p||m.isGK)continue;const inb=m.pos.x*dir>HL-16.5&&Math.abs(m.pos.z)<20.16;if(inb){n++;sp+=Math.hypot(m.vel.x,m.vel.z);}}
          R.boxAtCross+=n;R.boxSpdAtCross+=n?sp/n:0;pend.push({t:i+50,T,p});}}
      for(const q of pend.filter(q=>q.t===i)){let n=0;for(const m of q.T.players){if(m===q.p||m.isGK)continue;if(m.pos.x*q.T.dir>HL-16.5&&Math.abs(m.pos.z)<20.16)n++;}R.boxAfter+=n;}
      pend=pend.filter(q=>q.t>i);
      prevOwner=o;g.sim(1/60);
    }
    if(g.goalLog)R.goalKinds=g.goalLog.reduce((a,x)=>{const k=(x.kind||'solo')+(x.run?'/'+x.run:'');a[k]=(a[k]||0)+1;return a;},{});
    return {matches:R.matches,goalsPerMatch:+(R.goals/R.matches).toFixed(2),shotsPerMatch:+(R.shots/R.matches).toFixed(1),
      offBallSpeedAttHalf:+(R.offSpd/R.offN).toFixed(2),sprintPct:+(R.sprintN/R.offN*100).toFixed(1),
      crossesPerMatch:+(R.crosses/R.matches).toFixed(1),inBoxAtCross:+(R.boxAtCross/Math.max(1,R.crosses)).toFixed(2),boxRunSpeed:+(R.boxSpdAtCross/Math.max(1,R.crosses)).toFixed(2),inBoxWhenBallArrives:+(R.boxAfter/Math.max(1,R.crosses)).toFixed(2),goalKinds:R.goalKinds};
  },MIN);
  console.log(JSON.stringify(r));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
