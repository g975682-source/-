// Shared design system for the 모닝펀치 report decks.
const fs = require('fs');
const pptxgen = require('pptxgenjs');
const SKILL = fs.readdirSync('/root/.claude/skills/synced').map(d => `/root/.claude/skills/synced/${d}/pptx/scripts/apply_theme.js`).find(p => fs.existsSync(p));
const { applyTheme } = require(SKILL);

// ---- palette: deep navy / bright blue on a pale blueprint board (legacy export names kept: ORANGE = accent blue)
const NAVY = '0A2A5E', GRAY = '566175', MUTE = '8795AB', HAIR = 'CBD3DF', TRACK = 'E3E8F0', CREAM = 'EDF0F5', ORANGE = '1E7FE0', ORANGE_TX = '1668C7', GREEN = '5E86C4', SKY = 'B5C6E3', RED = 'B3261E', LIGHTBLUE = '7DB7FF';
const FONT = 'Pretendard', FONT_HEAD = 'Pretendard ExtraBold';
const THEME = {
  name: '모닝펀치 보고서',
  headFontFace: FONT_HEAD, bodyFontFace: FONT,
  colors: { dk1: NAVY, lt1: 'FFFFFF', dk2: GRAY, lt2: CREAM, accent1: ORANGE, accent2: ORANGE_TX, accent3: RED, accent4: MUTE, accent5: HAIR, accent6: SKY, hlink: '1668C7', folHlink: MUTE },
};
const ML = 0.8, CW = 11.733, MR = ML + CW; // margins
const ASSET = __dirname + '/assets/';

