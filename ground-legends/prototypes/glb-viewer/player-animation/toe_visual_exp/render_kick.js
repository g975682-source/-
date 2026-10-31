// Pictures of the kick for two copies of index.html (A as it is, D the toe-term candidate), same body, cameras and
// timeline, to look at the foot around the strike. Rigs are the game's own (buildRig + applyVisual, test access injected
// in memory as ../measure_kick_ground.js does), drawn with a separate renderer on a grass plane at y = 0.
//   node render_kick.js <A.html> <D.html> <out folder>
// Timeline: 12 idle frames, the game's kick timeline at 60 fps (visT -0.083 ... 0.133, the strike, 0.167 ... 0.45),
// 12 idle frames. The ball sits where the game keeps it for a standing owner (0.5 m in front, y = BR 0.11) until the
// strike; after it a faint ball marks where it was (in the game it has left).
// Body: Base Striker with yellow boots (only the boot colour differs from the tests, so the foot is easy to see).
// Writes <out>/frames/<variant>_<side>_<view>_<index>.png and <out>/frames.json.
const path=require('path'),fs=require('fs');
const P=require(path.join(__dirname,'..','..','..','..','tests','legacy','paths.js'));
const {chromium}=require(P.PLAYWRIGHT);
const three=fs.readFileSync(P.THREE_JS,'utf8');
const [fa,fd,outDir]=process.argv.slice(2);
if(!outDir){console.error('usage: node render_kick.js <A.html> <D.html> <out folder>');process.exit(2);}
const FR=path.join(outDir,'frames');fs.mkdirSync(FR,{recursive:true});
const INJECT=`window.__kg={A,applyVisual,buildRig,teamMats,TEAMS,ball,setClock(g,v){gtime=g;visDt=v;}};\n`;
const htmlOf=src=>{const k=src.indexOf('window.__game={');if(k<0)throw new Error('anchor');return '<!doctype html><html><head><meta charset="utf-8"></head><body>'+src.slice(0,k)+INJECT+src.slice(k)+'</body></html>';};

function setup(){window.__freeze=true;
  const D=window.__kg,TH=window.THREE,W=360,H=360;
  const ren=new TH.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});ren.setSize(W,H);ren.setPixelRatio(1);ren.setClearColor(0xbcd3e8);
  const scene=new TH.Scene();scene.add(new TH.HemisphereLight(0xffffff,0x40553a,0.95));const sun=new TH.DirectionalLight(0xffffff,0.75);sun.position.set(-3,5,2);scene.add(sun);
  const grass=new TH.Mesh(new TH.PlaneGeometry(30,30),new TH.MeshLambertMaterial({color:0x4f9a4a}));grass.rotation.x=-Math.PI/2;scene.add(grass);
  const grid=new TH.GridHelper(3,30,0x2f6a2c,0x3f7f3b);grid.position.y=0.001;scene.add(grid);
  const ballMat=new TH.MeshLambertMaterial({color:0xffffff,transparent:true,opacity:1});
  const ballM=new TH.Mesh(new TH.SphereGeometry(0.11,24,16),ballMat);ballM.position.set(0,0.11,0.5);scene.add(ballM);
  const mats=D.teamMats(D.TEAMS[0].home,D.TEAMS[0].gk),holder=new TH.Group();scene.add(holder);
  const pd={name:'Base Striker',short:'BS',label:'ST',num:9,st:{phy:70,pac:82},skin:'#e0ac85',hair:'#2b1d14',hs:0,boot:'#ffd200',h:1.0};
  D.ball.pos.set(0,0.11,0.5);
  window.__rk={D,TH,ren,scene,ballM,ballMat,holder,mats,pd};}

