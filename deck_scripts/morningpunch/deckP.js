const fs = require('fs');
const { createDoc, NAVY, GRAY, MUTE, HAIR, TRACK, CREAM, ORANGE, ORANGE_TX, SKY, ML, CW, MR } = require('./doc');
const OUT = '/home/user/-/MorningPunch_Pitch_3min.pptx';
const MD = '/home/user/-/MorningPunch_Pitch_3min_Script.md';
const d = createDoc({ file: OUT, docName: '3분 발표', title: '모닝펀치 3분 발표' });
const { C, tx, rect, hair, panel, stat, row, hbars, stacked } = d;

const SCRIPT = [
  ['표지', 10, '안녕하세요, ○○○입니다. 오늘은 아침마다 베개 속 손이 깨워주는 자동기상베개, 모닝펀치를 소개하겠습니다.'],
  ['문제', 35, '여러분, 알람을 끄고 "5분만 더" 했다가 지각할 뻔한 적 있으시죠? 저만 그런 게 아닙니다. 스웨덴 설문에서는 69%가 알람을 미루거나 여러 개 맞춰 뒀고, 미국 수면 앱에서는 알람을 쓴 밤의 절반이 넘는 55.7%에서 스누즈를 눌렀고, 평균 10.8분을 더 미뤘습니다. 한국 설문은 2011년 것뿐이지만 지각 이유 1위도 늦잠이었습니다. 알람은 소리라서, 끄면 끝입니다.'],
  ['해법: 모닝펀치', 45, '그래서 모닝펀치는 소리 대신 손길로 깨웁니다. 평소에는 베개 옆면 수납부에 로봇팔이 접혀 있습니다. 알람이 울리면 관절 두 개가 움직이며 팔이 펼쳐지고, 끝의 푹신한 손 모양 패드가 쿠션을 가볍게 두드립니다. 자는 동안 몸에 닿는 제품이라 힘 제한과 정지 센서를 넣을 계획이고, 세탁할 때는 팔을 분리할 수 있습니다. 소리는 끌 수 있어도, 손길은 모른 척하기 어렵습니다.'],
  ['경쟁과 시장', 25, '비슷한 제품으로는 소리로 도망가는 Clocky, 빛으로 깨우는 Hatch, 센서형 스마트 베개가 있고, 가격은 약 50달러에서 300달러 사이입니다. 모두 소리, 빛, 진동이 중심이고, 베개에서 손이 나와 두드리는 제품은 이번 조사에서 확인하지 못했습니다. 국내 베개 제조 출하액은 577억 원인데, 시장 규모가 아니라 공장 출하액입니다.'],
  ['돈', 35, '수익은 이렇게 계산했습니다. 소비자가 99,000원에서 부가세와 비용을 모두 빼면 한 대에 17,500원이 남습니다. 고정비 3.5억 원을 17,500원으로 나누면 2만 대가 손익분기라서 1년차는 적자지만, 2년차부터 흑자로 돌아서고 3년차에는 매출 54억 원, 영업이익률 11.6%를 계획합니다. 이 숫자는 모두 우리가 정한 가정이고, 설문과 부품 견적으로 확인할 예정입니다.'],
  ['사회 환원과 마무리', 30, '번 돈은 사회와 나눕니다. 국내 100대 기업 평균이 매출의 0.12%인데, 우리는 매출의 0.5%를 제품, 후원금, 재능기부, 봉사로 돌려드립니다. 이익이 아니라 매출 기준이라 적자인 해에도 지킬 수 있는 약속입니다. 다음은 소비자 설문, 부품 견적과 안전 시험, 특허 조사입니다. 모닝펀치, 소리 대신 손길로 깨웁니다. 감사합니다.'],
];
const NOTE = i => SCRIPT[i][2];

