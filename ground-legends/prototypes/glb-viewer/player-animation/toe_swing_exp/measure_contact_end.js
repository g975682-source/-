// The kicking foot around the strike and at the end of the kick, for two copies of index.html (before and after the
// toe-swing change), each drawn twice to check that the numbers repeat. Same rigs, timeline and injection as
// ../measure_kick_ground.js; the ground is y = 0, the root at (0,0,0) facing +z.
//   node measure_contact_end.js <before.html> <after.html> <out.json>
// Per frame of the 60 fps timeline (12 idle, the kick, 24 idle): the kicking boot's centre and the sole's toe tip in
// world space, the kicking ankle's rotation.x, the hips' height. Reported: the foot at the last frame before the strike
// (visT 0.1333) and the first after it (0.1667); the largest frame-to-frame jump of the toe tip and of the ankle angle
// inside the kick and across the kick -> idle switch; the hips' height step at that switch.
const path=require('path'),fs=require('fs'),crypto=require('crypto');
const P=require(path.join(__dirname,'..','..','..','..','tests','legacy','paths.js'));
const {chromium}=require(P.PLAYWRIGHT);
const three=fs.readFileSync(P.THREE_JS,'utf8');
const [fb,fa,fo]=process.argv.slice(2);if(!fo){console.error('usage: node measure_contact_end.js <before.html> <after.html> <out.json>');process.exit(2);}
const INJECT=`window.__kg={A,applyVisual,buildRig,teamMats,TEAMS,ball,setClock(g,v){gtime=g;visDt=v;}};\n`;
const htmlOf=src=>{const k=src.indexOf('window.__game={');if(k<0)throw new Error('anchor');return '<!doctype html><html><head><meta charset="utf-8"></head><body>'+src.slice(0,k)+INJECT+src.slice(k)+'</body></html>';};
function inPage(){window.__freeze=true;
  const D=window.__kg,TH=window.THREE,V=()=>new TH.Vector3(),holder=new TH.Group(),mats=D.teamMats(D.TEAMS[0].home,D.TEAMS[0].gk);
  const PD=[
    {name:'Base Striker',short:'BS',label:'ST',num:9,st:{phy:70,pac:82},skin:'#e0ac85',hair:'#2b1d14',hs:0,boot:'#111111',h:1.0},
    {name:'Tall Stopper',short:'TS',label:'CB',num:4,st:{phy:88,pac:60},skin:'#9b6847',hair:'#16120f',hs:1,boot:'#f4f4f4',h:1.03},
    {name:'Quick Winger',short:'QW',label:'RW',num:7,st:{phy:55,pac:92},skin:'#f1c9a5',hair:'#d8b46a',hs:2,boot:'#ff3d7f',h:0.96},
    {name:'Base Keeper',short:'BK',label:'GK',num:1,st:{phy:75,pac:60},skin:'#c68b62',hair:'#5a3a22',hs:0,boot:'#111111',h:1.01,gk:true}];
  D.ball.pos.set(3,0.11,2);
  const kickT=[];for(let i=1;i<=14;i++)kickT.push(-0.1+i/60);for(let i=1;i<=18;i++)kickT.push(0.15+i/60);
  const R=[];
  for(let ri=0;ri<PD.length;ri++)for(const side of [0,-1]){const r=D.buildRig(mats,PD[ri],!!PD[ri].gk,{parent:holder}),p={team:0,isOfficial:false,stamina:70,rig:r};
    const K=side<0?'L':'R',an=r['ankle'+K],sole=an.children.find(c=>c.isMesh&&c.geometry.type==='BoxGeometry'),boot=an.children.find(c=>c.isMesh&&c.geometry.type==='SphereGeometry');
    let g=12;const fr=[];
    const draw=(aid,t,label)=>{g+=1/60;D.setClock(g,1/60);D.applyVisual(p,0,0,0,0,aid,t,0.3,0,side);r.root.updateMatrixWorld(true);
      const toe=sole.localToWorld(V().set(0,0,0.1275)),bc=boot.getWorldPosition(V());
      fr.push({label,t:+t.toFixed(4),toe:toe.toArray().map(x=>+x.toFixed(4)),boot:bc.toArray().map(x=>+x.toFixed(4)),ankleX:+an.rotation.x.toFixed(4),hipsY:+r.hips.getWorldPosition(V()).y.toFixed(4)});};
    for(let i=0;i<12;i++)draw(D.A.idle,g,'idle before');
    for(const t of kickT)draw(D.A.kick,t,'kick');
    for(let i=0;i<24;i++)draw(D.A.idle,g,'idle after');
    R.push({rig:PD[ri].name,side,kickLeg:K,frames:fr});holder.remove(r.root);}
  return R;}
