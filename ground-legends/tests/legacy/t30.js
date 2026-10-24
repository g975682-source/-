const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  const r=await page.evaluate(()=>{__game.startDemo();const res={matches:[],stuck:0,states:{}};let stillT=0,last=null;
    for(let i=0;i<60*60*8;i++){const st=__game.state;res.states[st]=(res.states[st]||0)+1;
      const b=__game.ball;if(st==='play'&&!b.owner&&b.vel.length()<0.2){stillT+=1/60;if(stillT>6)res.stuck++;}else stillT=0;
      if(st==='fulltime'&&last!=='fulltime'){const s=__game.stats;res.matches.push({score:__game.score,shots:s.shots,fouls:s.fouls,y:s.yellows,r:s.reds,tk:s.tackles});}
      last=st;__game.sim(1/60);}
    res.traits=__game.traitCount;res.adv=__game.advCount;res.skills=__game.skillCount;return res;});
  console.log(JSON.stringify(r));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
