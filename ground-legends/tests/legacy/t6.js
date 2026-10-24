const open=require('./harness.js');
(async()=>{
  const {browser,page,errors,SP}=await open();
  const r=await page.evaluate(()=>{window.__dbg=[];let own=0,loose=0;for(let i=0;i<60*200;i++){if(__game.state==='play'){if(__game.ball.owner)own++;else loose++;}__game.sim(1/60);}
    const L=window.__dbg;let passes=0,ok=0,bad=0,byMode={};
    for(let i=0;i<L.length;i++){if(L[i][0]!=='pass')continue;passes++;const m=L[i][3];byMode[m]=byMode[m]||[0,0];byMode[m][0]++;
      const nx=L.slice(i+1).find(x=>x[0]==='gain');if(nx&&nx[2]===L[i][2]){ok++;byMode[m][1]++;}else bad++;}
    return {passes,ok,bad,byMode,own:own/60,loose:loose/60,score:__game.score,shots:__game.stats.shots,saves:__game.stats.saves};});
  console.log(JSON.stringify(r));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
