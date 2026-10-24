// Q run request: room at the run's target and along the way, the badge, and no ticker line
const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  const r=await page.evaluate(async()=>{
    const g=__game,wait=ms=>new Promise(r=>setTimeout(r,ms));const out={room:0,roomMid:0,n:0,through:0,tries:0,badge:0,ticker:''};
    g.startMatch({mode:'play',minutes:30,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(1);
    const T=g.teams[0],O=g.teams[1],dir=T.dir;
    const room=(x,z)=>{let m=99;for(const o of O.players){m=Math.min(m,Math.hypot(o.pos.x-x,o.pos.z-z));}return m;};
    for(let i=0;i<12;i++){
      const p=g.give(0,T.players.find(q=>q.label==='CM').slot);g.setCtl(p);p.pos.set(dir*8,0,0);p.vel.set(0,0,0);g.ball.pos.set(p.pos.x+dir*0.5,0.11,0);
      for(const q of T.players){if(q===p||q.isGK)continue;q.runT=0;q.runKind=null;q.runCD=5;}
      // a realistic back four with a gap: one centre-back stepped toward the ball side
      let k=0;for(const q of O.players){if(q.isGK)continue;const ln=q.line===1;const zs=[-16,-6+(i%3)*2,7,17];q.pos.set(dir*(ln?(k===1?23:28)+(i%2):16+(k%3)*2),0,ln?zs[k%4]:[-22,-8,8,22,-3,3][(k-4)%6]);q.vel.set(0,0,0);k++;}
      g.sim(0.2);
      const key=i%3===0?null:i%3===1?'down':'up';if(key)g.actDown(key);g.actDown('switch');g.sim(1/60);await wait(60);g.actUp('switch');g.sim(1/60);if(key)g.actUp(key);
      const rr=T.players.find(q=>q.runT>0&&q.runKind==='behind');if(!rr)continue;
      g.sim(0.6);out.n++;out.room+=room(rr.runTarget.x,rr.runTarget.z);out.roomMid+=room((rr.pos.x+rr.runTarget.x)/2,(rr.pos.z+rr.runTarget.z)/2);
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const bd=document.getElementById('runBadge');if(bd&&!bd.hidden)out.badge++;
      const sk=Math.abs(rr.pos.z-p.pos.z)>5?((rr.pos.z-p.pos.z)*dir>0?'down':'up'):null;g.actDown('right');if(sk)g.actDown(sk);g.actDown('through');await wait(150);g.actUp('through');g.actUp('right');if(sk)g.actUp(sk);
      out.tries++;let rec=null;for(let k2=0;k2<240;k2++){g.sim(1/60);if(g.ball.owner){rec=g.ball.owner;break;}}if(rec===rr)out.through++;out.res=(out.res||'')+(rec?(rec===rr?'OK':rec.team+rec.label):'none')+'/'+g.state+'@'+(g.ball.pos.x*dir).toFixed(0)+' ';
    }
    out.room=+(out.room/out.n).toFixed(1);out.roomMid=+(out.roomMid/out.n).toFixed(1);out.ticker=document.getElementById('ticker').innerText.slice(0,200);
    return out;});
  console.log(JSON.stringify(r));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
