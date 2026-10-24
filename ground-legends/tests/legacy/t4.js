const open=require('./harness.js');
(async()=>{
  const {browser,page,errors,SP}=await open();
  const r=await page.evaluate(()=>{const H={};let loose=0,own=0;
    for(let i=0;i<60*240;i++){const s=__game.state;H[s]=(H[s]||0)+1;if(s==='play'){if(__game.ball.owner)own++;else loose++;}__game.sim(1/60);}
    const st=__game.stats;return {H,own:own/60,loose:loose/60,score:__game.score,half:__game.half,shots:st.shots,on:st.on,passes:st.passes,ok:st.passOk,tk:st.tackles,fouls:st.fouls,off:st.offsides,cor:st.corners,saves:st.saves,y:st.yellows};});
  console.log(JSON.stringify(r));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
