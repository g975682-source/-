const open=require('./harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const {browser,page,errors,SP}=await open({viewport:{width:1100,height:900}});
  await page.evaluate(()=>{const codes=['EG','GE','IML','PDY','UIC','TMS','AEL','WCD','IFS','SPL',null,null];
    const H=['#16120f','#2b1d14','#5a3a22','#8a6a3a','#d8b46a','#1a1a1a'],S=['#f1c9a5','#e0ac85','#c68b62','#9b6847','#6f4a33','#4c3324'];
    const d=document.createElement('div');d.id='gal';d.style.cssText='position:fixed;inset:0;z-index:999;background:#0b1220;display:flex;gap:10px;flex-wrap:wrap;padding:10px;align-content:flex-start';
    codes.forEach((c,i)=>{const ovr=c?80+i*2:(i===10?75:62);const p={id:900+i,name:'테스트 선수'+i,short:'선수'+i,label:['ST','CM','CB','GK','LW','CAM','RB','CDM','RW','LM','ST','CB'][i],ovr,lv:i%4,legend:i%3===0,trait:'trickster',skin:S[i%6],hair:H[(i+2)%6],hs:i%3,num:i+1,st:{pac:80,sho:81,pas:82,dri:83,def:60,phy:70,gk:20},season:c};
      const w=document.createElement('div');w.innerHTML=__game.cardDbg(p);d.appendChild(w);});
    document.body.appendChild(d);});
  for(let i=0;i<60;i++){await page.evaluate(()=>__game.pump());await sleep(50);}
  await sleep(1500);
  await page.screenshot({path:SP+'/shots/f_gal.png'});
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
