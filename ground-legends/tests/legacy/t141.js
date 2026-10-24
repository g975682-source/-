const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  const info=await page.evaluate(()=>{const g=__game;g.startMatch({mode:'demo',minutes:12,home:0,away:2});window.__freeze=true;
    for(let i=0;i<60*60*10;i++){g.sim(1/60);const o=g.ball.owner;if(!o||g.state!=='play')continue;const T=g.teams[o.team];
      const br=T.players.filter(q=>q.runKind==='box'&&q.runT>0&&q.spd>5);if(br.length>=2&&Math.abs(o.pos.z)>12&&o.pos.x*T.dir>22)return br.map(q=>q.label+':'+q.boxSlot).join(' ');}
    return 'none';});
  console.log(info);
  await page.waitForTimeout(500);await page.screenshot({path:'ob1.png'});
  for(const n of [2,3]){await page.evaluate(()=>__game.sim(0.7));await page.waitForTimeout(400);await page.screenshot({path:'ob'+n+'.png'});}
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
