const open=require('./harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const {browser,page,errors,SP}=await open();
  await page.click('#btnClub');await sleep(300);await page.click('#cnGo');await sleep(400);
  await page.click('[data-tab=squad]');await sleep(8000);
  console.log(await page.evaluate(()=>{const c=document.querySelector('.mini-pitch .pcard');const cs=getComputedStyle(c);return [c.outerHTML.slice(0,400),cs.height,cs.width,cs.aspectRatio,cs.overflow,[...c.children].map(e=>e.tagName+':'+e.getBoundingClientRect().height).join(',')].join('\n');}));
  const r=await page.evaluate(()=>{const c=document.querySelector(".mini-pitch .pcard");const cs=getComputedStyle(c);return [c.offsetHeight,cs.transform,cs.height,cs.boxSizing,cs.paddingBottom,cs.minHeight].join(" | ")})+" // "+await page.evaluate(()=>[...document.querySelectorAll(".mini-pitch .pcard")].map(c=>{const b=c.getBoundingClientRect();return Math.round(b.top)+"-"+Math.round(b.bottom)}).join(" "));console.log(r);await page.screenshot({path:SP+"/shots/f_squad2.png"});
  await browser.close();
})();
