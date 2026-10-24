const open=require('./harness.js');
(async()=>{
  const {browser,page}=await open();
  const r=await page.evaluate(()=>{window.__dbg=[];let outZ=0,outX=0,nearLine=0;
    for(let i=0;i<60*300;i++){__game.sim(1/60);const b=__game.ball;if(Math.abs(b.pos.z)>33)nearLine++;}
    return {ev:window.__dbg.filter(e=>e[0]==='save'||e[0]==='miss'||e[0]==='sp').map(e=>e.join(' ')),nearLine:nearLine/60,score:__game.score};});
  console.log(r.ev.join('\n'));console.log('nearLine s',r.nearLine,r.score);
  await browser.close();
})();