function createDoc({ file, docName, title }) {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  pres.title = title; pres.author = '모닝펀치 창업팀';
  const C = pres.SchemeColor;
  const footer = `모닝펀치  |  ${docName}`;
  const H = (o) => Object.assign({ fontFace: FONT_HEAD, bold: false }, o);

  pres.defineSlideMaster({ title: 'COVER', background: { path: ASSET + 'bg_cover.png' }, objects: [
    { placeholder: { options: { name: 'label', type: 'body', x: ML, y: 1.62, w: 5, h: 0.3, fontSize: 12, bold: true, color: C.accent2, charSpacing: 3, margin: 0, valign: 'top' }, text: '' } },
    { placeholder: { options: H({ name: 'title', type: 'title', x: 1.15, y: 2.6, w: 4.4, h: 2.0, fontSize: 38, color: C.text1, valign: 'middle', align: 'left', margin: 0 }), text: '' } },
    { placeholder: { options: { name: 'lead', type: 'body', x: ML, y: 5.15, w: 5.1, h: 1.1, fontSize: 14, color: C.text2, valign: 'top', margin: 0 }, text: '' } },
  ] });
  pres.defineSlideMaster({ title: 'DIVIDER', background: { path: ASSET + 'bg_dark.png' }, objects: [
    { placeholder: { options: H({ name: 'label', type: 'body', x: ML, y: 2.5, w: 3, h: 0.9, fontSize: 44, color: C.accent1, margin: 0, valign: 'top' }), text: '' } },
    { placeholder: { options: H({ name: 'title', type: 'title', x: ML, y: 3.45, w: 10.5, h: 0.9, fontSize: 36, color: C.background1, valign: 'top', align: 'left', margin: 0 }), text: '' } },
    { placeholder: { options: { name: 'lead', type: 'body', x: ML, y: 4.5, w: 9, h: 0.9, fontSize: 16, color: C.accent6, valign: 'top', margin: 0 }, text: '' } },
  ] });
  pres.defineSlideMaster({ title: 'BODY', background: { path: ASSET + 'bg_body.png' },
    slideNumber: { x: 11.9, y: 7.02, w: 0.63, h: 0.28, fontSize: 9, color: C.accent4, align: 'right' },
    objects: [
      { placeholder: { options: { name: 'label', type: 'body', x: ML, y: 0.4, w: CW, h: 0.28, fontSize: 11, bold: true, color: C.accent2, charSpacing: 1, margin: 0, valign: 'top', align: 'center' }, text: '' } },
      { placeholder: { options: H({ name: 'title', type: 'title', x: ML, y: 0.68, w: CW, h: 0.6, fontSize: 28, color: C.text1, valign: 'top', align: 'center', margin: 0 }), text: '' } },
      { placeholder: { options: { name: 'lead', type: 'body', x: 1.4, y: 1.52, w: CW - 1.2, h: 0.55, fontSize: 13.5, color: C.text2, margin: 0, valign: 'top', align: 'center' }, text: '' } },
      { text: { text: footer, options: { x: ML, y: 7.02, w: 8, h: 0.28, fontSize: 9, color: C.accent4, margin: 0 } } },
    ] });
  pres.defineSlideMaster({ title: 'CLOSING', background: { path: ASSET + 'bg_dark.png' }, objects: [
    { placeholder: { options: { name: 'label', type: 'body', x: ML, y: 0.72, w: 8, h: 0.3, fontSize: 11, bold: true, color: C.accent6, charSpacing: 2, margin: 0, valign: 'top' }, text: '' } },
    { placeholder: { options: H({ name: 'title', type: 'title', x: ML, y: 1.05, w: 10.6, h: 0.9, fontSize: 34, color: C.background1, valign: 'top', align: 'left', margin: 0 }), text: '' } },
  ] });
  pres.defineSlideMaster({ title: 'CONTENTS', background: { path: ASSET + 'bg_body.png' }, objects: [] });

  const sectionsSeen = {};
  const sec = name => { if (!sectionsSeen[name]) { pres.addSection({ title: name }); sectionsSeen[name] = true; } };

  // ---------- primitives
  const tx = (s, text, x, y, w, h, o, nm) => {
    o = Object.assign({}, o || {});
    if (o.bold && (o.fontSize || 13) >= 26) { o.fontFace = FONT_HEAD; o.bold = false; } // heavy display weight for big numbers
    return s.addText(text, Object.assign({ x, y, w, h, margin: 0, isTextBox: true, valign: 'top', color: C.text1, fontSize: 13, objectName: nm || '텍스트' }, o));
  };
  const rect = (s, x, y, w, h, fill, nm, line) => s.addShape(pres.ShapeType.rect, { x, y, w, h, fill: { color: fill }, line: { color: line || fill, width: line ? 0.75 : 0 }, objectName: nm || '도형' });
  const hair = (s, x, y, w, color, pt, nm) => s.addShape(pres.ShapeType.line, { x, y, w, h: 0, line: { color: color || HAIR, width: pt || 0.75 }, objectName: nm || '구분선' });
  const sparkle = (s, x, y, size, color) => {
    s.addShape(pres.ShapeType.star4, { x, y, w: size, h: size, fill: { color }, line: { color, width: 0 }, objectName: '장식 별 1' });
    s.addShape(pres.ShapeType.star4, { x: x + size * 1.25, y: y + size * 0.45, w: size * 0.6, h: size * 0.6, fill: { color }, line: { color, width: 0 }, objectName: '장식 별 2' });
  };
  const panel = (s, x, y, w, h, nm, dark) => {
    s.addShape(pres.ShapeType.rect, { x, y, w, h, fill: { color: dark ? NAVY : CREAM }, line: { color: dark ? NAVY : HAIR, width: 0.75 }, objectName: nm || '패널' });
    if (dark) sparkle(s, x + w - 0.75, y + h / 2 - 0.11, 0.2, 'FFFFFF');
  };

  const TAGS = { '사실': { fill: NAVY, line: NAVY, text: 'FFFFFF' }, '추정': { fill: ORANGE, line: ORANGE, text: 'FFFFFF' }, '가정': { fill: 'FFFFFF', line: NAVY, text: NAVY } };
  function pill(s, kind, x, y, w, h, fs, nm) {
    const m = TAGS[kind];
    s.addShape(pres.ShapeType.roundRect, { x, y, w, h, rectRadius: h / 2, fill: { color: m.fill }, line: { color: m.line, width: 0.9 }, objectName: `${kind} ${nm}틀` });
    s.addText(kind, { x, y, w, h, fontSize: fs, bold: true, color: m.text, align: 'center', valign: 'middle', margin: 0, isTextBox: true, objectName: `${kind} ${nm}` });
  }
  const addTag = (s, kind) => pill(s, kind, MR - 0.72, 0.42, 0.72, 0.28, 10.5, '표시');
  const tagInline = (s, kind, x, y) => pill(s, kind, x, y, 0.58, 0.24, 9.5, '작은 표시');

  // ---------- slide factories
  const cover = ({ label, title, lead, meta, notes }) => {
    sec('표지');
    const s = pres.addSlide({ masterName: 'COVER', sectionTitle: '표지' });
    s.addText(label, { placeholder: 'label' }); s.addText(title, { placeholder: 'title' }); s.addText(lead, { placeholder: 'lead' });
    // dashed-handle frame around the title
    s.addShape(pres.ShapeType.rect, { x: 0.8, y: 2.3, w: 4.9, h: 2.55, fill: { color: 'FFFFFF', transparency: 100 }, line: { color: NAVY, width: 1 }, objectName: '제목 틀' });
    [[0.8, 2.3], [5.7, 2.3], [0.8, 4.85], [5.7, 4.85]].forEach((p, i) => s.addShape(pres.ShapeType.rect, { x: p[0] - 0.05, y: p[1] - 0.05, w: 0.1, h: 0.1, fill: { color: NAVY }, line: { color: NAVY, width: 0 }, objectName: `틀 모서리 ${i + 1}` }));
    // circular illustration
    s.addShape(pres.ShapeType.ellipse, { x: 6.95, y: 1.25, w: 5.0, h: 5.0, fill: { color: 'FFFFFF', transparency: 100 }, line: { color: NAVY, width: 1 }, objectName: '원형 테두리' });
    s.addImage({ path: ASSET + 'illus.png', x: 7.35, y: 1.65, w: 4.2, h: 4.2, rounding: true, altText: '접힌 로봇팔이 펼쳐져 손 모양 패드로 베개 쿠션을 두드리는 그림', objectName: '제품 그림' });
    sparkle(s, 11.55, 6.05, 0.2, NAVY);
    s.addText('MORNING PUNCH  BUSINESS PLAN', { x: 10.5, y: 3.5, w: 4.2, h: 0.25, fontSize: 8, color: MUTE, charSpacing: 4, rotate: 90, margin: 0, isTextBox: true, align: 'center', objectName: '세로 문구' });
    s.addText(meta, { x: ML, y: 6.85, w: 8, h: 0.3, fontSize: 10.5, color: MUTE, margin: 0, isTextBox: true, objectName: '표지 메타' });
    if (notes) s.addNotes(notes);
    return s;
  };
  const divider = ({ section, num, title, lead, notes }) => {
    sec(section);
    const s = pres.addSlide({ masterName: 'DIVIDER', sectionTitle: section });
    s.addText(num, { placeholder: 'label' }); s.addText(title, { placeholder: 'title' }); s.addText(lead || '', { placeholder: 'lead' });
    sparkle(s, 11.7, 6.15, 0.22, LIGHTBLUE);
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
    sparkle(s, 11.7, 0.85, 0.22, LIGHTBLUE);
    if (notes) s.addNotes(notes);
    return s;
  };
  // contents page in the reference style: navy index panel on the left, descriptions on the right
  const contents = ({ section, items, notes }) => {
    sec(section);
    const s = pres.addSlide({ masterName: 'CONTENTS', sectionTitle: section });
    s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 5.0, h: 7.5, fill: { color: NAVY }, line: { color: NAVY, width: 0 }, objectName: '목차 패널' });
    s.addText('CONTENTS', { x: 0.9, y: 0.85, w: 3.8, h: 0.6, fontFace: FONT_HEAD, fontSize: 30, color: 'FFFFFF', margin: 0, isTextBox: true, objectName: '목차 제목' });
    const n = items.length, y0 = 2.1, gap = Math.min(0.95, 4.9 / n);
    items.forEach((it, i) => {
      const y = y0 + i * gap;
      s.addText(it[0], { x: 0.9, y, w: 0.9, h: 0.45, fontSize: 15, bold: true, color: LIGHTBLUE, margin: 0, isTextBox: true, valign: 'middle', objectName: '목차 번호' });
      s.addShape(pres.ShapeType.star4, { x: 1.85, y: y + 0.14, w: 0.17, h: 0.17, fill: { color: LIGHTBLUE }, line: { color: LIGHTBLUE, width: 0 }, objectName: '목차 별' });
      s.addText(it[1], { x: 2.25, y, w: 2.6, h: 0.45, fontSize: 17, bold: true, color: 'FFFFFF', margin: 0, isTextBox: true, valign: 'middle', objectName: '목차 항목' });
      s.addShape(pres.ShapeType.line, { x: 5.9, y: y - 0.1, w: 6.6, h: 0, line: { color: i === 0 ? NAVY : HAIR, width: i === 0 ? 1.25 : 0.5 }, objectName: '목차 구분선' });
      s.addText(it[2], { x: 5.9, y, w: 6.6, h: 0.45, fontSize: 13, color: GRAY, margin: 0, isTextBox: true, valign: 'middle', objectName: '목차 설명' });
    });
    s.addShape(pres.ShapeType.line, { x: 5.9, y: y0 + n * gap - 0.1, w: 6.6, h: 0, line: { color: HAIR, width: 0.5 }, objectName: '목차 구분선' });
    if (notes) s.addNotes(notes);
    return s;
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
    h: (t, o) => ({ text: t, options: Object.assign({ bold: true, fontSize: 11.5, color: C.text2, valign: 'middle', border: [{ type: 'none' }, { type: 'none' }, { type: 'solid', pt: 1.5, color: NAVY }, { type: 'none' }] }, o || {}) }),
    c: (t, o) => ({ text: t, options: Object.assign({ fontSize: 12.5, color: C.text1, valign: 'middle', border: [{ type: 'none' }, { type: 'none' }, { type: 'solid', pt: 0.5, color: HAIR }, { type: 'none' }] }, o || {}) }),
  };
  const table = (s, rows, { x, y, w, colW, rowH, nm }) => s.addTable(rows, { x: x === undefined ? ML : x, y, w: w || CW, colW, rowH, objectName: nm || '표', fill: { color: 'FFFFFF', transparency: 100 } });
  const tableFrom = (s, data, { x, y, w, colW, rowH, align, boldFirst, emphRows, fontSize, nm, headSize, levelCol }) => {
    const rows = data.map((r, ri) => r.map((cell, ci) => {
      const al = (align && align[ci]) || 'left';
      if (ri === 0) return T.h(cell, { align: al, fontSize: headSize || 11.5 });
      const emph = emphRows && emphRows.includes(ri);
      const isLevel = levelCol === ci;
      return T.c(cell, { align: isLevel ? 'center' : al, bold: (boldFirst && ci === 0) || emph || isLevel, fontSize: fontSize || 12.5, color: isLevel && /낮음/.test(cell) ? C.accent3 : C.text1, fill: emph ? { color: CREAM } : undefined });
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
  return { pres, C, cover, divider, body, closing, contents, tx, rect, hair, panel, sparkle, stat, row, table, tableFrom, T, hbars, stacked, tagInline, addTag, finish, footer };
}

module.exports = { createDoc, THEME, NAVY, GRAY, MUTE, HAIR, TRACK, CREAM, ORANGE, ORANGE_TX, GREEN, SKY, RED, LIGHTBLUE, ML, CW, MR };
