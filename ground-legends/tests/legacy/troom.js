const open=require('./harness.js');
(async()=>{
  const {browser,page}=await open();
  const r=await page.evaluate(()=>{const g=__game;let n=0,room=0,mid=0,lane=0,k=0;const seen=new WeakMap();
    g.startMatch({mode:'demo',minutes:12,home:0,away:2});window.__freeze=true;
    for(let i=0;i<60*60*24;i++){if(g.state==='fulltime'){k++;g.startMatch({mode:'demo',minutes:12,home:k%3,away:2});window.__freeze=true;}
      g.sim(1/60);if(g.state!=='play')continue;
      for(const p of g.players){if(p.runKind!=='behind'&&p.runKind!=='third')continue;if(p.runT<1.6||seen.get(p)===p.runTarget.x+p.runTarget.z)continue;seen.set(p,p.runTarget.x+p.runTarget.z);
        const O=g.teams[1-p.team].players;const rm=(x,z)=>{let m=99;for(const o of O)m=Math.min(m,Math.hypot(o.pos.x-x,o.pos.z-z));return m;};
        n++;room+=Math.min(rm(p.runTarget.x,p.runTarget.z),15);mid+=Math.min(rm((p.pos.x+p.runTarget.x)/2,(p.pos.z+p.runTarget.z)/2),15);
        // 1 s later: room around the runner himself
        p._chk=i+60;}
      for(const p of g.players)if(p._chk===i){const O=g.teams[1-p.team].players;let m=99;for(const o of O)m=Math.min(m,Math.hypot(o.pos.x-p.pos.x,o.pos.z-p.pos.z));lane+=Math.min(m,15);p._chk=null;}}
    return {runs:n,roomAtTarget:+(room/n).toFixed(2),roomMidway:+(mid/n).toFixed(2),runnerFreeAfter1s:+(lane/n).toFixed(2)};});
  console.log(JSON.stringify(r));await browser.close();
})();
