const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  const r=await page.evaluate(async()=>{
    const g=__game,wait=ms=>new Promise(r=>setTimeout(r,ms));g.startTutorial();window.__freeze=true;g.tutGo(4);
    const o=[];const st=()=>{const t=g.tut;return 'step '+t.i+' done '+t.done+' goals '+t.goals+' ev '+JSON.stringify(t.ev.map(e=>e.type+':'+e.val))+' own '+(g.ball.owner?g.ball.owner.team+':'+g.ball.owner.slot:'-')+' state '+g.state+' ball '+g.ball.pos.x.toFixed(1)+','+g.ball.pos.y.toFixed(1)+','+g.ball.pos.z.toFixed(1)+' sp '+(g.sp?g.sp.type:'-');};
    o.push(st());g.actDown('shoot');g.sim(1/60);await wait(250);g.actUp('shoot');
    for(let i=0;i<14;i++){g.sim(0.25);o.push(st());}
    return o;});
  console.log(r.join('\n'));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
