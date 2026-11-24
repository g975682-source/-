const fs = require('fs');
const { ML, CW, MR, NAVY, HAIR, CREAM, ORANGE, ORANGE_TX, GRAY, MUTE } = require('./doc');
const REPL = [
  ['베개 옆에서 부드러운 실리콘 손이 나와 어깨를 톡톡 칩니다', '평소 베개 옆면 수납부에 접혀 있던 로봇팔이 관절 두 개로 펼쳐지고, 끝의 푹신한 손 모양 패드가 쿠션을 가볍게 두드립니다'],
  ['시각이 되면 베개 옆면에서 부드러운 실리콘 손이 나와 어깨를 톡톡', '알람이 울리면 접혀 있던 팔이 펼쳐져 손 모양 패드가 쿠션을 톡톡'],
  ['부드러운 실리콘 손이 어깨를 쳐요', '접힌 팔이 펼쳐져 손 패드가 쿠션을 톡톡 쳐요'],
  ['머리를 떼면 압력 센서가 알아채고 손이 들어갑니다', '머리를 떼면 압력 센서가 알아채고 팔이 다시 접혀 들어갑니다'],
  ['일어나서 머리를 베개에서 떼면 압력 센서가 알아채고 손이 들어갑니다', '일어나서 머리를 베개에서 떼면 압력 센서가 알아채고 팔이 다시 접혀 들어갑니다'],
  ['일어나 머리를 떼면 압력 센서가 감지해 손이 들어감', '일어나 머리를 떼면 압력 센서가 감지해 팔이 다시 접힘'],
  ['그림에서 파란 선이 0을 지나는 점이 2만 대입니다', '그림에서 막대가 0이 되는 지점이 2만 대입니다'],
  ['모닝핸즈', '모닝펀치'], ['Morning Hands', 'Morning Punch'],
];
const fix = v => {
  if (typeof v === 'string') { REPL.forEach(([a, b]) => { v = v.split(a).join(b); }); return v; }
  if (Array.isArray(v)) return v.map(fix);
  if (v && typeof v === 'object') { const o = {}; for (const k in v) o[k] = fix(v[k]); return o; }
  return v;
};
const CJ = fix(JSON.parse(fs.readFileSync(__dirname + '/content.json', 'utf8')));
const SRC = JSON.parse(fs.readFileSync(__dirname + '/sources.json', 'utf8'));
const g = (k, i) => n => { const t = CJ[k][i].shapes[n]; if (t === undefined) throw new Error(`no shape ${k}${i} ${n}`); return t; };
const notes = (k, i) => CJ[k][i].notes;
const tbl = (k, i, n) => CJ[k][i].tables[n || 0];
const link = u => /[^\x00-\x7F]/.test(u) ? encodeURI(u) : u;

// two-column numbered source list with hyperlinks
function sourceList(d, s, list, { y, fs: fsz, gap, colW, extra }) {
  const half = Math.ceil(list.length / 2);
  [list.slice(0, half), list.slice(half)].forEach((col, ci) => {
    const off = ci * half;
    const runs = [];
    col.forEach(([n, u], i) => {
      runs.push({ text: String(off + i + 1).padStart(2, ' ') + '   ', options: { color: d.C.accent2, bold: true } });
      runs.push({ text: n, options: { hyperlink: { url: link(u) }, breakLine: i < col.length - 1 } });
    });
    d.tx(s, runs, ML + ci * (colW + 0.3), y || 2.05, colW, 4.6, { fontSize: fsz || 10, paraSpaceAfter: gap === undefined ? 5 : gap }, `출처 목록 ${ci + 1}`);
  });
  if (extra) d.tx(s, extra, ML, 6.55, CW, 0.3, { fontSize: 9.5, color: d.C.text2 }, '출처 각주');
}

// simple stacked paragraphs
const paras = (items, o) => items.map((t, i) => ({ text: t, options: Object.assign({ breakLine: i < items.length - 1 }, o || {}) }));

module.exports = { CJ, SRC, g, notes, tbl, sourceList, paras, link, fix };
