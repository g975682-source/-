const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  const r=await page.evaluate(async()=>{
    const g=__game,wait=ms=>new Promise(r=>setTimeout(r,ms));g.startTutorial();window.__freeze=true;g.tutGo(+window.__step||3);
    const o=[];const st=()=>{const t=g.tut;return 'step '+t.i+' done '+t.done+' ev '+JSON.stringify(t.ev.map(e=>e.type+':'+e.val))+' own '+(g.ball.owner?g.ball.owner.team+':'+g.ball.owner.slot:'-')+' ctl '+g.controlled.slot+' state '+g.state+' ball '+g.ball.pos.x.toFixed(1)+','+g.ball.pos.y.toFixed(1)+','+g.ball.pos.z.toFixed(1)+' b9 '+(()=>{const b=g.players.find(p=>p.team===0&&p.slot===9);return b.pos.x.toFixed(1)+','+b.pos.z.toFixed(1)+' st '+b.state+' parked '+g.tut.park.has(b)+' itPt '+b.itPt.x.toFixed(1)+','+b.itPt.z.toFixed(1);})();};
    o.push(st());g.actDown('right');g.actDown('lob');g.sim(1/60);await wait(300);g.actUp('lob');g.actUp('right');
    for(let i=0;i<50;i++){g.sim(0.06);if(i>14&&i<40)o.push(st());}
    return o;});
  console.log(r.join('\n'));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
