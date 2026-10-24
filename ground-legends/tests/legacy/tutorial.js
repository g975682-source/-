/* ================= tutorial ================= */
// A practice match where each step sets up a small situation, tells the player what to press, and moves on
// when he has done it. Players not needed for a step are parked and frozen; the clock does not run.
let tut=null;
const TUT_KEY='gl-tut-v1';
const kb=k=>`<kbd>${k}</kbd>`;
function tutEv(type,val){if(tut&&!tut.done)tut.ev.push({type,val,t:tut.t});}
function tutHas(type,f){return tut.ev.some(e=>e.type===type&&(!f||f(e.val)));}
function tutP(ti,slot){return teams[ti].players.find(p=>p.slot===slot);}
// everyone stands aside unless the step uses him
function tutStage(use){
  tut.park=new Map();let k=0;
  for(const p of players){if(use.includes(p))continue;
    const side=p.team===0?-1:1,spot=new V3(clamp(-30+(k%11)*6,-HL+2,HL-2),0,side*(HW-1.5));k++;
    p.pos.copy(spot);tut.park.set(p,spot.clone());}
  for(const p of players){resetTransient(p);p.vel.set(0,0,0);p.wantVel.set(0,0,0);p.state='normal';p.stun=0;p.holding=false;}
  SP=null;state='play';releaseBall();ball.vel.set(0,0,0);intended=null;offCheck=null;lastPass=null;foulSeq=null;advantage=null;
  for(const K of CTRL){K.inq.length=0;K.pend=null;K.buffer=null;K.g=null;}
  tutRing.visible=false;tut.carrier=null;tut.acc=0;
}
function tutBall(p){ball.pos.set(p.pos.x+Math.sin(p.face)*0.5,BR,p.pos.z+Math.cos(p.face)*0.5);gainPossession(p);setControlled(p);}
function tutPlace(p,x,z,face){p.pos.set(x,0,z);p.face=face??Math.PI/2;return p;}
function tutMark(x,z){tutRing.position.set(x,0.04,z);tutRing.visible=true;tut.mark=new V3(x,0,z);}
const TUT_STEPS=[
  {t:'이동과 질주',x:`${kb('←↑↓→')} 방향키로 공을 몰고 <b>노란 원</b>까지 가 보세요. ${kb('E')}를 누르고 있으면 전력 질주합니다.`,
   setup(){const p=tutPlace(tutP(0,9),-10,0);tutStage([p]);tutBall(p);tutMark(14,-9);},
   check(){return d2(controlled.pos,tut.mark)<2.2&&ball.owner===controlled;}},
  {t:'짧은 패스',x:`${kb('S')}를 눌러 가까운 동료에게 땅볼 패스. 방향키로 받을 동료 쪽을 가리키고 누르면 그 선수에게 갑니다. 누르는 시간이 길수록 세집니다.`,
   setup(){const a=tutPlace(tutP(0,5),-6,0),b=tutPlace(tutP(0,9),4,6,-Math.PI/2);tutStage([a,b]);tutBall(a);},
   check(){return tutHas('pass',m=>m==='ground');}},
  {t:'스루 패스',x:`앞으로 뛰어 들어가는 동료가 있을 때 ${kb('W')}로 <b>그 선수 앞 빈 공간</b>에 찔러 주세요.`,
   setup(){const a=tutPlace(tutP(0,5),-4,0),b=tutPlace(tutP(0,9),2,-7);tutStage([a,b]);tutBall(a);b.runT=6;b.runTarget.set(26,0,-6);},
   check(){return tutHas('pass',m=>m==='through');}},
  {t:'로빙 패스 · 크로스',x:`수비수가 길을 막고 있으면 ${kb('A')}로 공을 띄워 넘기세요. 측면 깊은 곳에서는 크로스가 됩니다.`,
   setup(){const a=tutPlace(tutP(0,5),-12,-4),b=tutPlace(tutP(0,9),14,6,-Math.PI/2),d=tutPlace(tutP(1,6),1,1,-Math.PI/2);tutStage([a,b,d]);tutBall(a);},
   check(){return tutHas('pass',m=>m==='lob'||m==='cross');}},
  {t:'슛',x:`${kb('D')}를 누르고 있다가 떼면 슛. 길게 누를수록 강하고 높게 갑니다. 방향키로 좌우 코스를 정하세요. 골을 넣어 보세요!`,
   setup(){const p=tutPlace(tutP(0,9),36,2);tutStage([p,teams[1].gk]);teams[1].gk.pos.set(HL-0.6,0,0);tutBall(p);},
   check(){return tut.goals>0;}},
  {t:'감아차기',x:`${kb('Z')}를 누른 채 ${kb('D')}: 골대 바깥을 보고 차서 안으로 휘어 들어가는 감아차기입니다.`,
   setup(){const p=tutPlace(tutP(0,9),33,-9);tutStage([p,teams[1].gk]);teams[1].gk.pos.set(HL-0.6,0,0);tutBall(p);},
   check(){return tutHas('shot',k=>k==='fin');}},
  {t:'로빙슛 · 낮은 슛',x:`${kb('Q')}를 누른 채 ${kb('D')}는 골키퍼 키를 넘기는 <b>로빙슛</b>, ${kb('D')}를 떼고 바로 한 번 더 ${kb('D')}는 <b>낮고 빠른 슛</b>입니다. 둘 다 해 보세요.`,
   setup(){const p=tutPlace(tutP(0,9),36,0);tutStage([p,teams[1].gk]);teams[1].gk.pos.set(HL-4,0,0);tutBall(p);},
   check(){return tutHas('shot',k=>k==='chip')&&tutHas('shot',k=>k==='low');},
   prog(){return (tutHas('shot',k=>k==='chip')?'로빙슛 ✓ ':'로빙슛 · ')+(tutHas('shot',k=>k==='low')?'낮은 슛 ✓':'낮은 슛');}},
  {t:'개인기 ① 속임 동작',x:`${kb('Shift')}를 <b>누른 채</b> ${kb('↓')} 또는 ${kb('↑')}를 톡: 몸을 한쪽으로 흔든 뒤 반대로 빠집니다. 개인기는 오른쪽으로 달릴 때 기준 방향입니다.`,
   setup(){const p=tutPlace(tutP(0,9),-4,0),d=tutPlace(tutP(1,6),2.6,0,-Math.PI/2);tutStage([p,d]);tutBall(p);d.stun=99;},
   check(){return tutHas('skill',k=>k!=='basic');}},
  {t:'개인기 ② 스텝오버 · 룰렛',x:`${kb('Shift')}를 누른 채 ${kb('→')}${kb('↘')}${kb('↓')} 순서로 쓸어 누르면 <b>스텝오버</b>, ${kb('←')}${kb('↑')}${kb('→')}${kb('↓')} 으로 한 바퀴 돌리면 <b>룰렛</b>입니다. 별이 높은 선수일수록 화려한 개인기가 나갑니다. 전체 목록은 ${kb('H')}가 아닌 조작법 화면에 있습니다.`,
   setup(){const p=tutPlace(tutP(0,9),-4,0),d=tutPlace(tutP(1,6),2.6,0,-Math.PI/2);tutStage([p,d]);tutBall(p);d.stun=99;},
   check(){return tut.ev.filter(e=>e.type==='skill'&&e.val!=='basic'&&e.val!=='bodyfeint').length>0;}},
  {t:'공 지키기',x:`등 뒤에 수비수가 붙었습니다. ${kb('C')}를 누르고 있으면 몸으로 공을 가립니다. 2초 동안 지켜 보세요.`,
   setup(){const p=tutPlace(tutP(0,9),0,0),d=tutPlace(tutP(1,6),-1.3,0,Math.PI/2);tutStage([p,d]);tutBall(p);},
   tick(dt){if(controlled&&controlled.shielding&&ball.owner===controlled)tut.acc+=dt;},check(){return tut.acc>2;},prog(){return '지킨 시간 '+Math.min(2,tut.acc).toFixed(1)+' / 2.0초';}},
  {t:'수비 ① 선수 전환',x:`상대가 공을 몰고 옵니다. ${kb('S')}를 누르면 <b>막기 가장 좋은 선수</b>로 커서가 바뀝니다 (머리 위 흰 화살표). ${kb('Shift')}+방향키는 그 방향의 선수로 바꿉니다.`,
   setup(){const c=tutPlace(tutP(1,9),8,0,-Math.PI/2),a=tutPlace(tutP(0,2),-6,1),b=tutPlace(tutP(0,8),12,-20);tutStage([c,a,b]);tutBall(c);setControlled(b);tut.carrier=c;},
   check(){return tutHas('switch');}},
  {t:'수비 ② 스탠딩 태클',x:`공을 가진 상대에게 붙어서 ${kb('D')}로 스탠딩 태클! 공을 빼앗아 보세요. ${kb('D')}나 ${kb('S')}를 누르고 있으면 따라붙어 압박합니다.`,
   setup(){const c=tutPlace(tutP(1,9),6,0,-Math.PI/2),a=tutPlace(tutP(0,2),-4,0.5);tutStage([c,a]);tutBall(c);setControlled(a);tut.carrier=c;},
   check(){return ball.owner&&ball.owner.team===0;}},
  {t:'수비 ③ 견제',x:`바로 덤비면 제쳐집니다. ${kb('C')}를 누르고 있으면 골문 쪽에 서서 버티는 <b>견제</b>입니다. 2초 버텨 보세요.`,
   setup(){const c=tutPlace(tutP(1,9),8,0,-Math.PI/2),a=tutPlace(tutP(0,2),-2,0);tutStage([c,a]);tutBall(c);setControlled(a);tut.carrier=c;},
   tick(dt){if(controlled&&controlled.jockeyT>0)tut.acc+=dt;},check(){return tut.acc>2;},prog(){return '견제 '+Math.min(2,tut.acc).toFixed(1)+' / 2.0초';}},
  {t:'수비 ④ 슬라이딩 태클',x:`${kb('A')}는 슬라이딩 태클. 멀리서 공을 쳐낼 수 있지만, 뒤에서 들어가거나 놓치면 반칙이 됩니다. 한 번 해 보세요.`,
   setup(){const c=tutPlace(tutP(1,9),8,0,-Math.PI/2),a=tutPlace(tutP(0,2),-1,2);tutStage([c,a]);tutBall(c);setControlled(a);tut.carrier=c;},
   check(){return tutHas('slide');}},
  {t:'골키퍼',x:`골키퍼가 공을 잡았습니다. 방향키로 박스 안을 걸어 나간 뒤 ${kb('S')}로 던지거나 ${kb('D')}·${kb('A')}로 길게 차세요. ${kb('W')}는 공을 내려놓습니다.`,
   setup(){const g=teams[0].gk,a=tutPlace(tutP(0,2),-30,10);tutStage([g,a]);g.pos.set(-HL+2,0,0);g.face=Math.PI/2;tutBall(g);g.holding=true;g.holdT=-30;tut.gk0=g.pos.clone();},
   check(){return tutHas('gkout');}},
  {t:'직접 프리킥',x:`방향키로 노란 조준점을 옮기고 ${kb('D')}를 길게 눌렀다 떼면 도움닫기 후 슛. 달리는 동안 ${kb('←')}${kb('→')}로 감아차기, ${kb('↑')}로 드롭슛.`,
   setup(){const p=tutPlace(tutP(0,9),20,0);tutStage([p,teams[1].gk]);for(const s of [2,3,6])tutStage.keep=1;startSetPiece('freekick',0,new V3(HL-24,BR,5));tut.park.clear();},
   check(){return tutHas('shot',k=>k==='fk');}},
  {t:'페널티킥',x:`방향키로 구석을 노리고 ${kb('D')}. ${kb('Q')}+${kb('D')}는 가운데로 띄우는 칩슛입니다. 막을 때는 ←→로 움직이고 차는 순간 방향키로 다이브합니다.`,
   setup(){tutStage([]);tut.park.clear();startSetPiece('penalty',0,new V3(HL-11,BR,0));},
   check(){return tutHas('shot',k=>k==='pen');}},
];
function startTutorial(){
  SND.init();showScreen(null);
  beginMatch({sides:[{def:TEAMS[0],form:'4-3-3',roster:rosterFor(TEAMS[0],'4-3-3',false)},{def:TEAMS[2],form:'4-3-3',roster:rosterFor(TEAMS[2],'4-3-3',false)}],
    diff:'amateur',minutes:30,human:true,firstKick:0,tutorial:true});
  tut={i:0,ev:[],t:0,goals:0,done:false,park:new Map(),acc:0};
  $('#tutBox').hidden=false;tutGo(0);
}
function tutGo(i){
  if(i>=TUT_STEPS.length){tutFinish();return;}
  tut.i=i;tut.ev=[];tut.t=0;tut.goals=0;tut.done=false;tut.acc=0;
  TUT_STEPS[i].setup();renderTut();banner('STEP '+(i+1),TUT_STEPS[i].t);
}
function tutRetry(){if(!tut)return;if(tut.done){tutGo(tut.i+1);return;}TUT_STEPS[tut.i].setup();renderTut();}
function renderTut(){
  const S=TUT_STEPS[tut.i],box=$('#tutBox');
  box.innerHTML=`<div class="tt-head"><span>튜토리얼 ${tut.i+1} / ${TUT_STEPS.length}</span><b>${S.t}</b></div><p>${S.x}</p>
    <div class="tt-prog">${tut.done?'<b class="pos">성공! 다음 단계로 넘어갑니다</b>':S.prog?esc(S.prog()):''}</div>
    <div class="tt-dots">${TUT_STEPS.map((s,k)=>`<i class="${k<tut.i||k===tut.i&&tut.done?'on':k===tut.i?'cur':''}"></i>`).join('')}</div>
    <div class="row"><button class="btn" data-tut="retry">다시 하기</button><button class="btn" data-tut="skip">건너뛰기</button><button class="btn ghost" data-tut="quit">튜토리얼 끝내기</button></div>`;
}
function tutTick(dt){
  tut.t+=dt;offCheck=null;
  for(const [p,s] of tut.park){p.pos.copy(s);p.vel.set(0,0,0);p.wantVel.set(0,0,0);}
  const S=TUT_STEPS[tut.i];
  // the attacker in the defending steps just runs at goal; reaching the box resets the step
  const c=tut.carrier;
  if(c&&ball.owner===c&&state==='play'){const T=teams[c.team],gx=T.dir*HL;tmpA.set(gx-c.pos.x,0,-c.pos.z).normalize();c.wantVel.copy(tmpA).multiplyScalar(c.maxSpd()*0.5);c.face=Math.atan2(tmpA.x,tmpA.z);
    if(inOppBox(c.pos,c.team)&&!tut.done){say('상대가 박스까지 들어왔습니다. 다시 해 보세요.');tutRetry();return;}}
  if(S.tick)S.tick(dt);
  const g=teams[0].gk;if(tut.gk0&&g.holding)tut.gkWalk=Math.max(tut.gkWalk||0,d2(g.pos,tut.gk0));
  if(!tut.done&&S.check()){tut.done=true;SND.ooh();renderTut();setTimeout(()=>{if(tut&&tut.done&&mode==='match')tutGo(tut.i+1);},1500);}
  else if(S.prog&&Math.floor(tut.t*4)!==Math.floor((tut.t-dt)*4))renderTut();
}
function tutGoal(ti){tut.goals++;banner('GOAL','',ti===0?'goal':'');SND.roar();releaseBall();ball.vel.set(0,0,0);state='dead';deadT=1.6;deadFn=tutRetry;}
function tutOut(){releaseBall();ball.vel.set(0,0,0);state='dead';deadT=1.0;deadFn=tutRetry;}
function tutFinish(){
  try{localStorage.setItem(TUT_KEY,'1');}catch(e){}
  $('#tutBox').hidden=true;tut=null;
  goMenu();$('#tutDone').hidden=false;
}
function tutQuit(){try{localStorage.setItem(TUT_KEY,'1');}catch(e){}$('#tutBox').hidden=true;tut=null;goMenu();}
const tutRing=new THREE.Mesh(new THREE.RingGeometry(1.2,1.55,40),new THREE.MeshBasicMaterial({color:0xffd84a,transparent:true,opacity:0.85,depthWrite:false}));
tutRing.rotation.x=-Math.PI/2;tutRing.visible=false;scene.add(tutRing);
