// Q tap with the ball: a teammate runs in behind (the side pressed picks him); W then finds him
const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  const r=await page.evaluate(async()=>{
    const g=__game,wait=ms=>new Promise(r=>setTimeout(r,ms));const out={};
    g.startMatch({mode:'play',minutes:30,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(1);
    const T=g.teams[0],dir=T.dir;
    const setup=()=>{const p=g.give(0,T.players.find(q=>q.label==='CM').slot);g.setCtl(p);p.pos.set(dir*12,0,0);p.vel.set(0,0,0);g.ball.pos.set(p.pos.x+dir*0.5,0.11,0);
      for(const q of T.players){if(q===p||q.isGK)continue;q.runT=0;q.runKind=null;q.runCD=5;}
      const O=g.teams[1];let i=0;for(const q of O.players){if(q.isGK)continue;const ln=q.line===1;q.pos.set(dir*(ln?28:(i<8?18:0)),0,(ln?[-15,-5,5,15][i%4]:[-26,-9,9,26,-6,6][(i-4)%6]));q.vel.set(0,0,0);i++;}
      g.sim(1/60);return p;};
    for(const [nm,key] of [['no direction',null],['down',  'down'],['up','up']]){
      const p=setup();const sh=g.say;if(key)g.actDown(key);g.actDown('switch');g.sim(1/60);await wait(60);g.actUp('switch');g.sim(1/60);if(key)g.actUp(key);
      const run=T.players.filter(q=>q.runT>0&&q.runKind==='behind');g.sim(0.6);
      out[nm]={runners:run.map(q=>q.label+'@z'+(q.pos.z*dir).toFixed(0)+' v'+Math.hypot(q.vel.x,q.vel.z).toFixed(1)),hint:g.teams[0].hint&&g.teams[0].hint.label,skill:p.sk?p.sk.m.k:null};}
    // Q then W: the through ball goes to the runner
    {let ok=0,n=0;for(let i=0;i<6;i++){const p=setup();g.actDown('switch');g.sim(1/60);await wait(60);g.actUp('switch');g.sim(0.7);
      const runner=T.players.find(q=>q.runT>0&&q.runKind==='behind');if(!runner)continue;n++;
      const sk=Math.abs(runner.pos.z)>5?(runner.pos.z*dir>0?'down':'up'):null;g.actDown('right');if(sk)g.actDown(sk);g.actDown('through');await wait(150);g.actUp('through');g.actUp('right');if(sk)g.actUp(sk);let rec=null;for(let k=0;k<240;k++){g.sim(1/60);if(g.ball.owner){rec=g.ball.owner;break;}}if(rec===runner)ok++;out['w'+i]=[runner.label,(runner.pos.x*dir).toFixed(0),rec?rec.team+rec.label:'none',g.state,g.intended?0:0];}
      out.QthenW={tries:n,runnerGotIt:ok};}
    // Q held: the old no-touch feint / stop and look up still work
    {const p=setup();const c0=g.skillCount.stopgoal||0;g.actDown('switch');g.sim(1/60);await wait(500);g.actUp('switch');g.sim(0.4);out.qHold=(g.skillCount.stopgoal||0)-c0;}
    return out;});
  console.log(JSON.stringify(r,null,1));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
