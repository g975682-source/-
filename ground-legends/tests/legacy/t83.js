const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  const r=await page.evaluate(async()=>{
    const g=__game,wait=ms=>new Promise(r=>setTimeout(r,ms));
    g.startMatch({mode:'play',minutes:12,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(1);
    const out={};
    const setup=(x,z,face)=>{const p=g.give(0,9);p.pos.set(x,0,z);p.face=face??Math.PI/2;p.vel.set(0,0,0);g.ball.pos.set(x+0.5,0.11,z);
      for(const q of g.players)if(q!==p&&!q.isGK){q.pos.set(q.team?-30:-40,0,q.slot*3-15);q.vel.set(0,0,0);}
      g.setCtl(p);p.sk=null;p.cdSkill=0;g.sim(1/60);return p;};
    const press=async(keys,ms)=>{for(const k of keys)g.actDown(k);g.sim(1/60);await wait(ms||60);for(const k of keys.slice().reverse())g.actUp(k);};
    // shots are held a firm 250 ms: past 90% of the gauge (0.27 s) they over-hit and fly
    const shot=async(keys,label)=>{const p=setup(30,0);const k0=keys.slice(0,-1),last=keys[keys.length-1];for(const k of k0)g.actDown(k);g.sim(1/60);g.actDown(last);await wait(250);g.actUp(last);for(const k of k0)g.actUp(k);
      let peak=0,v0=0;for(let i=0;i<40;i++){g.sim(1/60);if(!g.ball.owner&&!v0)v0=Math.hypot(g.ball.vel.x,g.ball.vel.z);peak=Math.max(peak,g.ball.pos.y);}
      return {peak:+peak.toFixed(2),v0:+v0.toFixed(1),spin:+g.ball.sp.s.toFixed(2)};};
    out.normal=await shot(['shoot']);
    out.chipQD=await shot(['switch','shoot']);
    out.finesseZD=await shot(['z','shoot']);
    // D then tap D: low shot
    {const p=setup(30,0);g.actDown('shoot');await wait(250);g.actUp('shoot');g.sim(1/60);g.actDown('shoot');g.sim(1/60);g.actUp('shoot');
     let peak=0;for(let i=0;i<40;i++){g.sim(1/60);peak=Math.max(peak,g.ball.pos.y);}out.lowDD={peak:+peak.toFixed(2)};}
    // D then S: fake shot (no shot taken)
    {const sc=g.stats.shots[0];const c0=g.skillCount.fakeshot||0;const p=setup(20,0);g.actDown('shoot');await wait(200);g.actUp('shoot');g.sim(1/60);g.actDown('pass');g.sim(1/60);g.actUp('pass');g.sim(0.8);
     out.fakeShot={skill:(g.skillCount.fakeshot||0)-c0,shotTaken:g.stats.shots[0]-sc,own:g.ball.owner===p};}
    // A x2 in the crossing zone: ground cross
    {const p=setup(40,25,Math.PI/2);g.actDown('lob');await wait(200);g.actUp('lob');g.sim(1/60);g.actDown('lob');g.sim(1/60);g.actUp('lob');let peak=0;for(let i=0;i<50;i++){g.sim(1/60);peak=Math.max(peak,g.ball.pos.y);}out.groundCrossAA={peak:+peak.toFixed(2)};}
    {const p=setup(40,25,Math.PI/2);g.actDown('lob');await wait(200);g.actUp('lob');let peak=0;for(let i=0;i<60;i++){g.sim(1/60);peak=Math.max(peak,g.ball.pos.y);}out.crossA={peak:+peak.toFixed(2)};}
    // C: shield with an opponent behind
    {const p=setup(0,0,Math.PI/2);const o=g.players.find(q=>q.team===1&&q.slot===5);o.pos.set(1.6,0,0);g.actDown('c');g.sim(0.6);out.shield={shielding:p.shielding,face:+p.face.toFixed(2),facingAway:Math.cos(p.face-(-Math.PI/2))>0.7};g.actUp('c');g.sim(0.1);}
    // Ctrl + direction: knock on
    {const p=setup(0,0,Math.PI/2);g.actDown('right');g.sim(1/60);g.actDown('ctrl');g.sim(1/60);g.actUp('ctrl');const v=g.ball.vel.x;g.actUp('right');out.knock={ballVx:+v.toFixed(1),owner:!!g.ball.owner};g.sim(1.5);out.knock.regained=g.ball.owner===p;}
    // E with no direction: stop
    {const p=setup(0,0,Math.PI/2);p.vel.set(6,0,0);g.actDown('sprint');g.sim(0.6);out.stopE=+Math.hypot(p.vel.x,p.vel.z).toFixed(2);g.actUp('sprint');}
    // Q tap without direction: stop and look at goal; with direction: no-touch feint
    {const p=setup(0,10,0);const c0=g.skillCount.stopgoal||0;g.actDown('switch');g.sim(1/60);await wait(450);g.actUp('switch');g.sim(0.7);out.qHold={stopgoal:(g.skillCount.stopgoal||0)-c0,face:+p.face.toFixed(2)};}
    {const p=setup(0,0);const c0=g.skillCount.nt1||0;g.actDown('down');g.actDown('switch');g.sim(1/60);await wait(450);g.actUp('switch');g.sim(1/60);g.actUp('down');g.sim(0.4);out.qHoldDir=(g.skillCount.nt1||0)-c0;}
    // Z tap: support run
    {const p=setup(0,0);g.actDown('z');g.sim(1/60);g.actUp('z');g.sim(1/60);out.zSupport=g.players.filter(q=>q.team===0&&q.runT>1).length;}
    // ` : bunny hop
    {const p=setup(0,0);const c0=g.skillCount.hop||0;g.actDown('hop');g.sim(1/60);g.actUp('hop');g.sim(0.2);out.hop={n:(g.skillCount.hop||0)-c0,y:+p.y.toFixed(2)};g.sim(0.5);}
    // defending: D close = standing tackle, C = jockey goal-side, A when down = quick get up
    {const o=g.give(1,9);o.pos.set(0,0,0);o.vel.set(0,0,0);g.ball.pos.set(-0.5,0.11,0);const d=g.players.find(q=>q.team===0&&q.slot===5);d.pos.set(-1.6,0,0);d.state='normal';g.setCtl(d);g.sim(1/60);
     g.actDown('shoot');g.sim(1/60);out.dTackle=d.state;g.actUp('shoot');g.sim(1);}
    {const o=g.give(1,9);o.pos.set(0,0,0);o.vel.set(-3,0,0);g.ball.pos.set(-0.5,0.11,0);const d=g.players.find(q=>q.team===0&&q.slot===5);d.pos.set(-6,0,3);d.state='normal';g.setCtl(d);
     g.actDown('c');g.sim(1.2);const gs=(d.pos.x<o.pos.x);out.jockey={goalSide:gs,dist:+Math.hypot(d.pos.x-o.pos.x,d.pos.z-o.pos.z).toFixed(2)};g.actUp('c');}
    {const d=g.give(0,6);g.setCtl(d);g.sim(1/60);d.state='fall';d.stateT=0;d.fallDur=1.1;g.actDown('lob');g.sim(1/60);g.actUp('lob');g.sim(0.3);out.quickUp=d.state;}
    // keeper: W puts the ball down, Z cannot pick it back up
    {const gk=g.players.find(q=>q.team===0&&q.isGK);g.give(0,gk.slot);gk.holding=true;g.setCtl(gk);g.sim(1/60);g.actDown('through');g.sim(1/60);g.actUp('through');g.sim(0.1);const h1=gk.holding;
     g.actDown('z');g.sim(1/60);g.actUp('z');g.sim(0.1);out.gk={dropped:!h1,repick:gk.holding};}
    return out;});
  console.log(JSON.stringify(r,null,1));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
