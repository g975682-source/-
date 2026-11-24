const fs = require('fs');
const { createDoc, NAVY, GRAY, MUTE, HAIR, TRACK, CREAM, ORANGE, ORANGE_TX, GREEN, SKY, ML, CW, MR } = require('./doc');
const C0 = JSON.parse(fs.readFileSync(__dirname + '/content.json', 'utf8')).P;
const OUT = '/home/user/-/MorningPunch_Pitch_3min.pptx';
const MD = '/home/user/-/MorningPunch_Pitch_3min_Script.md';
const d = createDoc({ file: OUT, docName: '3분 발표', title: '모닝펀치 3분 발표' });
const { C, tx, rect, hair, panel, stat, row, hbars, stacked } = d;
const NOTE = i => C0[i].notes;

(async () => {
  // 1 cover
  d.cover({ label: 'MORNING PUNCH', title: '모닝펀치', lead: '베개 속 손이 깨워주는 자동기상베개\n3분 발표', meta: '가상 창업 시나리오  ·  발표용', notes: NOTE(1) });

  // 2 problem
  let s = d.body({ section: '발표', label: '01  문제', title: '늦잠은 정말 흔한 문제일까', lead: '알람을 끄고 다시 잠드는 일은 설문과 앱 기록 양쪽에서 확인됩니다.', tag: '사실', notes: NOTE(2) });
  const ev = [['69%', '알람을 미루거나 여러 개 맞춘다', '스웨덴 설문 1,732명'], ['55.7%', '알람을 쓴 밤에 스누즈를 눌렀다', '미국 수면 앱 약 2.1만 명'], ['32.1%', '지각 이유 1위는 늦잠', '한국 직장인 설문 (2011)']];
  ev.forEach((e, i) => {
    const x = ML + i * 3.98;
    stat(s, { x, y: 2.5, w: 3.5, num: e[0], numSize: 60, label: e[1], note: e[2], noteH: 0.5 });
  });
  panel(s, ML, 5.35, CW, 1.15, '핵심 문장 패널', true);
  tx(s, '소리 대신 손길로 깨운다', ML + 0.4, 5.35, CW - 0.8, 1.15, { fontSize: 26, bold: true, color: C.background1, valign: 'middle' }, '핵심 문장');

  // 3 competition & market
  s = d.body({ section: '발표', label: '02  경쟁과 시장', title: '비슷한 제품과 국내 시장', lead: '손이 나오는 베개와 같은 제품은 확인하지 못했고, 깨우는 방식이 비슷한 제품을 비교했습니다.', tag: '사실', notes: NOTE(3) });
  const cp = [['Clocky', '바퀴로 도망가는 알람시계', '약 $50'], ['Hatch', '빛과 소리로 깨우는 시계', '약 $170'], ['스마트 베개', '센서형 (ZEEQ 등)', '$199 ~ 299']];
  cp.forEach((r, i) => {
    const y = 2.45 + i * 1.12;
    hair(s, ML, y, 6.6, i === 0 ? NAVY : HAIR, i === 0 ? 1.25 : 0.5);
    tx(s, r[0], ML, y + 0.2, 3.2, 0.5, { fontSize: 22, bold: true }, '경쟁 이름');
    tx(s, r[1], ML, y + 0.68, 3.8, 0.35, { fontSize: 13, color: C.text2 }, '경쟁 설명');
    tx(s, r[2], 4.6, y + 0.2, 2.8, 0.7, { fontSize: 26, bold: true, color: C.accent2, align: 'right', valign: 'middle' }, '경쟁 가격');
  });
  hair(s, ML, 2.45 + 3 * 1.12, 6.6, HAIR, 0.5);
  tx(s, 'Hatch는 회사 전체 매출이 연 약 $200M(보도)이며 수면 시계만의 매출은 확인하지 못했습니다.', ML, 5.95, 6.6, 0.6, { fontSize: 11, color: C.text2 }, '경쟁 각주');
  panel(s, 8.1, 2.45, 4.43, 4.05, '시장 패널', true);
  tx(s, '국내 베개 제조 출하액', 8.5, 2.8, 3.7, 0.4, { fontSize: 14, bold: true, color: C.accent1 }, '시장 제목');
  tx(s, '577억원', 8.5, 3.4, 3.7, 1.0, { fontSize: 56, bold: true, color: C.background1, valign: 'middle' }, '시장 숫자');
  tx(s, '통계청 광업제조업조사 2024\n직원 10명 이상 사업체 16개', 8.5, 4.65, 3.7, 0.8, { fontSize: 12.5, color: C.accent6 }, '시장 출처');
  tx(s, '시장 규모가 아닌 공장 출하액입니다.', 8.5, 5.65, 3.7, 0.5, { fontSize: 12.5, bold: true, color: C.background1 }, '시장 주의');

  // 4 unit economics
  s = d.body({ section: '발표', label: '03  1대당 손익', title: '1대를 팔면 얼마가 남을까', lead: '부가세를 뺀 공급가에서 만드는 비용과 파는 비용을 빼면 한 대에 17,500원이 남습니다.', tag: '가정', notes: NOTE(4) });
  const fl = [['99,000원', '소비자가'], ['90,000원', '회사 매출 (부가세 제외)'], ['17,500원', '한 대에 남는 돈'], ['2만 대', '손익분기 판매량']];
  fl.forEach((f, i) => {
    const x = ML + i * 3.0;
    stat(s, { x, y: 2.55, w: 2.7, num: f[0], numSize: 34, label: f[1], numColor: i === 2 ? C.accent2 : C.text1, noteH: 0.1 });
    if (i < 3) tx(s, '›', x + 2.5, 2.5, 0.3, 0.7, { fontSize: 30, color: C.accent4, align: 'center' }, '화살표');
  });
  panel(s, ML, 4.5, CW, 1.9, '계산 패널');
  tx(s, '90,000 − 45,500 (만드는 비용) − 27,000 (파는 비용) = 17,500원', ML + 0.4, 4.7, CW - 0.8, 0.55, { fontSize: 20, bold: true, valign: 'middle' }, '계산 1');
  tx(s, '고정비 3.5억원 ÷ 17,500원 = 20,000대', ML + 0.4, 5.45, CW - 0.8, 0.55, { fontSize: 20, bold: true, color: C.accent2, valign: 'middle' }, '계산 2');

  // 5 three-year
  s = d.body({ section: '발표', label: '04  전망', title: '3년 매출·이익 전망', lead: '1년차는 적자, 2년차부터 흑자가 되는 계획입니다. 판매 대수는 모두 가정입니다.', tag: '가정', notes: NOTE(5) });
  const yrs = [['1년차', 9, '-1.75'], ['2년차', 27, '+1.14'], ['3년차', 54, '+6.26']];
  const base = 5.55, maxH = 2.7;
  hair(s, ML, base, 7.0, MUTE, 0.75, '기준선');
  yrs.forEach((y, i) => {
    const h = Math.max(0.25, y[1] / 54 * maxH), x = ML + 0.5 + i * 2.25;
    rect(s, x, base - h, 1.3, h, i === 2 ? ORANGE : NAVY, `막대 ${i + 1}`);
    tx(s, `${y[1]}억`, x - 0.3, base - h - 0.5, 1.9, 0.45, { fontSize: 22, bold: true, align: 'center', valign: 'middle' }, `막대 값 ${i + 1}`);
    tx(s, y[0], x - 0.3, base + 0.1, 1.9, 0.3, { fontSize: 13, bold: true, align: 'center' }, `막대 이름 ${i + 1}`);
    tx(s, `영업이익 ${y[2]}억`, x - 0.4, base + 0.42, 2.1, 0.3, { fontSize: 12, bold: true, align: 'center', color: i === 0 ? C.accent2 : C.accent3 }, `막대 이익 ${i + 1}`);
  });
  tx(s, '매출 (억원)', ML, 2.35, 3, 0.3, { fontSize: 11, color: C.text2 }, '축 이름');
  stat(s, { x: 8.7, y: 2.45, w: 3.8, num: '54억원', numSize: 44, numColor: C.accent2, label: '3년차 매출 목표', note: '국내 베개 제조 출하액(577억원)의 약 9%라서 쉬운 목표가 아닙니다.', noteH: 0.9 });
  stat(s, { x: 8.7, y: 4.75, w: 3.8, num: '1만 → 6만 대', numSize: 26, label: '판매 대수 (1년차 → 3년차)', note: '모두 우리가 정한 가정입니다.', noteH: 0.6 });

  // 6 CSR
  s = d.body({ section: '발표', label: '05  사회 환원', title: '매출의 0.5%를 사회에 돌려줍니다', lead: '이익이 아닌 매출 기준이라 적자인 해에도 지킬 수 있는 약속입니다.', tag: '가정', notes: NOTE(6) });
  hbars(s, [{ label: '국내 100대 기업 평균', value: 0.12, text: '0.12%' }, { label: '필수소비재 업종', value: 0.52, text: '0.52%' }, { label: '모닝펀치 제안', value: 0.5, text: '0.5%' }, { label: 'Patagonia', value: 1.0, text: '1.0%' }], { x: ML, y: 2.6, labelW: 2.5, trackW: 4.6, gap: 0.78, barH: 0.22, max: 1.0, highlight: 2, labelSize: 14, valSize: 16 });
  tx(s, '출처: 2024 사회공헌백서(2023년, 90개사), Patagonia', ML, 5.65, 8, 0.3, { fontSize: 10.5, color: C.text2 }, '벤치마크 출처');
  stat(s, { x: 9.3, y: 2.45, w: 3.2, num: '450만원', numSize: 40, numColor: C.accent2, label: '1년차 환원액', note: '매출 9억원 × 0.5%', noteH: 0.5 });
  tx(s, '환원 구성', ML, 6.0, 1.6, 0.3, { fontSize: 11, bold: true, color: C.text2 }, '구성 제목');
  stacked(s, [{ v: 40, color: NAVY, name: '제품 기부 40%' }, { v: 30, color: ORANGE, name: '후원금 30%' }, { v: 15, color: GRAY, name: '재능 15%' }, { v: 15, color: MUTE, name: '봉사 15%' }], { x: 2.4, y: 5.95, w: 10.13, h: 0.4, labelSize: 11 });

  // 7 closing
  s = d.closing({ section: '발표', label: '06  정리', title: '정리와 다음 단계', notes: NOTE(7) });
  const cl = [['01', '숫자의 대부분은 가정', '판매 대수·원가·고정비는 견적과 설문으로 바꿔야 합니다.'], ['02', '찾지 못한 것', '최근 한국 설문, PL 보험료, 부품 대량 견적'], ['03', '다음 단계', '소비자 설문 · 부품 견적 · 인증 품목 분류 · 세무 확인']];
  cl.forEach((c, i) => {
    const y = 2.6 + i * 1.3;
    hair(s, ML, y, CW, '3A4460', 0.75);
    tx(s, c[0], ML, y + 0.3, 0.9, 0.5, { fontSize: 18, bold: true, color: C.accent1 }, '정리 번호');
    tx(s, c[1], ML + 1.0, y + 0.3, 4.2, 0.6, { fontSize: 22, bold: true, color: C.background1 }, '정리 제목');
    tx(s, c[2], ML + 5.4, y + 0.34, CW - 5.4, 0.7, { fontSize: 15, color: C.accent6 }, '정리 설명');
  });
  tx(s, '감사합니다', ML, 6.55, 5, 0.4, { fontSize: 16, bold: true, color: C.background1 }, '마무리 인사');

  await d.finish();

  // script
  const SEC = [10, 30, 35, 35, 30, 30, 20]; const titles = ['표지', '문제', '경쟁과 시장', '1대당 손익', '3년 전망', '사회 환원', '마무리'];
  const sc = [1, 2, 3, 4, 5, 6, 7].map(i => C0[i].notes);
  const total = sc.reduce((a, t) => a + t.replace(/\s/g, '').length, 0);
  let md = `# 모닝펀치 3분 발표 대본\n\n분당 300자(공백 제외) 기준 약 ${(total / 300).toFixed(1)}분, 공백 제외 ${total}자입니다. 슬라이드 7장, 각 시간은 대략의 안내입니다.\n\n`;
  sc.forEach((t, i) => { md += `## ${i + 1}. ${titles[i]} (약 ${SEC[i]}초)\n\n${t}\n\n`; });
  md += '## 발표 팁\n\n- 숫자는 "가정"인지 "확인한 사실"인지 함께 말하세요.\n- Hatch와 577억원은 "회사 전체 매출", "시장 규모가 아닌 출하액"이라는 단서를 꼭 붙이세요.\n- 시간이 부족하면 3번(경쟁과 시장)의 Clocky 설명을 줄이세요.\n';
  fs.writeFileSync(MD, md, 'utf8');
  console.log('done', total);
})();
