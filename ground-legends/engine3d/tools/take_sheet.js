// Contact sheets of motion-capture takes on the engine's model: each BVH named on the command line is retargeted with the
// prototype's code (as mocap_qa.js does) and drawn at fixed steps, side view (camera beside the travel, following the
// hips) with a ground grid, one row per take, so the stride, lean and foot contacts can be looked at. Development tool.
//   node ground-legends/engine3d/tools/take_sheet.js <out.png> <step s> <frames per row> <take.bvh> [take.bvh ...]
const path=require('path'),fs=require('fs');
const GL=path.join(__dirname,'..','..'),PA=path.join(GL,'prototypes','glb-viewer');
const P=require(path.join(GL,'tests','legacy','paths.js'));const {chromium}=require(P.PLAYWRIGHT);
const three=fs.readFileSync(P.THREE_JS,'utf8'),model=fs.readFileSync(path.join(GL,'engine3d','models','mh_player.glb'));
const [OUT,STEP,PER,...TAKES]=process.argv.slice(2);
(async()=>{
  const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>{const u=r.request().url();
    if(u.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'});
    if(u==='http://viewer.local/engine_model.glb')return r.fulfill({body:model,contentType:'model/gltf-binary'});
    if(u.startsWith('http://viewer.local/take/')){const f=TAKES[+u.split('/').pop()];return r.fulfill({body:fs.readFileSync(f),contentType:'text/plain'});}
    if(u.startsWith('http://viewer.local/')){const f=path.join(PA,decodeURIComponent(u.slice(20).split('?')[0]));
      if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.html')?'text/html':'text/plain'});
      return r.fulfill({status:404,body:'not found'});}
    return r.abort();});
  await page.goto('http://viewer.local/player-animation/index.html?autoload=0');
  await page.waitForFunction(()=>window.PALab&&window.GLRetarget);
  const png=await page.evaluate(async({n,step,per,names})=>{
    const L=PALab,M=await L.loadModel('http://viewer.local/engine_model.glb'),W=180,H=240;
    const ren=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});ren.setSize(W,H);ren.setClearColor(0xeef2f5);
    const sc=new THREE.Scene();sc.add(new THREE.HemisphereLight(0xffffff,0x667788,1.0));const dl=new THREE.DirectionalLight(0xffffff,0.6);dl.position.set(2,5,3);sc.add(dl);
    const grid=new THREE.GridHelper(200,200,0x8899aa,0xb8c4cc);sc.add(grid);sc.add(M.holder);
    const cam=new THREE.PerspectiveCamera(30,W/H,0.1,100);
    const sheet=document.createElement('canvas');sheet.width=W*per;sheet.height=(H+16)*n;const g=sheet.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,sheet.width,sheet.height);
    for(let k=0;k<n;k++){const bv=await L.loadTake('http://viewer.local/take/'+k),c=L.makeClip(M,bv,{name:'t'+k,from:0.02,to:bv.clip.duration-0.02,pad:0});
      const p0=L.pathAt(c,0),p1=L.pathAt(c,c.duration),dx=p1[0]-p0[0],dz=p1[1]-p0[1],dl2=Math.hypot(dx,dz)||1,sx=-dz/dl2,sz=dx/dl2;   // camera on the travel's side
      g.fillStyle='#000';g.font='12px sans-serif';g.fillText(names[k],4,k*(H+16)+12);
      const T=[];for(let i=0;i<per;i++)T.push(Math.min(c.duration,i*step));let i=0;
      L.sampleClip(M,c,T,t=>{const pa=L.pathAt(c,t);M.holder.position.x=pa[0];M.holder.position.z=pa[1];M.holder.updateMatrixWorld(true);
        const h=new THREE.Vector3();M.by.Hips.getWorldPosition(h);cam.position.set(h.x+sx*5.2,1.0,h.z+sz*5.2);cam.lookAt(h.x,0.85,h.z);
        ren.render(sc,cam);g.drawImage(ren.domElement,i*W,k*(H+16)+16);g.fillStyle='#333';g.fillText(t.toFixed(2)+'s',i*W+4,k*(H+16)+30);
        M.holder.position.set(0,0,0);M.holder.updateMatrixWorld(true);i++;return 0;});}
    return sheet.toDataURL('image/png');},{n:TAKES.length,step:+STEP,per:+PER,names:TAKES.map(t=>path.basename(t))});
  fs.writeFileSync(OUT,Buffer.from(png.split(',')[1],'base64'));await browser.close();if(errors.length)console.log('page errors',errors.slice(0,3));
})().catch(e=>{console.error(e);process.exit(1);});
