// Account save: inside claude.ai the club and progress follow the viewer's account (index.html, "account save").
// Each case opens the game with an in-page stand-in for the user and db capabilities (or none) and checks what the
// game shows and writes. Exit code 0 only when every check passes.
//   node ground-legends/tests/account_save.js
const P=require('./legacy/paths.js');
const {chromium}=require(P.PLAYWRIGHT);
const fs=require('fs');
const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>'+fs.readFileSync(process.env.GAME||P.GAME_DEFAULT,'utf8')+'</body></html>';
const three=fs.readFileSync(P.THREE_JS,'utf8');
const UID='u_test1',PATH='data/users/'+UID+'/save',CLUB_KEY='gl-club-v1';
let fails=0;const ok=(name,cond,info)=>{console.log((cond?'ok   ':'FAIL ')+name+(info!==undefined?'  '+JSON.stringify(info).slice(0,240):''));if(!cond)fails++;};

// local: browser storage to start with; cloud: the account document (null = none); opts.ro: writes refused as for a
// view-only viewer; opts.delay: ms before the account read answers; opts.claude=false: no window.claude at all
async function open(browser,{local={},cloud=null,ro=false,delay=0,claude=true}={}){
  const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];
  // the fonts are blocked here on purpose (no network in the test): that load error is not the game's
  page.on('console',m=>{if(m.type()==='error'&&!/^Failed to load resource/.test(m.text()))errors.push(m.text());});page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  await page.addInitScript(({local,cloud,ro,delay,claude,UID})=>{
    try{localStorage.clear();localStorage.setItem('gl-tut-v1','1');for(const k in local)localStorage.setItem(k,local[k]);}catch(e){}
    if(!claude)return;
    let cur=cloud;window.__dbWrites=[];
    const ref=path=>({id:path.split('/').pop(),path,
      get:async()=>{if(delay)await new Promise(r=>setTimeout(r,delay));return {id:'save',exists:!!cur,data:()=>cur?JSON.parse(JSON.stringify(cur)):undefined,metadata:{fromCache:false,hasPendingWrites:false}};},
      set:async b=>{if(ro)throw {code:'invalid_argument',message:'below the minimum level'};if(JSON.stringify(b).length>262144)throw {code:'invalid_argument',message:'too big'};
        window.__dbWrites.push({path,body:JSON.parse(JSON.stringify(b))});cur=JSON.parse(JSON.stringify(b));}});
    const db={doc:p=>{if(p.split('/').length%2)throw new TypeError('a document path has an even number of segments');return ref(p);}};
    const user={id:async()=>UID,me:async()=>({id:UID,name:'테스트 감독',avatarUrl:'data:image/gif;base64,R0lGODlhAQABAAAAACw=',color:'#888888',email:null,isOwner:false,canEdit:false})};
    window.claude={use:async n=>n==='db'?db:n==='user'?user:null};
  },{local,cloud,ro,delay,claude,UID});
  await page.route('**/*',r=>{const u=r.request().url();
    if(u.startsWith('http://game.local'))return r.fulfill({body:html,contentType:'text/html'});
    if(u.includes('three.min.js'))return r.fulfill({body:three,contentType:'application/javascript'});
    return r.abort();});
  await page.goto('http://game.local/');
  await page.waitForTimeout(1500);
  return {page,errors};
}
const state=page=>page.evaluate(()=>({acct:window.__game.acct,chip:document.querySelector('#lbAcct').textContent,chipHidden:document.querySelector('#lbAcct').hidden,
  club:document.querySelector('#lbClubName').textContent,writes:window.__dbWrites||null,ls:Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)]))}));

