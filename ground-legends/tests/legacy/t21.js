const open=require('./harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const {browser,page,errors,SP}=await open();
  await page.evaluate(()=>{__game.startMatch({mode:'play',minutes:5,home:0,away:4,firstKick:0,diff:'pro'});window.__freeze=true;__game.sim(1);});
  // 1. back-pass: CB (slot 2) in own box passes to GK with left arrow
  const bp=[];
  for(let k=0;k<6;k++){
    const r=await page.evaluate(async()=>{
      const T0=__game.players.filter(p=>p.team===0);const cb=T0.find(p=>p.slot===2),gk=T0.find(p=>p.isGK);
      gk.pos.set(-50,0,0);cb.pos.set(-40,0,3+Math.random()*4);for(const p of __game.players)if(p.team===1)p.pos.x=Math.max(p.pos.x,-10);
      __game.give(0,2);__game.actDown('left');__game.actDown('pass');await new Promise(r=>setTimeout(r,150));__game.actUp('pass');__game.sim(1/60);__game.actUp('left');
      let caught=false,feet=false;for(let i=0;i<180;i++){__game.sim(1/60);const o=__game.ball.owner;if(o===gk){if(gk.holding)caught=true;else feet=true;break;}}
      return {caught,feet,ctrlIsGK:__game.controlled===gk};});
    bp.push(r);
  }
  console.log('backpass',JSON.stringify(bp));
  // 2. auto receive: CM passes right while the user keeps holding the up arrow
  let ok=0,fail=[];
  for(let k=0;k<12;k++){
    const r=await page.evaluate(async()=>{
      for(const p of __game.players)if(p.team===1)p.pos.z=Math.min(p.pos.z,-25);
      const cm=__game.give(0,5);__game.actDown('right');__game.actDown('pass');await new Promise(r=>setTimeout(r,120));__game.actUp('pass');__game.sim(1/60);__game.actUp('right');__game.actDown('up');
      const tgt=__game.controlled;const from=cm;let got=null;for(let i=0;i<240;i++){__game.sim(1/60);const o=__game.ball.owner;if(o){got=o;break;}if(__game.state!=='play')break;}
      __game.actUp('up');return {from:from.slot,to:tgt&&tgt.slot,got:got?got.team+':'+got.slot:'-',st:__game.state};});
    if(r.got==='0:'+r.to)ok++;else fail.push(r);
  }
  console.log('receive ok',ok,'/12',JSON.stringify(fail));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
