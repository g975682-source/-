const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  const r=await page.evaluate(()=>{window.__dbg=[];const res={sp:{},matches:[],stuck:[],maxSp:0,maxStill:0};
    let spT=0,stillT=0,lastScore='';let prevMatchClock=0;
    for(let i=0;i<60*60*12;i++){ // 12 minutes of real time = ~3 demo matches
      const st=__game.state;
      if(st==='setpiece'){spT+=1/60;res.maxSp=Math.max(res.maxSp,spT);}else spT=0;
      const b=__game.ball;if(st==='play'&&!b.owner&&b.vel.length()<0.2){stillT+=1/60;res.maxStill=Math.max(res.maxStill,stillT);if(stillT>6&&res.stuck.length<5)res.stuck.push([__game.clock.toFixed(0),b.pos.x.toFixed(1),b.pos.z.toFixed(1)]);}else stillT=0;
      if(st==='fulltime'&&res.matches.length===0||st==='fulltime'&&res.matches[res.matches.length-1]!==JSON.stringify(__game.score)+__game.stats.shots){ if(!res.matches.includes(JSON.stringify(__game.score)+__game.stats.shots))res.matches.push(JSON.stringify(__game.score)+__game.stats.shots);}
      __game.sim(1/60);
    }
    for(const e of window.__dbg)if(e[0]==='sp')res.sp[e[1]]=(res.sp[e[1]]||0)+1;
    return res;});
  console.log(JSON.stringify(r));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
