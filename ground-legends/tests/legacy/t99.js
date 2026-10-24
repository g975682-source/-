const open=require('./harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const {browser,page,errors,SP}=await open();
  const r=await page.evaluate(()=>{
    const g=__game;g.startMatch({mode:'play',minutes:12,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(1);
    const out={};
    const setup=()=>{const p=g.give(0,9);p.st.dri=96;p.pos.set(-5,0,0);p.face=Math.PI/2;p.vel.set(4,0,0);g.ball.pos.set(-4.5,0.11,0);
      for(const q of g.players)if(q!==p){q.pos.set(q.team?40:-40,0,q.slot*3-15);q.vel.set(0,0,0);}g.setCtl(p);p.sk=null;p.cdSkill=0;g.sim(0.05);return Object.assign({},g.skillCount);};
    const diff=b=>Object.keys(g.skillCount).filter(k=>(g.skillCount[k]||0)>(b[k]||0)).join(',')||'-';
    let b=setup();g.actDown('skill');g.sim(0.1);g.actUp('skill');g.sim(0.6);out.shiftAlone=diff(b);
    b=setup();g.actDown('skill');g.sim(0.9);g.actUp('skill');g.sim(0.6);out.shiftHeldLong=diff(b);
    b=setup();g.actDown('right');g.sim(0.5);g.actDown('skill');g.sim(0.8);g.actUp('skill');g.actUp('right');g.sim(0.6);out.runKeyStillHeld=diff(b);
    b=setup();g.actDown('right');g.sim(0.5);g.actDown('skill');g.sim(0.05);g.actUp('right');g.sim(0.05);g.actDown('down');g.sim(0.08);g.actUp('down');g.sim(0.05);g.actUp('skill');g.sim(0.6);out.runThenKey=diff(b);
    b=setup();g.actDown('down');g.sim(0.08);g.actUp('down');g.sim(0.05);g.actDown('skill');g.sim(0.1);g.actUp('skill');g.sim(0.6);out.keyBeforeShift=diff(b);
    // defending: Shift tap still changes player
    const o=g.give(1,9);o.pos.set(0,0,0);g.ball.pos.set(0.5,0.11,0);const T0=g.players.filter(p=>p.team===0&&!p.isGK);T0.forEach((p,i)=>p.pos.set(-12,0,-20+i*4));
    g.setCtl(T0[0]);g.sim(1/60);const c0=g.controlled;g.actDown('skill');g.sim(0.05);g.actUp('skill');g.sim(0.1);out.defShiftTapSwitch=g.controlled!==c0;
    return out;});
  console.log(JSON.stringify(r));
  // guide toggle
  const st=async()=>page.evaluate(()=>({mode:document.body.dataset.guide,keys:getComputedStyle(document.querySelector('#keys')).display,btn:document.querySelector('#btnGuide').textContent}));
  const g0=await st();await page.keyboard.press('KeyH');const g1=await st();await page.keyboard.press('KeyH');const g2=await st();
  await page.reload();await sleep(1500);const g3=await st();
  await page.keyboard.press('KeyH');const g4=await st();
  console.log(JSON.stringify({g0,g1,g2,afterReload:g3,g4}));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
