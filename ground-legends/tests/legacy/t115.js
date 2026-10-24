// play the whole tutorial through the real keys
const open=require('./harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const {browser,page,errors,SP}=await open({fresh:true});
  try{
  await sleep(1200);
  const asked=await page.$eval('#tutAsk',e=>!e.hidden);
  await page.screenshot({path:SP+'/shots/tut_ask.png'});
  await page.click('#tutStart');await sleep(800);
  const log=await page.evaluate(async()=>{
    const g=__game,wait=ms=>new Promise(r=>setTimeout(r,ms));window.__freeze=true;
    const out=[];const stepNo=()=>+document.querySelector('#tutBox .tt-head span').textContent.match(/(\d+) \//)[1];
    // the game measures a hold by the wall clock; a busy machine stretches wait(ms), and past 0.3 s a shot is full
    // power. So the hold the game sees is set to exactly ms before the release.
    const shots=[];
    const press=async(keys,ms)=>{for(const k of keys)g.actDown(k);g.sim(1/60);await wait(ms||80);
      const K=g.ctrl[0],now=performance.now();for(const k of keys)K.downAt[k]=now-(ms||80);
      for(const k of keys.slice().reverse())g.actUp(k);
      const e=K.inq[K.inq.length-1];if(keys.includes('shoot')&&e&&e.act==='shoot')shots.push([stepNo(),+e.held.toFixed(3)]);g.sim(1/60);};
    // shooting steps: a shot off the bar or a keeper's parry can leave the ball loose, and the step does not reset
    // itself then. Do what a player would: press 다시 하기.
    const retries=[];
    const ownBall=()=>{const ok=()=>g.state==='play'&&g.ball.owner===g.controlled;
      for(let t=0;t<2&&!ok();t+=1/60)g.sim(1/60);if(ok()||document.querySelector('#tutBox').hidden)return;
      retries.push(stepNo());document.querySelector('#tutBox [data-tut=retry]').click();for(let t=0;t<2&&!ok();t+=1/60)g.sim(1/60);};
    const waitNext=async(n,limit=6)=>{let t=0;while(stepNo()===n&&t<limit){g.sim(0.1);await wait(10);t+=0.1;}return stepNo()!==n||document.querySelector('#tutBox').hidden;};
    const steer=async(tx,tz,secs)=>{for(let t=0;t<secs;t+=0.1){const c=g.controlled,dx=tx-c.pos.x,dz=tz-c.pos.z;
      for(const [k,on] of [['right',dx>0.8],['left',dx<-0.8],['down',dz>0.8],['up',dz<-0.8]]){if(on&&!g.act[k])g.actDown(k);if(!on&&g.act[k])g.actUp(k);}g.sim(0.1);}
      for(const k of ['right','left','up','down'])if(g.act[k])g.actUp(k);};
    const attempt=async(n,fn,tries=6)=>{for(let i=0;i<tries;i++){await fn(i);if(await waitNext(n,4))return i+1;}return 'FAIL';};
    let n;
    n=stepNo();out.push(['1 move',await attempt(n,async()=>{await steer(14,-9,8);})]);
    n=stepNo();out.push(['2 pass',await attempt(n,async()=>{g.actDown('right');g.actDown('down');await press(['pass'],150);g.actUp('down');g.actUp('right');g.sim(2.5);})]);
    n=stepNo();out.push(['3 through',await attempt(n,async()=>{g.actDown('right');await press(['through'],200);g.actUp('right');g.sim(3);})]);
    n=stepNo();out.push(['4 lob',await attempt(n,async()=>{g.actDown('right');await press(['lob'],300);g.actUp('right');g.sim(3.5);})]);
    n=stepNo();out.push(['5 shoot',await attempt(n,async(i)=>{ownBall();g.actDown(i%2?'up':'down');await press(['shoot'],250);g.actUp(i%2?'up':'down');g.sim(2.5);},10)]);
    n=stepNo();out.push(['6 finesse',await attempt(n,async()=>{ownBall();g.actDown('z');await press(['shoot'],250);g.actUp('z');g.sim(1.5);})]);
    n=stepNo();out.push(['7 chip+low',await attempt(n,async(i)=>{ownBall();if(i%2===0){g.actDown('switch');await press(['shoot'],250);g.actUp('switch');}else{await press(['shoot'],250);g.sim(0.05);await press(['shoot'],40);}g.sim(2.2);},8)]);
    n=stepNo();out.push(['7b power',await attempt(n,async(i)=>{ownBall();g.actDown('f');await press(['shoot'],60);g.actUp('f');let k=0;while(g.ps&&g.ps.t/0.8<g.ps.c&&k<80){g.sim(1/60);k++;}await press(['shoot'],30);g.sim(2.2);},6)]);
    n=stepNo();out.push(['8 feint',await attempt(n,async()=>{g.actDown('skill');g.sim(0.05);await press(['down'],80);g.sim(0.05);g.actUp('skill');g.sim(1);})]);
    n=stepNo();out.push(['9 stepover',await attempt(n,async()=>{g.actDown('skill');g.sim(0.05);g.actDown('right');g.sim(0.08);g.actDown('down');g.sim(0.08);g.actUp('right');g.sim(0.08);g.actUp('down');g.sim(0.05);g.actUp('skill');g.sim(1.2);})]);
    n=stepNo();out.push(['10 shield',await attempt(n,async()=>{g.actDown('c');g.sim(2.6);g.actUp('c');})]);
    n=stepNo();out.push(['11 switch',await attempt(n,async()=>{await press(['pass'],60);g.sim(0.3);})]);
    n=stepNo();out.push(['12 tackle',await attempt(n,async()=>{g.actDown('shoot');g.sim(3);g.actUp('shoot');},8)]);
    n=stepNo();out.push(['13 jockey',await attempt(n,async()=>{g.actDown('c');g.sim(2.6);g.actUp('c');})]);
    n=stepNo();out.push(['14 slide',await attempt(n,async()=>{await press(['lob'],60);g.sim(1);})]);
    n=stepNo();out.push(['15 keeper',await attempt(n,async()=>{g.actDown('right');g.sim(1.2);await press(['pass'],150);g.actUp('right');g.sim(0.5);})]);
    n=stepNo();out.push(['16 free kick',await attempt(n,async()=>{g.sim(1);await press(['shoot'],400);g.sim(1.5);})]);
    n=stepNo();out.push(['17 penalty',await attempt(n,async()=>{g.sim(1);await press(['shoot'],300);g.sim(1.5);})]);
    g.sim(2);await wait(200);
    out.push(['done modal',!document.querySelector('#tutDone').hidden,'box hidden',document.querySelector('#tutBox').hidden,'mode',g.mode]);
    out.push(['shot holds [step, held s]',shots]);out.push(['retried at step',retries]);
    return out;});
  console.log('asked on first visit:',asked);
  for(const l of log)console.log(JSON.stringify(l));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  // pass only if the tutorial was offered, every step succeeded, the done screen showed and the page threw nothing
  const bad=[];
  if(!asked)bad.push('tutorial was not offered on the first visit');
  const failed=log.filter(l=>l[1]==='FAIL').map(l=>l[0]);if(failed.length)bad.push('steps failed: '+failed.join(', '));
  const done=log.find(l=>l[0]==='done modal');if(!done||done[1]!==true)bad.push('done screen not shown');
  const pe=errors.filter(e=>e.startsWith('pageerror'));if(pe.length)bad.push(pe.length+' page error(s)');
  if(bad.length){console.error('T115 FAIL: '+bad.join('; '));process.exitCode=1;}else console.log('T115 PASS');
  }catch(err){console.error('T115 FAIL: '+(err&&err.stack||err));process.exitCode=1;}
  finally{await browser.close();}
})();
