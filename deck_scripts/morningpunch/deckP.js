const fs = require('fs');
const { createDoc, NAVY, GRAY, MUTE, HAIR, TRACK, CREAM, ORANGE, ORANGE_TX, SKY, ML, CW, MR } = require('./doc');
const OUT = '/home/user/-/MorningPunch_Pitch_3min.pptx';
const MD = '/home/user/-/MorningPunch_Pitch_3min_Script.md';
const d = createDoc({ file: OUT, docName: '3분 발표', title: '모닝펀치 3분 발표' });
const { C, tx, rect, hair, panel, stat, hbars, stacked } = d;

const SCRIPT = [
  ['표지', 12, '안녕하세요, 저는 ○○○입니다. 오늘은 우리가 가상으로 만든 회사 모닝펀치, 아침마다 베개 속 손이 깨워주는 자동기상베개를 3분 동안 소개하겠습니다.'],
  ['문제와 해법', 46, '알람을 끄고 다시 자는 일은 흔합니다. 스웨덴 설문에서는 69%가 알람을 미루거나 여러 개 맞춰 뒀고, 미국 수면 앱에서는 알람을 쓴 밤의 55.7%에서 스누즈를 눌렀습니다. 한국 설문은 2011년 것뿐이지만 지각 이유 1위가 늦잠이었습니다. 이 조사들은 스누즈가 해롭다는 뜻이 아니라 알람을 미루는 일이 흔하다는 뜻입니다. 그래서 소리 대신 손길로 깨웁니다. 평소엔 베개 옆면에 접혀 있던 로봇팔이 알람이 울리면 관절 두 개로 펼쳐지고, 끝의 푹신한 손 모양 패드가 쿠션을 가볍게 두드립니다. 세탁할 때는 분리할 수 있습니다.'],
  ['경쟁과 시장', 38, '비슷한 제품으로는 도망가는 알람시계 Clocky가 약 50달러, 빛으로 깨우는 Hatch가 약 170달러, 센서형 스마트 베개가 199에서 299달러입니다. 다만 Hatch는 아기 제품까지 포함한 회사 전체 매출이 연 약 2억 달러로 보도됐고, 수면 시계만의 매출은 알 수 없습니다. 손이 나오는 베개와 같은 제품은 이번 조사에서 확인하지 못했습니다. 국내 베개 제조 출하액은 577억 원이지만, 시장 규모가 아니라 공장 출하액입니다.'],
  ['돈: 1대당 손익과 3년 전망', 46, '이제 돈 이야기입니다. 소비자가는 99,000원이고 부가세를 뺀 회사 매출은 90,000원입니다. 재료비는 한 대 34,000원으로 가정했고, 만드는 비용과 파는 비용을 모두 빼면 한 대에 17,500원이 남습니다. 고정비 3.5억 원을 메우려면 2만 대를 팔아야 손익분기입니다. 그래서 1년차는 1만 대, 매출 9억 원으로 1.75억 원 적자이고, 2년차부터 흑자, 3년차에는 매출 54억 원, 영업이익률 11.6%입니다. 모두 우리가 정한 가정입니다.'],
  ['사회 환원과 다음 단계', 38, '마지막은 사회 환원입니다. 국내 100대 기업 평균은 매출의 0.12%, 필수소비재 업종은 0.52%, Patagonia는 1%입니다. 우리는 매출의 0.5%를 제안합니다. 1년차는 적자라 이익이 아니라 매출 기준으로 정했고, 금액은 450만 원입니다. 이를 제품 40%, 후원금 30%, 재능기부와 봉사 각 15%로 나눕니다. 다음 단계는 소비자 설문, 부품 견적과 안전 시험, 특허 조사입니다. 감사합니다.'],
];
const NOTE = i => SCRIPT[i][2];

