const { createDoc, NAVY, GRAY, MUTE, HAIR, TRACK, CREAM, ORANGE, ORANGE_TX, GREEN, SKY, ML, CW, MR } = require('./doc');
const { g, notes, tbl, SRC, sourceList, paras } = require('./parts');
const d = createDoc({ file: '/home/user/-/MorningPunch_Research_Summary.pptx', docName: '조사 정리 보고서', title: '모닝펀치 조사 정리 보고서' });
const { C, tx, rect, hair, panel, stat, row, hbars, stacked, tagInline, tableFrom } = d;
const N = i => notes('R', i);
const strip = t => t.replace(/^\d+\.\s*/, '');

(async () => {
  // 1 cover
  d.cover({ label: 'MORNING PUNCH', title: [{ text: '모닝펀치', options: { color: C.accent1, breakLine: true } }, { text: '조사 정리 보고서', options: {  } }], lead: '경쟁 제품 · 시장 · 비용 · 매출 전망 · 사회 환원\n지금까지 조사한 내용의 정리', meta: '가상 창업 시나리오  ·  조사 요약', notes: N(1) });

  // 2 how to read
  let G = g('R', 2), s = d.body({ section: '개요', label: '00  읽는 법', title: '이 자료를 읽는 법', lead: '모든 숫자에 확인 정도를 표시했습니다. 표시를 먼저 보면 어느 숫자를 믿을 수 있는지 알 수 있습니다.', notes: N(2) });
  [['사실', G('표시 설명 1'), G('표시 예 1')], ['추정', G('표시 설명 2'), G('표시 예 2')], ['가정', G('표시 설명 3'), G('표시 예 3')]].forEach((r, i) => {
    const y = 2.4 + i * 0.82;
    hair(s, ML, y, CW, i === 0 ? NAVY : HAIR, i === 0 ? 1.25 : 0.5);
    tagInline(s, r[0], ML, y + 0.28);
    tx(s, r[1], ML + 0.95, y + 0.2, 3.4, 0.42, { fontSize: 16, bold: true, valign: 'middle' }, '표시 설명');
    tx(s, r[2], ML + 4.6, y + 0.2, 7.0, 0.42, { fontSize: 13, color: C.text2, valign: 'middle' }, '표시 예');
  });
  hair(s, ML, 2.4 + 3 * 0.82, CW, HAIR, 0.5);
  tx(s, '신뢰도 기준', ML, 5.2, 3, 0.3, { fontSize: 11, bold: true, color: C.accent2 }, '신뢰도 제목');
  G('신뢰도 기준 내용').split(/\n| \/ /).forEach((t, i) => {
    const [a, b] = t.split(': ');
    tx(s, a, ML + i * 3.95, 5.55, 1, 0.3, { fontSize: 14, bold: true, color: a === '낮음' ? C.accent2 : C.text1 }, '신뢰도 등급');
    tx(s, b, ML + i * 3.95, 5.88, 3.6, 0.6, { fontSize: 12, color: C.text2 }, '신뢰도 설명');
  });
  tx(s, G('조사 방법') + '\n' + G('개요 각주'), ML, 6.45, CW, 0.45, { fontSize: 10, color: C.text2 }, '조사 방법');

  // 3 key results
  G = g('R', 3); s = d.body({ section: '개요', label: '00  요약', title: '한눈에 보는 핵심 결과', lead: '여섯 가지 숫자로 정리한 조사 결과입니다. 각 숫자 위에 확인 정도를 표시했습니다.', notes: N(3) });
  const kinds = ['사실', '추정', '사실', '가정', '추정', '가정'];
  for (let i = 0; i < 6; i++) {
    const col = i % 3, rw = Math.floor(i / 3), x = ML + col * 3.98, y = 2.3 + rw * 2.3;
    hair(s, x, y, 3.6, i < 3 ? NAVY : HAIR, i < 3 ? 1.25 : 0.5);
    tagInline(s, kinds[i], x, y + 0.18);
    tx(s, G(`핵심 숫자 ${i + 1}`), x, y + 0.5, 3.6, 0.6, { fontSize: 28, bold: true, valign: 'middle', color: i === 5 ? C.accent2 : C.text1 }, '핵심 숫자');
    tx(s, G(`핵심 라벨 ${i + 1}`), x, y + 1.12, 3.6, 0.3, { fontSize: 13, bold: true }, '핵심 라벨');
    tx(s, G(`핵심 설명 ${i + 1}`), x, y + 1.45, 3.6, 0.75, { fontSize: 10.5, color: C.text2 }, '핵심 설명');
  }

  // 4 problem evidence
  G = g('R', 4); s = d.body({ section: '경쟁·시장', label: '01  문제', title: '늦잠은 정말 흔한 문제일까', lead: '알람을 미루는 일은 해외 두 곳의 조사와 한국의 2011년 설문에서 확인됩니다.', tag: '사실', notes: N(4) });
  for (let i = 1; i <= 3; i++) {
    const x = ML + (i - 1) * 3.98;
    hair(s, x, 2.3, 3.6, i === 1 ? NAVY : NAVY, 1.25);
    tx(s, G(`근거 숫자 ${i}`), x, 2.45, 3.6, 1.0, { fontSize: 56, bold: true, valign: 'middle' }, '근거 숫자');
    tx(s, G(`근거 출처 ${i}`), x, 3.55, 3.6, 0.35, { fontSize: 13, bold: true, color: C.accent2 }, '근거 출처');
    tx(s, G(`근거 설명 ${i}`), x, 3.95, 3.6, 1.0, { fontSize: 12, color: C.text2 }, '근거 설명');
  }
  panel(s, ML, 5.3, CW, 1.3, '주의 패널');
  tx(s, '해석 시 주의', ML + 0.4, 5.42, 3, 0.3, { fontSize: 11, bold: true, color: C.accent2 }, '주의 제목');
  tx(s, G('근거 주의').replace(/^주의:\s*/, ''), ML + 0.4, 5.75, CW - 0.8, 0.8, { fontSize: 12, color: C.text1 }, '주의 내용');

  // 5 competitors
  G = g('R', 5); s = d.body({ section: '경쟁·시장', label: '01  경쟁', title: '비슷한 제품은 무엇이 있나', lead: G('경쟁 결론'), tag: '사실', notes: N(5) });
  tableFrom(s, tbl('R', 5), { x: ML, y: 2.35, w: CW, colW: [2.15, 2.35, 2.25, 3.9, 1.083], rowH: 0.58, boldFirst: true, levelCol: 4, fontSize: 11.5, headSize: 11 });

  // 6 revenue
  G = g('R', 6); s = d.body({ section: '경쟁·시장', label: '01  매출', title: '경쟁 제품은 1년에 얼마나 팔았나', lead: 'Clocky는 판매량으로 직접 계산했고, Hatch는 언론 보도를 그대로 인용했습니다.', tag: '추정', notes: N(6) });
  [[G('Clocky 이름'), G('Clocky 숫자'), G('Clocky 설명')], [G('Hatch 이름'), G('Hatch 숫자'), G('Hatch 설명')]].forEach((c, i) => {
    const x = ML + i * 6.1;
    hair(s, x, 2.3, 5.6, NAVY, 1.25);
    tx(s, c[0], x, 2.45, 5.6, 0.32, { fontSize: 13, bold: true, color: C.accent2 }, '경쟁 이름');
    tx(s, c[1], x, 2.8, 5.6, 0.8, { fontSize: 34, bold: true, valign: 'middle' }, '경쟁 숫자');
    tx(s, c[2], x, 3.7, 5.6, 0.9, { fontSize: 12, color: C.text2 }, '경쟁 설명');
  });
  tx(s, 'Clocky 계산 따라가기', ML, 4.75, 4, 0.3, { fontSize: 11, bold: true, color: C.accent2 }, '계산 제목');
  hair(s, ML, 5.1, CW, NAVY, 1.25);
  for (let i = 1; i <= 5; i++) {
    const x = ML + (i - 1) * 2.35;
    tx(s, G(`계산 이름 ${i}`), x, 5.2, 2.2, 0.3, { fontSize: 11, bold: true, color: C.text2 }, '계산 이름');
    tx(s, G(`계산 내용 ${i}`), x, 5.5, 2.15, 0.7, { fontSize: 12, bold: true }, '계산 내용');
  }
  tx(s, G('매출 각주'), ML, 6.3, CW, 0.55, { fontSize: 10, color: C.text2 }, '매출 각주');

  // 7 market
  G = g('R', 7); s = d.body({ section: '경쟁·시장', label: '01  시장', title: '시장 규모는 어디까지 알 수 있나', lead: '해외 전망 두 건은 참고용이고, 국내 자료는 통계청 제조 출하액 한 가지입니다.', notes: N(7) });
  for (let i = 1; i <= 3; i++) {
    const x = ML + (i - 1) * 3.98;
    hair(s, x, 2.3, 3.6, NAVY, 1.25);
    tx(s, G(`시장 신뢰도 ${i}`), x, 2.42, 3.6, 0.3, { fontSize: 11, bold: true, color: /낮음/.test(G(`시장 신뢰도 ${i}`)) ? C.accent2 : C.text1 }, '시장 신뢰도');
    tx(s, G(`시장 숫자 ${i}`), x, 2.8, 3.6, 0.8, { fontSize: i === 1 ? 25 : 30, bold: true, valign: 'middle' }, '시장 숫자');
    tx(s, G(`시장 라벨 ${i}`), x, 3.7, 3.6, 0.32, { fontSize: 13.5, bold: true }, '시장 라벨');
    tx(s, G(`시장 설명 ${i}`), x, 4.05, 3.6, 0.9, { fontSize: 11.5, color: C.text2 }, '시장 설명');
  }
  panel(s, ML, 5.25, CW, 1.4, '해석 패널');
  tx(s, G('시장 해석'), ML + 0.4, 5.25, CW - 0.8, 1.4, { fontSize: 12.5, valign: 'middle' }, '시장 해석');

  // 8 unit economics
  G = g('R', 8); s = d.body({ section: '손익', label: '02  1대당 손익', title: '1대 팔면 얼마가 남나', lead: '소비자가 99,000원에서 부가세를 빼고, 만드는 비용과 파는 비용을 빼면 17,500원이 남습니다.', tag: '가정', notes: N(8) });
  tableFrom(s, tbl('R', 8), { x: ML, y: 2.2, w: 6.9, colW: [3.5, 1.7, 1.7], rowH: 0.355, align: ['left', 'right', 'right'], emphRows: [6, 11], fontSize: 11.5, headSize: 10.5 });
  [[1, 2.25], [2, 3.35], [3, 4.45]].forEach(([i, y]) => {
    hair(s, 8.35, y, 4.18, i === 3 ? ORANGE : HAIR, i === 3 ? 1.25 : 0.5);
    tx(s, G(`핵심 숫자 ${i}`), 8.35, y + 0.12, 4.18, 0.55, { fontSize: 28, bold: true, valign: 'middle', color: i === 3 ? C.accent2 : C.text1 }, '핵심 숫자');
    tx(s, G(`핵심 설명 ${i}`), 8.35, y + 0.7, 4.18, 0.35, { fontSize: 11, color: C.text2 }, '핵심 설명');
  });
  tx(s, G('손익 각주'), 8.35, 5.65, 4.18, 0.8, { fontSize: 10, color: C.text2 }, '손익 각주');

  // 9 cost evidence
  G = g('R', 9); s = d.body({ section: '손익', label: '02  비용 근거', title: '비용 숫자는 어디에서 왔나', lead: '수수료와 인증비는 공식 자료에서 가져왔고, 부품 원가와 보험료는 아직 확정하지 못했습니다.', notes: N(9) });
  for (let i = 1; i <= 4; i++) {
    const x = ML + ((i - 1) % 2) * 6.1, y = 2.3 + Math.floor((i - 1) / 2) * 2.2;
    const title = G(`비용 제목 ${i}`), nm = title.replace(/\s*\(.*\)/, ''), kind = /\((사실|추정)\)/.exec(title);
    hair(s, x, y, 5.6, NAVY, 1.25);
    tx(s, nm, x, y + 0.18, 3.8, 0.4, { fontSize: 16, bold: true }, '비용 제목');
    if (kind) tagInline(s, kind[1], x + 5.04, y + 0.25); else tagInline(s, '가정', x + 5.04, y + 0.25);
    tx(s, G(`비용 설명 ${i}`), x, y + 0.65, 5.6, 1.45, { fontSize: 11.5, color: C.text2 }, '비용 설명');
  }

  // 10 projection
  G = g('R', 10); s = d.body({ section: '손익', label: '02  전망', title: '3년 매출과 이익 예상', lead: '1년차는 적자이고 2년차부터 흑자로 돌아서는 계획입니다. 판매 대수는 모두 우리가 정한 가정입니다.', tag: '가정', notes: N(10) });
  tableFrom(s, tbl('R', 10, 0), { x: ML, y: 2.2, w: 6.9, colW: [2.7, 1.4, 1.4, 1.4], rowH: 0.4, align: ['left', 'right', 'right', 'right'], emphRows: [7], fontSize: 12, headSize: 10.5 });
  tx(s, '1년차 시나리오', 8.35, 2.2, 4.18, 0.3, { fontSize: 11, bold: true, color: C.accent2 }, '시나리오 제목');
  tableFrom(s, tbl('R', 10, 1), { x: 8.35, y: 2.55, w: 4.18, colW: [1.0, 1.3, 1.88], rowH: 0.36, align: ['left', 'right', 'right'], fontSize: 11.5, headSize: 10.5 });
  tx(s, G('민감도 제목'), 8.35, 4.2, 4.18, 0.3, { fontSize: 11, bold: true, color: C.accent2 }, '민감도 제목');
  tx(s, paras(G('민감도 내용').split(/\n| \/ /), { }), 8.35, 4.52, 4.18, 0.85, { fontSize: 11.5, paraSpaceAfter: 3 }, '민감도 내용');
  tx(s, G('매출 각주'), ML, 5.95, CW, 0.7, { fontSize: 10.5, color: C.text2 }, '매출 각주');

  // 11 donation
  G = g('R', 11); s = d.body({ section: '사회 환원', label: '03  사회 환원', title: '기업은 얼마나 기부할까', lead: '매출 대비 기부 비율을 기준으로 우리 제안은 매출의 0.5%입니다.', tag: '사실', notes: N(11) });
  tx(s, G('벤치마크 제목'), ML, 2.25, 6, 0.3, { fontSize: 11, bold: true, color: C.accent2 }, '벤치마크 제목');
  hbars(s, [1, 2, 3, 4].map(i => ({ label: G(`막대 이름 ${i}`), value: parseFloat(G(`막대 값 ${i}`)), text: G(`막대 값 ${i}`) })), { x: ML, y: 2.8, labelW: 2.9, trackW: 2.4, gap: 0.78, barH: 0.2, max: 1.0, highlight: 2 });
  tx(s, G('벤치마크 출처'), ML, 5.95, 6.9, 0.5, { fontSize: 10, color: C.text2 }, '벤치마크 출처');
  tx(s, G('환원 제목'), 8.35, 2.25, 4.18, 0.3, { fontSize: 11, bold: true, color: C.accent2 }, '환원 제목');
  stacked(s, [{ v: 40, color: NAVY, short: '제품 40' }, { v: 30, color: '3B4A73', short: '후원금 30' }, { v: 15, color: ORANGE, short: '재능 15', dark: true }, { v: 15, color: 'A9C6EE', short: '봉사 15', dark: true }], { x: 8.35, y: 2.65, w: 4.18, h: 0.55, labelSize: 10 });
  tx(s, '※ 구성 비율은 우리가 정한 가정입니다.', 8.35, 3.28, 4.18, 0.3, { fontSize: 10, color: C.text2 }, '환원 주석');
  hair(s, 8.35, 3.8, 4.18, HAIR, 0.5);
  tx(s, G('환원 금액').split(/\n| \/ /).join('\n'), 8.35, 3.95, 4.18, 1.0, { fontSize: 14, bold: true }, '환원 금액');

  // 12 tax
  G = g('R', 12); s = d.body({ section: '사회 환원', label: '03  세법', title: '기부금 한도와 제품 기부', lead: G('세법 각주'), tag: '사실', notes: N(12) });
  tableFrom(s, tbl('R', 12), { x: ML, y: 2.2, w: CW, colW: [1.85, 5.5, 3.2, 1.183], rowH: 0.6, boldFirst: true, levelCol: 3, fontSize: 11, headSize: 10.5 });

  // 13 unknown
  G = g('R', 13); s = d.body({ section: '검증', label: '04  한계', title: '확인하지 못한 것', lead: '찾지 못한 자료와 접속하지 못한 사이트를 숨기지 않고 적었습니다.', notes: N(13) });
  const cols = [[G('미확인 제목'), G('미확인 목록').split(/\n| \/ /), 4.5], [G('접속 제목'), G('접속 목록').split(/\n| \/ /), 3.9], ['아직 정하지 못한 것', ['발표자 이름', '발표 시간', '※ 제품 이름(모닝펀치)과 손 동작(접힌 팔이 펼쳐져 쿠션을 가볍게 두드림)은 정했습니다.'], 2.9]];
  let cx = ML;
  cols.forEach(c => {
    hair(s, cx, 2.3, c[2], NAVY, 1.25);
    tx(s, c[0], cx, 2.42, c[2], 0.34, { fontSize: 14, bold: true }, '열 제목');
    tx(s, paras(c[1]), cx, 2.9, c[2], 3.7, { fontSize: 11.5, paraSpaceAfter: 10 }, '열 목록');
    cx += c[2] + 0.2;
  });

  // 14 reliability
  s = d.body({ section: '검증', label: '04  신뢰도', title: '숫자별 신뢰도 점검', lead: '', notes: N(14) });
  tableFrom(s, tbl('R', 14), { x: ML, y: 1.65, w: CW, colW: [2.3, 4.7, 1.3, 3.433], rowH: 0.385, boldFirst: true, levelCol: 2, fontSize: 11.5, headSize: 10.5 });

  // 15 sources
  s = d.body({ section: '부록', label: '부록', title: '출처', lead: '', notes: N(15) });
  sourceList(d, s, SRC, { y: 1.7, fs: 10, gap: 3.5, colW: 5.7, extra: g('R', 15)('출처 각주') });

  await d.finish();
  console.log('ok');
})();
