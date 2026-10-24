const open=require('./harness.js');
(async()=>{
  const {browser,page}=await open();
  const r=await page.evaluate(()=>{const g=__game;const out={};let cur=null,k=0,info=null;const HL=52.5;
    g.startMatch({mode:'demo',minutes:12,home:0,away:2});window.__freeze=true;
    for(let i=0;i<60*60*24;i++){if(g.state==='fulltime'){k++;g.startMatch({mode:'demo',minutes:12,home:k%3,away:2});window.__freeze=true;cur=null;continue;}
      const lp=g.lastPass;
      if(lp&&lp!==cur&&lp.open&&lp.kind==='through'){cur=lp;const m=g.intended,T=g.teams[lp.team];info={m,dir:T.dir,from:g.ball.pos.clone(),mx:m?m.pos.x*T.dir:0,tgt:m?m.runTarget.clone():null,t:0,v0:g.ball.vel.length()};}
      if(cur&&info){info.t+=1/60;if(!cur.open||g.state!=='play'){const o=g.ball.owner||g.ball.lastTouch;let k2=g.state!=='play'?'out/'+g.state:o===info.m?'target':o&&o.team===cur.team?'mate':o&&o.isGK?'GK':'def';
        const e=out[k2]=out[k2]||{n:0,leadL:0,t:0,recvToBall:0};e.n++;e.leadL+=info.tgt?Math.hypot(info.tgt.x-info.from.x,info.tgt.z-info.from.z):0;e.t+=info.t;e.recvToBall+=info.m?Math.hypot(info.m.pos.x-g.ball.pos.x,info.m.pos.z-g.ball.pos.z):0;cur=null;info=null;}}
      g.sim(1/60);}
    for(const k in out){const e=out[k];e.leadL=+(e.leadL/e.n).toFixed(1);e.t=+(e.t/e.n).toFixed(2);e.recvToBall=+(e.recvToBall/e.n).toFixed(1);}return out;});
  console.log(JSON.stringify(r));await browser.close();
})();