// one side's whole timeline; returns PNG data URLs per frame and view, and the frame labels
function runSide(side,views,keep){
  const {D,TH,ren,scene,ballM,ballMat,holder,mats,pd}=window.__rk;
  const r=D.buildRig(mats,pd,false,{parent:holder}),p={team:0,isOfficial:false,stamina:70,rig:r};
  const sx=side<0?1:-1;   // camera on the kicking leg's side (the right leg is on -x)
  const CAM={
    side:{pos:[sx*3.6,1.0,0.15],look:[0,0.78,0.15],fov:38},
    front34:{pos:[sx*2.3,1.1,2.6],look:[0,0.7,0.2],fov:40},
    foot:{pos:[sx*1.9,0.32,0.35],look:[0,0.2,0.05],fov:46}};
  const cams={};for(const [k,c] of Object.entries(CAM)){const cam=new TH.PerspectiveCamera(c.fov,1,0.02,50);cam.position.set(...c.pos);cam.lookAt(new TH.Vector3(...c.look));cams[k]=cam;}
  const kickT=[];for(let i=1;i<=14;i++)kickT.push(-0.1+i/60);for(let i=1;i<=18;i++)kickT.push(0.15+i/60);
  const seq=[];for(let i=0;i<12;i++)seq.push(['idle before',null]);for(const t of kickT)seq.push(['kick',t]);for(let i=0;i<12;i++)seq.push(['idle after',null]);
  let g=12;const out=[];
  seq.forEach(([label,t],i)=>{g+=1/60;D.setClock(g,1/60);D.applyVisual(p,0,0,0,0,label==='kick'?D.A.kick:D.A.idle,label==='kick'?t:g,0.3,0,side);r.root.updateMatrixWorld(true);
    const struck=label==='idle after'||(label==='kick'&&t>0.15);ballMat.opacity=struck?0.25:1;ballM.visible=true;
    const row={i,label,t:t==null?null:+t.toFixed(4),img:{}};
    if(keep(row))for(const v of views){ren.render(scene,cams[v]);row.img[v]=ren.domElement.toDataURL('image/png');}
    out.push(row);});
  holder.remove(r.root);return out;}

async function renderBuild(browser,file,tag){
  const html=htmlOf(fs.readFileSync(file,'utf8'));const page=await browser.newPage({viewport:{width:400,height:400}});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{try{localStorage.setItem('gl-tut-v1','1');}catch(e){}});
  await page.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://game.local'))return r.fulfill({body:html,contentType:'text/html'});if(u.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'});return r.abort();});
  await page.goto('http://game.local/');await page.waitForFunction(()=>window.__kg&&window.__game);
  await page.evaluate(setup);await page.evaluate('window.runSide='+runSide.toString());
  const KEY=[0,0.1,0.1333,0.1667,0.2,0.2333,0.25,0.2667,0.2833,0.3,0.4];   // 0.25 ... 0.283: the foot passes the ball's place
  const res={};
  for(const side of [0,-1]){
    // every frame of the side view (for the moving picture), key frames in all three views
    const rows=await page.evaluate(([side,KEY])=>{const keepKey=r=>r.label==='kick'&&KEY.some(k=>Math.abs(k-r.t)<1e-3);
      const all=runSide(side,['side'],()=>true),key=runSide(side,['side','front34','foot'],keepKey);
      return {all:all.map(r=>({i:r.i,label:r.label,t:r.t,img:r.img})),key:key.filter(keepKey).map(r=>({i:r.i,label:r.label,t:r.t,img:r.img}))};},[side,KEY]);
    res[side]=rows;}
  await page.close();
  const index={all:{},key:{}};
  for(const side of [0,-1]){index.all[side]=[];index.key[side]=[];
    for(const r of res[side].all){const f=`${tag}_s${side}_side_all_${String(r.i).padStart(3,'0')}.png`;fs.writeFileSync(path.join(FR,f),Buffer.from(r.img.side.split(',')[1],'base64'));index.all[side].push({i:r.i,label:r.label,t:r.t,file:f});}
    for(const r of res[side].key){const e={i:r.i,label:r.label,t:r.t,files:{}};
      for(const [v,d] of Object.entries(r.img)){const f=`${tag}_s${side}_${v}_key_${r.t.toFixed(4)}.png`;fs.writeFileSync(path.join(FR,f),Buffer.from(d.split(',')[1],'base64'));e.files[v]=f;}
      index.key[side].push(e);}}
  return {file:path.relative(process.cwd(),file),errors,index};}

(async()=>{const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const out={A:await renderBuild(browser,fa,'A'),D:await renderBuild(browser,fd,'D')};await browser.close();
  fs.writeFileSync(path.join(outDir,'frames.json'),JSON.stringify(out,null,1));
  for(const k of ['A','D'])console.log(k,out[k].file,'page errors',out[k].errors.length,'frames',out[k].index.all[0].length+out[k].index.all[-1].length,'key',out[k].index.key[0].length+out[k].index.key[-1].length);
})();
