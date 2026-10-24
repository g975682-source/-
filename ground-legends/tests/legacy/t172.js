// a defender stands in the run's natural path: does the requested run go round to the open side?
const open=require('./harness.js');
(async()=>{
  const {browser,page}=await open();
  const r=await page.evaluate(async()=>{const g=__game,wait=ms=>new Promise(r=>setTimeout(r,ms));
    g.startMatch({mode:'play',minutes:30,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(1);
    const T=g.teams[0],O=g.teams[1],dir=T.dir;const res=[];
    for(const side of [1,-1])for(let i=0;i<4;i++){
      const p=g.give(0,T.players.find(q=>q.label==='CM').slot);g.setCtl(p);p.pos.set(dir*10,0,0);p.vel.set(0,0,0);g.ball.pos.set(p.pos.x+dir*0.5,0.11,0);
      const st=T.players.find(q=>q.label==='ST');st.pos.set(dir*24,0,dir*side*1);st.vel.set(0,0,0);
      for(const q of T.players){if(q===p||q.isGK)continue;q.runT=0;q.runKind=null;q.runCD=5;if(q!==st)q.pos.set(dir*-10,0,q.slot*4-20);}
      // two defenders shut one side of him, the other side is open
      let k=0;for(const q of O.players){if(q.isGK)continue;const sp=[[30,side*7],[34,side*12],[26,-side*20],[16,0],[16,side*10],[16,-side*12],[8,0],[8,10],[8,-10],[0,0]][k++];q.pos.set(dir*sp[0],0,dir*sp[1]);q.vel.set(0,0,0);}
      g.sim(0.1);g.actDown('switch');g.sim(1/60);await wait(60);g.actUp('switch');g.sim(1/60);
      const rr=T.players.find(q=>q.runT>0&&q.runKind==='behind');if(!rr){res.push('none');continue;}
      const tz=(rr.runTarget.z*dir)*side;res.push((rr===st?'ST':rr.label)+(tz>1?' blocked side':tz<-1?' OPEN side':' straight')+' tz'+(rr.runTarget.z*dir).toFixed(0));}
    return res;});
  console.log(JSON.stringify(r));await browser.close();
})();
