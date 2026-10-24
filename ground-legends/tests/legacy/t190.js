const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  await page.waitForTimeout(600);
  // practice (lobby)
  await page.keyboard.down('KeyD');await page.waitForTimeout(350);await page.screenshot({path:'g1.png'});
  const a=await page.$eval('#gauge',e=>[e.hidden,e.style.left,e.style.top,document.getElementById('gaugeFill').style.width]);await page.keyboard.up('KeyD');
  // a match
  await page.evaluate(()=>{const g=__game;g.startMatch({mode:'play',minutes:30,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(1);const T=g.teams[0];const p=g.give(0,T.players.find(q=>q.label==='ST').slot);g.setCtl(p);window.__freeze=false;});
  await page.waitForTimeout(400);await page.keyboard.down('KeyD');await page.waitForTimeout(300);await page.screenshot({path:'g2.png'});
  const b=await page.$eval('#gauge',e=>[e.hidden,e.style.left,e.style.top]);await page.keyboard.up('KeyD');
  console.log(JSON.stringify({prac:a,match:b}));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,5).join('\n'));
  await browser.close();
})();
