const open=require('./harness.js');
(async()=>{
  const {browser,page}=await open();
  const r=await page.evaluate(()=>{window.__dbg=[];__game.sim(200);const L=window.__dbg;const out=[];
    for(let i=0;i<L.length;i++){if(L[i][0]==='land'){const nx=L.slice(i+1).find(x=>x[0]==='gain');out.push(L[i-1].join(' ')+' | '+L[i].join(' ')+' | next '+(nx?nx.join(' '):''));}}return out;});
  console.log(r.join('\n'));
  await browser.close();
})();
