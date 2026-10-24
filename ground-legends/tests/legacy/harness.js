const P=require('./paths.js');   // tool locations, see paths.js
const { chromium } = require(P.PLAYWRIGHT);
const fs=require('fs');
const SP=P.OUT;
const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>'+fs.readFileSync(process.env.GAME||P.GAME_DEFAULT,'utf8')+'</body></html>';
const three=fs.readFileSync(P.THREE_JS,'utf8');
module.exports=async function open(opts={}){
  const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const page=await browser.newPage({viewport:opts.viewport||{width:1280,height:720},hasTouch:!!opts.touch,isMobile:!!opts.touch});
  if(!opts.fresh)await page.addInitScript(()=>{try{localStorage.setItem('gl-tut-v1','1');}catch(e){}});
  const errors=[];
  page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errors.push(m.type()+': '+m.text());});
  page.on('pageerror',e=>errors.push('pageerror: '+e.message+'\n'+e.stack));
  await page.route('**/*',r=>{const u=r.request().url();
    if(u.startsWith('http://game.local'))return r.fulfill({body:html,contentType:'text/html'});
    if(u.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'});
    return r.abort();});
  await page.goto('http://game.local/');
  await page.waitForTimeout(1500);
  return {browser,page,errors,SP};
};
