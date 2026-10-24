const open=require('./harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const {browser,page,errors,SP}=await open();
  await page.evaluate(()=>{const kit={shirt:'#e8304a',trim:'#ffffff',pat:'hoops',shorts:'#ffffff',socks:'#e8304a',num:'#ffffff'};
    const H=['#16120f','#2b1d14','#5a3a22','#8a6a3a','#d8b46a','#1a1a1a'],S=['#f1c9a5','#e0ac85','#c68b62','#9b6847','#6f4a33','#4c3324'];
    const d=document.createElement('div');d.style.cssText='position:fixed;inset:0;z-index:999;background:#123;display:flex;gap:6px;flex-wrap:wrap;align-content:flex-start';
    for(let i=0;i<10;i++){const c=new Image();c.src=__game.faceDbg({name:'Test'+i,short:'T',skin:S[i%6],hair:H[i%6],hs:i%3,boot:'#111111',h:1,num:i+1},kit,i>=5,i===0||i===5);c.style.cssText='width:200px;height:240px;background:#345';d.appendChild(c);}
    document.body.appendChild(d);});
  await sleep(300);
  await page.screenshot({path:SP+'/shots/f_faces2.png'});
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
