const open=require('./harness.js');
(async()=>{
  for(const vp of [{width:1280,height:720},{width:390,height:780}]){
    const {browser,page,errors}=await open({viewport:vp,touch:vp.width<500});
    await page.waitForTimeout(900);await page.screenshot({path:'lobbyW'+vp.width+'.png'});
    const ov=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    console.log(vp.width,'overflow',ov,'mode',await page.evaluate(()=>__game.mode),'ERR',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,3).join(' | '));
    if(vp.width>500){await page.keyboard.press('Escape');await page.waitForTimeout(900);await page.screenshot({path:'lobbyWatch.png'});}
    await browser.close();}
})();
