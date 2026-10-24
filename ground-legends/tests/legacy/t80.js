// every skill move: runs to the end without errors, ball stays sane, pose stays finite
const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  const r=await page.evaluate(()=>{
    const g=__game;g.startMatch({mode:'play',minutes:12,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(1);
    const out=[];
    for(const m of g.skills.filter(m=>window.__only?window.__only.includes(m.k):true)){
      for(const s of [1,-1]){
        const p=g.give(0,9);p.st.dri=96;p.trait='trickster';p.pos.set(-5,0,0);p.face=Math.PI/2;p.vel.set(4,0,0);g.ball.pos.set(-4.5,0.11,0);
        // park everyone else far away so nothing interferes
        for(const q of g.players)if(q!==p){q.pos.set(q.team?40:-40,0,q.slot*3-15);q.vel.set(0,0,0);}
        g.setCtl(p);p.cdSkill=0;p.sk=null;
        if(m.k==='atw'||m.k==='inair'){g.skill(p,'juggle',1);g.sim(0.6);}
        const ok=g.skill(p,m.k,s,m.k==='stopgoal'?{turn:1}:(m.k==='atw'||m.k==='inair')?{chain:true}:{});
        let maxH=0,bad=null,minD=99,maxD=0,released=false;
        const p0=p.pos.clone();
        for(let i=0;i<Math.ceil((m.dur+(window.__long||0.9))*60);i++){g.sim(1/60);const b=g.ball.pos;maxH=Math.max(maxH,b.y);
          if(!isFinite(b.x+b.y+b.z+p.pos.x+p.pos.z+p.face))bad='nan';
          const r=p.rig;for(const o of [r.legL,r.legR,r.kneeL,r.kneeR,r.hips,r.torso,r.armL,r.armR])if(!isFinite(o.rotation.x+o.rotation.y+o.rotation.z))bad='pose';
          const d=Math.hypot(b.x-p.pos.x,b.z-p.pos.z);if(g.ball.owner===p){minD=Math.min(minD,d);maxD=Math.max(maxD,d);}else released=true;}
        out.push({k:m.k,s,ok,bad,maxH:+maxH.toFixed(2),maxD:+maxD.toFixed(2),released,own:g.ball.owner===p,moved:+Math.hypot(p.pos.x-p0.x,p.pos.z-p0.z).toFixed(1),state:g.state});
      }
    }
    return out;});
  const fails=r.filter(x=>!x.ok||x.bad||x.maxD>1.6||(!x.own&&x.state==='play'&&!x.released));
  console.log('moves',r.length/2,'fails',fails.length);
  for(const x of r)console.log(JSON.stringify(x));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
