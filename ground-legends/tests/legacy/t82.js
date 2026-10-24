// Shift + arrow gestures through the real input path (actDown/actUp + ticks)
const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  const r=await page.evaluate(()=>{
    const g=__game;g.startMatch({mode:'play',minutes:12,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(1);
    const run=(ops,dri,mods)=>{
      const p=g.give(0,9);p.st.dri=dri||96;p.trait='trickster';p.pos.set(-5,0,0);p.face=Math.PI/2;p.vel.set(3,0,0);g.ball.pos.set(-4.5,0.11,0);
      for(const q of g.players)if(q!==p){q.pos.set(q.team?40:-40,0,q.slot*3-15);q.vel.set(0,0,0);}
      g.setCtl(p);p.sk=null;p.cdSkill=0;g.sim(0.05);
      const before=Object.assign({},g.skillCount);
      for(const m of (mods||[]))g.actDown(m);
      g.actDown('skill');g.sim(0.03);
      for(const o of ops){if(typeof o==='number'){g.sim(o);continue;}const [t,k]=o.split(':');(t==='d'?g.actDown:g.actUp)(k);g.sim(1/60);}
      g.sim(0.03);g.actUp('skill');
      for(const m of (mods||[]))g.actUp(m);
      g.sim(0.05);
      const done=Object.keys(g.skillCount).filter(k=>(g.skillCount[k]||0)>(before[k]||0));
      const side=p.sk?Math.sign(p.sk.s):0;
      g.sim(1.2);
      return done.join(',')+(side?(side>0?'+':'-'):'');
    };
    const T=(k,t=0.08)=>['d:'+k,t,'u:'+k,0.06];
    const out={};
    out.bodyfeintR=run(T('down'));
    out.bodyfeintL=run(T('up'));
    out.sidestepR=run(['d:down',0.45,'u:down']);
    out.stepoverR=run(['d:right',0.08,'d:down',0.08,'u:right',0.08,'u:down']);
    out.stepoverR_nodiag=run(['d:right',0.08,'u:right',0.03,'d:down',0.08,'u:down']);
    out.revstepR=run(['d:down',0.08,'d:right',0.08,'u:down',0.08,'u:right']);
    out.rouletteR=run(['d:left',0.08,'d:up',0.08,'u:left',0.08,'d:right',0.08,'u:up',0.08,'d:down',0.08,'u:right',0.08,'u:down']);
    out.rainbow=run([...T('left'),...T('right'),...T('right')]);
    out.rainbow_3star=run([...T('left'),...T('right'),...T('right')],76);
    out.neyrainbow_6=run([...T('left'),...T('right'),...T('right')],96);
    out.elastico=run(['d:down',0.08,'d:left',0.08,'u:down',0.08,'d:up',0.08,'u:left',0.08,'u:up']);
    out.heelflick=run([...T('right'),...T('left')]);
    out.flickup=run([...T('right'),...T('right'),...T('right')]);
    out.quickroll=run(['d:left',0.5,'u:left']);
    out.sombrero=run(['d:right',0.5,'u:right']);
    out.stopturnL=run([...T('right'),...T('up')],84);
    out.turnspinL=run([...T('right'),...T('up')],96);
    out.spinL=run(['d:left','d:up',0.08,'u:left','u:up',0.06,'d:left','d:up',0.08,'u:left','u:up']);
    out.dbspinQ=run([...T('left'),...T('down')],96,['switch']);
    out.roul3C=run([...T('left'),...T('up')],96,['c']);
    out.bare=run([]);
    // defence: Shift + direction moves the cursor that way
    const o=g.give(1,9);o.pos.set(0,0,0);g.ball.pos.set(0.5,0.11,0);
    const T0=g.players.filter(p=>p.team===0&&!p.isGK);T0.forEach((p,i)=>{p.pos.set(-10,0,-20+i*4);});
    const cur=T0[5];g.setCtl(cur);g.sim(1/60);
    g.actDown('skill');g.sim(0.03);g.actDown('down');g.sim(0.05);g.actUp('down');g.actUp('skill');g.sim(0.05);
    out.defSwitchDown=(g.controlled.pos.z>cur.pos.z?'ok ':'bad ')+cur.pos.z+'->'+g.controlled.pos.z;
    return out;});
  console.log(JSON.stringify(r,null,1));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
