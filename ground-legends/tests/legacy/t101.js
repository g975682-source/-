const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  const r=await page.evaluate(()=>{
    const g=__game;const res={};
    for(const tr of ['deadeye',null])for(const dist of [25,10]){
      let goals=0,on=0,flash=0;const N=90;
      for(let i=0;i<N;i++){
        g.startMatch({mode:'play',minutes:90,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(0.3);
        const gk=g.players.find(q=>q.team===1&&q.isGK);gk.trait=tr;gk.st.gk=78;
        const p=g.give(0,9);p.st.sho=82;p.pos.set(52.5-dist,0,(i%5-2)*3);p.face=Math.PI/2;g.ball.pos.set(p.pos.x+0.5,0.11,p.pos.z);
        for(const q of g.players)if(q!==p&&!q.isGK)q.pos.set(-30,0,q.slot*3-15);
        gk.pos.set(51.3,0,0);g.sim(0.6);   // keeper sets himself
        const s0=g.score[0],o0=g.stats.on[0],f0=(g.traitCount.deadeye||0);
        // shoot like the AI does
        g.setCtl(g.players.find(q=>q.team===0&&q.slot===3));window.__shoot&&0;
        __game.aiShoot?__game.aiShoot(p):null;
        g.sim(2.5);goals+=g.score[0]-s0;on+=g.stats.on[0]-o0;flash+=(g.traitCount.deadeye||0)-f0;
      }
      res[(tr||'none')+'_'+dist+'m']={onTarget:on,goals,saveRate:on?Math.round((1-goals/on)*100)+'%':'-',deadeyeFlash:flash};
    }
    return res;});
  console.log(JSON.stringify(r,null,1));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