async function measure(browser,file){const src=fs.readFileSync(file,'utf8'),html=htmlOf(src);
  const page=await browser.newPage({viewport:{width:640,height:360}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{try{localStorage.setItem('gl-tut-v1','1');}catch(e){}});
  await page.route('**/*',r=>{const u=r.request().url();
    if(u.startsWith('http://game.local'))return r.fulfill({body:html,contentType:'text/html'});
    if(u.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'});
    return r.abort();});
  await page.goto('http://game.local/');await page.waitForFunction(()=>window.__kg&&window.__game);
  const rows=await page.evaluate(inPage);await page.close();
  return {file:path.relative(process.cwd(),file),sha256:crypto.createHash('sha256').update(src).digest('hex'),errors,rows};}
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
function summarise(rows){return rows.map(({rig,side,kickLeg,frames})=>{
  const at=t=>frames.find(f=>f.label==='kick'&&Math.abs(f.t-t)<1e-3);
  let maxToe=0,maxToeAt=null,maxAn=0,maxAnAt=null;
  for(let i=1;i<frames.length;i++){const a=frames[i-1],b=frames[i];if(b.label!=='kick'&&a.label!=='kick')continue;
    const d=dist(a.toe,b.toe),da=Math.abs(b.ankleX-a.ankleX);if(d>maxToe){maxToe=d;maxToeAt=a.label+' '+a.t+' -> '+b.label+' '+b.t;}if(da>maxAn){maxAn=da;maxAnAt=a.label+' '+a.t+' -> '+b.label+' '+b.t;}}
  const li=frames.map(f=>f.label).lastIndexOf('kick'),last=frames[li],first=frames[li+1];
  return {rig,side,kickLeg,preStrike:at(0.1333),postStrike:at(0.1667),maxToeStepInKick:+maxToe.toFixed(4),maxToeStepAt:maxToeAt,maxAnkleStepInKick:+maxAn.toFixed(4),maxAnkleStepAt:maxAnAt,
    endSwitch:{toeStep:+dist(last.toe,first.toe).toFixed(4),ankleStep:+(first.ankleX-last.ankleX).toFixed(4),hipsStep:+(first.hipsY-last.hipsY).toFixed(4),lastKick:last,firstIdle:first}};});}
(async()=>{const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const out={};
  for(const [k,f] of [['before',fb],['after',fa]]){const m1=await measure(browser,f),m2=await measure(browser,f);
    out[k]={file:m1.file,sha256:m1.sha256,pageErrors:[...m1.errors,...m2.errors],repeatIdentical:JSON.stringify(m1.rows)===JSON.stringify(m2.rows),summary:summarise(m1.rows),frames:m1.rows};}
  await browser.close();fs.writeFileSync(fo,JSON.stringify(out,null,1));
  for(const k of ['before','after']){const o=out[k];console.log(`\n== ${k} ${o.file} sha256 ${o.sha256.slice(0,16)} page errors ${o.pageErrors.length} two runs identical: ${o.repeatIdentical}`);
    for(const s of o.summary)console.log(`${s.rig.padEnd(13)} side ${String(s.side).padStart(2)} | strike: before t=0.1333 toe ${s.preStrike.toe} ankleX ${s.preStrike.ankleX}; after t=0.1667 toe ${s.postStrike.toe} boot ${s.postStrike.boot} ankleX ${s.postStrike.ankleX}`+
      `\n${''.padEnd(22)}| max step in kick: toe ${s.maxToeStepInKick} m (${s.maxToeStepAt}), ankle ${s.maxAnkleStepInKick} rad (${s.maxAnkleStepAt}) | kick->idle: toe ${s.endSwitch.toeStep} m, ankle ${s.endSwitch.ankleStep} rad, hips ${s.endSwitch.hipsStep} m`);}
})();
