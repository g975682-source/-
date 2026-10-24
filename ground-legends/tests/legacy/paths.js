// Where the legacy tests find their tools. Each can be set from the environment; the defaults work in the
// session that wrote these tests and in a checkout with `npm install` run in ground-legends/tests.
//   PLAYWRIGHT  the playwright module          THREE_JS  three r128 build/three.min.js
//   GAME        the game page (harness tests)  TEST_OUT  where screenshots go (TEST_OUT/shots)
const path=require('path'),fs=require('fs');
const first=(...c)=>c.find(f=>f&&fs.existsSync(f));
const LEGACY=__dirname,TESTS=path.join(LEGACY,'..'),REPO=path.join(TESTS,'..','..');
function playwright(){
  if(process.env.PLAYWRIGHT)return process.env.PLAYWRIGHT;
  const orig=first('/opt/node22/lib/node_modules/playwright');if(orig)return orig;   // the copy these tests were written against
  try{return require.resolve('playwright',{paths:[LEGACY,TESTS]});}catch(e){}
  return 'playwright';
}
const THREE_JS=first(process.env.THREE_JS,path.join(TESTS,'node_modules/three/build/three.min.js'),
  '/tmp/claude-0/-home-user--/0b5a4a37-18af-51a6-8f0e-f8efcca46872/scratchpad/deps/node_modules/three/build/three.min.js');
if(!THREE_JS)throw new Error('three r128 three.min.js not found: run `npm install` in ground-legends/tests or set THREE_JS');
const OUT=process.env.TEST_OUT||path.join(LEGACY,'out');
fs.mkdirSync(path.join(OUT,'shots'),{recursive:true});
module.exports={PLAYWRIGHT:playwright(),THREE_JS,OUT,MOCKROOM:path.join(LEGACY,'mockroom.js'),
  GAME_DEFAULT:path.join(TESTS,'..','index.html'),DOCS:path.join(REPO,'docs','index.html')};