(async () => {
  // 1 cover
  d.cover({ label: 'MORNING PUNCH', title: [{ text: '베개 속 손이', options: { breakLine: true } }, { text: '깨워주는', options: { breakLine: true } }, { text: '모닝펀치', options: { color: C.accent1 } }], lead: '자동기상베개 · 3분 발표', meta: '가상 창업 시나리오  ·  발표용', notes: NOTE(0) });

  // 2 problem + solution
  let s = d.body({ section: '발표', label: '01  문제와 해법', title: '알람은 끄면 끝, 손길은 다릅니다', lead: '알람을 미루는 일은 흔하고, 모닝펀치는 소리 대신 촉각으로 깨웁니다.', tag: '사실', notes: NOTE(1) });
  [['69%', '알람을 미루거나 여러 개 맞춘다', '스웨덴 설문 1,732명'], ['55.7%', '알람을 쓴 밤에 스누즈를 눌렀다', '미국 수면 앱 약 2.1만 명'], ['32.1%', '지각 이유 1위는 늦잠', '한국 직장인 설문 (2011)']].forEach((e, i) => {
    const y = 2.25 + i * 1.15;
    hair(s, ML, y, 6.3, i === 0 ? NAVY : HAIR, i === 0 ? 1.25 : 0.5);
    tx(s, e[0], ML, y + 0.14, 2.1, 0.8, { fontSize: 38, bold: true, valign: 'middle' }, '큰 숫자');
    tx(s, e[1], ML + 2.25, y + 0.2, 4.0, 0.35, { fontSize: 14, bold: true }, '숫자 라벨');
    tx(s, e[2], ML + 2.25, y + 0.58, 4.0, 0.3, { fontSize: 11.5, color: C.text2 }, '숫자 출처');
  });
  s.addShape(d.pres.ShapeType.ellipse, { x: 8.55, y: 2.2, w: 3.2, h: 3.2, fill: { color: 'FFFFFF', transparency: 100 }, line: { color: NAVY, width: 1 }, objectName: '그림 원형 테두리' });
  s.addImage({ path: __dirname + '/assets/illus.png', x: 8.8, y: 2.45, w: 2.7, h: 2.7, rounding: true, altText: '접힌 로봇팔이 펼쳐져 손 모양 패드로 베개를 두드리는 그림', objectName: '제품 그림' });
  tx(s, '접힌 팔이 펼쳐져 손 패드가 쿠션을 톡톡', 7.4, 5.5, 5.5, 0.3, { fontSize: 13, bold: true, align: 'center' }, '그림 설명');
  panel(s, ML, 5.95, CW, 0.7, '핵심 문장 패널', true);
  tx(s, '소리 대신 손길로 깨운다', ML + 0.4, 5.95, 8, 0.7, { fontSize: 20, bold: true, color: C.background1, valign: 'middle' }, '핵심 문장');

  // 3 competition + market
  s = d.body({ section: '발표', label: '02  경쟁과 시장', title: '비슷한 제품과 국내 시장', lead: '손이 나오는 베개와 같은 제품은 확인하지 못했고, 깨우는 방식이 비슷한 제품을 비교했습니다.', tag: '사실', notes: NOTE(2) });
  [['Clocky', '바퀴로 도망가는 알람시계', '약 $50'], ['Hatch', '빛과 소리로 깨우는 시계', '약 $170'], ['스마트 베개', '센서형 (ZEEQ 등)', '$199 ~ 299']].forEach((r, i) => {
    const y = 2.4 + i * 1.12;
    hair(s, ML, y, 6.6, i === 0 ? NAVY : HAIR, i === 0 ? 1.25 : 0.5);
    tx(s, r[0], ML, y + 0.2, 3.2, 0.5, { fontSize: 22, bold: true }, '경쟁 이름');
    tx(s, r[1], ML, y + 0.68, 3.8, 0.35, { fontSize: 13, color: C.text2 }, '경쟁 설명');
    tx(s, r[2], 4.6, y + 0.2, 2.8, 0.7, { fontSize: 26, bold: true, color: C.accent2, align: 'right', valign: 'middle' }, '경쟁 가격');
  });
  hair(s, ML, 2.4 + 3 * 1.12, 6.6, HAIR, 0.5);
  tx(s, 'Hatch는 회사 전체 매출이 연 약 $200M(보도)이며 수면 시계만의 매출은 확인하지 못했습니다.', ML, 5.95, 6.6, 0.6, { fontSize: 11, color: C.text2 }, '경쟁 각주');
  panel(s, 8.1, 2.4, 4.43, 4.15, '시장 패널', true);
  tx(s, '국내 베개 제조 출하액', 8.5, 2.75, 3.4, 0.4, { fontSize: 14, bold: true, color: C.accent6 }, '시장 제목');
  tx(s, '577억원', 8.5, 3.35, 3.7, 1.0, { fontSize: 56, bold: true, color: C.background1, valign: 'middle' }, '시장 숫자');
  tx(s, '통계청 광업제조업조사 2024\n직원 10명 이상 사업체 16개', 8.5, 4.6, 3.7, 0.8, { fontSize: 12.5, color: C.accent6 }, '시장 출처');
  tx(s, '시장 규모가 아닌 공장 출하액입니다.', 8.5, 5.6, 3.7, 0.5, { fontSize: 12.5, bold: true, color: C.background1 }, '시장 주의');

  // 4 money
  s = d.body({ section: '발표', label: '03  돈', title: '한 대에 17,500원, 3년 뒤 매출 54억원', lead: '부가세를 뺀 공급가에서 비용을 빼면 17,500원이 남고, 2만 대부터 손익분기입니다.', tag: '가정', notes: NOTE(3) });
  [['99,000원', '소비자가'], ['90,000원', '회사 매출 (부가세 제외)'], ['17,500원', '한 대에 남는 돈'], ['2만 대', '손익분기 판매량']].forEach((f, i) => {
    const x = ML + i * 3.0;
    stat(s, { x, y: 2.1, w: 2.7, num: f[0], numSize: 30, label: f[1], numColor: i === 2 ? C.accent2 : C.text1, noteH: 0.1 });
    if (i < 3) tx(s, '›', x + 2.5, 2.05, 0.3, 0.6, { fontSize: 26, color: C.accent4, align: 'center' }, '화살표');
  });
  hair(s, ML, 3.3, CW, HAIR, 0.5);
  tx(s, '매출 (억원) · 영업이익', ML, 3.45, 4, 0.3, { fontSize: 11, bold: true, color: C.accent2 }, '차트 제목');
  const yrs = [['1년차', 9, '-1.75'], ['2년차', 27, '+1.14'], ['3년차', 54, '+6.26']];
  const base = 5.95, maxH = 1.85;
  hair(s, ML, base, 6.9, MUTE, 0.75, '기준선');
  yrs.forEach((y, i) => {
    const h = Math.max(0.2, y[1] / 54 * maxH), x = ML + 0.6 + i * 2.2;
    rect(s, x, base - h, 1.2, h, i === 2 ? ORANGE : NAVY, `매출 막대 ${i + 1}`);
    tx(s, `${y[1]}억`, x - 0.3, base - h - 0.36, 1.8, 0.32, { fontSize: 15, bold: true, align: 'center' }, '막대 값');
    tx(s, `${y[0]}  ·  ${y[2]}억`, x - 0.4, base + 0.08, 2.0, 0.28, { fontSize: 11.5, bold: true, align: 'center', color: y[2][0] === '-' ? C.accent3 : C.text1 }, '연차와 영업이익');
  });
  [['판매 대수', '1만 → 3만 → 6만 대'], ['흑자 전환', '2년차 +1.14억원'], ['3년차 영업이익률', '11.6%']].forEach((r, i) => {
    const y = 3.5 + i * 1.05;
    hair(s, 8.55, y, 3.98, i === 2 ? ORANGE : NAVY, 1.25);
    tx(s, r[0], 8.55, y + 0.1, 3.98, 0.28, { fontSize: 11, bold: true, color: C.text2 }, '항목');
    tx(s, r[1], 8.55, y + 0.4, 3.98, 0.55, { fontSize: 24, bold: true, color: i === 2 ? C.accent2 : C.text1, valign: 'middle' }, '값');
  });
  tx(s, '※ 판매 대수·원가·고정비는 모두 우리가 정한 가정입니다.', ML, 6.52, 8, 0.28, { fontSize: 10, color: C.text2 }, '가정 각주');

  // 5 CSR + next steps
  s = d.body({ section: '발표', label: '04  사회 환원', title: '매출의 0.5%를 사회에 돌려줍니다', lead: '이익이 아닌 매출 기준이라 적자인 해에도 지킬 수 있는 약속입니다.', tag: '가정', notes: NOTE(4) });
  hbars(s, [{ label: '국내 100대 기업 평균', value: 0.12, text: '0.12%' }, { label: '필수소비재 업종', value: 0.52, text: '0.52%' }, { label: '모닝펀치 제안', value: 0.5, text: '0.5%' }, { label: 'Patagonia', value: 1.0, text: '1.0%' }], { x: ML, y: 2.3, labelW: 2.7, trackW: 3.4, gap: 0.62, barH: 0.2, max: 1.0, highlight: 2 });
  tx(s, '출처: 2024 사회공헌백서(2023년, 90개사), Patagonia', ML, 4.7, 7.5, 0.3, { fontSize: 10, color: C.text2 }, '벤치마크 출처');
  stat(s, { x: 8.55, y: 2.15, w: 3.98, num: '450만원', numSize: 40, numColor: C.accent2, label: '1년차 환원액 (매출 9억원 × 0.5%)', noteH: 0.1 });
  stacked(s, [{ v: 40, color: NAVY, short: '제품 40%' }, { v: 30, color: '3B4A73', short: '후원금 30%' }, { v: 15, color: ORANGE, short: '재능 15', dark: false }, { v: 15, color: 'A9C6EE', short: '봉사 15', dark: true }], { x: 8.55, y: 3.75, w: 3.98, h: 0.5, labelSize: 10 });
  panel(s, ML, 5.3, CW, 1.3, '다음 단계 패널', true);
  tx(s, '다음 단계', ML + 0.4, 5.42, 2, 0.3, { fontSize: 11, bold: true, color: C.accent6 }, '다음 단계 제목');
  ['소비자 설문 (9.9만원 지불 의사)', '부품 견적과 안전 시험', '유사 특허 조사'].forEach((t, i) => {
    const x = ML + 0.4 + i * 3.75;
    tx(s, String(i + 1), x, 5.8, 0.4, 0.55, { fontSize: 26, bold: true, color: C.accent1, valign: 'middle' }, '번호');
    tx(s, t, x + 0.5, 5.8, 3.0, 0.55, { fontSize: 13, bold: true, color: C.background1, valign: 'middle' }, '다음 단계 항목');
  });

  await d.finish();

  const cnt = t => t.replace(/\s/g, '').length;
  const total = SCRIPT.reduce((a, r) => a + cnt(r[2]), 0);
  let md = `# 모닝펀치 3분 발표 대본\n\n슬라이드 ${SCRIPT.length}장. 분당 300자(공백 제외) 기준으로 공백 제외 ${total}자, 약 ${(total / 300).toFixed(1)}분입니다. 각 슬라이드 시간은 대략의 안내입니다.\n\n`;
  SCRIPT.forEach((r, i) => { md += `## 슬라이드 ${i + 1}. ${r[0]} (약 ${r[1]}초, ${cnt(r[2])}자)\n\n${r[2]}\n\n`; });
  md += '## 발표 팁\n\n- 숫자는 "확인한 사실"인지 "우리가 정한 가정"인지 함께 말하세요. 4번 슬라이드의 숫자는 모두 가정입니다.\n- Hatch는 "회사 전체 매출", 577억 원은 "시장 규모가 아닌 출하액"이라는 단서를 꼭 붙이세요.\n- 3번 슬라이드에서 "같은 제품이 없다"고 단정하지 말고 "이번 조사에서 확인하지 못했다"고 말하세요.\n- 발표자 이름을 소개하려면 1번 슬라이드 대본 맨 앞에 넣으세요.\n';
  fs.writeFileSync(MD, md, 'utf8');
  console.log('done', total, SCRIPT.map(r => cnt(r[2])));
})();
