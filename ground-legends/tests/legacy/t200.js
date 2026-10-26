// turning shots vs square-on shots through the real keys; and S during the shot motion
const open=require('./harness.js');
const N=+(process.env.N||40);
(async()=>{
  const {browser,page,errors}=await open();
  const r=await page.evaluate(async(N)=>{
    const g=__game,wait=ms=>new Promise(r=>setTimeout(r,ms));const out={};
    g.startMatch({mode:'play',minutes:90,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(1);
    const T=g.teams[0],dir=T.dir;
    const setup=(face)=>{const p=g.give(0,T.players.find(q=>q.label==='ST').slot);p.st.sho=85;p.pos.set(dir*36.5,0,-3);p.face=face;p.vel.set(0,0,0);
      g.ball.pos.set(p.pos.x+Math.sin(face)*0.5,0.11,p.pos.z+Math.cos(face)*0.5);
      for(const q of g.players)if(q!==p&&!q.isGK){q.pos.set(q.team?-30:-40,0,q.slot*3-15);q.vel.set(0,0,0);}
      const gk=g.players.find(q=>q.team===1&&q.isGK);gk.st.gk=80;gk.pos.set(dir*51.3,0,0);gk.state='normal';gk.save=null;g.setCtl(p);p.sk=null;g.sim(1/60);return p;};
    // a firm 250 ms, not a full gauge: a full one now over-hits every shot and would hide the body-shape cost
    for(const [nm,face,hold] of [['facing goal',Math.atan2(dir,0),250],['side-on',Math.atan2(0,1),250],['back to goal',Math.atan2(-dir,0),250],['back, quick tap',Math.atan2(-dir,0),90],['facing, quick tap',Math.atan2(dir,0),90]]){
      let on=0,goals=0,spd=0,n=0,faceAtKick=0;
      for(let i=0;i<N;i++){const p=setup(face);const s0=g.score[0],o0=g.stats.on[0];
        g.actDown('right');g.actDown('down');g.actDown('shoot');await wait(hold);g.actUp('shoot');   // aim at the far corner, shoot
        let v=0;for(let k=0;k<200;k++){g.sim(1/60);if(!g.ball.owner&&!v&&Math.hypot(g.ball.vel.x,g.ball.vel.z)>5){v=Math.hypot(g.ball.vel.x,g.ball.vel.z);faceAtKick+=Math.abs(((p.face-Math.atan2(dir,0))*180/Math.PI+540)%360-180);}if(g.score[0]!==s0)break;}
        g.actUp('right');g.actUp('down');n++;spd+=v;on+=g.stats.on[0]-o0;goals+=g.score[0]-s0;g.setScore(0,0);
        if(g.state!=='play'){g.startMatch({mode:'play',minutes:90,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(1);}}
      out[nm]={onTarget:Math.round(on/n*100)+'%',goals:Math.round(goals/n*100)+'%',speed:+(spd/n).toFixed(1),bodyVsGoalAtKick:Math.round(faceAtKick/n)+'°'};}
    // fakes
    const fk=async(key,how)=>{const p=setup(Math.atan2(dir,0));const sh=g.stats.shots[0],pa=g.stats.passes[0];const c0=Object.assign({},g.skillCount);
      g.actDown(key);await wait(250);if(how==='held'){g.sim(1/60);g.actDown('pass');g.sim(1/60);g.actUp('pass');g.actUp(key);}else{g.actUp(key);g.sim(12/60);g.actDown('pass');g.sim(1/60);g.actUp('pass');}
      g.sim(0.8);const d={};for(const k in g.skillCount)if((g.skillCount[k]||0)!==(c0[k]||0))d[k]=1;return {skills:Object.keys(d).join(','),shot:g.stats.shots[0]-sh,pass:g.stats.passes[0]-pa};};
    out.fakeShotWhileHoldingD=await fk('shoot','held');out.fakeShot0_2sAfterRelease=await fk('shoot','after');
    out.fakeCrossWhileHoldingA=await fk('lob','held');out.fakeCross0_2sAfterRelease=await fk('lob','after');
    return out;},N);
  for(const k in r)console.log(k.padEnd(28),JSON.stringify(r[k]));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
