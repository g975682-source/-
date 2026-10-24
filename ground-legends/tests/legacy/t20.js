const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  const r=await page.evaluate(()=>{__game.startDemo();const res={matches:[],stuck:[],maxSp:0,states:{}};let spT=0,stillT=0,prevH=1;
    let last=null;
    for(let i=0;i<60*60*12;i++){const st=__game.state;res.states[st]=(res.states[st]||0)+1;
      if(st==='setpiece'){spT+=1/60;res.maxSp=Math.max(res.maxSp,spT);}else spT=0;
      const b=__game.ball;if(st==='play'&&!b.owner&&b.vel.length()<0.2){stillT+=1/60;if(stillT>6&&res.stuck.length<5)res.stuck.push([__game.clock.toFixed(0),b.pos.x.toFixed(1),b.pos.z.toFixed(1)]);}else stillT=0;
      if(st==='fulltime'&&last!=='fulltime'){const s=__game.stats;res.matches.push({score:__game.score,shots:s.shots,on:s.on,saves:s.saves,fouls:s.fouls,y:s.yellows,r:s.reds,tk:s.tackles,off:s.offsides,cor:s.corners});}
      last=st;__game.sim(1/60);}
    return res;});
  console.log(JSON.stringify(r,null,0).replace(/\},\{/g,'},\n{'));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
