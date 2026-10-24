const open=require('./harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const {browser,page,errors,SP}=await open();
  await page.click('#btnClub');await sleep(300);await page.click('#cnGo');await sleep(400);
  await page.click('[data-tab=squad]');await sleep(6000);
  await page.evaluate(()=>{const ims=[...document.querySelectorAll('img[data-fid]')].slice(0,6);const d=document.createElement('div');d.style.cssText='position:fixed;inset:0;z-index:999;background:#123;display:flex;gap:8px;flex-wrap:wrap';
   for(const im of ims){const c=new Image();c.src=im.src;c.style.cssText='width:200px;height:240px;background:#345';d.appendChild(c);}document.body.appendChild(d);});
  await sleep(300);
  await page.screenshot({path:SP+'/shots/f_faces.png'});
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
