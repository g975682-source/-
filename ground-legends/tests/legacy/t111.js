// gait sheet: one runner at six moments of the stride, plus a side line-up
const open=require('./harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const {execSync}=require('child_process');
(async()=>{
  const {browser,page,errors,SP}=await open({viewport:{width:640,height:480}});
  await page.evaluate(()=>{const g=__game;g.startMatch({mode:'play',minutes:12,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(1);
    for(const q of g.players)q.pos.set(80,0,80);});
  const files=[];
  for(const [spd,label] of [[7,'sprint'],[3.5,'jog']])for(let k=0;k<4;k++){
    await page.evaluate(([spd,k])=>{const g=__game,p=g.players[9];p.pos.set(0,0,0);p.face=Math.PI/2;p.vel.set(spd,0,0);p.spd=spd;p.visA=1;p.visPh=k*Math.PI/2;p.oAnim=null;p.state='normal';
      window.__camOverride={pos:new THREE.Vector3(0,1.0,3.4),look:new THREE.Vector3(0,0.85,0)};},[spd,k]);
    await sleep(700);const fn=SP+'/shots/gait_'+label+k+'.png';await page.screenshot({path:fn,clip:{x:200,y:60,width:240,height:380}});files.push(fn);}
  execSync(`python3 -c "
from PIL import Image
import sys
fs=sys.argv[1:];im=Image.new('RGB',(240*4,380*2))
for i,f in enumerate(fs):im.paste(Image.open(f),((i%4)*240,(i//4)*380))
im.save('${SP}/shots/gait_sheet.png')
" `+files.join(' '));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
