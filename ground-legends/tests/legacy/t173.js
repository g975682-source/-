const open=require('./harness.js');
(async()=>{
  const {browser,page}=await open();
  await page.evaluate(async()=>{const g=__game,wait=ms=>new Promise(r=>setTimeout(r,ms));
    g.startMatch({mode:'play',minutes:30,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(1);
    const T=g.teams[0],dir=T.dir;const p=g.give(0,T.players.find(q=>q.label==='CM').slot);g.setCtl(p);p.pos.set(dir*8,0,-4);g.ball.pos.set(p.pos.x+dir*0.5,0.11,-4);const st=T.players.find(q=>q.label==='ST');st.pos.set(dir*15,0,dir*3);g.sim(0.1);
    g.actDown('switch');g.sim(1/60);await wait(60);g.actUp('switch');g.sim(0.35);});
  await page.waitForTimeout(300);await page.screenshot({path:'rb1.png'});
  const b=await page.$eval('#runBadge',e=>[e.hidden,e.style.left,e.style.top]);console.log(b);await page.screenshot({path:'rb1z.png',clip:{x:Math.max(0,parseFloat(b[1])-160),y:Math.max(0,parseFloat(b[2])-160),width:320,height:240}});
  await browser.close();
})();