(async () => {
  // 1 cover
  d.cover({ label: 'MORNING PUNCH', title: [{ text: '베개 속 손이', options: { breakLine: true } }, { text: '깨워주는', options: { breakLine: true } }, { text: '모닝펀치', options: { color: C.accent1 } }], lead: '자동기상베개 · 3분 발표', meta: '가상 창업 시나리오  ·  발표용', notes: NOTE(0) });

  // 2 problem (hook + evidence)
  let s = d.body({ section: '발표', label: '01  문제', title: '알람 끄고 "5분만 더", 해본 적 있나요?', lead: '알람을 미루는 일은 해외 조사와 한국 설문 모두에서 확인됩니다.', tag: '사실', notes: NOTE(1) });
  [['69%', '알람을 미루거나 여러 개 맞춘다', '스웨덴 설문 1,732명'], ['55.7%', '알람을 쓴 밤에 스누즈를 눌렀다', '미국 수면 앱 약 2.1만 명'], ['32.1%', '지각 이유 1위는 늦잠', '한국 직장인 설문 (2011)']].forEach((e, i) => {
    const x = ML + i * 3.98;
    hair(s, x, 2.3, 3.6, NAVY, 1.25);
    tx(s, e[0], x, 2.45, 3.6, 1.0, { fontSize: 56, bold: true, valign: 'middle' }, '큰 숫자');
    tx(s, e[1], x, 3.55, 3.6, 0.35, { fontSize: 13.5, bold: true, color: C.accent2 }, '숫자 라벨');
    tx(s, e[2], x, 3.95, 3.6, 0.3, { fontSize: 12, color: C.text2 }, '숫자 출처');
  });
  panel(s, ML, 5.1, CW, 1.4, '핵심 문장 패널', true);
  tx(s, '알람은 소리라서, 끄면 끝입니다', ML + 0.5, 5.1, 9, 1.4, { fontSize: 28, bold: true, color: C.background1, valign: 'middle' }, '핵심 문장');

  // 3 solution / product
  s = d.body({ section: '발표', label: '02  해법', title: '소리 대신 손길로 깨우는 모닝펀치', lead: '접혀 있던 로봇팔이 펼쳐져, 손 모양 패드가 쿠션을 가볍게 두드립니다.', tag: '가정', notes: NOTE(2) });
  s.addShape(d.pres.ShapeType.ellipse, { x: 0.8, y: 2.0, w: 4.7, h: 4.7, fill: { color: 'FFFFFF', transparency: 100 }, line: { color: NAVY, width: 1 }, objectName: '그림 원형 테두리' });
  s.addImage({ path: __dirname + '/assets/illus.png', x: 1.1, y: 2.3, w: 4.1, h: 4.1, rounding: true, altText: '접힌 로봇팔이 펼쳐져 손 모양 패드로 베개를 두드리는 그림', objectName: '제품 그림' });
  tx(s, '작동 방식', 6.2, 2.05, 3, 0.28, { fontSize: 10.5, bold: true, color: C.accent2 }, '작동 라벨');
  [['1', '평소: 접혀 있다', '베개 옆면 수납부에 로봇팔이 접혀 들어가 있습니다.'], ['2', '알람: 펼쳐진다', '관절 두 개가 움직이며 팔이 펼쳐집니다.'], ['3', '기상: 두드린다', '손 모양 푹신한 패드가 쿠션을 가볍게 두드립니다.']].forEach((r, i) => {
    const y = 2.4 + i * 0.85;
    hair(s, 6.2, y, 6.33, i === 0 ? NAVY : HAIR, i === 0 ? 1.25 : 0.5);
    row(s, { x: 6.2, y: y + 0.12, w: 6.33, idx: r[0], title: r[1], desc: r[2], h: 0.7, titleSize: 15, descSize: 12 });
  });
  tx(s, '제품 구조', 6.2, 5.05, 3, 0.28, { fontSize: 10.5, bold: true, color: C.accent2 }, '구조 라벨');
  ['옆면 수납부', '관절 2개', '손 모양 패드', '세탁 시 분리'].forEach((t, i) => {
    const x = 6.2 + i * 1.62;
    s.addShape(d.pres.ShapeType.roundRect, { x, y: 5.4, w: 1.5, h: 0.36, rectRadius: 0.18, fill: { color: 'FFFFFF' }, line: { color: NAVY, width: 0.9 }, objectName: '구조 태그 틀' });
    tx(s, t, x, 5.4, 1.5, 0.36, { fontSize: 11.5, bold: true, align: 'center', valign: 'middle' }, '구조 태그');
  });
  tx(s, '안전(우리 설계 가정): 힘 제한 · 장애물 정지 센서 · 전원 차단', 6.2, 5.92, 6.3, 0.28, { fontSize: 11, color: C.text2 }, '안전 문구');
  panel(s, 6.2, 6.3, 6.33, 0.5, '핵심 문장 패널', true);
  tx(s, '소리는 끌 수 있어도, 손길은 모른 척하기 어렵다', 6.5, 6.3, 5.4, 0.5, { fontSize: 13, bold: true, color: C.background1, valign: 'middle' }, '핵심 문장');

  // 4 competition + market
  s = d.body({ section: '발표', label: '03  경쟁과 시장', title: '비슷한 제품은 소리·빛·센서가 중심', lead: '손이 나오는 베개와 같은 제품은 이번 조사에서 확인하지 못했습니다.', tag: '사실', notes: NOTE(3) });
  [['Clocky', '바퀴로 도망가는 알람시계 (소리)', '약 $50'], ['Hatch', '빛과 소리로 서서히 깨움', '약 $170'], ['스마트 베개', '센서로 진동·빛·소리 (ZEEQ 등)', '$199 ~ 299'], ['모닝펀치', '접힌 팔이 쿠션을 두드림 (촉각)', '$71 (가정)']].forEach((r, i) => {
    const y = 2.3 + i * 0.95, last = i === 3;
    if (last) rect(s, ML, y + 0.04, 6.6, 0.87, CREAM, '우리 제품 행 배경');
    hair(s, ML, y, 6.6, i === 0 ? NAVY : HAIR, i === 0 ? 1.25 : 0.5);
    tx(s, r[0], ML + 0.15, y + 0.12, 2.0, 0.7, { fontSize: 18, bold: true, valign: 'middle', color: last ? C.accent2 : C.text1 }, '경쟁 이름');
    tx(s, r[1], ML + 2.25, y + 0.12, 2.5, 0.7, { fontSize: 12.5, color: C.text1, valign: 'middle' }, '깨우는 방식');
    tx(s, r[2], ML + 4.7, y + 0.12, 1.75, 0.7, { fontSize: 18, bold: true, color: C.accent2, align: 'right', valign: 'middle' }, '가격');
  });
  hair(s, ML, 2.3 + 4 * 0.95, 6.6, HAIR, 0.5);
  tx(s, 'Hatch는 회사 전체 매출이 연 약 $200M(보도)이며 수면 시계만의 매출은 확인하지 못했습니다.', ML, 6.25, 6.6, 0.5, { fontSize: 10.5, color: C.text2 }, '경쟁 각주');
  panel(s, 8.1, 2.3, 4.43, 4.2, '시장 패널', true);
  tx(s, '국내 베개 제조 출하액', 8.5, 2.65, 3.4, 0.4, { fontSize: 14, bold: true, color: C.accent6 }, '시장 제목');
  tx(s, '577억원', 8.5, 3.25, 3.7, 1.0, { fontSize: 56, bold: true, color: C.background1, valign: 'middle' }, '시장 숫자');
  tx(s, '통계청 광업제조업조사 2024\n직원 10명 이상 사업체 16개', 8.5, 4.5, 3.7, 0.8, { fontSize: 12.5, color: C.accent6 }, '시장 출처');
  tx(s, '시장 규모가 아닌 공장 출하액입니다.', 8.5, 5.5, 3.7, 0.5, { fontSize: 12.5, bold: true, color: C.background1 }, '시장 주의');

  // 5 money (three numbers)
  s = d.body({ section: '발표', label: '04  돈', title: '한 대에 17,500원, 3년 뒤 매출 54억원', lead: '1년차는 적자이고 2년차부터 흑자로 돌아서는 계획입니다.', tag: '가정', notes: NOTE(4) });
  tx(s, '매출 (억원)  ·  영업이익', ML, 2.15, 5, 0.3, { fontSize: 11, bold: true, color: C.accent2 }, '차트 제목');
  const yrs = [['1년차', 9, '-1.75'], ['2년차', 27, '+1.14'], ['3년차', 54, '+6.26']];
  const base = 5.85, maxH = 3.0;
  hair(s, ML, base, 6.9, MUTE, 0.75, '기준선');
  yrs.forEach((y, i) => {
    const h = Math.max(0.2, y[1] / 54 * maxH), x = ML + 0.6 + i * 2.2;
    rect(s, x, base - h, 1.2, h, i === 2 ? ORANGE : NAVY, `매출 막대 ${i + 1}`);
    tx(s, `${y[1]}억`, x - 0.3, base - h - 0.45, 1.8, 0.4, { fontSize: 20, bold: true, align: 'center' }, '막대 값');
    tx(s, `${y[0]}  ·  ${y[2]}억`, x - 0.4, base + 0.1, 2.0, 0.3, { fontSize: 12, bold: true, align: 'center', color: y[2][0] === '-' ? C.accent3 : C.text1 }, '연차와 영업이익');
  });
  [['17,500원', '한 대에 남는 돈', '소비자가 99,000원 − 부가세 − 비용'], ['2만 대', '손익분기 판매량', '고정비 3.5억원 ÷ 17,500원'], ['11.6%', '3년차 영업이익률', '판매 1만 → 3만 → 6만 대']].forEach((r, i) => {
    const y = 2.2 + i * 1.4;
    hair(s, 8.55, y, 3.98, i === 0 ? ORANGE : NAVY, 1.25);
    tx(s, r[0], 8.55, y + 0.1, 3.98, 0.65, { fontSize: 32, bold: true, color: i === 0 ? C.accent2 : C.text1, valign: 'middle' }, '큰 숫자');
    tx(s, r[1], 8.55, y + 0.78, 3.98, 0.28, { fontSize: 12.5, bold: true }, '숫자 라벨');
    tx(s, r[2], 8.55, y + 1.05, 3.98, 0.25, { fontSize: 10.5, color: C.text2 }, '숫자 설명');
  });
  tx(s, '※ 판매 대수·원가·고정비는 모두 우리가 정한 가정입니다.', ML, 6.55, 8, 0.28, { fontSize: 10, color: C.text2 }, '가정 각주');

  // 6 CSR + closing
  s = d.body({ section: '발표', label: '05  사회 환원', title: '번 돈의 0.5%를 사회와 나눕니다', lead: '이익이 아닌 매출 기준이라 적자인 해에도 지킬 수 있는 약속입니다.', tag: '가정', notes: NOTE(5) });
  hbars(s, [{ label: '국내 100대 기업 평균', value: 0.12, text: '0.12%' }, { label: '필수소비재 업종', value: 0.52, text: '0.52%' }, { label: '모닝펀치 제안', value: 0.5, text: '0.5%' }, { label: 'Patagonia', value: 1.0, text: '1.0%' }], { x: ML, y: 2.25, labelW: 2.7, trackW: 3.4, gap: 0.6, barH: 0.2, max: 1.0, highlight: 2 });
  tx(s, '출처: 2024 사회공헌백서(2023년, 90개사), Patagonia', ML, 4.6, 7.5, 0.3, { fontSize: 10, color: C.text2 }, '벤치마크 출처');
  stat(s, { x: 8.55, y: 2.1, w: 3.98, num: '450만원', numSize: 40, numColor: C.accent2, label: '1년차 환원액 (매출 9억원 × 0.5%)', noteH: 0.1 });
  stacked(s, [{ v: 40, color: NAVY, short: '제품 40%' }, { v: 30, color: '3B4A73', short: '후원금 30%' }, { v: 15, color: ORANGE, short: '재능 15' }, { v: 15, color: 'A9C6EE', short: '봉사 15', dark: true }], { x: 8.55, y: 3.65, w: 3.98, h: 0.5, labelSize: 10 });
  panel(s, ML, 5.1, CW, 1.55, '마무리 패널', true);
  tx(s, '소리 대신 손길로 깨웁니다', ML + 0.5, 5.2, 9, 0.75, { fontSize: 28, bold: true, color: C.background1, valign: 'middle' }, '마무리 문장');
  tx(s, '다음 단계   ①  소비자 설문   ②  부품 견적과 안전 시험   ③  특허 조사', ML + 0.5, 6.05, 10, 0.4, { fontSize: 13, color: C.accent6, valign: 'middle' }, '다음 단계');

  await d.finish();

  const cnt = t => t.replace(/\s/g, '').length;
  const total = SCRIPT.reduce((a, r) => a + cnt(r[2]), 0);
  let md = `# 모닝펀치 3분 발표 대본\n\n슬라이드 ${SCRIPT.length}장. 분당 280자(공백 제외) 기준으로 공백 제외 ${total}자, 약 ${(total / 280).toFixed(1)}분입니다. 각 슬라이드 시간은 대략의 안내입니다.\n\n`;
  SCRIPT.forEach((r, i) => { md += `## 슬라이드 ${i + 1}. ${r[0]} (약 ${r[1]}초, ${cnt(r[2])}자)\n\n${r[2]}\n\n`; });
  md += '## 발표 팁\n\n- 숫자는 "확인한 사실"인지 "우리가 정한 가정"인지 함께 말하세요. 5번 슬라이드의 숫자는 모두 가정입니다.\n- Hatch는 "회사 전체 매출", 577억 원은 "시장 규모가 아닌 출하액"이라는 단서를 꼭 붙이세요.\n- 4번 슬라이드에서 "같은 제품이 없다"고 단정하지 말고 "이번 조사에서 확인하지 못했다"고 말하세요.\n- 발표자 이름을 소개하려면 1번 슬라이드 대본 맨 앞에 넣으세요.\n';
  fs.writeFileSync(MD, md, 'utf8');
  console.log('done', total, SCRIPT.map(r => cnt(r[2])));
})();
