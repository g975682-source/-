const open=require('./harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const {browser,page,errors,SP}=await open();
  await page.evaluate(()=>{const g=__game;g.startMatch({mode:'play',minutes:12,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(1);
    const p=g.give(0,9);p.st.dri=96;p.trait='trickster';p.pos.set(10,0,0);p.face=Math.PI/2;g.ball.pos.set(10.5,0.11,0);g.setCtl(p);g.sim(0.1);g.skill(p,'elastico',1);g.sim(0.25);window.__freeze=false;});
  await sleep(300);await page.screenshot({path:SP+'/shots/sk_toast.png'});
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
