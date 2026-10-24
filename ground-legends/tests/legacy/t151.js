const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  const r=await page.evaluate(()=>{const g=__game;g.startMatch({mode:'demo',minutes:12,home:0,away:2});window.__freeze=true;
    // after a loose tackle, who has the ball 1.5 s later?
    const after={};let watch=null,prev=0;
    for(let i=0;i<60*60*24;i++){if(g.state==='fulltime'){g.startMatch({mode:'demo',minutes:12,home:1,away:2});window.__freeze=true;}
      const n=g.tackleCount.loose||0;if(n>prev){prev=n;const o=g.ball.lastTouch;watch={t:90,team:o?o.team:-1};}
      if(watch&&--watch.t<=0){const ow=g.ball.owner;const k=!ow?'still loose':ow.team===watch.team?'tackler side':'carrier side';after[k]=(after[k]||0)+1;watch=null;}
      g.sim(1/60);}
    return {counts:g.tackleCount,looseAfter1_5s:after};});
  console.log(JSON.stringify(r));console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
