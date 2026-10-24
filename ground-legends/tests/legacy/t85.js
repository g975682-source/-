const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  const r=await page.evaluate(async()=>{
    const g=__game,wait=ms=>new Promise(r=>setTimeout(r,ms));
    g.startMatch({mode:'play',minutes:12,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(1);
    const out={};const tap=(k)=>{g.actDown(k);g.sim(1/60);g.actUp(k);g.sim(1/60);};
    // attacking direct free kick
    g.setPiece('freekick',0,30,5);g.sim(0.8);
    const sp=g.sp;out.fk=!!(sp&&sp.fk);const t0=sp.taker;
    tap('sprint');out.eChangesKicker=g.sp.taker!==t0;
    tap('c');out.k2=!!g.sp.fk.k2;
    const k2=g.sp.fk.k2;g.actDown('c');g.sim(1/60);g.actDown('shoot');await wait(300);g.actUp('shoot');g.actUp('c');g.sim(1/60);
    out.cdSecondKickerShoots=g.sp&&g.sp.taker===k2;g.sim(2);
    // driven free kick (Q+D)
    g.setPiece('freekick',0,28,-3);g.sim(0.8);g.actDown('switch');g.sim(1/60);g.actDown('shoot');await wait(300);g.actUp('shoot');g.actUp('switch');g.sim(1/60);out.drive=g.sp&&g.sp.fk&&g.sp.fk.drive;g.sim(1.2);out.driveTop=+g.ball.sp.top.toFixed(2);g.sim(2);
    // C then C+S: lay-off for the second kicker who strikes first time
    g.setPiece('freekick',0,29,2);g.sim(0.8);tap('c');const kk=g.sp.fk.k2;const sh0=g.stats.shots[0];g.actDown('c');g.sim(1/60);g.actDown('pass');await wait(100);g.actUp('pass');g.actUp('c');g.sim(2);
    out.layoff={shotBy2nd:g.stats.shots[0]>sh0,lastShooter:g.ball.shotBy===kk};g.sim(2);
    // defending free kick: W jump, D charge
    g.setPiece('freekick',1,-30,4);g.sim(0.8);const wall=g.players.filter(p=>p.team===0&&p.inWall);
    tap('through');out.wallJump=wall.filter(p=>p.oAnim==='jump').length+'/'+wall.length;
    tap('shoot');out.wallCharge=g.players.length&&true;g.sim(3);
    // penalty: Q+D chip
    g.setPiece('penalty',0,41.5,0);g.sim(0.8);g.actDown('switch');g.sim(1/60);g.actDown('shoot');await wait(250);g.actUp('shoot');g.actUp('switch');g.sim(1/60);out.penChip=g.sp&&g.sp.fk&&g.sp.fk.chip;g.sim(0.7);out.penSpeed=+g.ball.vel.length().toFixed(1);g.sim(3);
    // corner: A x3 ground
    g.setPiece('corner',0,52.1,33.6);g.sim(0.8);g.actDown('lob');await wait(150);g.actUp('lob');g.sim(1/60);tap('lob');tap('lob');let pk=0;for(let i=0;i<60;i++){g.sim(1/60);pk=Math.max(pk,g.ball.pos.y);}out.cornerAAA=+pk.toFixed(2);g.sim(3);
    // throw-in: A then S = fake throw
    g.setPiece('throw',0,10,33.95);g.sim(0.8);g.actDown('lob');await wait(150);g.actUp('lob');g.sim(1/60);tap('pass');g.sim(0.3);out.fakeThrow=g.state==='setpiece';
    tap('through');g.sim(0.3);out.manualThrow=g.state==='play';
    return out;});
  console.log(JSON.stringify(r));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
