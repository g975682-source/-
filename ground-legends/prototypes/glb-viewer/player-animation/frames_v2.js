// Frame sequences of the baseline (no variant) for looking at the motion over time: the viewer's pose() at fixed steps,
// saved as single frames in a scratch folder given on the command line, then put together into contact sheets by
// frames_v2_sheet.py. This is not continuous playback: it shows every frame at the step only.
//   node frames_v2.js <frames folder>
const path=require('path'),fs=require('fs');
const DIR=__dirname,GV=path.join(DIR,'..');
const P=require(path.join(GV,'..','..','tests','legacy','paths.js'));
const {chromium}=require(P.PLAYWRIGHT);
const three=fs.readFileSync(P.THREE_JS,'utf8');
const FR=path.resolve(process.argv[2]||'frames');fs.mkdirSync(FR,{recursive:true});
const STEP=1/15;
(async()=>{
  const GP=JSON.parse(fs.readFileSync(path.join(DIR,'out','game_probe.json'),'utf8'));
  const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const page=await browser.newPage({viewport:{width:640,height:520}});const errors=[];
  page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errors.push(m.text());});page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>{const u=r.request().url();
    if(u.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'});
    if(u.startsWith('http://viewer.local/')){const f=path.join(GV,decodeURIComponent(u.slice(20).split('?')[0]));
      if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.html')?'text/html':'application/octet-stream'});
      return r.fulfill({status:404,body:'not found'});}
    return r.abort();});
  await page.goto('http://viewer.local/player-animation/index.html?autoload=0');
  await page.waitForFunction(()=>window.__pa);
  await page.evaluate(async()=>{await window.__pa.loadModel();await window.__pa.useKick('143_24');});
  const scenes=[];
  for(const name of ['standing D 0.2 s','running straight D 0.2 s','running angled D 0.2 s','running straight D 0.2 s then stop']){
    const g=GP.scenarios.find(s=>s.name===name),from=Math.max(-0.5,-g.lastOwned+1/60),to=name.startsWith('standing')||/stop/.test(name)?1.7:0.9,list=[];
    for(let dt=from;dt<=to+1e-9;dt+=STEP){const f=path.join(FR,`${name.replace(/\W+/g,'_')}_${list.length.toString().padStart(3,'0')}.png`);
      await page.evaluate(({g,dt})=>window.__pa.pose({plan:'game',game:g,dt},'side'),{g,dt});
      await page.locator('#view').screenshot({path:f});list.push({file:path.basename(f),dt:+dt.toFixed(3)});}
    scenes.push({name,frames:list});}
  fs.writeFileSync(path.join(FR,'frames.json'),JSON.stringify({step:STEP,scenes,errors},null,1));
  await browser.close();
  console.log('frames',scenes.map(s=>s.name+' '+s.frames.length).join(', '),'errors',errors.length);
})();
