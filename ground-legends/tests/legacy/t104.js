const open=require('./harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const {browser,page,errors,SP}=await open();
  await page.click('#btnClub');await sleep(300);await page.click('#cnGo');await sleep(400);
  await page.click('[data-tab=cups]');await sleep(800);
  const lockedTxt=await page.$$eval('.cupcard',cs=>cs.map(c=>c.querySelector('.foot+*, .kv')&&c.innerText.split('\n').filter(t=>t.includes('참가 조건')).join('')));
  await page.screenshot({path:SP+'/shots/cups_locked.png'});
  // boost the squad so the Europa League opens
  await page.evaluate(()=>{const k='gl-club-v1',c=JSON.parse(localStorage.getItem(k));c.players.forEach(p=>{p.ovr=Math.max(p.ovr,74);for(const q in p.st)if(q!=='gk')p.st[q]=Math.max(p.st[q],70);});c.minutes=3;localStorage.setItem(k,JSON.stringify(c));});
  await page.reload();await sleep(1500);await page.click('#btnClub');await sleep(300);await page.click('[data-tab=cups]');await sleep(500);
  const canEnter=await page.$$eval('[data-cupenter]',b=>b.map(x=>x.dataset.cupenter));
  await page.click('[data-cupenter="el"]');await sleep(500);
  await page.screenshot({path:SP+'/shots/cups_entered.png'});
  const log=[];
  // results to force: group W D L -> depends on table; then knockouts W, draw (shoot-out), W
  const plan=[[2,0],[1,1],[3,1],[2,1],[1,1],[2,0]];
  for(let m=0;m<6;m++){
    const btn=await page.$('[data-cupplay="el"]');if(!btn){log.push('no play button at match '+m);break;}
    await btn.click();await sleep(800);
    const info=await page.evaluate(()=>{const g=__game;return {ai:g.teams[1].ai.label,smart:g.teams[1].ai.smart,oppOvr:g.teams[1].def.ovr,opp:g.teams[1].def.name,cup:g.cfg.club.cup};});
    await page.evaluate(()=>{const g=__game;window.__freeze=true;let n=0;while(g.state!=='halftime'&&n<400){g.sim(1);n++;}});
    await page.click('#btnSecond');await sleep(200);
    await page.evaluate((sc)=>{const g=__game;let n=0;while(g.state!=='fulltime'&&n<400){g.sim(0.5);n++;if(g.clock>5300)g.setScore(sc[0],sc[1]);}},plan[m]);
    // let the result screen appear with the forced score: re-run showResult path by finishing
    await page.evaluate(()=>{window.__freeze=false;});await sleep(1500);
    const res=await page.evaluate(()=>{const r=document.querySelector('#result');return {shown:!r.hidden,txt:document.querySelector('#resBody .reward')?document.querySelector('#resBody .reward').innerText.replace(/\n/g,' | '):''};});
    log.push(JSON.stringify(info)+' -> '+JSON.stringify(res).slice(0,400));
    await page.click('#btnRematch');await sleep(800);
  }
  const st=await page.evaluate(()=>{const c=JSON.parse(localStorage.getItem('gl-club-v1'));return {stage:c.cups.el.stage,log:c.cups.el.log,tro:c.trophies,money:c.money};});
  await page.screenshot({path:SP+'/shots/cups_after.png'});
  console.log('locked texts',JSON.stringify(lockedTxt));console.log('canEnter',canEnter);
  console.log(log.join('\n'));console.log(JSON.stringify(st));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
