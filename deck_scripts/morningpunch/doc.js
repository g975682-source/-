// Shared design system for the 모닝펀치 report decks.
const fs = require('fs');
const pptxgen = require('pptxgenjs');
const SKILL = fs.readdirSync('/root/.claude/skills/synced').map(d => `/root/.claude/skills/synced/${d}/pptx/scripts/apply_theme.js`).find(p => fs.existsSync(p));
const { applyTheme } = require(SKILL);

// ---- palette (brand: deep navy / orange / soft cream), restrained use
const NAVY = '161F37', GRAY = '5B6275', MUTE = '8A90A0', HAIR = 'D9D5CC', TRACK = 'ECE8DF', CREAM = 'F6F3EC', ORANGE = 'FF7542', ORANGE_TX = 'C8431A', GREEN = '2A8F7B', SKY = 'B9C0D4';
const THEME = {
  name: '모닝펀치 보고서',
  headFontFace: 'Malgun Gothic', bodyFontFace: 'Malgun Gothic',
  colors: { dk1: NAVY, lt1: 'FFFFFF', dk2: GRAY, lt2: CREAM, accent1: ORANGE, accent2: ORANGE_TX, accent3: GREEN, accent4: MUTE, accent5: HAIR, accent6: SKY, hlink: '2F4C80', folHlink: MUTE },
};
const ML = 0.8, CW = 11.733, MR = ML + CW; // margins

