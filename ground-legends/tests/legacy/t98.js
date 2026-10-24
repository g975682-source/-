// sloppy human input: does the same move come out as with clean input?
const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  const r=await page.evaluate(()=>{
    const g=__game;g.startMatch({mode:'play',minutes:12,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(1);
    let seed=7;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
    const KEY={'→':'right','←':'left','↑':'up','↓':'down'};
    // ops: [['d',key],[t],['u',key]...]
    const play=(ops,faceDeg)=>{
      const p=g.give(0,9);p.st.dri=96;p.trait='trickster';p.pos.set(-5,0,0);
      const a=(faceDeg||0)*Math.PI/180,wx=Math.cos(a),wz=-Math.sin(a);p.face=Math.atan2(wx,wz);p.vel.set(wx*4,0,wz*4);g.ball.pos.set(-5+wx*0.5,0.11,wz*0.5);
      for(const q of g.players)if(q!==p){q.pos.set(q.team?40:-40,0,q.slot*3-15);q.vel.set(0,0,0);}
      g.setCtl(p);p.sk=null;p.cdSkill=0;g.sim(0.05);
      const before=Object.assign({},g.skillCount);
      g.actDown('skill');g.sim(0.03);
      for(const o of ops){if(typeof o==='number'){g.sim(Math.max(1/60,o));continue;}(o[0]==='d'?g.actDown:g.actUp)(KEY[o[1]]);}
      g.sim(0.05);window.__lg=JSON.stringify(g.ctrl[0].g&&g.ctrl[0].g.toks)+' skBuf '+JSON.stringify(g.ctrl[0].skBuf)+' sk '+(p.sk&&p.sk.m.k)+' inq '+JSON.stringify(g.ctrl[0].inq);g.actUp('skill');g.sim(0.05);window.__lg+=' | after sk '+(p.sk&&p.sk.m.k)+' skBuf '+JSON.stringify(g.ctrl[0].skBuf)+' own '+(g.ball.owner===p)+' state '+g.state;(window.__logs=window.__logs||[]).push(window.__lg);
      const done=Object.keys(g.skillCount).filter(k=>(g.skillCount[k]||0)>(before[k]||0));
      g.sim(1.3);return done.join(',')||'-';
    };
    // a move written as steps: 'x' tap, 'x_' hold, '~xyz' sweep (each key overlaps the next)
    const MOVES={bodyfeint:['↓'],sidestep:['↓_'],stepover:['~→↓'],revstep:['~↓→'],heelflick:['→','←'],flickup:['→','→','→'],
      roulette:['~←↑→↓'],fakego:['~↑←↓'],rainbow:['←','→','→'],advrainbow:['←_','→'],stopturn:['→','↑'],rollcut:['↑_','↓'],
      spin:['↖','↖'],elastico:['~↓←↑'],triple:['~←↓←↑'],quickroll:['←_'],rollflick:['↓_','→'],hocus:['~←↑←↓'],cancellift:['→','→','←'],
      sombrero:['→_'],neystep:['↑_','→']};
    const build=(steps,sl)=>{const ops=[];const T=()=>sl?0.04+rnd()*0.2:0.08,G=()=>sl?rnd()*0.28:0.06;
      for(let st of steps){
        if(sl&&st.startsWith('~')&&rnd()<0.3)st='~'+[...st.slice(1)].filter((c,i,a)=>i===0||i===a.length-1||rnd()<0.6).join('');   // skips a key in the rotation
        if(st.startsWith('~')){const ks=[...st.slice(1)];ops.push(['d',ks[0]],T());
          for(let i=1;i<ks.length;i++){ops.push(['d',ks[i]],sl?0.03+rnd()*0.1:0.056,['u',ks[i-1]],sl?0.02+rnd()*0.12:0.056);}
          ops.push(['u',ks[ks.length-1]],G());continue;}
        if(st==='↖'){ops.push(['d','←'],sl?rnd()*0.05:0.01,['d','↑'],T(),['u','←'],sl?rnd()*0.05:0.01,['u','↑'],G());continue;}
        if(st.endsWith('_')){ops.push(['d',st[0]],sl?0.2+rnd()*0.35:0.5,['u',st[0]],G());continue;}
        // sloppy taps sometimes overlap the next key
        ops.push(['d',st],T(),['u',st],G());
      }
      return ops;};
    const out={};
    for(const [k,steps] of Object.entries(MOVES)){
      const clean=play(build(steps,false));let ok=0;const got={};
      for(let i=0;i<8;i++){const face=[0,20,-25,45][i%4];const res=play(build(steps,true),face);got[res]=(got[res]||0)+1;if(res===clean)ok++;}
      out[k]={clean,ok,got};
    }
    out.logs=window.__logs;return out;});
  let tot=0,n=0;
  console.log(r.logs.join('\n'));delete r.logs;for(const [k,v] of Object.entries(r)){tot+=v.ok;n+=8;console.log(k.padEnd(11),v.clean.padEnd(11),v.ok+'/8',JSON.stringify(v.got));}
  console.log('TOTAL',tot+'/'+n,Math.round(tot/n*100)+'%');
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
