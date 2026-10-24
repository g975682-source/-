// power shot gauge (F+D), shot fake (D,S) and cross fake (A,S) through real key edges
const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  const r=await page.evaluate(async()=>{
    const g=__game,wait=ms=>new Promise(r=>setTimeout(r,ms));
    g.startMatch({mode:'play',minutes:12,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(1);
    const out={};
    const setup=(x,z,face)=>{const p=g.give(0,9);p.st.sho=85;p.pos.set(x,0,z);p.face=face??Math.PI/2;p.vel.set(0,0,0);g.ball.pos.set(x+0.5,0.11,z);
      for(const q of g.players)if(q!==p&&!q.isGK){q.pos.set(q.team?-30:-40,0,q.slot*3-15);q.vel.set(0,0,0);}
      g.setCtl(p);p.sk=null;p.cdSkill=0;g.sim(1/60);return p;};
    const flight=()=>{let v0=0;for(let i=0;i<40;i++){g.sim(1/60);if(!g.ball.owner&&!v0&&g.ball.vel.length()>4)v0=Math.hypot(g.ball.vel.x,g.ball.vel.z);}return +v0.toFixed(1);};
    // 1: F + D, then D in the green
    {const p=setup(30,0);const sh=g.stats.shots[0];g.actDown('f');g.actDown('shoot');g.sim(1/60);await wait(30);g.actUp('shoot');
     const ps=g.ps;const vis=!document.getElementById('psGauge').hidden;let frames=0;
     while(g.ps&&g.ps.t/0.8<g.ps.c&&frames<60){g.sim(1/60);frames++;}
     const slow=Math.hypot(p.vel.x,p.vel.z);const anim=p.oAnim;
     g.actDown('shoot');g.sim(1/60);g.actUp('shoot');g.actUp('f');
     out.green={gauge:!!ps,visible:vis,zone:ps&&[+ps.c.toFixed(2),+ps.w.toFixed(2)],frames,windup:anim,lbl:document.getElementById('psLbl').textContent,v0:flight(),shots:g.stats.shots[0]-sh};}
    // 2: let it run out
    {const p=setup(30,0);const sh=g.stats.shots[0];g.actDown('f');g.actDown('shoot');g.sim(1/60);g.actUp('shoot');g.actUp('f');g.sim(0.7);const before=g.stats.shots[0]-sh;g.sim(0.15);
     out.timeout={beforeEnd:before,lbl:document.getElementById('psLbl').textContent,v0:flight(),shots:g.stats.shots[0]-sh};}
    // 3: early press, outside the green
    {const p=setup(30,0);const sh=g.stats.shots[0];g.actDown('f');g.actDown('shoot');g.sim(1/60);g.actUp('shoot');g.sim(2/60);const c=g.ps.c;g.actDown('shoot');g.sim(1/60);g.actUp('shoot');g.actUp('f');
     out.early={zoneC:+c.toFixed(2),lbl:document.getElementById('psLbl').textContent,v0:flight(),shots:g.stats.shots[0]-sh};}
    // 4: tackled mid-gauge: no shot
    {const p=setup(30,0);const sh=g.stats.shots[0];g.actDown('f');g.actDown('shoot');g.sim(1/60);g.actUp('shoot');g.sim(0.2);
     const o=g.give(1,6);g.sim(0.2);const gone=!g.ps;g.actDown('shoot');g.sim(1/60);g.actUp('shoot');g.actUp('f');g.sim(0.5);
     out.lost={gaugeGone:gone,shots:g.stats.shots[0]-sh};}
    // 5: D then S = shot fake, A then S = cross fake (midfield and the crossing zone)
    const fake=async(key,x,z,face)=>{const p=setup(x,z,face);const sh=g.stats.shots[0],pa=g.stats.passes[0];const c0=Object.assign({},g.skillCount);
      g.actDown(key);await wait(120);g.actUp(key);g.sim(3/60);g.actDown('pass');g.sim(1/60);g.actUp('pass');g.sim(0.7);
      const d={};for(const k in g.skillCount)if((g.skillCount[k]||0)!==(c0[k]||0))d[k]=g.skillCount[k]-(c0[k]||0);
      return {skills:d,shots:g.stats.shots[0]-sh,passes:g.stats.passes[0]-pa,own:g.ball.owner===p};};
    out.shotFake=await fake('shoot',30,0);
    out.crossFakeMid=await fake('lob',0,5);
    out.crossFakeWing=await fake('lob',40,25);
    // 6: a plain A still lobs (after the A-tap window)
    {const p=setup(0,5);const pa=g.stats.passes[0];g.actDown('lob');await wait(120);g.actUp('lob');let t=0;while(g.stats.passes[0]===pa&&t<1){g.sim(1/60);t+=1/60;}out.lobDelay=+t.toFixed(2);}
    return out;});
  console.log(JSON.stringify(r,null,1));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
