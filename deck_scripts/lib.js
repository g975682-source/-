const pptxgen = require('pptxgenjs');
const React = require('react');
const RDS = require('react-dom/server');
const sharp = require('sharp');
const fa = require('react-icons/fa');
const SK = require('fs').readdirSync('/root/.claude/skills/synced').map(d => `/root/.claude/skills/synced/${d}/pptx/scripts/apply_theme.js`).find(p => require('fs').existsSync(p));
const { applyTheme } = require(SK);

const THEME = {
  name: 'Morning Hands Summary',
  headFontFace: 'Malgun Gothic', bodyFontFace: 'Malgun Gothic',
  colors: { dk1: '1B1F3B', lt1: 'FFFFFF', dk2: '2E3566', lt2: 'EEF0F8', accent1: 'F4A259', accent2: '5B6ABF', accent3: '3E8E7E', accent4: 'E76F51', accent5: '8E9AAF', accent6: 'B8C0E0', hlink: '5B6ABF', folHlink: '8E9AAF' },
};
const H = THEME.colors;

function makePres(title, footer, titleSize) {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  pres.title = title; pres.author = '모닝핸즈 창업팀';
  const C = pres.SchemeColor;
  pres.defineSlideMaster({ title: 'TITLE', background: { color: H.dk1 }, objects: [
    { placeholder: { options: { name: 'title', type: 'title', x: 0.8, y: 2.0, w: 7.2, h: 2.0, fontSize: 50, bold: true, color: C.background1, valign: 'bottom', align: 'left', margin: 0 }, text: '' } },
    { placeholder: { options: { name: 'body', type: 'body', x: 0.8, y: 4.3, w: 7.2, h: 1.6, fontSize: 22, color: C.accent6, valign: 'top', align: 'left', margin: 0 }, text: '' } },
  ] });
  pres.defineSlideMaster({ title: 'CLOSE', background: { color: H.dk1 }, objects: [
    { placeholder: { options: { name: 'title', type: 'title', x: 0.8, y: 0.6, w: 11.7, h: 1.0, fontSize: 40, bold: true, color: C.background1, valign: 'middle', align: 'left', margin: 0 }, text: '' } },
  ] });
  pres.defineSlideMaster({ title: 'CONTENT', background: { color: H.lt1 },
    slideNumber: { x: 12.1, y: 7.02, w: 0.6, h: 0.3, fontSize: 11, color: C.accent5, align: 'right' },
    objects: [
      { placeholder: { options: { name: 'title', type: 'title', x: 0.6, y: 0.4, w: 10.9, h: 0.9, fontSize: titleSize || 30, bold: true, color: C.text1, valign: 'middle', align: 'left', margin: 0 }, text: '' } },
      { text: { text: footer, options: { x: 0.6, y: 7.02, w: 9, h: 0.3, fontSize: 11, color: C.accent5, margin: 0 } } },
    ] });
  return { pres, C };
}

const iconCache = {};
async function icon(name, hex) {
  const k = name + hex; if (iconCache[k]) return iconCache[k];
  const svg = RDS.renderToStaticMarkup(React.createElement(fa[name], { color: '#' + hex, size: 256 }));
  const buf = await sharp(Buffer.from(svg)).resize(256, 256).png().toBuffer();
  return (iconCache[k] = 'image/png;base64,' + buf.toString('base64'));
}

function helpers(pres, C) {
  const card = (s, x, y, w, h, nm, fill) => { const f = fill || C.background2; s.addShape(pres.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.12, fill: { color: f }, line: { color: f, width: 0.5 }, objectName: nm }); };
  const tx = (s, text, x, y, w, h, o, nm) => s.addText(text, Object.assign({ x, y, w, h, margin: 0, isTextBox: true, valign: 'top', color: C.text1, fontSize: 16, objectName: nm || 'text' }, o || {}));
  const iconCircle = async (s, name, x, y, d, fill, hex, nm) => {
    s.addShape(pres.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: fill }, line: { color: fill, width: 0.5 }, objectName: nm + ' 원' });
    const p = d * 0.5;
    s.addImage({ data: await icon(name, hex), x: x + (d - p) / 2, y: y + (d - p) / 2, w: p, h: p, altText: nm, objectName: nm + ' 아이콘' });
  };
  const tag = (s, kind, x, y) => {
    const m = { '사실': [C.accent3, C.background1], '추정': [C.accent1, C.text1], '가정': [C.accent2, C.background1] }[kind];
    s.addShape(pres.ShapeType.roundRect, { x, y, w: 0.85, h: 0.36, rectRadius: 0.18, fill: { color: m[0] }, line: { color: m[0], width: 0.5 }, objectName: `${kind} 표시 배경` });
    tx(s, kind, x, y, 0.85, 0.36, { fontSize: 14, bold: true, color: m[1], align: 'center', valign: 'middle' }, `${kind} 표시`);
  };
  const th = (t, o) => ({ text: t, options: Object.assign({ bold: true, color: C.background1, fill: { color: C.text2 }, fontSize: 14, valign: 'middle' }, o || {}) });
  const td = (t, o) => ({ text: t, options: Object.assign({ color: C.text1, fontSize: 14, valign: 'middle' }, o || {}) });
  const border = { type: 'solid', pt: 0.75, color: 'DDE1EE' };
  return { card, tx, iconCircle, tag, th, td, border };
}

module.exports = { THEME, H, makePres, helpers, icon, applyTheme };
