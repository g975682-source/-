const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  const r=await page.evaluate(()=>{let m=0,sh=0;const g=__game;g.startMatch({mode:'play',minutes:12,home:0,away:2,firstKick:0});
    const sc=g.players[0].rig.root.parent;sc.traverse(o=>{if(o.isMesh){m++;if(o.castShadow)sh++;}});
    const per=[];g.players[0].rig.root.traverse(o=>{if(o.isMesh)per.push(o.castShadow?1:0);});
    return {sceneMeshes:m,shadowCasters:sh,perPlayer:per.length,perPlayerShadow:per.filter(x=>x).length,heights:g.players.map(p=>p.rig.body.cm).sort((a,b)=>a-b).join(',')};});
  console.log(JSON.stringify(r));
  await browser.close();
})();
