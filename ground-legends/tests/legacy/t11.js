const open=require('./harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const {browser,page,errors,SP}=await open({viewport:{width:390,height:844},touch:true});
  await page.screenshot({path:SP+'/shots/m_title.png'});
  await page.tap('#btnPlay');await sleep(300);
  await page.screenshot({path:SP+'/shots/m_squad.png',fullPage:false});
  const ov=await page.evaluate(()=>({sw:document.querySelector('#squad').scrollWidth,cw:document.querySelector('#squad').clientWidth}));console.log('squad overflow',ov);
  await page.evaluate(()=>__game.startMatch({mode:'play',minutes:5,firstKick:0}));await sleep(1200);
  await page.screenshot({path:SP+'/shots/m_play.png'});
  // landscape phone
  await page.setViewportSize({width:844,height:390});await sleep(1200);
  await page.screenshot({path:SP+'/shots/m_land.png'});
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
