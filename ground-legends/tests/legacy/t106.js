// equal teams, AI level 'pro' against each competition AI (sides swapped every match)
const open=require('./harness.js');
(async()=>{
  const {browser,page,errors}=await open();
  const r=await page.evaluate(()=>{
    const g=__game,out={};window.__D=g.diffs;
    window.__D.wcNoSmart=Object.assign({},window.__D.cupWC,{smart:0});
    for(const dk of (window.__LIST||['cupWC','wcNoSmart'])){
      let gf=0,ga=0,sf=0,sa=0,w=0,d=0,l=0;
      for(let m=0;m<12;m++){
        const swap=m%2===1;
        g.startMatch({mode:'watch',home:1,away:3,formH:'4-3-3',formA:'4-3-3',minutes:5,diff:'pro',firstKick:m%2});window.__freeze=true;
        const me=swap?0:1;g.teams[me].ai=window.__D[dk];g.teams[1-me].ai=window.__D.pro;
        let n=0;while(g.state!=='fulltime'&&n<400){g.sim(1);if(g.state==='replay'||g.state==='halftime')g.sim(3);n++;}
        const s=g.score,st=g.stats;gf+=s[me];ga+=s[1-me];sf+=st.shots[me];sa+=st.shots[1-me];if(s[me]>s[1-me])w++;else if(s[me]<s[1-me])l++;else d++;
      }
      out[dk]={record:w+'승 '+d+'무 '+l+'패',goals:gf+':'+ga,shots:sf+':'+sa};
    }
    return out;});
  console.log(JSON.stringify(r,null,1));
  console.log('ERRORS',errors.filter(e=>!e.includes('ERR_FAILED')).slice(0,10).join('\n'));
  await browser.close();
})();
