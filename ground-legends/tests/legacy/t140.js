// the user's side vs a standing low block: teammates run while the user carries the ball, and his passes find the runs
const open=require('./harness.js');
(async()=>{
  const {browser,page,errors,SP}=await open();
  const r=await page.evaluate(async()=>{
    const g=__game,wait=ms=>new Promise(r=>setTimeout(r,ms));const out={};
    g.startMatch({mode:'play',minutes:30,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(1);
    const T=g.teams[0],O=g.teams[1],dir=T.dir,lab=q=>q.label+(q.runT>0?'['+q.runKind+(q.runKind==='box'?':'+q.boxSlot:'')+']':'');
    // a back four on a line, a midfield screen: they stand, so the runs can be seen against them
    let spots=[[34,-14],[36,-5],[36,5],[34,14],[22,-12],[24,0],[22,12],[14,-8],[14,8],[8,0]];
    const block=(lineX)=>{let i=0;for(const q of O.players){if(q.isGK)continue;const s=spots[i++];q.pos.set(dir*(s[0]+(lineX||0)),0,dir*s[1]);q.vel.set(0,0,0);q.wantVel.set(0,0,0);q.state='normal';}};
    const run=(sec,lineX)=>{for(let k=0;k<sec*10;k++){block(lineX);g.sim(0.1);}};
    const snap=()=>T.players.filter(q=>!q.isGK&&q!==g.controlled).map(q=>lab(q)+'@'+(q.pos.x*dir).toFixed(0)+','+(q.pos.z*dir).toFixed(0)+' v'+Math.hypot(q.vel.x,q.vel.z).toFixed(1)).join(' | ');
    // 1) carrying the ball through midfield
    {const p=g.give(0,T.players.find(q=>q.label==='CM').slot);g.setCtl(p);p.pos.set(-4*dir,0,0);g.ball.pos.set(p.pos.x,0.11,0);
      run(3,-16);g.actDown('up');const kinds={};let fast=0,n=0;
      for(let k=0;k<30;k++){run(0.1,-16);for(const q of T.players){if(q===p||q.isGK)continue;n++;if(q.runT>0)kinds[q.runKind]=(kinds[q.runKind]||0)+1;if(Math.hypot(q.vel.x,q.vel.z)>6)fast++;}}
      g.actUp('right');out.midfieldCarry={runsSeen:kinds,sprintPct:Math.round(fast/n*100),at:(p.pos.x*dir).toFixed(0),snap:snap()};}
    // which arrow points where on this camera
    const keyFor={};{for(const k of ['up','down','left','right']){const p=g.give(0,T.players.find(q=>q.label==='CM').slot);g.setCtl(p);p.pos.set(0,0,0);p.vel.set(0,0,0);g.ball.pos.set(0,0.11,0);g.actDown(k);g.sim(0.4);g.actUp(k);keyFor[k]=[Math.round(p.vel.x*dir),Math.round(p.vel.z*dir)];}}
    out.keys=keyFor;const fwdKey=Object.keys(keyFor).find(k=>keyFor[k][0]>2),sideKey=s=>Object.keys(keyFor).find(k=>keyFor[k][1]*s>2);
    // 2) W through ball while a run in behind is on
    {let tries=0,kept=0,runnerRecv=0,goals=0;for(let i=0;i<10;i++){
      const p=g.give(0,T.players.find(q=>q.label==='CM').slot);g.setCtl(p);p.pos.set(dir*-4,0,dir*-4);g.ball.pos.set(p.pos.x,0.11,p.pos.z);
      let t=0,runner=null;while(t<8&&!(runner=T.players.find(q=>q.runT>0.8&&['behind','third','give'].includes(q.runKind)))){run(0.1,-16);t+=0.1;}
      if(!runner||g.ball.owner!==p)continue;tries++;
      const dz=runner.pos.z-p.pos.z,dx=runner.pos.x-p.pos.x;   // aim at him: arrows are screen-relative, but in this camera right = +x
      const k1=fwdKey,k2=Math.abs(dz)>5?sideKey(Math.sign(dz*dir)):null;g.actDown(k1);if(k2)g.actDown(k2);g.actDown('through');await wait(160);g.actUp('through');g.actUp(k1);if(k2)g.actUp(k2);
      let rec=null;for(let k=0;k<200;k++){g.sim(1/60);if(g.ball.owner){rec=g.ball.owner;break;}}
      if(rec&&rec.team===0)kept++;if(rec===runner)runnerRecv++;}
      out.throughToRuns={tries,kept,receivedByTheRunner:runnerRecv};}
    spots=[[36,-12],[37,-4],[37,4],[38,10],[24,-12],[26,0],[24,6],[14,-8],[14,4],[8,0]];
    // 3) carrying down the right wing toward the byline: does the box fill, and does the cross find a runner?
    {let res=[];for(let i=0;i<6;i++){const w=T.players.find(q=>q.label==='RW');const p=g.give(0,w.slot);g.setCtl(p);p.pos.set(dir*14,0,dir*27);g.ball.pos.set(p.pos.x,0.11,p.pos.z);
      run(3);const s0=snap();g.actDown(fwdKey);g.actDown('sprint');run(2.2);g.actUp('sprint');g.actUp(fwdKey);
      const inBox=T.players.filter(q=>q!==p&&q.pos.x*dir>52.5-16.5&&Math.abs(q.pos.z)<20.16);const boxRunSpd=inBox.length?inBox.reduce((a,q)=>a+Math.hypot(q.vel.x,q.vel.z),0)/inBox.length:0;
      const s1=snap();g.actDown('lob');await wait(250);g.actUp('lob');let first=null;
      for(let k=0;k<200;k++){g.sim(1/60);const lt=g.ball.lastTouch;if(lt&&lt!==p){first=lt;break;}}
      res.push({at:(p.pos.x*dir).toFixed(0)+','+(p.pos.z*dir).toFixed(0),inBox:inBox.length,boxRunSpd:+boxRunSpd.toFixed(1),first:first?(first.team===0?'att ':'def ')+lab(first):'none',before:i===0?s1:undefined,start:i===0?s0:undefined});}
      out.wing=res;}
    return out;});
  console.log(JSON.stringify(r,null,1));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
