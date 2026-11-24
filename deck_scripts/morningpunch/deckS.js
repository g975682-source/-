const { createDoc, NAVY, GRAY, MUTE, HAIR, TRACK, CREAM, ORANGE, ORANGE_TX, GREEN, SKY, ML, CW, MR } = require('./doc');
const { g, notes, tbl, SRC, sourceList, paras, CJ } = require('./parts');
const d = createDoc({ file: '/home/user/-/MorningPunch_Student_Presentation.pptx', docName: '발표 자료', title: '모닝펀치 발표 자료' });
const { C, tx, rect, hair, panel, stat, row, hbars, stacked, tagInline, tableFrom } = d;
const N = i => notes('S', i);
const SPL = /\n| \/ /;
const lines = t => t.split('\n').join(' ');

(async () => {
  // 1
  d.cover({ label: 'MORNING PUNCH', title: [{ text: '베개 속 손이', options: { breakLine: true } }, { text: '깨워주는', options: { breakLine: true } }, { text: '모닝펀치', options: { color: C.accent1,  } }], lead: '자동기상베개 · 가상 창업 계획 발표', meta: '발표자 ○○○  ·  약 18분', notes: N(1) });

  // 2 three questions
  let G = g('S', 2), s = d.body({ section: '시작', label: '00  오늘의 질문', title: '오늘 발표의 세 가지 질문', lead: '세 질문에 차례로 답합니다. 숫자 옆에는 확인한 정도(사실·추정·가정)를 표시했습니다.', notes: N(2) });
  for (let i = 1; i <= 3; i++) {
    const x = ML + (i - 1) * 3.98;
    hair(s, x, 2.3, 3.6, NAVY, 1.25);
    tx(s, `질문 ${i}`, x, 2.42, 3.6, 0.28, { fontSize: 10.5, bold: true, color: C.accent2 }, '질문 번호');
    tx(s, lines(G(`질문 ${i}`)), x, 2.75, 3.6, 0.9, { fontSize: 19, bold: true }, '질문');
    hair(s, x, 3.85, 3.6, HAIR, 0.5);
    tx(s, G(`답 ${i}`).split('\n').join('\n'), x, 4.0, 3.6, 1.1, { fontSize: 14, color: i === 3 ? C.accent2 : C.text1, bold: true }, '답');
  }
  hair(s, ML, 5.55, CW, HAIR, 0.5);
  [['사실', G('사실 설명')], ['추정', G('추정 설명')], ['가정', G('가정 설명')]].forEach((r, i) => {
    tagInline(s, r[0], ML + i * 3.98, 5.78);
    tx(s, r[1], ML + i * 3.98 + 0.7, 5.78, 3.0, 0.24, { fontSize: 12, color: C.text2, valign: 'middle' }, '표시 설명');
  });
  tx(s, G('요약 각주'), ML, 6.3, CW, 0.3, { fontSize: 10, color: C.text2 }, '요약 각주');

  // 3 evidence
  G = g('S', 3); s = d.body({ section: '문제와 아이디어', label: '01  문제', title: '늦잠은 정말 흔한 문제일까?', lead: '알람을 미루는 일은 해외 두 곳의 조사와 한국 설문에서 확인됩니다.', tag: '사실', notes: N(3) });
  for (let i = 1; i <= 3; i++) {
    const x = ML + (i - 1) * 3.98;
    hair(s, x, 2.3, 3.6, NAVY, 1.25);
    tx(s, G(`근거 숫자 ${i}`), x, 2.45, 3.6, 1.0, { fontSize: 56, bold: true, valign: 'middle' }, '근거 숫자');
    tx(s, G(`근거 출처 ${i}`), x, 3.55, 3.6, 0.35, { fontSize: 12.5, bold: true, color: C.accent2 }, '근거 출처');
    tx(s, G(`근거 설명 ${i}`), x, 3.95, 3.6, 1.0, { fontSize: 12.5, color: C.text2 }, '근거 설명');
  }
  panel(s, ML, 5.3, CW, 1.3, '주의 패널');
  tx(s, G('근거 주의').replace(/^주의:\s*/, '※ '), ML + 0.4, 5.3, CW - 0.8, 1.3, { fontSize: 13, valign: 'middle' }, '주의 문장');

  // 4 idea
  G = g('S', 4); s = d.body({ section: '문제와 아이디어', label: '01  아이디어', title: '우리의 아이디어: 베개 속 손', lead: '소리가 아니라 촉각, 몸에 닿는 느낌으로 깨웁니다.', tag: '가정', notes: N(4) });
  for (let i = 1; i <= 4; i++) {
    const x = ML + (i - 1) * 2.98;
    hair(s, x, 2.3, 2.7, i === 2 ? ORANGE : NAVY, 1.25);
    tx(s, G(`단계 번호 ${i}`), x, 2.42, 2.7, 0.28, { fontSize: 10.5, bold: true, color: C.accent2 }, '단계 번호');
    tx(s, G(`단계 제목 ${i}`), x, 2.75, 2.7, 0.45, { fontSize: 17, bold: true }, '단계 제목');
    tx(s, G(`단계 설명 ${i}`), x, 3.25, 2.7, 0.8, { fontSize: 12, color: C.text2 }, '단계 설명');
  }
  panel(s, ML, 4.3, CW, 1.65, '구조 패널');
  tx(s, '제품 구조 (디자인 담당 제안)', ML + 0.4, 4.4, 5, 0.28, { fontSize: 10.5, bold: true, color: C.accent2 }, '구조 라벨');
  tx(s, paras(['팔이 접혀 들어가는 베개 옆면 수납부', '팔을 펼치고 움직이는 2개의 관절', '끝부분의 손 모양 패드', '세탁할 때 분리할 수 있는 구조']), ML + 0.4, 4.75, 5.4, 1.1, { fontSize: 12.5, paraSpaceAfter: 2 }, '구조 목록');
  tx(s, '작동 방식', ML + 6.4, 4.4, 5, 0.28, { fontSize: 10.5, bold: true, color: C.accent2 }, '작동 라벨');
  tx(s, paras(['평소에는 로봇팔이 베개 옆 수납부에 접혀 있습니다.', '알람이 울리면 관절이 움직이며 팔이 펼쳐집니다.', '손 모양의 푹신한 패드가 쿠션을 가볍게 두드립니다.']), ML + 6.4, 4.75, 5.0, 1.1, { fontSize: 12.5, paraSpaceAfter: 2 }, '작동 목록');
  tx(s, G('아이디어 한계'), ML, 6.2, CW, 0.5, { fontSize: 10.5, color: C.text2 }, '아이디어 한계');

  // 5 terms
  G = g('S', 5); s = d.body({ section: '문제와 아이디어', label: '01  용어', title: '발표 전에 용어부터', lead: '빵 가게 예시로 여섯 가지 용어를 먼저 익힙니다.', notes: N(5) });
  for (let i = 1; i <= 6; i++) {
    const x = ML + ((i - 1) % 3) * 3.98, y = 2.3 + Math.floor((i - 1) / 3) * 2.2;
    hair(s, x, y, 3.6, NAVY, 1.25);
    tx(s, G(`용어 ${i}`), x, y + 0.15, 3.6, 0.45, { fontSize: 20, bold: true }, '용어');
    tx(s, G(`용어 뜻 ${i}`).split('\n').join('  '), x, y + 0.68, 3.6, 0.7, { fontSize: 12.5, color: C.text1 }, '용어 뜻');
    tx(s, G(`용어 예 ${i}`), x, y + 1.42, 3.6, 0.5, { fontSize: 11.5, color: C.accent2 }, '용어 예');
  }

  // 6 competitors
  G = g('S', 6); s = d.body({ section: '경쟁 분석', label: '02  경쟁 제품', title: '비슷한 제품은 무엇이 있을까?', lead: '손이 나오는 베개와 같은 상용 제품은 이번 조사에서 확인하지 못했습니다.', tag: '사실', notes: N(6) });
  tableFrom(s, tbl('S', 6).map(r => r.map(c => c.split('\n').join(' '))), { x: ML, y: 2.3, w: CW, colW: [2.6, 3.6, 2.4, 3.133], rowH: 0.7, boldFirst: true, fontSize: 12.5, headSize: 11 });
  tx(s, G('경쟁 각주'), ML, 6.0, CW, 0.5, { fontSize: 10.5, color: C.text2 }, '경쟁 각주');

  // 7 revenue
  G = g('S', 7); s = d.body({ section: '경쟁 분석', label: '02  경쟁 매출', title: '경쟁 제품은 1년에 얼마나 팔았을까?', lead: 'Clocky는 계산한 추정이고, Hatch는 언론 보도를 그대로 인용한 값입니다.', tag: '추정', notes: N(7) });
  [1, 2].forEach(i => {
    const x = ML + (i - 1) * 6.1;
    hair(s, x, 2.3, 5.6, NAVY, 1.25);
    tx(s, G(`${i === 1 ? 'Clocky' : 'Hatch'} 이름`), x, 2.45, 5.6, 0.32, { fontSize: 13, bold: true, color: C.accent2 }, '경쟁 이름');
    tx(s, G(`${i === 1 ? 'Clocky' : 'Hatch'} 숫자`), x, 2.8, 5.6, 0.8, { fontSize: 32, bold: true, valign: 'middle' }, '경쟁 숫자');
    tx(s, G(`${i === 1 ? 'Clocky' : 'Hatch'} 설명`), x, 3.7, 5.6, 0.9, { fontSize: 12, color: C.text2 }, '경쟁 설명');
  });
  tx(s, G('계산 제목'), ML, 4.75, 4, 0.3, { fontSize: 11, bold: true, color: C.accent2 }, '계산 제목');
  hair(s, ML, 5.1, CW, NAVY, 1.25);
  for (let i = 1; i <= 5; i++) {
    const x = ML + (i - 1) * 2.35;
    tx(s, G(`계산 이름 ${i}`), x, 5.2, 2.2, 0.3, { fontSize: 11, bold: true, color: C.text2 }, '계산 이름');
    tx(s, G(`계산 내용 ${i}`), x, 5.5, 2.15, 0.7, { fontSize: 12.5, bold: true }, '계산 내용');
  }
  tx(s, G('매출 각주'), ML, 6.35, CW, 0.3, { fontSize: 10, color: C.text2 }, '매출 각주');

  // 8 cost flow
  G = g('S', 8); s = d.body({ section: '경쟁 분석', label: '02  경쟁 비용', title: '경쟁 제품은 돈을 어디에 쓸까?', lead: G('비용 그래프 제목'), tag: '가정', notes: N(8) });
  const pcs = [30, 7, 37, 16, 10], cols8 = [NAVY, '4A5878', '8A93AB', 'C5CAD8', ORANGE];
  stacked(s, pcs.map((v, i) => ({ v, color: cols8[i], short: `${v}원`, dark: i === 2 || i === 3 })), { x: ML, y: 2.4, w: CW, h: 0.8, labelSize: 16 });
  let cx = ML;
  for (let i = 1; i <= 5; i++) {
    const x = ML + (i - 1) * 2.35;
    rect(s, x, 3.65, 0.16, 0.16, cols8[i - 1], '범례 색');
    tx(s, G(`비용 이름 ${i}`), x + 0.28, 3.55, 2.0, 0.35, { fontSize: 14, bold: true, valign: 'middle' }, '비용 이름');
    tx(s, G(`비용 숫자 ${i}`), x, 4.05, 2.2, 0.6, { fontSize: 28, bold: true, color: i === 5 ? C.accent2 : C.text1 }, '비용 숫자');
    tx(s, G(`비용 설명 ${i}`), x, 4.7, 2.2, 0.6, { fontSize: 12, color: C.text2 }, '비용 설명');
  }
  tx(s, G('비용 각주'), ML, 5.9, CW, 0.6, { fontSize: 10.5, color: C.text2 }, '비용 각주');

  // 9 price
  G = g('S', 9); s = d.body({ section: '손익', label: '03  가격', title: '우리 제품 가격 정하기', lead: '소비자가 99,000원 중 부가세는 나라에 내는 돈이라 회사 매출로 보지 않습니다.', tag: '가정', notes: N(9) });
  hair(s, ML, 2.3, 5.4, NAVY, 1.25);
  tx(s, G('부가세 제목'), ML, 2.45, 5.4, 0.4, { fontSize: 16, bold: true }, '부가세 제목');
  tx(s, '99,000원', ML, 3.0, 5.4, 0.7, { fontSize: 38, bold: true, valign: 'middle' }, '소비자가');
  tx(s, '= 90,000원 (회사 매출) + 9,000원 (부가세)', ML, 3.8, 5.4, 0.4, { fontSize: 15, bold: true, color: C.accent2 }, '식');
  tx(s, G('부가세 설명'), ML, 4.35, 5.4, 1.0, { fontSize: 12.5, color: C.text2 }, '부가세 설명');
  tx(s, G('가격 위치 제목'), 7.0, 2.25, 5.5, 0.4, { fontSize: 16, bold: true }, '가격 위치 제목');
  hbars(s, [{ label: 'Clocky', value: 50, text: '$50' }, { label: '우리 (9.9만원)', value: 71, text: '$71' }, { label: 'Hatch Restore 3', value: 170, text: '$170' }, { label: 'Sunrise (예정가)', value: 199, text: '$199' }, { label: 'ZEEQ (예정가)', value: 299, text: '$299' }], { x: 7.0, y: 2.9, labelW: 1.9, trackW: 2.5, gap: 0.62, barH: 0.2, max: 299, highlight: 1, labelSize: 12 });
  tx(s, G('가격 위치 설명'), 7.0, 6.05, 5.5, 0.6, { fontSize: 10.5, color: C.text2 }, '가격 위치 설명');

  // 10 unit
  G = g('S', 10); s = d.body({ section: '손익', label: '03  1대당 손익', title: '1대 팔면 얼마가 남을까?', lead: '만드는 비용과 파는 비용을 빼면 한 대에 17,500원이 남습니다.', tag: '가정', notes: N(10) });
  for (let i = 1; i <= 3; i++) {
    const y = 2.3 + (i - 1) * 1.1;
    hair(s, ML, y, CW, i === 3 ? ORANGE : (i === 1 ? NAVY : HAIR), i === 1 || i === 3 ? 1.25 : 0.5);
    tx(s, G(`계산 이름 ${i}`), ML, y + 0.2, 2.8, 0.7, { fontSize: 18, bold: true, valign: 'middle', color: i === 3 ? C.accent2 : C.text1 }, '계산 이름');
    tx(s, G(`계산 식 ${i}`), ML + 3.0, y + 0.2, 8.7, 0.7, { fontSize: 22, bold: true, valign: 'middle', color: i === 3 ? C.accent2 : C.text1 }, '계산 식');
  }
  panel(s, ML, 5.75, CW, 0.75, '핵심 패널', true);
  tx(s, G('핵심 문장'), ML + 0.4, 5.75, CW - 0.8, 0.75, { fontSize: 18, bold: true, color: C.background1, valign: 'middle' }, '핵심 문장');
  tx(s, G('단위 각주'), ML, 6.55, CW, 0.3, { fontSize: 10, color: C.text2 }, '단위 각주');

  // 11 BEP
  G = g('S', 11); s = d.body({ section: '손익', label: '03  손익분기', title: '몇 대를 팔아야 손해를 안 볼까?', lead: '1대당 남는 돈 17,500원으로 고정비 3.5억원을 메우려면 2만 대를 팔아야 합니다.', tag: '가정', notes: N(11) });
  tx(s, '1년차 영업이익 (억원)', ML, 2.2, 5, 0.3, { fontSize: 11, bold: true, color: C.accent2 }, '차트 제목');
  const pts = [[5000, -2.625], [10000, -1.75], [15000, -0.875], [20000, 0], [25000, 0.875]];
  const zero = 3.45, sc = 0.6;
  hair(s, ML, zero, 6.6, MUTE, 0.75, '0 기준선');
  pts.forEach((p, i) => {
    const x = ML + 0.2 + i * 1.28, h = Math.abs(p[1]) * sc;
    if (h > 0) rect(s, x, p[1] < 0 ? zero : zero - h, 0.8, h, p[0] === 20000 ? ORANGE : (p[1] < 0 ? NAVY : GREEN), `영업이익 막대 ${i + 1}`);
    tx(s, p[1] === 0 ? '0' : (p[1] > 0 ? '+' : '') + p[1].toFixed(2), x - 0.2, p[1] < 0 ? zero + h + 0.05 : zero - h - 0.32, 1.2, 0.3, { fontSize: 12, bold: true, align: 'center', color: p[0] === 20000 ? C.accent2 : C.text1 }, '막대 값');
    tx(s, `${(p[0] / 10000).toFixed(p[0] % 10000 ? 1 : 0)}만 대`, x - 0.2, 5.75, 1.2, 0.3, { fontSize: 11, align: 'center', color: C.text2, bold: p[0] === 10000 || p[0] === 20000 }, '판매 대수');
  });
  tx(s, '※ 1만 대(기본 계획)는 −1.75억원, 2만 대는 손익분기입니다.', ML, 6.15, 6.6, 0.3, { fontSize: 10, color: C.text2 }, '차트 각주');
  for (let i = 1; i <= 3; i++) {
    const y = 2.25 + (i - 1) * 1.25;
    hair(s, 8.1, y, 4.43, i === 2 ? ORANGE : NAVY, 1.25);
    tx(s, G(`손익분기 이름 ${i}`), 8.1, y + 0.1, 4.43, 0.3, { fontSize: 11, bold: true, color: C.accent2 }, '손익분기 이름');
    tx(s, G(`손익분기 내용 ${i}`).split('\n').join('\n'), 8.1, y + 0.42, 4.43, 0.8, { fontSize: 13.5, bold: true }, '손익분기 내용');
  }
  tx(s, G('용어 복습').split('\n').join('   |   '), 8.1, 6.05, 4.43, 0.6, { fontSize: 10, color: C.text2 }, '용어 복습');

  // 12 scenarios
  G = g('S', 12); s = d.body({ section: '손익', label: '03  1년차', title: '1년차 매출 예상: 세 가지 시나리오', lead: '판매 대수는 우리가 정한 가정입니다. 크라우드펀딩 사전 판매로 먼저 검증합니다.', tag: '가정', notes: N(12) });
  tableFrom(s, tbl('S', 12).map(r => r.map(c => c.split('\n').join(' '))), { x: ML, y: 2.3, w: CW, colW: [1.7, 1.9, 2.6, 2.9, 2.633], rowH: 0.7, align: ['left', 'right', 'right', 'right', 'right'], boldFirst: true, emphRows: [2], fontSize: 13.5, headSize: 11 });
  panel(s, ML, 5.15, CW, 1.3, '시나리오 설명 패널');
  tx(s, G('시나리오 설명'), ML + 0.4, 5.15, CW - 0.8, 1.3, { fontSize: 13, valign: 'middle' }, '시나리오 설명');

  // 13 three-year
  G = g('S', 13); s = d.body({ section: '손익', label: '03  3개년', title: '3년 동안의 매출과 이익', lead: '1년차는 적자, 2년차부터 흑자가 되는 계획입니다.', tag: '가정', notes: N(13) });
  const yrs = [['1년차', 9, '-1.75'], ['2년차', 27, '+1.14'], ['3년차', 54, '+6.26']];
  const base = 5.35, maxH = 2.6;
  tx(s, '매출 (억원)', ML, 2.2, 3, 0.3, { fontSize: 11, bold: true, color: C.accent2 }, '차트 제목');
  hair(s, ML, base, 6.6, MUTE, 0.75, '기준선');
  yrs.forEach((y, i) => {
    const h = Math.max(0.2, y[1] / 54 * maxH), x = ML + 0.4 + i * 2.1;
    rect(s, x, base - h, 1.1, h, i === 2 ? ORANGE : NAVY, `매출 막대 ${i + 1}`);
    tx(s, String(y[1]), x - 0.3, base - h - 0.4, 1.7, 0.36, { fontSize: 16, bold: true, align: 'center' }, '막대 값');
    tx(s, y[0], x - 0.3, base + 0.1, 1.7, 0.3, { fontSize: 12, bold: true, align: 'center' }, '연차');
    tx(s, `영업이익 ${y[2]}`, x - 0.3, base + 0.4, 1.7, 0.3, { fontSize: 11, color: y[2][0] === '-' ? C.accent2 : C.text2, align: 'center' }, '영업이익');
  });
  [1, 2, 3].forEach(i => {
    const y = 2.25 + (i - 1) * 1.45;
    hair(s, 8.35, y, 4.18, i === 3 ? ORANGE : NAVY, 1.25);
    tx(s, G(`전망 숫자 ${i}`), 8.35, y + 0.12, 4.18, 0.7, { fontSize: 34, bold: true, valign: 'middle', color: i === 3 ? C.accent2 : C.text1 }, '전망 숫자');
    tx(s, G(`전망 설명 ${i}`), 8.35, y + 0.85, 4.18, 0.4, { fontSize: 12, color: C.text2 }, '전망 설명');
  });
  tx(s, G('전망 각주'), ML, 6.35, 7.5, 0.4, { fontSize: 10, color: C.text2 }, '전망 각주');

  // 14 sensitivity
  G = g('S', 14); s = d.body({ section: '손익', label: '03  민감도', title: '가격을 올리면 어떻게 될까?', lead: '1년차 영업이익(억원)을 소비자가와 판매 대수별로 계산했습니다.', tag: '가정', notes: N(14) });
  tableFrom(s, tbl('S', 14), { x: ML, y: 2.3, w: 6.9, colW: [2.7, 1.4, 1.4, 1.4], rowH: 0.55, align: ['left', 'right', 'right', 'right'], boldFirst: true, emphRows: [2], fontSize: 13, headSize: 11 });
  [['가격 효과 제목', '가격 효과 내용', 2.3], ['재료비 위험 제목', '재료비 위험 내용', 3.85]].forEach(([a, b, y]) => {
    hair(s, 8.35, y, 4.18, NAVY, 1.25);
    tx(s, G(a), 8.35, y + 0.1, 4.18, 0.3, { fontSize: 11, bold: true, color: C.accent2 }, '효과 제목');
    tx(s, G(b), 8.35, y + 0.45, 4.18, 1.1, { fontSize: 13, bold: true }, '효과 내용');
  });
  panel(s, ML, 5.3, CW, 0.7, '결론 패널', true);
  tx(s, G('민감도 결론'), ML + 0.4, 5.3, CW - 0.8, 0.7, { fontSize: 15, bold: true, color: C.background1, valign: 'middle' }, '민감도 결론');
  tx(s, G('민감도 각주'), ML, 6.15, CW, 0.5, { fontSize: 10, color: C.text2 }, '민감도 각주');

  // 15 donation
  G = g('S', 15); const G11 = g('R', 11);
  s = d.body({ section: '사회 환원', label: '04  기준', title: '기업은 얼마나 기부할까?', lead: '국내 평균과 해외 사례, 세법 규정을 기준으로 삼았습니다.', tag: '사실', notes: N(15) });
  tx(s, '매출 대비 기부 비율', ML, 2.25, 6, 0.3, { fontSize: 11, bold: true, color: C.accent2 }, '벤치마크 제목');
  hbars(s, [1, 2, 3, 4].map(i => ({ label: G11(`막대 이름 ${i}`), value: parseFloat(G11(`막대 값 ${i}`)), text: G11(`막대 값 ${i}`) })), { x: ML, y: 2.8, labelW: 2.9, trackW: 2.4, gap: 0.78, barH: 0.2, max: 1.0, highlight: 2 });
  [1, 2, 3].forEach(i => {
    const y = 2.25 + (i - 1) * 1.45;
    hair(s, 8.35, y, 4.18, i === 1 ? NAVY : HAIR, i === 1 ? 1.25 : 0.5);
    tx(s, G(`기부 제목 ${i}`), 8.35, y + 0.12, 4.18, 0.32, { fontSize: 15, bold: true }, '기준 제목');
    tx(s, G(`기부 설명 ${i}`), 8.35, y + 0.48, 4.18, 0.95, { fontSize: 11, color: C.text2 }, '기준 설명');
  });

  // 16 allocation
  G = g('S', 16); s = d.body({ section: '사회 환원', label: '04  제안', title: '매출의 0.5%, 어떻게 나눌까?', lead: G('환원 계산') + ' (구성 비율은 우리가 정한 가정, 단위 만원)', tag: '가정', notes: N(16) });
  stacked(s, [{ v: 40, color: NAVY, short: '제품 기부 40%' }, { v: 30, color: '3B4A73', short: '후원금 30%' }, { v: 15, color: ORANGE, short: '재능 15%', dark: true }, { v: 15, color: 'A9C6EE', short: '봉사 15%', dark: true }], { x: ML, y: 2.3, w: CW, h: 0.5, labelSize: 11.5 });
  tableFrom(s, tbl('S', 16), { x: ML, y: 3.05, w: CW, colW: [2.2, 1.4, 1.4, 1.4, 5.333], rowH: 0.45, align: ['left', 'right', 'right', 'right', 'left'], boldFirst: true, emphRows: [5], fontSize: 12.5, headSize: 10.5 });
  tx(s, G('환원 이유'), ML, 5.8, CW, 0.3, { fontSize: 13, bold: true, color: C.accent2 }, '환원 이유');
  tx(s, G('환원 각주'), ML, 6.15, CW, 0.5, { fontSize: 10, color: C.text2 }, '환원 각주');

  // 17 unknowns
  G = g('S', 17); s = d.body({ section: '마무리', label: '05  한계', title: '우리가 아직 모르는 것들', lead: '숫자 대부분은 가정이라 아래 여섯 가지를 먼저 확인해야 합니다.', notes: N(17) });
  for (let i = 1; i <= 6; i++) {
    const x = ML + ((i - 1) % 3) * 3.98, y = 2.3 + Math.floor((i - 1) / 3) * 2.2;
    hair(s, x, y, 3.6, NAVY, 1.25);
    tx(s, String(i).padStart(2, '0'), x, y + 0.15, 0.7, 0.35, { fontSize: 12, bold: true, color: C.accent2 }, '번호');
    tx(s, G(`한계 제목 ${i}`), x + 0.7, y + 0.12, 2.9, 0.4, { fontSize: 16, bold: true }, '한계 제목');
    tx(s, G(`한계 설명 ${i}`), x, y + 0.65, 3.6, 1.5, { fontSize: 11, color: C.text2 }, '한계 설명');
  }

  // 18 conclusion
  G = g('S', 18); s = d.closing({ section: '마무리', label: '정리', title: '정리: 세 가지 답', notes: N(18) });
  for (let i = 1; i <= 3; i++) {
    const y = 2.2 + (i - 1) * 1.3;
    hair(s, ML, y, CW, '3B4A73', 0.75);
    tx(s, String(i), ML, y + 0.2, 0.8, 0.8, { fontSize: 36, bold: true, color: C.accent1, valign: 'middle' }, '번호');
    tx(s, G(`결론 이름 ${i}`), ML + 1.0, y + 0.2, 2.2, 0.8, { fontSize: 18, bold: true, color: C.background1, valign: 'middle' }, '결론 이름');
    tx(s, G(`결론 내용 ${i}`), ML + 3.4, y + 0.15, 8.3, 0.9, { fontSize: 14, color: SKY, valign: 'middle' }, '결론 내용');
  }
  tx(s, G('다음 단계'), ML, 6.3, CW, 0.4, { fontSize: 14, bold: true, color: C.accent1 }, '다음 단계');

  // 19, 20 Q&A
  [19, 20].forEach((n, k) => {
    G = g('S', n); s = d.body({ section: '마무리', label: `Q&A  ${k + 1}/2`, title: `예상 질문과 답 (${k + 1}/2)`, lead: '', notes: N(n) });
    for (let i = 1; i <= 4; i++) {
      const y = 1.7 + (i - 1) * 1.22;
      hair(s, ML, y, CW, i === 1 ? NAVY : HAIR, i === 1 ? 1.25 : 0.5);
      tx(s, G(`질문 ${i}`).replace(/^Q\.\s*/, ''), ML, y + 0.12, 4.0, 0.95, { fontSize: 14.5, bold: true, valign: 'top' }, '질문');
      tx(s, G(`답 ${i}`).replace(/^A\.\s*/, ''), ML + 4.3, y + 0.12, 7.4, 1.0, { fontSize: 12.5, color: C.text1, valign: 'top' }, '답');
    }
  });

  // 21 memorize
  G = g('S', 21); s = d.body({ section: '부록', label: '부록 A', title: '꼭 외울 숫자 10개', lead: '발표 전에 반드시 외워 두세요.', notes: N(21) });
  for (let i = 1; i <= 10; i++) {
    const x = ML + ((i - 1) % 5) * 2.38, y = 2.3 + Math.floor((i - 1) / 5) * 2.2;
    hair(s, x, y, 2.15, NAVY, 1.25);
    tx(s, String(i), x, y + 0.1, 0.5, 0.3, { fontSize: 11, bold: true, color: C.accent2 }, '번호');
    tx(s, G(`암기 숫자 ${i}`).split('\n').join(' '), x, y + 0.42, 2.15, 0.9, { fontSize: i === 8 ? 12 : 16, bold: true, valign: 'top' }, '암기 숫자');
    tx(s, G(`암기 설명 ${i}`), x, y + 1.4, 2.15, 0.6, { fontSize: 10.5, color: C.text2 }, '암기 설명');
  }

  // 22 sources
  s = d.body({ section: '부록', label: '부록 B', title: '출처', lead: '', notes: N(22) });
  const drop = ['Ruggie', '스마트 클락', '스마트 베개 시장', '서보', 'MCU', 'EMC 시험 수수료 (KTC)', 'EMC 시험 수수료 (KTR)', '지정시험기관'];
  sourceList(d, s, SRC.filter(r => !drop.some(k => r[0].includes(k))), { y: 1.7, fs: 10.5, gap: 4, colW: 5.7, extra: g('R', 15)('출처 각주') });

  await d.finish();
  console.log('ok');
})();
