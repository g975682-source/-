const open=require('./harness.js');
(async()=>{
  const {browser,page}=await open();
  const r=await page.evaluate(()=>{const g=__game;const K={};let cur=null,k=0;
    g.startMatch({mode:'demo',minutes:12,home:0,away:2});window.__freeze=true;
    for(let i=0;i<60*60*36;i++){if(g.state==='fulltime'){k++;g.startMatch({mode:'demo',minutes:12,home:k%3,away:2});window.__freeze=true;cur=null;continue;}
      const lp=g.lastPass;
      if(lp&&lp!==cur&&lp.open&&lp.kind){cur=lp;cur._k=lp.kind;cur._to=g.intended;}
      if(cur&&!cur.open&&!cur._done){cur._done=true;const o=g.ball.owner||g.ball.lastTouch;const e=K[cur._k]=K[cur._k]||{n:0,ok:0,toTarget:0};e.n++;if(o&&o.team===cur.team)e.ok++;if(o&&o===cur._to)e.toTarget++;}
      g.sim(1/60);}
    for(const k in K)K[k].pct=Math.round(K[k].ok/K[k].n*100);return K;});
  console.log(JSON.stringify(r));await browser.close();
})();
