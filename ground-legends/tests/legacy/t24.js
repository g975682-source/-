const open=require('./harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const {browser,page,errors,SP}=await open();
  await page.evaluate(()=>{__game.startMatch({mode:'play',minutes:5,home:2,away:3,firstKick:0});window.__freeze=true;__game.sim(1);});
  // human penalties: 10 attempts, aim bottom right corner with medium power
  const pens=await page.evaluate(async()=>{let g=0,res=[];
    for(let k=0;k<10;k++){__game.setPiece('penalty',0,41.5,0);__game.sim(0.8);
      __game.actDown(k%2?'right':'left');__game.sim(0.5);__game.actUp(k%2?'right':'left');
      __game.actDown('shoot');await new Promise(r=>setTimeout(r,500));__game.actUp('shoot');
      const s0=__game.score[0];for(let i=0;i<200;i++){__game.sim(1/60);if(__game.state!=='setpiece'&&__game.state!=='play')break;}
      res.push(__game.score[0]>s0?'G':'x');if(__game.state==='goal'||__game.state==='replay')__game.sim(6);}
    return res.join('');});
  console.log('human pens',pens);
  // AI penalties vs our GK (no input) and AI direct free kicks vs wall
  const ai=await page.evaluate(()=>{const res=[];for(let k=0;k<10;k++){const s1=__game.score[1];__game.setPiece('penalty',1,-41.5,0);for(let i=0;i<60*5;i++){__game.sim(1/60);if(__game.state!=='setpiece'&&__game.state!=='play')break;}res.push(__game.score[1]>s1?'G':'x');if(__game.state!=='play')__game.sim(7);}
    const fk=[];for(let k=0;k<10;k++){const s1=__game.score[1];__game.setPiece('freekick',1,-27,(k%3-1)*6);for(let i=0;i<60*6;i++){__game.sim(1/60);if(__game.state==='goal'||__game.state==='dead')break;}fk.push(__game.score[1]>s1?'G':__game.state[0]);if(__game.state!=='play')__game.sim(7);}
    return {pens:res.join(''),fk:fk.join('')};});
  console.log('ai',JSON.stringify(ai));
  // throw-in thrown straight into goal does not count; thrower cannot touch twice
  const th=await page.evaluate(()=>{__game.setPiece('throw',0,50,33.95);__game.sim(0.8);const b=__game.ball;const sp=__game.sp;const t=sp.taker;
    // simulate a throw straight at goal
    __game.actDown('pass');__game.actUp('pass');__game.sim(1/60);b.owner=null;b.pos.set(51.5,1.2,2);b.vel.set(8,0,0);b.lastTouch=t;
    const s0=__game.score[0];for(let i=0;i<120;i++)__game.sim(1/60);return {score:__game.score,state:__game.state,sp:__game.sp&&__game.sp.type,s0};});
  console.log('throw-in goal',JSON.stringify(th));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
