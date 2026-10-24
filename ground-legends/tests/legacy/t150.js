// S vs W to a forward who is standing, jogging or sprinting: where and how does he receive it?
const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  const r=await page.evaluate(async()=>{
    const g=__game,wait=ms=>new Promise(r=>setTimeout(r,ms));const out={};
    g.startMatch({mode:'play',minutes:30,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(1);
    const T=g.teams[0],dir=T.dir;
    for(const key of ['pass','through'])for(const [nm,spd] of [['stand',0],['jog',4],['sprint',7.5]]){
      const acc={ahead:0,recvSpd:0,n:0,t:0,lost:0};
      for(let i=0;i<6;i++){
        const p=g.give(0,T.players.find(q=>q.label==='CM').slot);g.setCtl(p);p.pos.set(dir*-5,0,0);p.face=dir>0?Math.PI/2:-Math.PI/2;p.vel.set(0,0,0);g.ball.pos.set(p.pos.x+dir*0.5,0.11,0);
        const st=T.players.find(q=>q.label==='ST');
        for(const q of g.players)if(q!==p&&q!==st&&!q.isGK){q.pos.set(q.team?dir*(q.line===1?34:44):dir*-40,0,(q.slot*5-25)*(q.team?1.3:1));q.vel.set(0,0,0);}
        st.pos.set(dir*8,0,dir*3);st.vel.set(dir*spd,0,0);st.face=dir>0?Math.PI/2:-Math.PI/2;
        g.sim(1/60);st.vel.set(dir*spd,0,0);
        const x0=st.pos.x*dir;if(i===0&&key==='pass'&&spd===0)out.pre=g.teams[1].players.map(q=>q.label+(q.pos.x).toFixed(0)).join(' ');g.actDown('right');g.actDown(key);await wait(250);g.actUp(key);g.actUp('right');
        let t=0,rec=null;while(t<4){g.sim(1/60);t+=1/60;if(g.ball.owner){rec=g.ball.owner;break;}}
        if(rec!==st){acc.lost++;acc.who=(acc.who||'')+(rec?rec.team+rec.label:'none')+'@'+(g.ball.pos.x*dir).toFixed(0)+' ';continue;}
        acc.n++;acc.ahead+=st.pos.x*dir-x0;acc.recvSpd+=Math.hypot(st.vel.x,st.vel.z);acc.t+=t;}
      out[key+' '+nm]={receivedBySt:acc.n+'/6',aheadOfStart:+(acc.ahead/Math.max(1,acc.n)).toFixed(1),speedAtReception:+(acc.recvSpd/Math.max(1,acc.n)).toFixed(1),time:+(acc.t/Math.max(1,acc.n)).toFixed(2),who:acc.who};
    }
    return out;});
  for(const k in r)console.log(k.padEnd(16),JSON.stringify(r[k]));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
