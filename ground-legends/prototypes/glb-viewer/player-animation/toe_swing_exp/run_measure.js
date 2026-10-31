// Runs ../measure_kick_ground.js unchanged against another copy of index.html and writes its measure.json somewhere
// else, so the earlier result (out/kick_ground/measure.json) is not overwritten. Only the two file paths are
// redirected; the measurement itself is the original script's.
//   node run_measure.js <index.html to measure> <output json>
const fs=require('fs'),path=require('path');
const [src,out]=process.argv.slice(2).map(p=>path.resolve(p));
if(!src||!out){console.error('usage: node run_measure.js <index.html> <out.json>');process.exit(2);}
const ORIG=path.join(__dirname,'..','measure_kick_ground.js');
const GAME=path.resolve(__dirname,'..','..','..','..','index.html'),OLD=path.resolve(__dirname,'..','out','kick_ground','measure.json');
const rd=fs.readFileSync,wr=fs.writeFileSync;
fs.readFileSync=function(p,...a){return rd.call(fs,path.resolve(String(p))===GAME?src:p,...a);};
fs.writeFileSync=function(p,...a){const q=path.resolve(String(p));if(q===OLD)return wr.call(fs,out,...a);if(q.endsWith('.json'))throw new Error('unexpected write '+q);return wr.call(fs,p,...a);};
console.log('measuring',path.relative(process.cwd(),src),'->',path.relative(process.cwd(),out));
require(ORIG);
