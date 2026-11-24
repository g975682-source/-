const fs = require('fs');
const { THEME, H, makePres, helpers, applyTheme } = require('./lib');
const OUT = '/home/user/-/MorningHands_Pitch_3min.pptx';
const MD = '/home/user/-/MorningHands_Pitch_3min_Script.md';
const { pres, C } = makePres('모닝핸즈(가칭) 3분 발표', '모닝핸즈(가칭) · 가상 창업 시나리오 · 3분 발표', 34);
const { card, tx, iconCircle, tag } = helpers(pres, C);

const SCRIPT = [
  ['표지', '안녕하세요. 아침에 알람을 끄고 다시 잠드는 분들을 위한 제품, 모닝핸즈를 소개합니다. 베개 속 손이 가볍게 두드려 깨워주는, 우리가 가상으로 만든 창업 아이디어입니다. 오늘은 문제, 경쟁, 돈, 사회 환원을 3분 안에 말씀드리겠습니다.'],
  ['문제', '먼저 늦잠이 정말 흔한 문제인지 확인했습니다. 스웨덴 설문에서는 69%가 알람을 미루거나 여러 개 맞춰 둔다고 답했고, 미국 수면 앱 기록에서는 알람을 쓴 밤의 55.7%에서 스누즈를 눌렀습니다. 한국 직장인 설문은 2011년 것뿐이지만 지각 이유 1위가 늦잠이었습니다. 이 조사들은 스누즈가 해롭다는 뜻이 아니라 알람을 미루는 일이 흔하다는 뜻입니다. 그래서 소리 대신 손길로 깨우는 제품을 생각했습니다.'],
  ['경쟁과 시장', '비슷한 제품으로는 50달러대 도망가는 알람시계 Clocky, 170달러 빛으로 깨우는 Hatch, 199달러에서 299달러 센서형 스마트 베개가 있었습니다. Hatch는 회사 전체 매출이 연 약 2억 달러로 보도됐지만, 수면 시계만의 매출은 알 수 없습니다. 국내 베개 제조 출하액은 2024년 약 577억 원인데, 이것은 시장 규모가 아니라 직원 10명 이상 공장의 출하액입니다.'],
  ['1대당 손익', '가격은 99,000원이고, 부가세를 빼면 회사 매출은 90,000원입니다. 만드는 데 45,500원, 파는 데 27,000원이 들어서 한 대에 17,500원이 남습니다. 고정비 3억 5천만 원을 메우려면 2만 대를 팔아야 손익분기입니다. 이 숫자들은 대부분 우리가 정한 가정입니다.'],
  ['3년 전망', '1년차에 1만 대를 팔면 매출 9억 원이고 1억 7천5백만 원 적자입니다. 2년차부터 흑자가 되고, 3년차에는 6만 대를 팔아 매출 54억 원, 영업이익 6억 원이 목표입니다. 다만 54억 원은 국내 베개 제조 출하액의 약 9%라서 쉬운 목표는 아닙니다.'],
  ['사회 환원', '번 돈의 0.5%를 사회에 돌려주겠습니다. 국내 100대 기업 평균은 0.12%, 필수소비재 업종은 0.52%입니다. 이익이 아닌 매출 기준이라 적자인 해에도 지킬 수 있고, 1년차에는 450만 원입니다. 제품 기부 40%, 후원금 30%, 재능기부와 봉사 15%씩으로 나눕니다.'],
  ['마무리', '아직 확인하지 못한 것도 많습니다. 숫자의 대부분은 가정이고, 한국의 최신 설문과 보험료는 찾지 못했습니다. 다음 단계는 소비자 설문, 부품 견적, 인증 품목 분류, 세무 확인입니다. 들어 주셔서 감사합니다.'],
];
const SEC = [10, 30, 35, 30, 25, 30, 20]; // seconds guide

const slide = (title, i) => {
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: '발표' });
  s.addText(title, { placeholder: 'title' });
  s.addNotes(SCRIPT[i][1]);
  return s;
};

