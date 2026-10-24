const open=require('./harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const {execSync}=require('child_process');
(async()=>{
  const {browser,page,errors,SP}=await open({viewport:{width:640,height:480}});
  const moves=process.argv.slice(2);
  await page.evaluate(()=>{const g=__game;g.startMatch({mode:'play',minutes:12,home:0,away:2,firstKick:0});window.__freeze=true;g.sim(1);});
  const files=[];
  for(const mk of moves){
    await page.evaluate((mk)=>{const g=__game;const p=g.give(0,9);p.st.dri=96;p.trait='trickster';p.pos.set(0,0,0);p.face=Math.PI/2;p.vel.set(3,0,0);g.ball.pos.set(0.5,0.11,0);
      for(const q of g.players)if(q!==p)q.pos.set(q.team?60:-60,0,q.slot*3-15);
      const o=g.players.find(q=>q.team===1&&q.slot===5);o.pos.set(2.6,0,0.2);o.face=-Math.PI/2;
      g.setCtl(p);p.sk=null;p.cdSkill=0;if(mk==='atw'||mk==='inair'){g.skill(p,'juggle',1);g.sim(0.6);}
      g.skill(p,mk,1,(mk==='atw'||mk==='inair')?{chain:true}:{});window.__sp=p;window.__dur=g.skills.find(m=>m.k===mk).dur;},mk);
    for(let f=0;f<5;f++){
      await page.evaluate((f)=>{const p=window.__sp,g=__game;const T=window.__dur*f/4;const step=(T-(window.__t||0));if(f===0)window.__t=0;else{g.sim(Math.max(1/60,window.__dur/4));}
        const x=p.pos.x,z=p.pos.z;window.__camOverride={pos:new THREE.Vector3(x+0.3,1.5,z+4.6),look:new THREE.Vector3(x+0.3,0.75,z)};},f);
      await sleep(450);const fn=SP+'/shots/sk_'+mk+'_'+f+'.png';await page.screenshot({path:fn,clip:{x:160,y:60,width:320,height:360}});files.push(fn);
    }
  }
  execSync(`python3 -c "
from PIL import Image
import sys
fs=sys.argv[1:];n=5;rows=len(fs)//n
im=Image.new('RGB',(320*n//2,360*rows//2))
for i,f in enumerate(fs):
  a=Image.open(f).resize((160,180));im.paste(a,((i%n)*160,(i//n)*180))
im.save('${SP}/shots/sk_sheet.png')
" `+files.join(' '));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
