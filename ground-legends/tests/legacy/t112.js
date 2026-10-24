const open=require('./harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const {browser,page,errors,SP}=await open();
  await page.click('#btnClub');await sleep(300);await page.click('#cnGo');await sleep(400);
  await page.evaluate(()=>{const k='gl-club-v1',c=JSON.parse(localStorage.getItem(k));c.players.forEach(p=>{p.ovr=Math.max(p.ovr,74);});c.minutes=3;localStorage.setItem(k,JSON.stringify(c));});
  await page.reload();await sleep(1500);await page.click('#btnClub');await sleep(300);await page.click('[data-tab=cups]');await sleep(300);
  await page.click('[data-cupenter="el"]');await sleep(300);
  // jump straight to the quarter-final
  await page.evaluate(()=>{const k='gl-club-v1',c=JSON.parse(localStorage.getItem(k));c.cups.el.stage='qf';c.cups.el.round=3;localStorage.setItem(k,JSON.stringify(c));});
  await page.reload();await sleep(1500);await page.click('#btnClub');await sleep(300);await page.click('[data-tab=cups]');await sleep(300);
  await page.click('[data-cupplay="el"]');await sleep(800);
  await page.evaluate(()=>{const g=__game;window.__freeze=true;let n=0;while(g.state!=='halftime'&&n<400){g.sim(1);n++;}});
  await page.click('#btnSecond');await sleep(200);
  const log=await page.evaluate(async()=>{const g=__game,wait=ms=>new Promise(r=>setTimeout(r,ms));const out=[];
    let n=0;while(g.state!=='fulltime'&&!document.querySelector('#pkTrack:not([hidden])')&&n<800){g.sim(0.25);if(g.clock>5000)g.setScore(1,1);n++;}
    out.push('after 90: state '+g.state+' pk '+!document.querySelector('#pkTrack').hidden+' score '+g.score);
    let kicks=0,guard=0;
    while(g.state!=='fulltime'&&guard<3000){guard++;
      if(g.state==='setpiece'&&g.sp&&g.sp.fk&&g.sp.t>0.8&&g.sp.fk.mode==='aim'&&g.sp.taker.team===0){
        // aim a bit to one side and shoot
        g.sp.fk.aim.z=(kicks%2?1:-1)*2.4;g.actDown('shoot');g.sim(1/60);await wait(250);g.actUp('shoot');kicks++;}
      g.sim(1/30);}
    out.push('end state '+g.state+' pens '+JSON.stringify(g.cfg.club.pens)+' track '+document.querySelector('#pkTrack').innerText.replace(/\n/g,' / '));
    return out;});
  await sleep(2500);
  const res=await page.evaluate(()=>({shown:!document.querySelector('#result').hidden,kicker:document.querySelector('#resBody .kicker')&&document.querySelector('#resBody .kicker').textContent,reward:document.querySelector('#resBody .reward')&&document.querySelector('#resBody .reward').innerText.replace(/\n/g,' | ')}));
  await page.screenshot({path:SP+'/shots/pk_result.png'});
  const st=await page.evaluate(()=>{const c=JSON.parse(localStorage.getItem('gl-club-v1'));return {stage:c.cups.el.stage,log:c.cups.el.log};});
  console.log(log.join('\n'));console.log(JSON.stringify(res));console.log(JSON.stringify(st));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
