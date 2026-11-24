const { createDoc, NAVY, GRAY, MUTE, HAIR, TRACK, CREAM, ORANGE, ORANGE_TX, GREEN, SKY, ML, CW, MR } = require('./doc');
const { g, notes, tbl, SRC, sourceList, paras } = require('./parts');
const d = createDoc({ file: '/home/user/-/MorningPunch_Business_Report.pptx', docName: '사업 보고서', title: '모닝펀치 사업 보고서' });
const { C, tx, rect, hair, panel, stat, row, hbars, stacked, tagInline, tableFrom } = d;
const N = i => notes('B', i);
const SP = /\n| \/ /;

(async () => {
  d.cover({ label: 'MORNING PUNCH', title: '모닝펀치\n사업 보고서', lead: '경쟁 제품 분석 · 연간 매출 예상 · 사회 환원 제안', meta: '가상 창업 시나리오  ·  베개 속 손이 깨워주는 자동기상베개', notes: N(1) });

  // contents
  let s = d.body({ section: '개요', label: '목차', title: '목차', lead: '', notes: '보고서는 세 가지 질문에 답하는 순서로 구성했습니다. 마지막에 리스크와 실행 계획, 먼저 검증할 것을 정리합니다.' });
  [['01', '시장과 경쟁 분석', '같거나 비슷한 제품, 1년 매출, 비용 구조, 시장 규모'], ['02', '매출·손익 예상', '1대당 손익, 1년차 시나리오, 3개년 전망, 민감도'], ['03', '사회 환원 제안', '기업 기부 수준, 환원 비율과 구성, 세법 점검'], ['04', '리스크와 실행 계획', '안전·인증·특허·수요, 로드맵, 먼저 검증할 것'], ['부록', '신뢰도 점검, 가정과 출처', '숫자별 확인 정도, 주요 가정, 출처 34건']].forEach((r, i) => {
    const y = 1.75 + i * 0.95;
    hair(s, ML, y, CW, i === 0 ? NAVY : HAIR, i === 0 ? 1.25 : 0.5);
    tx(s, r[0], ML, y + 0.22, 1.2, 0.5, { fontSize: 22, bold: true, color: C.accent2, valign: 'middle' }, '목차 번호');
    tx(s, r[1], ML + 1.5, y + 0.22, 4.5, 0.5, { fontSize: 20, bold: true, valign: 'middle' }, '목차 제목');
    tx(s, r[2], ML + 6.2, y + 0.22, 5.5, 0.5, { fontSize: 13, color: C.text2, valign: 'middle' }, '목차 설명');
  });
  hair(s, ML, 1.75 + 5 * 0.95, CW, HAIR, 0.5);

  // exec summary
  let G = g('B', 2);
  s = d.body({ section: '개요', label: '요약', title: '핵심 요약: 세 가지 결론', lead: '이 보고서가 던진 세 질문에 대한 답입니다.', notes: N(2) });
  [['1', '경쟁 제품은 1년에 얼마나 파나'], ['2', '우리 제품은 1년에 얼마나 팔 수 있나'], ['3', '번 돈의 몇 %를 사회에 돌려줄까']].forEach((q, i) => {
    const x = ML + i * 3.98, n = i + 1;
    hair(s, x, 2.3, 3.6, NAVY, 1.25);
    tx(s, `질문 ${q[0]}`, x, 2.42, 3.6, 0.28, { fontSize: 10.5, bold: true, color: C.accent2 }, '질문 번호');
    tx(s, q[1], x, 2.72, 3.6, 0.5, { fontSize: 13.5, bold: true }, '질문');
    tx(s, G(`요약 숫자 ${n}`), x, 3.4, 3.6, 0.9, { fontSize: n === 1 ? 32 : 44, bold: true, valign: 'middle', color: n === 3 ? C.accent2 : C.text1 }, '요약 숫자');
    tx(s, G(`요약 라벨 ${n}`), x, 4.35, 3.6, 0.3, { fontSize: 12, bold: true, color: C.text2 }, '요약 라벨');
    tx(s, G(`요약 설명 ${n}`), x, 4.72, 3.6, 1.4, { fontSize: 11.5, color: C.text2 }, '요약 설명');
  });
  hair(s, ML, 6.2, CW, HAIR, 0.5);
  tx(s, G('요약 각주'), ML, 6.3, CW, 0.4, { fontSize: 10, color: C.text2 }, '요약 각주');

  // ---------------- 01
  d.divider({ section: '01 시장과 경쟁', num: '01', title: '시장과 경쟁 분석', lead: g('B', 3)('Text 0'), notes: '첫 번째 질문입니다. 같거나 비슷한 제품은 무엇이 있고, 1년에 얼마를 팔며, 돈이 어디에 쓰이는지 봅니다.' });

  // problem + product
  G = g('B', 4);
  s = d.body({ section: '01 시장과 경쟁', label: '01  문제와 해법', title: '늦잠 문제와 우리의 해법', lead: '알람은 끄면 끝납니다. 우리는 접혀 있던 로봇팔이 펼쳐져 손 모양 패드로 쿠션을 두드리는 방식으로 깨웁니다.', tag: '가정', notes: N(4) });
  tx(s, '문제', ML, 2.3, 3, 0.28, { fontSize: 10.5, bold: true, color: C.accent2 }, '문제 라벨');
  tx(s, G('문제 제목').replace(/^문제:\s*/, ''), ML, 2.58, 5.2, 0.45, { fontSize: 18, bold: true }, '문제 제목');
  for (let i = 1; i <= 3; i++) {
    const y = 3.3 + (i - 1) * 1.05;
    hair(s, ML, y, 5.0, i === 1 ? NAVY : HAIR, i === 1 ? 1.25 : 0.5);
    row(s, { x: ML, y: y + 0.15, w: 5.0, idx: String(i), title: G(`문제 제목 ${i}`), desc: G(`문제 설명 ${i}`), h: 0.85 });
  }
  panel(s, 6.3, 2.3, 6.233, 4.35, '제품 패널');
  tx(s, '제품 구조', 6.7, 2.45, 5.4, 0.28, { fontSize: 10.5, bold: true, color: C.accent2 }, '구조 라벨');
  tx(s, paras(['관절형 로봇팔', '팔이 접혀 들어가는 베개 옆면 수납부', '팔을 펼치고 움직이는 2개의 관절', '끝부분의 손 모양 패드', '세탁할 때 분리할 수 있는 구조'], {}), 6.7, 2.78, 5.4, 1.6, { fontSize: 12.5, paraSpaceAfter: 4 }, '구조 목록');
  hair(s, 6.7, 4.45, 5.43, HAIR, 0.5);
  tx(s, '작동 방식', 6.7, 4.55, 5.4, 0.28, { fontSize: 10.5, bold: true, color: C.accent2 }, '작동 라벨');
  [['1', '평소에는 로봇팔이 베개 옆 수납부에 접혀 있습니다.'], ['2', '알람이 울리면 관절이 움직이며 팔이 펼쳐집니다.'], ['3', '푹신한 손 모양 패드가 아래로 움직여 쿠션을 가볍게 두드립니다.']].forEach((r, i) => {
    tx(s, r[0], 6.7, 4.9 + i * 0.5, 0.4, 0.4, { fontSize: 13, bold: true, color: C.accent2 }, '작동 번호');
    tx(s, r[1], 7.15, 4.9 + i * 0.5, 4.95, 0.45, { fontSize: 12, valign: 'top' }, '작동 설명');
  });
  tx(s, '출처: 디자인 담당 제안 / 안전 기능(힘 제한·정지 센서)은 우리 설계 가정', 6.7, 6.35, 5.5, 0.25, { fontSize: 9, color: C.text2 }, '제품 출처');

  // evidence
  G = g('B', 5);
  s = d.body({ section: '01 시장과 경쟁', label: '01  문제 근거', title: '늦잠은 실제로 흔한 문제인가', lead: '알람을 미루는 일은 해외 두 곳의 조사와 한국의 2011년 설문에서 확인됩니다.', tag: '사실', notes: N(5) });
  for (let i = 1; i <= 3; i++) {
    const x = ML + (i - 1) * 3.98;
    hair(s, x, 2.3, 3.6, NAVY, 1.25);
    tx(s, G(`근거 숫자 ${i}`), x, 2.45, 3.6, 1.0, { fontSize: 56, bold: true, valign: 'middle' }, '근거 숫자');
    tx(s, G(`근거 출처 ${i}`), x, 3.55, 3.6, 0.35, { fontSize: 12.5, bold: true, color: C.accent2 }, '근거 출처');
    tx(s, G(`근거 설명 ${i}`), x, 3.95, 3.6, 1.0, { fontSize: 12, color: C.text2 }, '근거 설명');
  }
  panel(s, ML, 5.2, CW, 1.45, '주의 패널');
  tx(s, G('주의 제목'), ML + 0.4, 5.32, 3, 0.3, { fontSize: 11, bold: true, color: C.accent2 }, '주의 제목');
  tx(s, G('주의 내용').split(/\n+/).filter(Boolean).join('\n'), ML + 0.4, 5.65, CW - 0.8, 0.95, { fontSize: 11.5, paraSpaceAfter: 3 }, '주의 내용');

  // competitors
  s = d.body({ section: '01 시장과 경쟁', label: '01  경쟁 제품', title: '같거나 비슷한 제품', lead: '손이 나오는 베개와 같은 상용 제품은 확인하지 못했고, 깨우는 방식이 비슷한 제품을 비교했습니다.', tag: '사실', notes: N(6) });
  tableFrom(s, tbl('B', 6), { x: ML, y: 2.3, w: CW, colW: [2.5, 2.4, 1.9, 3.2, 1.733], rowH: 0.65, boldFirst: true, fontSize: 11, headSize: 10.5 });

  // revenue
  G = g('B', 8);
  s = d.body({ section: '01 시장과 경쟁', label: '01  경쟁 매출', title: '경쟁 제품의 1년 매출 추정', lead: 'Clocky는 판매량으로 계산한 추정이고, Hatch는 언론 보도를 그대로 인용한 값입니다.', tag: '추정', notes: N(8) });
  [1, 2].forEach(i => {
    const x = ML + (i - 1) * 6.1;
    hair(s, x, 2.3, 5.6, NAVY, 1.25);
    tx(s, G(`산식 이름 ${i}`), x, 2.45, 5.6, 0.32, { fontSize: 13, bold: true, color: C.accent2 }, '산식 이름');
    tx(s, G(`산식 결과 ${i}`), x, 2.8, 5.6, 0.8, { fontSize: 34, bold: true, valign: 'middle' }, '산식 결과');
    tx(s, G(`산식 근거 ${i}`), x, 3.7, 5.6, 1.0, { fontSize: 12, color: C.text2 }, '산식 근거');
  });
  const R6 = g('R', 6);
  tx(s, 'Clocky 계산 따라가기', ML, 4.85, 4, 0.3, { fontSize: 11, bold: true, color: C.accent2 }, '계산 제목');
  hair(s, ML, 5.2, CW, NAVY, 1.25);
  for (let i = 1; i <= 5; i++) {
    const x = ML + (i - 1) * 2.35;
    tx(s, R6(`계산 이름 ${i}`), x, 5.3, 2.2, 0.3, { fontSize: 11, bold: true, color: C.text2 }, '계산 이름');
    tx(s, R6(`계산 내용 ${i}`), x, 5.6, 2.15, 0.6, { fontSize: 12, bold: true }, '계산 내용');
  }
  tx(s, G('매출 각주'), ML, 6.3, CW, 0.5, { fontSize: 10, color: C.text2 }, '매출 각주');

  // cost structure
  s = d.body({ section: '01 시장과 경쟁', label: '01  비용 구조', title: '경쟁 제품의 돈 흐름 (모형)', lead: '재무자료가 공개되지 않아 업계 일반 비중으로 가정한 모형입니다. 소비자가 100원일 때 항목별 비중입니다.', tag: '가정', notes: N(9) });
  const T9 = tbl('B', 9);
  const segC = [NAVY, '2F3B5E', '4A5878', '6B7794', '98A1B8', 'C5CAD8', ORANGE];
  const mk = col => T9.slice(1).map((r, i) => ({ v: parseInt(r[col]), color: segC[i], short: parseInt(r[col]) < 5 ? ' ' : r[0].replace(/\(.*\)/, '').replace('판매 수수료·유통', '판매').replace('제작 인건비', '인건비').replace('연구개발·관리', '연구·관리').replace('물류·포장', '물류'), dark: i >= 4 && i < 6 }));
  [['Clocky형', 1], ['Hatch형', 2]].forEach(([nm, col], i) => {
    const y = 2.35 + i * 0.7;
    tx(s, nm, ML, y, 1.4, 0.5, { fontSize: 12.5, bold: true, valign: 'middle' }, '막대 이름');
    stacked(s, mk(col), { x: ML + 1.5, y, w: CW - 1.5, h: 0.5, labelSize: 10.5 });
  });
  tableFrom(s, T9, { x: ML, y: 3.95, w: CW, colW: [3.5, 4.1, 4.133], rowH: 0.34, boldFirst: true, emphRows: [7], fontSize: 11.5, headSize: 10.5, align: ['left', 'right', 'right'] });

  // insights
  G = g('B', 10);
  s = d.body({ section: '01 시장과 경쟁', label: '01  시사점', title: '경쟁 분석에서 얻은 시사점', lead: '경쟁 제품의 가정 비중과 비교하면 우리 제품은 원가율이 높고 가격은 낮습니다.', tag: '가정', notes: N(10) });
  for (let i = 1; i <= 3; i++) {
    const y = 2.4 + (i - 1) * 1.4;
    hair(s, ML, y, CW, i === 1 ? NAVY : HAIR, i === 1 ? 1.25 : 0.5);
    tx(s, String(i), ML, y + 0.25, 0.8, 0.7, { fontSize: 32, bold: true, color: C.accent2, valign: 'middle' }, '번호');
    tx(s, G(`시사점 제목 ${i}`), ML + 1.0, y + 0.25, 4.4, 0.8, { fontSize: 17, bold: true, valign: 'middle' }, '시사점 제목');
    tx(s, G(`시사점 설명 ${i}`), ML + 5.6, y + 0.22, 6.1, 0.9, { fontSize: 12.5, color: C.text2, valign: 'middle' }, '시사점 설명');
  }

  // market
  G = g('B', 7);
  s = d.body({ section: '01 시장과 경쟁', label: '01  시장', title: '인접 시장은 빠르게 성장 중', lead: '시장조사 업체의 전망은 참고용이며, 국내에서 확인한 숫자는 통계청의 제조 출하액 한 가지입니다.', notes: N(7) });
  for (let i = 1; i <= 3; i++) {
    const x = ML + (i - 1) * 3.98;
    hair(s, x, 2.3, 3.6, NAVY, 1.25);
    tx(s, G(`시장 숫자 ${i}`), x, 2.5, 3.6, 0.8, { fontSize: i === 1 ? 25 : 30, bold: true, valign: 'middle' }, '시장 숫자');
    tx(s, G(`시장 라벨 ${i}`), x, 3.4, 3.6, 0.32, { fontSize: 13.5, bold: true }, '시장 라벨');
    tx(s, G(`시장 설명 ${i}`), x, 3.75, 3.6, 1.1, { fontSize: 11.5, color: C.text2 }, '시장 설명');
  }
  panel(s, ML, 5.2, CW, 1.4, '시장 주의 패널');
  tx(s, G('시장 각주'), ML + 0.4, 5.2, CW - 0.8, 1.4, { fontSize: 12, valign: 'middle' }, '시장 각주');

  // ---------------- 02
  d.divider({ section: '02 매출·손익', num: '02', title: '매출·손익 예상', lead: g('B', 11)('Text 0'), notes: '두 번째 질문입니다. 우리 제품의 1대당 손익과 연도별 매출 전망입니다. 판매 대수와 원가는 대부분 우리가 정한 가정입니다.' });

  const R8 = g('R', 8);
  s = d.body({ section: '02 매출·손익', label: '02  1대당 손익', title: '1대당 손익', lead: '소비자가 99,000원에서 부가세를 빼고, 만드는 비용과 파는 비용을 빼면 17,500원이 남습니다.', tag: '가정', notes: N(12) });
  tableFrom(s, tbl('B', 12), { x: ML, y: 2.2, w: 6.9, colW: [3.5, 1.7, 1.7], rowH: 0.355, align: ['left', 'right', 'right'], emphRows: [6, 11], fontSize: 11.5, headSize: 10.5 });
  [[1, 2.25], [2, 3.35], [3, 4.45]].forEach(([i, y]) => {
    hair(s, 8.35, y, 4.18, i === 3 ? ORANGE : HAIR, i === 3 ? 1.25 : 0.5);
    tx(s, R8(`핵심 숫자 ${i}`), 8.35, y + 0.12, 4.18, 0.55, { fontSize: 28, bold: true, valign: 'middle', color: i === 3 ? C.accent2 : C.text1 }, '핵심 숫자');
    tx(s, R8(`핵심 설명 ${i}`), 8.35, y + 0.7, 4.18, 0.35, { fontSize: 11, color: C.text2 }, '핵심 설명');
  });
  tx(s, R8('손익 각주'), 8.35, 5.65, 4.18, 0.8, { fontSize: 10, color: C.text2 }, '손익 각주');

  // BOM
  const BOM = tbl('B', 13);
  s = d.body({ section: '02 매출·손익', label: '02  재료비', title: '재료비 구성 (BOM 1대 34,000원)', lead: '서보 모터와 MCU만 도매 목록가를 참고했고 나머지 부품 단가는 우리가 정한 가정입니다.', tag: '가정', notes: N(13) });
  tableFrom(s, BOM.concat([['합계', '34,000', '100%']]), { x: ML, y: 2.2, w: 5.9, colW: [3.1, 1.5, 1.3], rowH: 0.42, align: ['left', 'right', 'right'], emphRows: [9], fontSize: 12, headSize: 10.5 });
  hbars(s, BOM.slice(1).map(r => ({ label: r[0].replace(/\s*\(.*\)/, ''), value: parseInt(r[1].replace(',', '')), text: r[2] })), { x: 7.2, y: 2.3, labelW: 1.8, trackW: 2.3, gap: 0.5, barH: 0.18, max: 7000, highlight: -1, labelSize: 12, valSize: 12 });
  tx(s, '서보 모터 1,000개 약 $1.47(알리바바 목록가), MCU 모듈 약 $1~2(LCSC). 소량 소매가는 $11~14로 편차가 큽니다. 배터리 셀 가격은 확인하지 못했습니다.', 7.2, 6.3, 5.3, 0.55, { fontSize: 10, color: C.text2 }, '부품 각주');

  // scenarios
  G = g('B', 14);
  s = d.body({ section: '02 매출·손익', label: '02  1년차', title: '1년차 매출 예상: 세 가지 시나리오', lead: '판매 대수에 공급가 90,000원을 곱한 값이며, 판매 대수는 우리가 정한 가정입니다.', tag: '가정', notes: N(14) });
  [1, 2, 3].forEach(i => {
    const x = ML + (i - 1) * 3.98;
    hair(s, x, 2.3, 3.6, i === 2 ? ORANGE : NAVY, 1.25);
    tx(s, G(`시나리오 이름 ${i}`), x, 2.45, 3.6, 0.32, { fontSize: 13, bold: true, color: i === 2 ? C.accent2 : C.text2 }, '시나리오 이름');
    tx(s, G(`시나리오 매출 ${i}`).replace('매출 ', ''), x, 2.9, 3.6, 0.9, { fontSize: 44, bold: true, valign: 'middle' }, '시나리오 매출');
    tx(s, '매출', x, 3.8, 3.6, 0.3, { fontSize: 12, color: C.text2 }, '매출 라벨');
    tx(s, G(`시나리오 손익 ${i}`), x, 4.25, 3.6, 0.4, { fontSize: 14, bold: true }, '시나리오 손익');
  });
  panel(s, ML, 5.2, CW, 1.4, '각주 패널');
  tx(s, G('1년차 각주'), ML + 0.4, 5.2, CW - 0.8, 1.4, { fontSize: 12.5, valign: 'middle' }, '1년차 각주');

  // 3-year chart
  G = g('B', 15);
  s = d.body({ section: '02 매출·손익', label: '02  3개년', title: '3개년 매출·이익 전망', lead: '1년차는 적자이고 2년차부터 흑자로 돌아섭니다. 판매 대수 1만 → 3만 → 6만 대는 모두 가정입니다.', tag: '가정', notes: N(15) });
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
  tx(s, '※ 3년차 매출 54억원은 국내 베개 제조 출하액(577억원)의 약 9%입니다(추정).', ML, 6.35, 7.5, 0.3, { fontSize: 10, color: C.text2 }, '차트 각주');

  // 3-year table
  G = g('B', 16);
  s = d.body({ section: '02 매출·손익', label: '02  손익표', title: '3개년 손익 요약 (억원)', lead: '', tag: '가정', notes: N(16) });
  tableFrom(s, tbl('B', 16), { x: ML, y: 1.7, w: CW, colW: [5.2, 2.18, 2.18, 2.173], rowH: 0.42, align: ['left', 'right', 'right', 'right'], emphRows: [7], fontSize: 12.5, headSize: 11 });
  hair(s, ML, 5.65, CW, HAIR, 0.5);
  tx(s, G('고정비 구성'), ML, 5.75, CW, 0.4, { fontSize: 12, bold: true }, '고정비 구성');
  tx(s, G('자금 설명'), ML, 6.2, CW, 0.4, { fontSize: 12, color: C.text2 }, '자금 설명');

  // sensitivity
  G = g('B', 17);
  s = d.body({ section: '02 매출·손익', label: '02  민감도', title: '가격과 재료비가 이익을 좌우한다', lead: '1년차 영업이익(억원)을 소비자가와 판매 대수, 재료비와 마케팅비 변화로 비교했습니다.', tag: '가정', notes: N(17) });
  tx(s, '소비자가 × 판매 대수 (억원)', ML, 2.25, 6, 0.3, { fontSize: 11, bold: true, color: C.accent2 }, '표 제목 1');
  tableFrom(s, tbl('B', 17, 0), { x: ML, y: 2.6, w: 5.9, colW: [2.3, 1.2, 1.2, 1.2], rowH: 0.5, align: ['left', 'right', 'right', 'right'], boldFirst: true, emphRows: [2], fontSize: 12, headSize: 10.5 });
  tx(s, '변수 변화 (99,000원·1만 대)', 7.2, 2.25, 5, 0.3, { fontSize: 11, bold: true, color: C.accent2 }, '표 제목 2');
  tableFrom(s, tbl('B', 17, 1), { x: 7.2, y: 2.6, w: 5.33, colW: [2.4, 1.5, 1.43], rowH: 0.42, align: ['left', 'right', 'right'], emphRows: [2], fontSize: 12, headSize: 10.5 });
  panel(s, ML, 5.55, CW, 1.05, '결론 패널');
  tx(s, '가격을 올리면 이익이 크게 개선되고, 재료비가 50% 오르면 1대당 남는 돈이 500원으로 줄어듭니다. 부품 견적과 가격 테스트가 첫 번째 할 일입니다.', ML + 0.4, 5.55, CW - 0.8, 1.05, { fontSize: 13, bold: true, valign: 'middle' }, '민감도 결론');

  // ---------------- 03
  d.divider({ section: '03 사회 환원', num: '03', title: '사회 환원 제안', lead: g('B', 18)('Text 0'), notes: '세 번째 질문입니다. 매출의 몇 %를 어떤 방식으로 환원할지, 세법상 문제는 없는지 봅니다.' });

  G = g('B', 19); const G11 = g('R', 11);
  s = d.body({ section: '03 사회 환원', label: '03  기준', title: '기부는 얼마가 적당한가', lead: '국내 평균과 해외 사례를 기준으로 우리 제안은 매출의 0.5%입니다.', tag: '사실', notes: N(19) });
  tx(s, '매출 대비 기부 비율', ML, 2.25, 6, 0.3, { fontSize: 11, bold: true, color: C.accent2 }, '벤치마크 제목');
  hbars(s, [1, 2, 3, 4].map(i => ({ label: G11(`막대 이름 ${i}`), value: parseFloat(G11(`막대 값 ${i}`)), text: G11(`막대 값 ${i}`) })), { x: ML, y: 2.8, labelW: 2.9, trackW: 2.4, gap: 0.78, barH: 0.2, max: 1.0, highlight: 2 });
  tx(s, G11('벤치마크 출처'), ML, 5.95, 6.9, 0.5, { fontSize: 10, color: C.text2 }, '벤치마크 출처');
  [1, 2, 3].forEach(i => {
    const y = 2.25 + (i - 1) * 1.45;
    hair(s, 8.35, y, 4.18, i === 1 ? NAVY : HAIR, i === 1 ? 1.25 : 0.5);
    tx(s, G(`벤치마크 제목 ${i}`), 8.35, y + 0.12, 4.18, 0.32, { fontSize: 14, bold: true }, '기준 제목');
    tx(s, G(`벤치마크 설명 ${i}`), 8.35, y + 0.48, 4.18, 0.95, { fontSize: 10.5, color: C.text2 }, '기준 설명');
  });

  G = g('B', 20);
  s = d.body({ section: '03 사회 환원', label: '03  제안', title: '제안: 매출의 0.5% 환원', lead: '', tag: '가정', notes: N(20) });
  panel(s, ML, 1.75, 5.2, 4.8, '제안 패널', true);
  tx(s, G('제안 앞글'), ML + 0.5, 2.35, 4, 0.4, { fontSize: 16, color: SKY }, '제안 앞글');
  tx(s, G('제안 숫자'), ML + 0.5, 2.85, 4.4, 1.5, { fontSize: 88, bold: true, color: C.background1, valign: 'middle' }, '제안 숫자');
  tx(s, G('제안 이익 대비'), ML + 0.5, 4.55, 4.3, 0.35, { fontSize: 13, bold: true, color: C.accent1 }, '제안 이익 대비');
  tx(s, G('제안 상향 조건'), ML + 0.5, 5.05, 4.3, 0.9, { fontSize: 12.5, color: SKY }, '제안 상향 조건');
  for (let i = 1; i <= 3; i++) {
    const y = 1.75 + (i - 1) * 1.65;
    hair(s, 6.7, y, 5.83, i === 1 ? NAVY : HAIR, i === 1 ? 1.25 : 0.5);
    tx(s, String(i), 6.7, y + 0.2, 0.5, 0.4, { fontSize: 15, bold: true, color: C.accent2 }, '번호');
    tx(s, G(`이유 제목 ${i}`), 7.3, y + 0.2, 5.2, 0.4, { fontSize: 16, bold: true }, '이유 제목');
    tx(s, G(`이유 설명 ${i}`), 7.3, y + 0.65, 5.2, 0.9, { fontSize: 12, color: C.text2 }, '이유 설명');
  }

  G = g('B', 21);
  s = d.body({ section: '03 사회 환원', label: '03  구성', title: '환원 방식과 연도별 금액', lead: '제품·후원금·재능·봉사의 구성 비율(40·30·15·15%)은 우리가 정한 가정입니다. 단위는 만원입니다.', tag: '가정', notes: N(21) });
  stacked(s, [{ v: 40, color: NAVY, short: '제품 기부 40%' }, { v: 30, color: '3B4A73', short: '후원금 30%' }, { v: 15, color: ORANGE, short: '재능 15%', dark: true }, { v: 15, color: 'F2B79F', short: '봉사 15%', dark: true }], { x: ML, y: 2.25, w: CW, h: 0.5, labelSize: 11.5 });
  tableFrom(s, tbl('B', 21), { x: ML, y: 3.0, w: CW, colW: [2.2, 1.4, 1.4, 1.4, 5.333], rowH: 0.45, align: ['left', 'right', 'right', 'right', 'left'], boldFirst: true, emphRows: [5], fontSize: 12, headSize: 10.5 });
  tx(s, G('환원 각주'), ML, 5.95, CW, 0.9, { fontSize: 10, color: C.text2 }, '환원 각주');

  const R12 = g('R', 12);
  s = d.body({ section: '03 사회 환원', label: '03  세법', title: '기부금 한도와 제품 기부', lead: R12('세법 각주'), tag: '사실', notes: notes('R', 12) });
  tableFrom(s, tbl('R', 12), { x: ML, y: 2.2, w: CW, colW: [1.85, 5.5, 3.2, 1.183], rowH: 0.57, boldFirst: true, levelCol: 3, fontSize: 11, headSize: 10.5 });

  // ---------------- 04
  d.divider({ section: '04 리스크·실행', num: '04', title: '리스크와 실행 계획', lead: '출시 전에 풀어야 할 위험과 12개월 로드맵입니다.', notes: '마지막으로 출시 전에 풀어야 할 리스크와 실행 계획을 정리합니다.' });

  G = g('B', 22);
  s = d.body({ section: '04 리스크·실행', label: '04  리스크', title: '출시 전에 풀어야 할 리스크', lead: '수면 중 몸에 닿는 제품이라 안전과 인증이 가장 중요합니다.', notes: N(22) });
  for (let i = 1; i <= 6; i++) {
    const x = ML + ((i - 1) % 3) * 3.98, y = 2.3 + Math.floor((i - 1) / 3) * 2.2;
    hair(s, x, y, 3.6, NAVY, 1.25);
    tx(s, String(i).padStart(2, '0'), x, y + 0.15, 0.7, 0.35, { fontSize: 12, bold: true, color: C.accent2 }, '번호');
    tx(s, G(`리스크 제목 ${i}`), x + 0.7, y + 0.12, 2.8, 0.4, { fontSize: 16, bold: true }, '리스크 제목');
    tx(s, G(`리스크 설명 ${i}`), x, y + 0.65, 3.6, 1.5, { fontSize: 10.5, color: C.text2 }, '리스크 설명');
  }

  G = g('B', 23);
  s = d.body({ section: '04 리스크·실행', label: '04  로드맵', title: '실행 로드맵', lead: '선판매로 수요를 먼저 확인한 뒤 정식 출시와 확장으로 이어가는 계획입니다.', tag: '가정', notes: N(23) });
  for (let i = 1; i <= 4; i++) {
    const x = ML + (i - 1) * 2.98;
    hair(s, x, 2.35, 2.7, i === 1 ? ORANGE : NAVY, 1.25);
    tx(s, G(`로드맵 기간 ${i}`), x, 2.5, 2.7, 0.3, { fontSize: 11, bold: true, color: C.accent2 }, '로드맵 기간');
    tx(s, G(`로드맵 이름 ${i}`), x, 2.85, 2.7, 0.5, { fontSize: 22, bold: true }, '로드맵 이름');
    tx(s, paras(G(`로드맵 항목 ${i}`).split(/\n| \/ /)), x, 3.5, 2.7, 1.5, { fontSize: 12, color: C.text2, paraSpaceAfter: 5 }, '로드맵 항목');
  }
  panel(s, ML, 5.2, CW, 1.4, '검증 패널');
  tx(s, G('검증 제목'), ML + 0.4, 5.32, 4, 0.3, { fontSize: 11, bold: true, color: C.accent2 }, '검증 제목');
  tx(s, G('검증 내용'), ML + 0.4, 5.68, CW - 0.8, 0.85, { fontSize: 12.5 }, '검증 내용');

  const chk = G('검증 내용').split(/\s*[①②③]\s*/).filter(Boolean);
  s = d.closing({ section: '04 리스크·실행', label: '다음 단계', title: '먼저 검증할 세 가지', notes: '다음 단계는 설문, 안전 시험, 특허 조사입니다. 이 세 가지가 확인되기 전까지 우리 숫자는 가정입니다.' });
  chk.forEach((t, i) => {
    const y = 2.4 + i * 1.35;
    hair(s, ML, y, CW, '3B4A73', 0.75);
    tx(s, String(i + 1), ML, y + 0.25, 0.8, 0.8, { fontSize: 36, bold: true, color: C.accent1, valign: 'middle' }, '번호');
    tx(s, t.trim(), ML + 1.1, y + 0.25, 10.4, 0.8, { fontSize: 20, bold: true, color: C.background1, valign: 'middle' }, '검증 항목');
  });

  // ---------------- appendix
  s = d.body({ section: '부록', label: '부록 A', title: '숫자별 신뢰도 점검', lead: '', notes: N(24) });
  tableFrom(s, tbl('B', 24), { x: ML, y: 1.65, w: CW, colW: [2.2, 4.6, 1.3, 3.633], rowH: 0.385, boldFirst: true, levelCol: 2, fontSize: 11, headSize: 10.5 });

  G = g('B', 25);
  s = d.body({ section: '부록', label: '부록 B', title: '주요 가정', lead: '', notes: '이 보고서의 핵심 가정입니다. 가정은 견적과 설문으로 바꿔야 합니다.' });
  const as = G('가정 목록').split(/\n/).filter(Boolean);
  as.forEach((t, i) => {
    const y = 1.75 + i * 0.78;
    hair(s, ML, y, CW, i === 0 ? NAVY : HAIR, i === 0 ? 1.25 : 0.5);
    tx(s, String(i + 1), ML, y + 0.12, 0.5, 0.5, { fontSize: 14, bold: true, color: C.accent2 }, '번호');
    tx(s, t, ML + 0.6, y + 0.1, CW - 0.6, 0.65, { fontSize: 11.5, valign: 'top' }, '가정 항목');
  });

  s = d.body({ section: '부록', label: '부록 C', title: '출처', lead: '', notes: '출처 목록입니다. 링크가 있는 자료는 클릭해서 원문을 확인할 수 있습니다.' });
  sourceList(d, s, SRC, { y: 1.7, fs: 10, gap: 3.5, colW: 5.7, extra: g('R', 15)('출처 각주') });

  await d.finish();
  console.log('ok');
})();
