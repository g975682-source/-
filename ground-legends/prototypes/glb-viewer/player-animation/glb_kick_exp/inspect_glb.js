// Bone layout of out/mh_player.glb: names, parents, rest translations and rotations, world positions; read only.
//   node inspect_glb.js
const path=require('path'),fs=require('fs');
const P=require(path.join(__dirname,'..','..','..','..','tests','legacy','paths.js'));
const {chromium}=require(P.PLAYWRIGHT);
const three=fs.readFileSync(P.THREE_JS,'utf8'),gl=fs.readFileSync(path.join(__dirname,'..','..','vendor','GLTFLoader.js'),'utf8');
const glb=fs.readFileSync(path.join(__dirname,'..','out','mh_player.glb'));
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage();
  await p.route('**/*',r=>{const u=r.request().url();if(u.endsWith('/page'))return r.fulfill({body:'<html><body></body></html>',contentType:'text/html'});if(u.endsWith('.glb'))return r.fulfill({body:glb,contentType:'model/gltf-binary'});return r.abort();});
  await p.goto('http://x.local/page');await p.addScriptTag({content:three});await p.addScriptTag({content:gl});
  const o=await p.evaluate(async()=>{const buf=await (await fetch('http://x.local/m.glb')).arrayBuffer();const g=await new Promise((res,rej)=>new THREE.GLTFLoader().parse(buf,'',res,rej));
    g.scene.updateMatrixWorld(true);const out=[];g.scene.traverse(o=>{if(o.isBone){const w=o.getWorldPosition(new THREE.Vector3());out.push({n:o.name,parent:o.parent&&o.parent.name,p:o.position.toArray().map(v=>+v.toFixed(4)),q:o.quaternion.toArray().map(v=>+v.toFixed(4)),s:o.scale.toArray().map(v=>+v.toFixed(3)),w:w.toArray().map(v=>+v.toFixed(3))});}});
    let root=[];g.scene.traverse(o=>{if(!o.isBone&&o!==g.scene)root.push({n:o.name,type:o.type,s:o.scale.toArray(),q:o.quaternion.toArray().map(v=>+v.toFixed(3))});});
    let mn=1e9;g.scene.traverse(o=>{if(o.isSkinnedMesh){const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++)mn=Math.min(mn,a.getY(i));}});
    return {bones:out,other:root,minY:mn};});
  console.log(JSON.stringify(o.other));console.log('mesh min y (bind)',o.minY);for(const x of o.bones)console.log(x.n.padEnd(22),'parent',String(x.parent).padEnd(18),'p',x.p.join(','),'q',x.q.join(','),'world',x.w.join(','));await b.close();})();