(async () => {
  pres.addSection({ title: '발표' });
  // 1 title
  let s = pres.addSlide({ masterName: 'TITLE', sectionTitle: '발표' });
  s.addText('모닝핸즈', { placeholder: 'title' });
  s.addText('베개 속 손이 깨워주는 베개\n3분 발표', { placeholder: 'body' });
  s.addNotes(SCRIPT[0][1]);
  s.addShape(pres.ShapeType.ellipse, { x: 8.6, y: 1.5, w: 4.2, h: 4.2, fill: { color: C.text2 }, line: { color: C.text2, width: 0.5 }, objectName: '표지 원' });
  s.addImage({ data: await require('./lib').icon('FaHandPaper', H.accent1), x: 9.8, y: 2.7, w: 1.8, h: 1.8, altText: '손 아이콘', objectName: '표지 손 아이콘' });
  s.addImage({ data: await require('./lib').icon('FaMoon', H.accent6), x: 8.2, y: 1.2, w: 0.8, h: 0.8, altText: '달 아이콘', objectName: '표지 달 아이콘' });

  // 2 problem
  s = slide('늦잠, 정말 흔한 문제일까?', 1);
  tag(s, '사실', 11.9, 0.65);
  const ev = [['FaUsers', '69%', '알람을 미루거나\n여러 개 맞춘다', '스웨덴 설문 1,732명'], ['FaBell', '55.7%', '알람을 쓴 밤에\n스누즈를 눌렀다', '미국 수면 앱 약 2.1만 명'], ['FaClock', '32.1%', '지각 이유\n1위는 늦잠', '한국 직장인 설문 (2011)']];
  for (let i = 0; i < 3; i++) {
    const x = 0.6 + i * 4.14;
    card(s, x, 1.6, 3.85, 4.1, `근거 카드 ${i + 1}`);
    await iconCircle(s, ev[i][0], x + 0.35, 1.9, 0.75, H.accent2, H.lt1, `근거 ${i + 1}`);
    tx(s, ev[i][1], x + 0.35, 2.85, 3.2, 1.0, { fontSize: 54, bold: true, valign: 'middle' }, `근거 숫자 ${i + 1}`);
    tx(s, ev[i][2], x + 0.35, 3.95, 3.2, 0.9, { fontSize: 20, bold: true }, `근거 설명 ${i + 1}`);
    tx(s, ev[i][3], x + 0.35, 5.0, 3.2, 0.5, { fontSize: 15, color: C.text2 }, `근거 출처 ${i + 1}`);
  }
  card(s, 0.6, 5.95, 12.13, 0.85, '핵심 문장 카드', C.text2);
  tx(s, '소리 대신 손길로 깨운다', 0.9, 5.95, 11.5, 0.85, { fontSize: 24, bold: true, color: C.accent1, valign: 'middle' }, '핵심 문장');

  // 3 competition and market
  s = slide('비슷한 제품과 국내 시장', 2);
  tag(s, '사실', 11.9, 0.65);
  const cp = [['Clocky', '도망가는 알람시계', '약 $50'], ['Hatch', '빛과 소리로 깨우는 시계', '약 $170'], ['스마트 베개', '센서형 (ZEEQ 등)', '$199~299']];
  for (let i = 0; i < 3; i++) {
    const y = 1.6 + i * 1.5;
    card(s, 0.6, y, 6.6, 1.3, `경쟁 카드 ${i + 1}`);
    tx(s, cp[i][0], 0.9, y + 0.15, 3.0, 0.5, { fontSize: 24, bold: true }, `경쟁 이름 ${i + 1}`);
    tx(s, cp[i][1], 0.9, y + 0.7, 3.8, 0.45, { fontSize: 16, color: C.text2 }, `경쟁 설명 ${i + 1}`);
    tx(s, cp[i][2], 4.6, y + 0.15, 2.4, 1.0, { fontSize: 28, bold: true, color: C.accent2, align: 'right', valign: 'middle' }, `경쟁 가격 ${i + 1}`);
  }
  tx(s, 'Hatch는 회사 전체 매출이 연 약 $200M(보도). 수면 시계만의 매출은 미확인', 0.6, 6.15, 6.6, 0.7, { fontSize: 14, color: C.text2 }, '경쟁 각주');
  card(s, 7.5, 1.6, 5.23, 4.3, '시장 카드', C.text2);
  tx(s, '국내 베개 제조 출하액', 7.85, 1.9, 4.6, 0.5, { fontSize: 20, bold: true, color: C.accent1 }, '시장 제목');
  tx(s, '577억원', 7.85, 2.6, 4.6, 1.2, { fontSize: 66, bold: true, color: C.background1, valign: 'middle' }, '시장 숫자');
  tx(s, '통계청 광업제조업조사 2024\n직원 10명 이상 사업체 16개', 7.85, 4.0, 4.6, 0.9, { fontSize: 16, color: C.accent6 }, '시장 출처');
  tx(s, '※ 시장 규모가 아닌 공장 출하액', 7.85, 5.1, 4.6, 0.5, { fontSize: 16, bold: true, color: C.background1 }, '시장 주의');

  // 4 unit economics
  s = slide('1대 팔면 얼마가 남을까?', 3);
  tag(s, '가정', 11.9, 0.65);
  const fl = [['99,000원', '소비자가', C.background2, C.text1], ['90,000원', '회사 매출 (부가세 제외)', C.background2, C.text1], ['17,500원', '한 대에 남는 돈', C.text2, C.accent1], ['2만 대', '손익분기 판매량', C.accent1, C.text1]];
  for (let i = 0; i < 4; i++) {
    const x = 0.6 + i * 3.1;
    card(s, x, 1.8, 2.75, 2.6, `흐름 카드 ${i + 1}`, fl[i][2]);
    tx(s, fl[i][0], x + 0.15, 2.2, 2.45, 1.0, { fontSize: 32, bold: true, color: fl[i][3], align: 'center', valign: 'middle' }, `흐름 숫자 ${i + 1}`);
    tx(s, fl[i][1], x + 0.15, 3.3, 2.45, 0.8, { fontSize: 16, color: i === 2 ? C.background1 : C.text2, align: 'center', bold: true }, `흐름 설명 ${i + 1}`);
    if (i < 3) tx(s, '→', x + 2.7, 2.7, 0.45, 0.6, { fontSize: 28, bold: true, color: C.accent2, align: 'center' }, `화살표 ${i + 1}`);
  }
  card(s, 0.6, 4.75, 12.13, 1.7, '계산 카드');
  tx(s, '90,000 − 45,500(만드는 비용) − 27,000(파는 비용) = 17,500원', 0.9, 4.9, 11.5, 0.6, { fontSize: 22, bold: true, valign: 'middle' }, '계산 1');
  tx(s, '고정비 3.5억원 ÷ 17,500원 = 20,000대', 0.9, 5.6, 11.5, 0.6, { fontSize: 22, bold: true, color: C.accent2, valign: 'middle' }, '계산 2');

  // 5 3-year
  s = slide('3년 매출·이익 전망', 4);
  tag(s, '가정', 11.9, 0.65);
  const yrs = [['1년차', 9, '-1.75'], ['2년차', 27, '+1.14'], ['3년차', 54, '+6.26']];
  const base = 5.0, maxH = 3.2;
  s.addShape(pres.ShapeType.rect, { x: 0.8, y: base, w: 7.0, h: 0.03, fill: { color: 'C9CEDD' }, line: { color: 'C9CEDD', width: 0.5 }, objectName: '기준선' });
  yrs.forEach((y, i) => {
    const h = Math.max(0.3, y[1] / 54 * maxH), x = 1.2 + i * 2.2;
    s.addShape(pres.ShapeType.roundRect, { x, y: base - h, w: 1.5, h, rectRadius: 0.06, fill: { color: i === 2 ? C.accent1 : C.accent2 }, line: { color: i === 2 ? C.accent1 : C.accent2, width: 0.5 }, objectName: `막대 ${i + 1}` });
    tx(s, `${y[1]}억`, x - 0.2, base - h - 0.6, 1.9, 0.55, { fontSize: 26, bold: true, align: 'center', valign: 'middle' }, `막대 값 ${i + 1}`);
    tx(s, y[0], x - 0.2, base + 0.1, 1.9, 0.4, { fontSize: 18, bold: true, align: 'center' }, `막대 이름 ${i + 1}`);
    tx(s, `영업이익 ${y[2]}억`, x - 0.35, base + 0.55, 2.2, 0.4, { fontSize: 15, bold: true, align: 'center', color: i === 0 ? C.accent4 : C.accent3 }, `막대 이익 ${i + 1}`);
  });
  tx(s, '매출 (억원)', 0.8, 1.55, 3.0, 0.4, { fontSize: 16, color: C.text2 }, '축 이름');
  card(s, 8.3, 1.6, 4.43, 2.4, '비교 카드', C.text2);
  tx(s, '54억원', 8.6, 1.8, 3.9, 0.9, { fontSize: 44, bold: true, color: C.accent1, valign: 'middle' }, '비교 숫자');
  tx(s, '= 국내 베개 제조 출하액(577억원)의 약 9%', 8.6, 2.8, 3.9, 1.0, { fontSize: 17, bold: true, color: C.background1 }, '비교 설명');
  card(s, 8.3, 4.2, 4.43, 2.0, '판매 카드');
  tx(s, '판매 대수', 8.6, 4.35, 3.9, 0.4, { fontSize: 15, bold: true, color: C.accent2 }, '판매 제목');
  tx(s, '1만 대 → 3만 대 → 6만 대', 8.6, 4.85, 3.9, 0.6, { fontSize: 20, bold: true }, '판매 내용');
  tx(s, '모두 우리가 정한 가정', 8.6, 5.5, 3.9, 0.5, { fontSize: 14, color: C.text2 }, '판매 주의');

  // 6 CSR
  s = slide('사회 환원: 매출의 0.5%', 5);
  tag(s, '가정', 11.9, 0.65);
  const bars = [['국내 100대 기업 평균', 0.12, C.accent5, '0.12%'], ['필수소비재 업종', 0.52, C.accent5, '0.52%'], ['우리 제안', 0.5, C.accent1, '0.5%'], ['Patagonia', 1.0, C.accent5, '1.0%']];
  bars.forEach((b, i) => {
    const y = 1.65 + i * 0.95, w = Math.max(0.15, b[1] * 5.0);
    tx(s, b[0], 0.6, y, 3.0, 0.7, { fontSize: 17, bold: true, valign: 'middle' }, `막대 이름 ${i + 1}`);
    s.addShape(pres.ShapeType.roundRect, { x: 3.7, y: y + 0.07, w, h: 0.56, rectRadius: 0.06, fill: { color: b[2] }, line: { color: b[2], width: 0.5 }, objectName: `막대 ${i + 1}` });
    tx(s, b[3], 3.7 + w + 0.15, y, 1.2, 0.7, { fontSize: 20, bold: true, valign: 'middle' }, `막대 값 ${i + 1}`);
  });
  tx(s, '출처: 2024 사회공헌백서(2023년, 90개사), Patagonia', 0.6, 5.5, 9.0, 0.35, { fontSize: 13, color: C.text2 }, '벤치마크 출처');
  tx(s, '환원 구성', 0.6, 5.95, 2.0, 0.4, { fontSize: 16, bold: true }, '구성 제목');
  const al = [['제품 기부 40%', 40, C.accent2], ['후원금 30%', 30, C.accent1], ['재능 15%', 15, C.accent3], ['봉사 15%', 15, C.accent4]];
  let ax = 2.6; const unit = 9.6 / 100;
  al.forEach((a, i) => {
    const w = a[1] * unit;
    s.addShape(pres.ShapeType.rect, { x: ax, y: 5.95, w, h: 0.5, fill: { color: a[2] }, line: { color: 'FFFFFF', width: 1 }, objectName: `구성 막대 ${i + 1}` });
    tx(s, a[0], ax, 5.95, w, 0.5, { fontSize: 13, bold: true, color: i === 1 ? C.text1 : C.background1, align: 'center', valign: 'middle' }, `구성 이름 ${i + 1}`);
    ax += w;
  });
  card(s, 9.9, 1.6, 2.83, 3.6, '금액 카드', C.text2);
  tx(s, '1년차', 10.1, 1.8, 2.4, 0.4, { fontSize: 15, color: C.accent6 }, '금액 제목');
  tx(s, '450만원', 10.1, 2.25, 2.4, 0.8, { fontSize: 30, bold: true, color: C.accent1, valign: 'middle' }, '금액 숫자');
  tx(s, '매출 9억원 × 0.5%\n\n이익이 아닌 매출 기준이라 적자인 해에도 지킬 수 있어요', 10.1, 3.2, 2.4, 1.9, { fontSize: 13, color: C.background1 }, '금액 설명');

  // 7 close
  s = pres.addSlide({ masterName: 'CLOSE', sectionTitle: '발표' });
  s.addText('정리와 다음 단계', { placeholder: 'title' });
  s.addNotes(SCRIPT[6][1]);
  const cl = [['1', '숫자의 대부분은 가정', '판매 대수·원가·고정비는 견적과 설문으로 바꿔야 합니다'], ['2', '못 찾은 것', '최근 한국 설문, PL 보험료, 부품 대량 견적'], ['3', '다음 단계', '소비자 설문 · 부품 견적 · 인증 품목 분류 · 세무 확인']];
  for (let i = 0; i < 3; i++) {
    const y = 2.0 + i * 1.5;
    s.addShape(pres.ShapeType.ellipse, { x: 0.8, y: y + 0.1, w: 0.85, h: 0.85, fill: { color: C.accent1 }, line: { color: C.accent1, width: 0.5 }, objectName: `정리 번호 원 ${i + 1}` });
    tx(s, cl[i][0], 0.8, y + 0.1, 0.85, 0.85, { fontSize: 28, bold: true, align: 'center', valign: 'middle' }, `정리 번호 ${i + 1}`);
    tx(s, cl[i][1], 2.0, y, 3.6, 1.05, { fontSize: 26, bold: true, color: C.accent1, valign: 'middle' }, `정리 이름 ${i + 1}`);
    tx(s, cl[i][2], 5.7, y, 7.0, 1.05, { fontSize: 20, color: C.background1, valign: 'middle' }, `정리 내용 ${i + 1}`);
  }
  tx(s, '감사합니다', 0.8, 6.4, 6, 0.6, { fontSize: 24, bold: true, color: C.accent6 }, '감사');

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);

  const total = SCRIPT.reduce((a, [, t]) => a + t.replace(/\s/g, '').length, 0);
  let md = '# 모닝핸즈 3분 발표 대본\n\n';
  md += `분당 300자(공백 제외) 기준 약 ${(total / 300).toFixed(1)}분, 공백 제외 ${total}자입니다. 슬라이드 7장, 각 시간은 대략의 안내입니다.\n\n`;
  SCRIPT.forEach(([t, txt], i) => { md += `## ${i + 1}. ${t} (약 ${SEC[i]}초)\n\n${txt}\n\n`; });
  md += '## 발표 팁\n\n- 숫자는 "가정"인지 "확인한 사실"인지 함께 말하세요.\n- Hatch와 577억원은 "회사 전체 매출", "시장 규모가 아닌 출하액"이라는 단서를 꼭 붙이세요.\n- 시간이 부족하면 3번(경쟁과 시장)의 Clocky 설명을 줄이세요.\n';
  fs.writeFileSync(MD, md, 'utf8');
  console.log('done chars', total, 'min', (total / 300).toFixed(2));
})();
