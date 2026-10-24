const open=require('./harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  for(const vp of [{width:1280,height:720},{width:390,height:844,touch:true}]){
    const {browser,page,errors,SP}=await open({viewport:{width:vp.width,height:vp.height},touch:vp.touch,fresh:true});
    await sleep(1300);await page.screenshot({path:SP+'/shots/tut_ask_'+vp.width+'.png'});
    if(vp.touch)await page.tap('#tutStart');else await page.click('#tutStart');await sleep(800);
    await page.evaluate(()=>{window.__freeze=true;__game.tutGo(7);});await sleep(900);
    await page.screenshot({path:SP+'/shots/tut_step_'+vp.width+'.png'});
    console.log(vp.width,'overflow',await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),'ERR',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,5).join('|'));
    await browser.close();
  }
})();
