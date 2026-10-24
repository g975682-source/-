// the website build as GitHub Pages would serve it: full document, no claude.ai runtime
const P=require('./paths.js');   // tool locations, see paths.js
const { chromium } = require(P.PLAYWRIGHT);
const fs=require('fs');const SP=P.OUT;
const html=fs.readFileSync(P.DOCS,'utf8'),three=fs.readFileSync(P.THREE_JS,'utf8');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  for(const vp of [{width:1280,height:720},{width:390,height:844,touch:true}]){
    const page=await browser.newPage({viewport:{width:vp.width,height:vp.height},hasTouch:!!vp.touch,isMobile:!!vp.touch});const errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('ERR_FAILED'))errors.push(m.text());});
    await page.route('**/*',r=>{const u=r.request().url();if(u.startsWith('https://g975682-source.github.io/'))return r.fulfill({body:html,contentType:'text/html'});if(u.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'});return r.abort();});
    await page.goto('https://g975682-source.github.io/-/');await sleep(1500);
    const info=await page.evaluate(()=>({mode:document.compatMode,title:document.title,claude:typeof window.claude,ow:document.documentElement.scrollWidth-innerWidth}));
    await page.screenshot({path:SP+'/shots/web_title_'+vp.width+'.png'});
    // quick match runs
    if(vp.touch)await page.tap('#btnPlay');else await page.click('#btnPlay');await sleep(500);
    if(vp.touch)await page.tap('#btnKick');else await page.click('#btnKick');await sleep(3000);
    const m=await page.evaluate(()=>({mode:__game.mode,state:__game.state}));
    // online screen explains it is not available here
    await page.evaluate(()=>{__game.startDemo&&0;});
    console.log(vp.width,JSON.stringify(info),JSON.stringify(m),'ERR',errors.slice(0,5).join(' | '));
    await page.close();
  }
  await browser.close();
})();
