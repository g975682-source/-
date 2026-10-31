// Summary of measure_kick_ground.js outputs (one per hipY variant): kicking foot lowest point and when, plant foot
// lowest and highest point while it stands (kick frames), hips height, the idle frames after the kick, left = right.
//   node summarise.js <measure.json> ...
const fs=require('fs');
const lo=(fr,s)=>fr.reduce((a,b)=>b[s].low<a[s].low?b:a),hi=(fr,s)=>fr.reduce((a,b)=>b[s].low>a[s].low?b:a);
const rows=[];
for(const f of process.argv.slice(2)){const X=JSON.parse(fs.readFileSync(f)),tag=f.replace(/.*measure_/,'').replace('.json','');
  for(const rg of X.rigs){const S0=rg.sides['0'],S1=rg.sides['-1'];
    // left = right: the raw pose exactly; at 60 fps the largest |left - right| on the kick frames (the idle sway before
    // the kick is not mirrored and reaches the first kick frames through the easing, as in the build before)
    const pick=(S,x)=>[x.hipsY,x[S.kickLeg].low,x[S.plantLeg].low,x[S.kickLeg].ankleY,x[S.plantLeg].ankleY];
    const sym=JSON.stringify(S0.raw.map(x=>pick(S0,x)))===JSON.stringify(S1.raw.map(x=>pick(S1,x)));
    const k0=S0.frames.filter(x=>x.label==='kick'),k1=S1.frames.filter(x=>x.label==='kick');let lr=0;
    k0.forEach((x,i)=>{const p=pick(S0,x),q=pick(S1,k1[i]);p.forEach((v,j)=>lr=Math.max(lr,Math.abs(v-q[j])));});
    const S=S0,K=S.kickLeg,P=S.plantLeg,k=S.frames.filter(x=>x.label==='kick');
    const a=lo(k,K),r=lo(S.raw,K),pl=lo(k,P),ph=hi(k,P),prl=lo(S.raw,P),prh=hi(S.raw,P),aft=lo(S.frames.filter(x=>x.label==='idle after'),K);
    const hipMin=Math.min(...k.map(x=>x.hipsY)),idle=S.frames[0].hipsY;
    rows.push({tag,rig:rg.name,kick60:a[K].low,kick60t:a.t,kickRaw:r[K].low,kickRawt:r.t,plant60min:pl[P].low,plant60max:ph[P].low,plantRawMin:prl[P].low,plantRawMax:prh[P].low,hipsIdle:idle,hipsMin:hipMin,afterIdleKick:aft[K].low,leftEqualsRight:sym,lr60:+lr.toFixed(4),pageErrors:X.pageErrors.length});}}
const cm=v=>(v*100).toFixed(1);
console.log('variant  body          | kick 60fps (t)   | kick raw (t)     | plant 60 min/max | plant raw min/max | hips idle→min | after idle | raw L=R, 60fps max|L-R|');
for(const x of rows)console.log(`${x.tag.padEnd(8)} ${x.rig.padEnd(13)} | ${cm(x.kick60).padStart(5)} (${x.kick60t}) | ${cm(x.kickRaw).padStart(5)} (${x.kickRawt}) | ${cm(x.plant60min).padStart(5)} / ${cm(x.plant60max).padStart(4)} | ${cm(x.plantRawMin).padStart(5)} / ${cm(x.plantRawMax).padStart(4)}  | ${cm(x.hipsIdle)}→${cm(x.hipsMin)} | ${cm(x.afterIdleKick).padStart(4)} | ${x.leftEqualsRight}, ${cm(x.lr60)}`);
fs.writeFileSync(require("path").join(__dirname,"out","summary.json"),JSON.stringify(rows,null,1));
