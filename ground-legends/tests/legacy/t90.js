// skill recognition under realistic conditions: diagonal running, slightly off-axis facing, slow taps, a run key still held
const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  const r=await page.evaluate(()=>{
    window.__gdbg=[];const g=__game;g.startMatch({mode:'play',minutes:12,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(1);
    const KEY={'→':'right','←':'left','↑':'up','↓':'down'};
    // seq: list of steps. 'x' = tap x, 'x+y' = press x then y together (diagonal), 'x_' = hold x
    const run=(faceDeg,hold,seq,opt={})=>{
      const p=g.give(0,9);p.st.dri=opt.dri||96;p.trait='trickster';p.pos.set(-5,0,0);
      // faceDeg is the screen angle (0 = →, 90 = ↑); screen up is world -z
      const a=faceDeg*Math.PI/180,wx=Math.cos(a),wz=-Math.sin(a);p.face=Math.atan2(wx,wz);p.vel.set(wx*4,0,wz*4);g.ball.pos.set(-5+wx*0.5,0.11,wz*0.5);
      for(const q of g.players)if(q!==p){q.pos.set(q.team?40:-40,0,q.slot*3-15);q.vel.set(0,0,0);}
      g.setCtl(p);p.sk=null;p.cdSkill=0;g.sim(0.05);
      const before=Object.assign({},g.skillCount);
      for(const k of (hold||[]))g.actDown(KEY[k]);g.sim(hold?0.4:0.1);
      g.actDown('skill');g.sim(0.05);for(const k of (hold||[]))g.actUp(KEY[k]);g.sim(opt.gap??0.06);
      const gap=opt.gap??0.06,tap=opt.tap??0.08;
      for(const st of seq){
        if(st.startsWith('~')){const ks=[...st.slice(1)].map(c=>KEY[c]);g.actDown(ks[0]);g.sim(tap);
          for(let i=1;i<ks.length;i++){g.actDown(ks[i]);g.sim(tap*0.7);g.actUp(ks[i-1]);g.sim(tap*0.7);}g.actUp(ks[ks.length-1]);g.sim(gap);continue;}
        if(st.endsWith('_')){const k=KEY[st[0]];g.actDown(k);g.sim(0.5);g.actUp(k);g.sim(gap);continue;}
        const ks=st.split('+').map(c=>KEY[c]);
        if(ks.length===1){g.actDown(ks[0]);g.sim(tap);g.actUp(ks[0]);g.sim(gap);}
        else{g.actDown(ks[0]);g.sim(0.02);g.actDown(ks[1]);g.sim(tap);g.actUp(ks[0]);g.sim(0.02);g.actUp(ks[1]);g.sim(gap);}
      }
      g.sim(0.03);g.actUp('skill');g.sim(0.05);
      const done=Object.keys(g.skillCount).filter(k=>(g.skillCount[k]||0)>(before[k]||0));
      g.sim(1.2);
      return done.join(',')||'-';
    };
    const cases={
      rainbow:['←','→','→'],stepover:['~→↓'],revstep:['~↓→'],roulette:['~←↑→↓'],
      elastico:['~↓←↑'],triple:['~←↓←↑'],turnL:['→','↑'],heelflick:['→','←'],flickup:['→','→','→'],bodyfeint:['↓'],quickroll:['←_'],
    };
    const out={};
    for(const [name,seq] of Object.entries(cases)){
      out[name]={
        right:run(0,null,seq),
        off20:run(20,null,seq),
        diag45:run(45,null,seq),
        diag45_run:run(45,['→','↑'],seq),
        diagNeg45:run(-45,null,seq),
        diag135:run(135,null,seq),
        off30:run(30,null,seq),
        up90:run(90,null,seq),
        runKeyHeld:run(0,['→'],seq),
        slowTaps:run(0,null,seq,{gap:0.26,tap:0.12}),
      };
    }
    out.__dbg=window.__gdbg;return out;});
  const cols=['right','off20','off30','diag45','diag45_run','diagNeg45','diag135','up90','runKeyHeld','slowTaps'];
  console.log('move'.padEnd(11)+cols.map(c=>c.slice(0,10).padEnd(11)).join(''));
  for(const [k,v] of Object.entries(r))if(k!=='__dbg')console.log(k.padEnd(11)+cols.map(c=>String(v[c]).slice(0,10).padEnd(11)).join(''));
  console.log(JSON.stringify(r.__dbg.filter((d,i)=>[11,13,16,24,34,35,36].includes(i)||d.top[0]&&/elastico|cancellift|waka|sidestep/.test(d.top[0])).slice(0,30)));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
