const open=require('./harness.js');
(async()=>{
  const {browser,page,errors,SP}=await open();
  const r=await page.evaluate(()=>{window.__dbg=[];__game.sim(40);return window.__dbg.slice(0,80);});
  console.log(r.map(x=>x.join(' ')).join('\n'));
  await browser.close();
})();
