const open=require('./harness.js');
(async()=>{
  const {browser,page,errors,SP}=await open();
  await page.click('#btnPlay'); await page.waitForTimeout(300);
  await page.screenshot({path:SP+'/shots/squad.png'});
  await page.click('#btnKick'); await page.waitForTimeout(500);
  await page.evaluate(()=>__game.sim(5));
  await page.waitForTimeout(600);
  await page.screenshot({path:SP+'/shots/play1.png'});
  // close-up poses
  await page.evaluate(()=>{
    window.__freeze=true;
    const ps=__game.players; const A=[0,1,2,3,4,5,6,9];
    // place 8 players in a row near center
    ps.forEach((p,i)=>{p.pos.set(100,0,100);});
    const pick=[ps[9],ps[3],ps[8],ps[1],ps[0],ps[14],ps[11],ps[20]];
    pick.forEach((p,i)=>{p.pos.set(-7+i*2,0,0);p.y=0;p.face=Math.PI/2*0+0.6;p.visA=A[i];p.visT=[0,0,0.22,0.3,0.35,0.6,0,0.5][i];p.visPh=[0,1.2,0,0,1.6,0,0,0.8][i];p.spd=[0,7,0,0,0,0,0,6][i];p.visSide=1;});
    pick[4].y=0.5;
    window.__camOverride={pos:new THREE.Vector3(0,2.2,7.5),look:new THREE.Vector3(0,0.9,0)};
  });
  await page.waitForTimeout(500);
  await page.screenshot({path:SP+'/shots/poses.png'});
  await page.evaluate(()=>{window.__camOverride={pos:new THREE.Vector3(-3.5,1.6,-3.5),look:new THREE.Vector3(-5,1.0,0)};});
  await page.waitForTimeout(400);
  await page.screenshot({path:SP+'/shots/back.png'});
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