function createDoc({ file, docName, title }) {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  pres.title = title; pres.author = '모닝펀치 창업팀';
  const C = pres.SchemeColor;
  const footer = `모닝펀치  |  ${docName}`;

  pres.defineSlideMaster({ title: 'COVER', background: { color: NAVY }, objects: [
    { placeholder: { options: { name: 'label', type: 'body', x: ML, y: 1.7, w: 7, h: 0.35, fontSize: 12, bold: true, color: C.accent1, charSpacing: 3, margin: 0, valign: 'top' }, text: '' } },
    { placeholder: { options: { name: 'title', type: 'title', x: ML, y: 2.2, w: 7.2, h: 1.9, fontSize: 46, bold: true, color: C.background1, valign: 'top', align: 'left', margin: 0 }, text: '' } },
    { placeholder: { options: { name: 'lead', type: 'body', x: ML, y: 4.3, w: 6.8, h: 1.1, fontSize: 18, color: C.accent6, valign: 'top', margin: 0 }, text: '' } },
  ] });
  pres.defineSlideMaster({ title: 'DIVIDER', background: { color: NAVY }, objects: [
    { placeholder: { options: { name: 'label', type: 'body', x: ML, y: 2.55, w: 3, h: 0.9, fontSize: 40, bold: true, color: C.accent1, margin: 0, valign: 'top' }, text: '' } },
    { placeholder: { options: { name: 'title', type: 'title', x: ML, y: 3.5, w: 10.5, h: 0.9, fontSize: 36, bold: true, color: C.background1, valign: 'top', align: 'left', margin: 0 }, text: '' } },
    { placeholder: { options: { name: 'lead', type: 'body', x: ML, y: 4.5, w: 9, h: 0.9, fontSize: 16, color: C.accent6, valign: 'top', margin: 0 }, text: '' } },
  ] });
  pres.defineSlideMaster({ title: 'BODY', background: { color: 'FFFFFF' },
    slideNumber: { x: 11.9, y: 6.98, w: 0.63, h: 0.28, fontSize: 9, color: C.accent4, align: 'right', fontFace: 'Malgun Gothic' },
    objects: [
      { placeholder: { options: { name: 'label', type: 'body', x: ML, y: 0.5, w: 8, h: 0.28, fontSize: 10.5, bold: true, color: C.accent2, charSpacing: 2, margin: 0, valign: 'top' }, text: '' } },
      { placeholder: { options: { name: 'title', type: 'title', x: ML, y: 0.8, w: 10.6, h: 0.7, fontSize: 30, bold: true, color: C.text1, valign: 'top', align: 'left', margin: 0 }, text: '' } },
      { placeholder: { options: { name: 'lead', type: 'body', x: ML, y: 1.5, w: CW, h: 0.6, fontSize: 14.5, color: C.text2, margin: 0, valign: 'top' }, text: '' } },
      { text: { text: footer, options: { x: ML, y: 6.98, w: 8, h: 0.28, fontSize: 9, color: C.accent4, margin: 0 } } },
    ] });
  pres.defineSlideMaster({ title: 'CLOSING', background: { color: NAVY }, objects: [
    { placeholder: { options: { name: 'label', type: 'body', x: ML, y: 0.7, w: 8, h: 0.3, fontSize: 11, bold: true, color: C.accent1, charSpacing: 2, margin: 0, valign: 'top' }, text: '' } },
    { placeholder: { options: { name: 'title', type: 'title', x: ML, y: 1.05, w: 10.6, h: 0.9, fontSize: 34, bold: true, color: C.background1, valign: 'top', align: 'left', margin: 0 }, text: '' } },
  ] });

  const sectionsSeen = {};
  const sec = name => { if (!sectionsSeen[name]) { pres.addSection({ title: name }); sectionsSeen[name] = true; } };

  // ---------- slide factories
  const cover = ({ label, title, lead, meta, notes }) => {
    sec('표지');
    const s = pres.addSlide({ masterName: 'COVER', sectionTitle: '표지' });
    s.addText(label, { placeholder: 'label' }); s.addText(title, { placeholder: 'title' }); s.addText(lead, { placeholder: 'lead' });
    // brand motif: a single sun, partly off-canvas (echoes the design team's cover)
    s.addShape(pres.ShapeType.ellipse, { x: 8.6, y: 0.9, w: 5.6, h: 5.6, fill: { color: ORANGE }, line: { color: ORANGE, width: 0 }, objectName: '브랜드 원 바깥' });
    s.addShape(pres.ShapeType.ellipse, { x: 9.85, y: 2.15, w: 3.1, h: 3.1, fill: { color: 'FFCC5C' }, line: { color: 'FFCC5C', width: 0 }, objectName: '브랜드 원 안쪽' });
    s.addText(meta, { x: ML, y: 6.45, w: 7, h: 0.35, fontSize: 11, color: SKY, margin: 0, isTextBox: true, objectName: '표지 메타' });
    if (notes) s.addNotes(notes);
    return s;
  };
  const divider = ({ section, num, title, lead, notes }) => {
    sec(section);
    const s = pres.addSlide({ masterName: 'DIVIDER', sectionTitle: section });
    s.addText(num, { placeholder: 'label' }); s.addText(title, { placeholder: 'title' }); s.addText(lead || '', { placeholder: 'lead' });
    if (notes) s.addNotes(notes);
    return s;
  };
  const body = ({ section, label, title, lead, notes, tag }) => {
    sec(section);
    const s = pres.addSlide({ masterName: 'BODY', sectionTitle: section });
    s.addText(label || section, { placeholder: 'label' }); s.addText(title, { placeholder: 'title' }); s.addText(lead || '', { placeholder: 'lead' });
    if (notes) s.addNotes(notes);
    if (tag) addTag(s, tag);
    return s;
  };
  const closing = ({ section, label, title, notes }) => {
    sec(section);
    const s = pres.addSlide({ masterName: 'CLOSING', sectionTitle: section });
    s.addText(label, { placeholder: 'label' }); s.addText(title, { placeholder: 'title' });
    if (notes) s.addNotes(notes);
    return s;
  };

  // ---------- primitives
  const tx = (s, text, x, y, w, h, o, nm) => s.addText(text, Object.assign({ x, y, w, h, margin: 0, isTextBox: true, valign: 'top', color: C.text1, fontSize: 13, objectName: nm || '텍스트' }, o || {}));
  const rect = (s, x, y, w, h, fill, nm, line) => s.addShape(pres.ShapeType.rect, { x, y, w, h, fill: { color: fill }, line: { color: line || fill, width: line ? 0.75 : 0 }, objectName: nm || '도형' });
  const hair = (s, x, y, w, color, pt, nm) => s.addShape(pres.ShapeType.line, { x, y, w, h: 0, line: { color: color || HAIR, width: pt || 0.75 }, objectName: nm || '구분선' });
  const panel = (s, x, y, w, h, nm, dark) => rect(s, x, y, w, h, dark ? NAVY : CREAM, nm || '패널');

  function addTag(s, kind) {
    const col = { '사실': NAVY, '추정': ORANGE_TX, '가정': GRAY }[kind];
    s.addShape(pres.ShapeType.rect, { x: MR - 0.7, y: 0.5, w: 0.7, h: 0.28, fill: { color: 'FFFFFF' }, line: { color: col, width: 1 }, objectName: `${kind} 표시 틀` });
    s.addText(kind, { x: MR - 0.7, y: 0.5, w: 0.7, h: 0.28, fontSize: 10.5, bold: true, color: col, align: 'center', valign: 'middle', margin: 0, isTextBox: true, objectName: `${kind} 표시` });
  }
  const tagInline = (s, kind, x, y) => {
    const col = { '사실': NAVY, '추정': ORANGE_TX, '가정': GRAY }[kind];
    s.addShape(pres.ShapeType.rect, { x, y, w: 0.56, h: 0.24, fill: { color: 'FFFFFF' }, line: { color: col, width: 0.75 }, objectName: `${kind} 작은 표시 틀` });
    s.addText(kind, { x, y, w: 0.56, h: 0.24, fontSize: 9.5, bold: true, color: col, align: 'center', valign: 'middle', margin: 0, isTextBox: true, objectName: `${kind} 작은 표시` });
  };

  // stat: number + label + note (editorial, no card)
  const stat = (s, { x, y, w, num, label, note, numSize, numColor, noteH, dark }) => {
    tx(s, num, x, y, w, (numSize || 40) / 72 * 1.35, { fontSize: numSize || 40, bold: true, color: numColor || (dark ? C.background1 : C.text1), valign: 'top', fit: 'none' }, '큰 숫자');
    const ny = y + (numSize || 40) / 72 * 1.35 + 0.08;
    if (label) tx(s, label, x, ny, w, 0.34, { fontSize: 13.5, bold: true, color: dark ? C.background1 : C.text1 }, '숫자 라벨');
    if (note) tx(s, note, x, ny + (label ? 0.38 : 0), w, noteH || 1.0, { fontSize: 12, color: dark ? C.accent6 : C.text2 }, '숫자 설명');
  };

  // numbered row (index in muted numerals, title, description)
  const row = (s, { x, y, w, idx, title, desc, h, tcolor, titleSize, descSize, idxColor }) => {
    tx(s, idx, x, y, 0.55, 0.4, { fontSize: 15, bold: true, color: idxColor || C.accent2 }, '번호');
    tx(s, title, x + 0.6, y, w - 0.6, 0.34, { fontSize: titleSize || 14.5, bold: true, color: tcolor || C.text1 }, '항목 제목');
    if (desc) tx(s, desc, x + 0.6, y + 0.36, w - 0.6, (h || 0.9) - 0.4, { fontSize: descSize || 12, color: C.text2 }, '항목 설명');
  };

  // ---------- table (thin rules, no fills)
  const T = {
    h: (t, o) => ({ text: t, options: Object.assign({ bold: true, fontSize: 11.5, color: C.text2, valign: 'middle', border: [{ type: 'none' }, { type: 'none' }, { type: 'solid', pt: 1.25, color: NAVY }, { type: 'none' }] }, o || {}) }),
    c: (t, o) => ({ text: t, options: Object.assign({ fontSize: 12.5, color: C.text1, valign: 'middle', border: [{ type: 'none' }, { type: 'none' }, { type: 'solid', pt: 0.5, color: HAIR }, { type: 'none' }] }, o || {}) }),
  };
  const table = (s, rows, { x, y, w, colW, rowH, nm }) => s.addTable(rows, { x: x === undefined ? ML : x, y, w: w || CW, colW, rowH, objectName: nm || '표', fill: { color: 'FFFFFF' } });
  // build from array-of-arrays: first row header; opts: align per column, bold first col, emphasis rows
  const tableFrom = (s, data, { x, y, w, colW, rowH, align, boldFirst, emphRows, fontSize, nm, headSize, levelCol }) => {
    const rows = data.map((r, ri) => r.map((cell, ci) => {
      const al = (align && align[ci]) || 'left';
      if (ri === 0) return T.h(cell, { align: al, fontSize: headSize || 11.5 });
      const emph = emphRows && emphRows.includes(ri);
      const isLevel = levelCol === ci;
      return T.c(cell, { align: isLevel ? 'center' : al, bold: (boldFirst && ci === 0) || emph || isLevel, fontSize: fontSize || 12.5, color: isLevel && /낮음/.test(cell) ? C.accent2 : C.text1, fill: emph ? { color: CREAM } : undefined });
    }));
    return table(s, rows, { x, y, w, colW, rowH, nm });
  };

  // ---------- simple charts built from shapes (compatible with any viewer)
  const hbars = (s, items, { x, y, labelW, trackW, gap, barH, max, valFmt, highlight, labelSize, valSize }) => {
    items.forEach((it, i) => {
      const yy = y + i * (gap || 0.62);
      tx(s, it.label, x, yy - 0.06, labelW, 0.4, { fontSize: labelSize || 12.5, valign: 'middle', color: C.text1, bold: highlight === i }, `막대 이름 ${i + 1}`);
      rect(s, x + labelW, yy + 0.07, trackW, barH || 0.16, TRACK, `막대 배경 ${i + 1}`);
      const bw = Math.max(0.04, trackW * it.value / max);
      rect(s, x + labelW, yy + 0.07, bw, barH || 0.16, highlight === i ? ORANGE : NAVY, `막대 ${i + 1}`);
      tx(s, it.text || (valFmt ? valFmt(it.value) : String(it.value)), x + labelW + trackW + 0.15, yy - 0.06, 1.3, 0.4, { fontSize: valSize || 13, bold: true, valign: 'middle', color: highlight === i ? C.accent2 : C.text1 }, `막대 값 ${i + 1}`);
    });
  };
  const stacked = (s, parts, { x, y, w, h, labelSize, showLabels }) => {
    const total = parts.reduce((a, p) => a + p.v, 0); let cx = x;
    parts.forEach((p, i) => {
      const pw = w * p.v / total;
      rect(s, cx, y, pw, h, p.color, `구성 막대 ${i + 1}`, 'FFFFFF');
      if (showLabels !== false) tx(s, p.short || p.name, cx, y, pw, h, { fontSize: labelSize || 11, bold: true, color: p.dark ? C.text1 : C.background1, align: 'center', valign: 'middle' }, `구성 이름 ${i + 1}`);
      cx += pw;
    });
  };

  const finish = async () => { await pres.writeFile({ fileName: file }); await applyTheme(file, THEME); };
  return { pres, C, cover, divider, body, closing, tx, rect, hair, panel, stat, row, table, tableFrom, T, hbars, stacked, tagInline, addTag, finish, footer };
}

module.exports = { createDoc, THEME, NAVY, GRAY, MUTE, HAIR, TRACK, CREAM, ORANGE, ORANGE_TX, GREEN, SKY, ML, CW, MR };
