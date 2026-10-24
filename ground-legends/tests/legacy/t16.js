const open=require('./harness.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const {browser,page,errors,SP}=await open();
  await page.evaluate(()=>{__game.startMatch({mode:'play',minutes:5,home:1,away:4,firstKick:0});__game.sim(2);});
  for(const [name,args] of [['corner',['corner',0,52.1,-33.6]],['fk',['freekick',0,30,8]],['pen',['penalty',0,41.5,0]],['throw',['throw',0,10,-33.95]]]){
    await page.evaluate(a=>{window.__freeze=true;__game.setPiece(...a);__game.sim(0.7);window.__freeze=false;},args);
    await sleep(1500);await page.screenshot({path:SP+'/shots/sp_'+name+'.png'});
    // execute: user presses the right key
    const key=name==='pen'||name==='fk'?'shoot':name==='corner'?'lob':'pass';
    const r=await page.evaluate(async k=>{window.__freeze=true;__game.actDown(k);await new Promise(r=>setTimeout(r,500));__game.actUp(k);__game.sim(0.05);const st=__game.state;__game.sim(1.5);return [st,__game.state,__game.score,__game.ball.owner?__game.ball.owner.team+':'+__game.ball.owner.slot:'-'];},key);
    console.log(name,JSON.stringify(r));
  }
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
