const open=require('./harness.js');
(async()=>{
  const {browser,page}=await open();
  const r=await page.evaluate(()=>{window.__dbg=[];const goals=[];let last='0,0';
    for(let i=0;i<60*60*12;i++){__game.sim(1/60);const sc=__game.score.join(',');if(sc!==last){goals.push(sc);last=sc;}if(__game.state==='fulltime')last='0,0';}
    const L=window.__dbg;const c={save:0,saved:0,miss:0,sp:{}};for(const e of L){if(e[0]==='save'){c.save++;if(e[6])c.saved++;}if(e[0]==='miss')c.miss++;if(e[0]==='sp')c.sp[e[1]]=(c.sp[e[1]]||0)+1;}
    return c;});
  console.log(JSON.stringify(r));
  await browser.close();
})();
