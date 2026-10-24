const open=require('./harness.js');
(async()=>{
  const {browser,page,errors,SP}=await open();
  await page.screenshot({path:SP+'/shots/title.png'});
  // fast sim demo match
  const r=[];
  for(let i=0;i<8;i++){ r.push(await page.evaluate(()=>{const o=__game.sim(30);const s=__game.stats;return {o,shots:s.shots,on:s.on,passes:s.passes,ok:s.passOk,tk:s.tackles,fouls:s.fouls,off:s.offsides,cor:s.corners,saves:s.saves,poss:s.poss.map(x=>x.toFixed(0))};})); }
  console.log(JSON.stringify(r,null,0).replace(/\},\{/g,'},\n{'));
  console.log('ERRORS',errors.slice(0,10).join('\n'));
  await browser.close();
})();
