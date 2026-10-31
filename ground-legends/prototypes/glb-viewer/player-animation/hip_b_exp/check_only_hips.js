// Which values change between two copies of index.html, over every animation state: each state of A (21) through the
// full visual step (applyPose + rigLife), 4 body types, sides -1/0/+1, speeds 0 and 6, raw and 60 fps clocks, 45
// frames. Values: hips height and the 19 joints' rotations (the same record as tests/anim_kick_sides.js).
// Prints, per state, how many values differ and at which record index (0 = hips height).
//   node check_only_hips.js <before.html> <after.html>
const path=require('path'),fs=require('fs');
const P=require(path.join(__dirname,'..','..','..','..','tests','legacy','paths.js'));
const {chromium}=require(P.PLAYWRIGHT);
const three=fs.readFileSync(P.THREE_JS,'utf8');
const [fb,fa]=process.argv.slice(2);
const INJECT=`window.__kg={A,applyVisual,buildRig,teamMats,TEAMS,ball,setClock(g,v){gtime=g;visDt=v;}};\n`;
const htmlOf=src=>{const k=src.indexOf('window.__game={');return '<!doctype html><html><head><meta charset="utf-8"></head><body>'+src.slice(0,k)+INJECT+src.slice(k)+'</body></html>';};
function inPage(){window.__freeze=true;
  const D=window.__kg,TH=window.THREE,holder=new TH.Group(),mats=D.teamMats(D.TEAMS[0].home,D.TEAMS[0].gk);
  const RJ=['hips','torso','chest','neck','head','shL','shR','armL','armR','elbowL','elbowR','wristL','wristR','legL','legR','kneeL','kneeR','ankleL','ankleR'];
  const PD=[
    {name:'Base Striker',short:'BS',label:'ST',num:9,st:{phy:70,pac:82},skin:'#e0ac85',hair:'#2b1d14',hs:0,boot:'#111111',h:1.0},
    {name:'Tall Stopper',short:'TS',label:'CB',num:4,st:{phy:88,pac:60},skin:'#9b6847',hair:'#16120f',hs:1,boot:'#f4f4f4',h:1.03},
    {name:'Quick Winger',short:'QW',label:'RW',num:7,st:{phy:55,pac:92},skin:'#f1c9a5',hair:'#d8b46a',hs:2,boot:'#ff3d7f',h:0.96},
    {name:'Base Keeper',short:'BK',label:'GK',num:1,st:{phy:75,pac:60},skin:'#c68b62',hair:'#5a3a22',hs:0,boot:'#111111',h:1.01,gk:true}];
  const read=r=>{const v=[r.hips.position.y];for(const j of RJ){const o=r[j].rotation;v.push(o.x,o.y,o.z);}return v;};
  D.ball.pos.set(3,0.11,2);const out={};
  for(const nm of Object.keys(D.A))for(let ri=0;ri<PD.length;ri++)for(const clock of ['raw','smooth'])for(const spd of [0,6])for(const side of [-1,0,1]){
    const r=D.buildRig(mats,PD[ri],!!PD[ri].gk,{parent:holder}),p={team:0,isOfficial:false,stamina:70,rig:r},rows=[];
    for(let f=0;f<45;f++){const g=12+f/60;D.setClock(g,clock==='raw'?0.25:1/60);D.applyVisual(p,1,0,-2,0.4+f*0.01,D.A[nm],Math.min(f/60,0.9),0.3+f*0.05,spd,side);rows.push(read(r));}
    out[`${nm}|${ri}|${clock}|${spd}|${side}`]=rows;holder.remove(r.root);}
  return out;}
async function run(browser,file){const html=htmlOf(fs.readFileSync(file,'utf8'));const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{try{localStorage.setItem('gl-tut-v1','1');}catch(e){}});
  await page.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://game.local'))return r.fulfill({body:html,contentType:'text/html'});if(u.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'});return r.abort();});
  await page.goto('http://game.local/');await page.waitForFunction(()=>window.__kg&&window.__game);const o=await page.evaluate(inPage);await page.close();return {o,errors};}
(async()=>{const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const B=await run(browser,fb),A=await run(browser,fa);await browser.close();
  const per={};let n=0;
  for(const k of Object.keys(B.o)){const st=k.split('|')[0];per[st]=per[st]||{values:0,diff:0,idx:{}};
    B.o[k].forEach((row,f)=>row.forEach((v,i)=>{n++;per[st].values++;if(!Object.is(v,A.o[k][f][i])){per[st].diff++;per[st].idx[i]=(per[st].idx[i]||0)+1;}}));}
  console.log('before',path.relative(process.cwd(),fb),'after',path.relative(process.cwd(),fa),'page errors',B.errors.length,A.errors.length,'values',n);
  for(const [st,x] of Object.entries(per))console.log(st.padEnd(11),x.values,'values,',x.diff,'different',x.diff?'at index '+JSON.stringify(x.idx):'');
})();
