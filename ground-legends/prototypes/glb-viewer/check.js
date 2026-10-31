// Headless check of the GLB viewer (Playwright + SwiftShader software WebGL, as the legacy tests use).
// For each model in models/: what loaded, the clips, root motion, foot height, whether the body leaves its holder
// when a clip plays in place, pose jumps when switching clips, and draw calls / triangles / render time for 1 and 22.
// Usage (from this folder): node check.js [model.glb ...]
const path=require('path'),fs=require('fs');
const P=require('../../tests/legacy/paths.js');
const {chromium}=require(P.PLAYWRIGHT);
const DIR=__dirname,three=fs.readFileSync(P.THREE_JS,'utf8');
const models=process.argv.slice(2).length?process.argv.slice(2):fs.readdirSync(path.join(DIR,'models')).filter(f=>/\.(glb|gltf)$/i.test(f));
(async()=>{
  const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  let failed=0;
  for(const m of models){
    const page=await browser.newPage({viewport:{width:1100,height:700}});
    const errors=[],net=[];
    page.on('console',x=>{if(x.type()==='error')errors.push(x.text());});
    page.on('pageerror',e=>errors.push('pageerror: '+e.message));
    page.on('requestfailed',r=>net.push(r.url()+' '+(r.failure()||{}).errorText));
    await page.route('**/*',r=>{const u=r.request().url();
      if(u.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'});
      if(u.startsWith('http://viewer.local/')){const f=path.join(DIR,decodeURIComponent(u.slice(20).split('?')[0])||'index.html');
        if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.html')?'text/html':'application/octet-stream'});
        return r.fulfill({status:404,body:'not found'});}
      return r.abort();});
    await page.goto('http://viewer.local/index.html?autoload=0');
    const rep=await page.evaluate(async m=>{const V=window.__viewer;const r=await V.load('models/'+m);if(!r)return {failed:document.querySelector('#status').textContent};
      const out={file:m,skinnedMeshes:r.skinnedMeshes,bones:r.bones,rootBone:r.rootBone,materials:r.materials,textures:r.textures,missingTextures:r.missingTextures,triangles:r.triangles,
        bindHeight:r.bindBox.height,scale:r.scaleApplied,facing:r.facing,yawApplied:r.yawApplied,boneSample:r.boneNames.slice(0,6),warnings:r.warnings||[],clips:[]};
      for(const c of r.clips)out.clips.push({name:c.name,dur:c.duration,tracks:c.tracks,missingBones:c.missingBones,rootMotion:c.rootMotion,footJointMinY:c.footJointMinY,footJointMaxOfLowest:c.footJointMaxOfLowest,inPlaceHipsMaxOffset:c.inPlaceHipsMaxOffset});
      return out;},m);
    if(rep.failed){console.log(m,'LOAD FAILED',rep.failed);failed++;await page.close();continue;}
    // pose jumps: largest per-frame bone move in steady play, and across a 0.25 s crossfade and a hard cut
    rep.switching=await page.evaluate(()=>{const V=window.__viewer,i=V.inst[0],clips=V.report.clips.map(c=>c.name);if(clips.length<2)return {note:'클립이 2개 미만'};
      const bones=[];i.root.traverse(o=>{if(o.isBone)bones.push(o);});const prev=bones.map(()=>new THREE.Vector3()),v=new THREE.Vector3();
      const step=()=>{i.mixer.update(1/60);i.holder.updateMatrixWorld(true);let mx=0;bones.forEach((b,k)=>{b.getWorldPosition(v);mx=Math.max(mx,v.distanceTo(prev[k]));prev[k].copy(v);});return mx;};
      const run=(n)=>{let mx=0;for(let k=0;k<n;k++)mx=Math.max(mx,step());return mx;};
      const a=clips[0],b=clips[1],res={from:a,to:b};
      document.querySelector('#xfade').value='0.25';V.stopAll();V.play(a);run(2);res.steady=+run(60).toFixed(3);
      V.play(b);res.crossfade=+run(20).toFixed(3);
      document.querySelector('#xfade').value='0';V.play(a);res.hardCut=+step().toFixed(3);
      document.querySelector('#xfade').value='0.25';return res;});
    // draw calls, triangles, render time (CPU side of renderer.render, SwiftShader: not a GPU figure)
    rep.perf={};
    for(const n of [1,22]){await page.evaluate(n=>{window.__viewer.setInstances(n);const c=window.__viewer.report.clips[0];if(c)window.__viewer.play(c.name);},n);
      await page.waitForTimeout(1500);
      rep.perf[n]=await page.evaluate(()=>{const V=window.__viewer,R=V.renderer;const t=[];for(let k=0;k<20;k++){for(const i of V.inst)i.mixer.update(1/60);const t0=performance.now();R.render(V.scene,V.camera);t.push(performance.now()-t0);}
        t.sort((a,b)=>a-b);return {calls:R.info.render.calls,triangles:R.info.render.triangles,geometries:R.info.memory.geometries,textures:R.info.memory.textures,renderMsMedian:+t[10].toFixed(1)};});}
    await page.evaluate(()=>window.__viewer.setInstances(1));await page.waitForTimeout(600);
    // a screenshot can hit the 30 s timeout under SwiftShader with a heavy model: record it instead of hiding it
    rep.screenshot=await page.screenshot({path:path.join(DIR,'out',m.replace(/\W/g,'_')+'.png'),timeout:90000}).then(()=>'saved',e=>'failed: '+e.message.split('\n')[0]);
    rep.consoleErrors=errors;rep.failedRequests=net.filter(u=>!/fonts|favicon/.test(u));
    console.log(JSON.stringify(rep,null,1));
    if(errors.length)failed++;
    await page.close();
  }
  await browser.close();
  console.log(failed?`CHECK FAIL: ${failed} model(s) with load failures or console errors`:'CHECK PASS');process.exitCode=failed?1:0;
})();