(async()=>{
  const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  // 1. no account (the website copy): stays in the browser, says so; and a real club to use below
  let local,localClub;
  {const {page,errors}=await open(browser,{claude:false});
    await page.evaluate(()=>{window.__game.clubNew('로컬 FC','LOC',0);});await page.waitForTimeout(300);
    const s=await state(page);
    ok('no account: state local',s.acct&&s.acct.state==='local'&&!s.acct.linked,s.acct);
    ok('no account: the chip says this browser',!s.chipHidden&&s.chip==='이 기기에 저장',s.chip);
    ok('no account: the club is saved in the browser',!!s.ls[CLUB_KEY]&&JSON.parse(s.ls[CLUB_KEY]).name==='로컬 FC');
    ok('no account: no page errors',errors.length===0,errors);
    local={};for(const k of [CLUB_KEY,'gl-sel','gl-nick','gl-save-at'])if(s.ls[k]!=null)local[k]=s.ls[k];localClub=JSON.parse(s.ls[CLUB_KEY]);
    await page.close();}
  const cloudClub=Object.assign({},localClub,{name:'클라우드 FC',money:999000});
  // 2. first sign-in with progress made before it in this browser: it goes up to the account
  {const pre=Object.assign({},local);delete pre['gl-save-at'];   // progress from before the account save existed
    const {page,errors}=await open(browser,{local:pre,cloud:null});await page.waitForTimeout(500);
    const s=await state(page);const w=s.writes[s.writes.length-1];
    ok('first sign-in: one write to the viewer\'s own document',s.writes.length===1&&w.path===PATH,s.writes.map(x=>x.path));
    ok('first sign-in: the club went up',w&&JSON.parse(w.body.keys[CLUB_KEY]).name==='로컬 FC'&&w.body.v===1&&w.body.at>0);
    ok('first sign-in: state synced, the chip says the account',s.acct.state==='synced'&&s.chip==='계정에 저장됨',[s.acct,s.chip]);
    ok('first sign-in: the account name is not stored',!JSON.stringify(w).includes('테스트 감독'));
    ok('first sign-in: no page errors',errors.length===0,errors);
    await page.close();}
  // 3. the account copy is newer: it replaces this browser's, which is kept aside
  {const old=Object.assign({},local,{'gl-save-at':'1000'});
    const {page,errors}=await open(browser,{local:old,cloud:{v:1,at:Date.now()+5000,keys:{[CLUB_KEY]:JSON.stringify(cloudClub),'gl-nick':'원격감독'}}});
    const s=await state(page);
    ok('newer account copy: the lobby shows its club',s.club==='클라우드 FC',s.club);
    ok('newer account copy: its nickname',await page.evaluate(()=>document.querySelector('#lbNick').textContent)==='원격감독');
    ok('newer account copy: this browser\'s copy kept in gl-save-backup',!!s.ls['gl-save-backup']&&JSON.parse(JSON.parse(s.ls['gl-save-backup']).keys[CLUB_KEY]).name==='로컬 FC');
    ok('newer account copy: nothing written back',s.writes.length===0,s.writes.length);
    // 4. a change after that is written to the account a moment later, once
    await page.evaluate(()=>{window.__game.clubSet({money:12345});});await page.waitForTimeout(300);
    await page.evaluate(()=>{window.__game.clubSet({money:23456});});await page.waitForTimeout(2200);
    const s2=await state(page);const w=s2.writes[s2.writes.length-1];
    ok('a change: written to the account, coalesced',s2.writes.length===1&&JSON.parse(w.body.keys[CLUB_KEY]).money===23456,s2.writes.length);
    ok('newer account copy: no page errors',errors.length===0,errors);
    await page.close();}
  // 5. this browser is newer: it goes up, the account copy is replaced
  {const newer=Object.assign({},local,{'gl-save-at':String(Date.now())});
    const {page,errors}=await open(browser,{local:newer,cloud:{v:1,at:1000,keys:{[CLUB_KEY]:JSON.stringify(cloudClub)}}});await page.waitForTimeout(500);
    const s=await state(page);const w=s.writes[s.writes.length-1];
    ok('newer here: the lobby keeps this browser\'s club',s.club==='로컬 FC',s.club);
    ok('newer here: written to the account',s.writes.length===1&&JSON.parse(w.body.keys[CLUB_KEY]).name==='로컬 FC');
    ok('newer here: no page errors',errors.length===0,errors);
    await page.close();}
  // 6. a view-only viewer: the write is refused, the game says so and keeps the browser save
  {const newer=Object.assign({},local,{'gl-save-at':String(Date.now())});
    const {page,errors}=await open(browser,{local:newer,cloud:null,ro:true});await page.waitForTimeout(500);
    const s=await state(page);
    ok('view only: state readonly, the chip says so',s.acct.state==='readonly'&&s.chip==='보기 전용 · 이 기기에 저장',[s.acct,s.chip]);
    await page.evaluate(()=>{window.__game.clubSet({money:777});});await page.waitForTimeout(2200);
    const s2=await state(page);
    ok('view only: the browser save still works',JSON.parse(s2.ls[CLUB_KEY]).money===777);
    ok('view only: no page errors',errors.length===0,errors);
    await page.close();}
  // 7. the account copy arrives while the club screen is open: applied when the main screen comes back
  {const old=Object.assign({},local,{'gl-save-at':'1000'});
    const {page,errors}=await open(browser,{local:old,cloud:{v:1,at:Date.now()+5000,keys:{[CLUB_KEY]:JSON.stringify(cloudClub)}},delay:2500});
    await page.evaluate(()=>window.__game.screen('#club'));await page.waitForTimeout(2500);
    const s=await state(page);
    ok('club screen open: the account copy waits',s.acct.pending===true&&JSON.parse(s.ls[CLUB_KEY]).name==='로컬 FC',s.acct);
    await page.evaluate(()=>window.__game.screen('#title'));await page.waitForTimeout(200);
    const s2=await state(page);
    ok('back on the main screen: the account copy is applied',!s2.acct.pending&&s2.club==='클라우드 FC',[s2.acct,s2.club]);
    ok('club screen open: no page errors',errors.length===0,errors);
    await page.close();}
  await browser.close();
  console.log(fails?`${fails} FAILED`:'all passed');process.exitCode=fails?1:0;
})();
