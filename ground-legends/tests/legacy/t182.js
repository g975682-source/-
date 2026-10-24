const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  await page.click('#btnClub');await page.waitForTimeout(300);await page.click('#cnGo');await page.waitForTimeout(500);
  await page.click('#btnClubBack');await page.waitForTimeout(400);
  await page.keyboard.press('Escape');await page.waitForTimeout(300);await page.keyboard.press('Enter');await page.waitForTimeout(900);
  console.log(JSON.stringify(await page.evaluate(()=>({team:__game.teams[0].def.name,bp:document.getElementById('lbBp').textContent,ovr:document.getElementById('lbOvr').textContent,season:document.getElementById('lbSeason').textContent,card:document.getElementById('lbCard').innerText.replace(/\n/g,' ')}))));
  await page.screenshot({path:'lobbyClub.png'});
  // a lobby tab opens the club on that tab
  await page.click('#title [data-lb="market"]');await page.waitForTimeout(400);
  console.log('tab',await page.evaluate(()=>[!document.getElementById('club').hidden,document.querySelector('#clubTabs .tab.on, #clubTabs .tab.active, #clubTabs [aria-selected=true]')?.dataset.tab]));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,5).join('\n'));
  await browser.close();
})();
