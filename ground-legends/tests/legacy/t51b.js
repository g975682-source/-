const P=require('./paths.js');   // tool locations, see paths.js
const { chromium } = require(P.PLAYWRIGHT);
const fs=require('fs');const SP=P.OUT;
const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>'+fs.readFileSync(P.GAME_DEFAULT,'utf8')+'</body></html>';
const three=fs.readFileSync(P.THREE_JS,'utf8'),mock=fs.readFileSync(P.MOCKROOM,'utf8');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const pages=[],errs=[[],[]];
  for(let k=0;k<2;k++){
    const ctx=await browser.newContext({viewport:{width:960,height:600}});const page=await ctx.newPage();
    page.on('pageerror',e=>errs[k].push(e.message+' '+(e.stack||'').split('\n')[1]));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('ERR_FAILED'))errs[k].push(m.text());});
    await page.exposeFunction('__relaySend',msg=>{setTimeout(()=>{for(const p of pages)p.evaluate(m=>window.__relayRecv&&window.__relayRecv(JSON.parse(m)),msg).catch(()=>{});},60);});
    await page.addInitScript(mock);
    await page.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://game.local'))return r.fulfill({body:html,contentType:'text/html'});if(u.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'});return r.abort();});
    pages.push(page);
  }
  for(const p of pages){await p.goto('http://game.local/');}
  await sleep(2500);
  const [A,B]=pages;
  await A.fill('#onNick','호스트').catch(()=>{});
  for(const p of pages){await p.click('#btnOnline');await sleep(300);}
  await A.fill('#onNick','호스트');await B.fill('#onNick','게스트');await sleep(800);
  console.log('A list:',await A.$eval('#onList',e=>e.innerText.replace(/\s+/g,' ').slice(0,120)));
  await A.screenshot({path:SP+'/shots/o_lobby.png'});
  await A.click('[data-ask]');await sleep(1200);
  console.log('B modal hidden?',await B.$eval('#onAsk',e=>e.hidden),await B.$eval('#onAskText',e=>e.textContent));
  await B.click('#onYes');await sleep(4000);
  const st=async p=>p.evaluate(()=>({mode:__game.mode,state:__game.state,net:__game.net&&__game.net.role,score:__game.score,clock:Math.round(__game.clock),ball:[__game.ball.pos.x.toFixed(1),__game.ball.pos.z.toFixed(1)],ctl:__game.controlled&&__game.controlled.team+':'+__game.controlled.slot,pres:window.__presBytes}));
  console.log('A',JSON.stringify(await st(A)));console.log('B',JSON.stringify(await st(B)));
  // whoever kicks off: press S on both to start the game
  for(const p of pages){await p.keyboard.down('KeyS');await sleep(150);await p.keyboard.up('KeyS');}
  await sleep(2500);for(const p of pages){await p.keyboard.down('KeyS');await sleep(150);await p.keyboard.up('KeyS');}
  await sleep(6000);
  console.log('A',JSON.stringify(await st(A)));console.log('B',JSON.stringify(await st(B)));
  // guest holds right arrow: its controlled player (team 1) should move on the host
  const before=await A.evaluate(()=>{const c=__game.players.find(p=>p.team===1&&p===window.__c1);return 0;});
  const g0=await A.evaluate(()=>{const K=__game.players;return null;});
  const posA=await A.evaluate(()=>{const g=__game;const c=g.players.filter(p=>p.team===1);return null;});
  const hostSeesGuestCtl=async()=>A.evaluate(()=>{/* CTRL not exported; infer from snapshot meta on guest instead */return 1;});
  const gctl0=await B.evaluate(()=>{const c=__game.controlled;return c?[c.slot,c.pos.x,c.pos.z]:null;});
  await B.keyboard.down('ArrowUp');await B.keyboard.down('KeyE');await sleep(1500);
  console.log('host sees guest input',JSON.stringify(await A.evaluate(()=>{const K=__game.ctrl[1];return {mv:[K.mv.x.toFixed(2),K.mv.z.toFixed(2)],up:K.act.up,sprint:K.act.sprint,remote:K.remote,ctl:K.controlled&&K.controlled.slot,vel:K.controlled&&Math.hypot(K.controlled.vel.x,K.controlled.vel.z).toFixed(2)};})));
  await A.evaluate(()=>__game.say('중계 테스트 메시지'));await sleep(1500);console.log('guest ticker now:',await B.$eval('#ticker',e=>e.innerText.replace(/\n/g,' | ')));
  const gctl1=await B.evaluate(()=>{const c=__game.controlled;return c?[c.slot,c.pos.x,c.pos.z]:null;});
  await B.keyboard.up('ArrowUp');await B.keyboard.up('KeyE');
  console.log('guest controlled before/after holding →',JSON.stringify(gctl0),JSON.stringify(gctl1));
  await A.screenshot({path:SP+'/shots/o_host.png'});await B.screenshot({path:SP+'/shots/o_guest.png'});
  const tick=await B.$eval('#ticker',e=>e.innerText.slice(0,200));console.log('guest ticker:',tick.replace(/\n/g,' | '));
  // guest skill move: Shift tap with the ball -> the host performs it and the guest sees the toast
  await A.evaluate(()=>{const g=__game,K=g.ctrl[1];const c=K.controlled||g.players.find(p=>p.team===1&&p.slot===9);g.give(1,c.slot);K.controlled=c;});
  await sleep(1500);
  const sc0=await A.evaluate(()=>Object.assign({},__game.skillCount));
  console.log('guest view',JSON.stringify(await B.evaluate(()=>{const g=__game,L=g.ctrl[g.net?1:0];return {st:g.state,ctl:L.controlled&&L.controlled.slot,own:g.ball.owner&&(g.ball.owner.team+':'+g.ball.owner.slot),ctlTeam:L.controlled&&L.controlled.team};})));
  await B.keyboard.down('ShiftLeft');await sleep(120);await B.keyboard.up('ShiftLeft');await sleep(400);
  console.log('guest ev',JSON.stringify(await B.evaluate(()=>__game.net.ev.slice(-4))));await sleep(2100);
  const sc1=await A.evaluate(()=>Object.assign({},__game.skillCount));
  console.log('guest Shift tap -> host skill',JSON.stringify(sc0),'->',JSON.stringify(sc1),'guest toast',await B.$eval('#skToast',e=>e.textContent+' '+e.className));
  // guest leaves: host should get a forfeit win
  await B.keyboard.press('Escape');await sleep(300);await B.click('#btnQuit');await sleep(2500);
  console.log('A after guest left',JSON.stringify(await st(A)),'result shown',await A.$eval('#result',e=>!e.hidden));
  console.log('B after leaving',JSON.stringify(await st(B)));
  console.log('ERR A',errs[0].slice(0,6).join('\n'));console.log('ERR B',errs[1].slice(0,6).join('\n'));
  await browser.close();
})();
