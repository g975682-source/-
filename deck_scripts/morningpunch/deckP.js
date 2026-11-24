const fs = require('fs');
const { paras } = require('./parts');
const { createDoc, NAVY, GRAY, MUTE, HAIR, TRACK, CREAM, ORANGE, ORANGE_TX, SKY, ML, CW, MR } = require('./doc');
const OUT = '/home/user/-/MorningPunch_Pitch_3min.pptx';
const MD = '/home/user/-/MorningPunch_Pitch_3min_Script.md';
const d = createDoc({ file: OUT, docName: '3분 발표', title: '모닝펀치 3분 발표' });
const { C, tx, rect, hair, panel, stat, row, hbars, stacked } = d;

const SCRIPT = [
  ['표지', '안녕하세요, ○○○입니다. 베개 속 손이 아침마다 깨워주는 자동기상베개, 모닝펀치를 3분 동안 소개하겠습니다.'],
  ['문제: 알람은 끄면 끝', '알람을 끄고 다시 자는 일은 흔합니다. 스웨덴 설문에서 69%가 알람을 미루거나 여러 개 맞췄고, 미국 수면 앱에서는 알람을 쓴 밤의 55.7%에서 스누즈를 눌렀습니다. 한국 설문은 2011년 것뿐이지만 지각 이유 1위가 늦잠이었습니다. 알람은 소리라서 끄면 끝입니다.'],
  ['해법: 소리 대신 손길', '그래서 소리 대신 손길로 깨웁니다. 평소엔 베개 옆면에 로봇팔이 접혀 있다가, 알람이 울리면 관절 두 개로 펼쳐지고, 손 모양 푹신한 패드가 쿠션을 가볍게 두드립니다. 세탁할 때는 팔을 분리할 수 있고, 안전을 위해 힘 제한과 정지 센서를 넣을 계획입니다.'],
  ['제품 구성과 원가', '재료비는 한 대 34,000원으로 가정했습니다. 베개 본체, 모터와 링크, 배터리가 절반 이상입니다. 인증 시험비는 KTL 수수료표로 계산하면 약 680만에서 770만 원으로 추정합니다.'],
  ['경쟁 제품', '비슷한 제품은 소리로 도망가는 Clocky가 약 50달러, 빛으로 깨우는 Hatch가 약 170달러, 센서형 스마트 베개가 199에서 299달러입니다. Hatch는 회사 전체 매출만 알려져 있고, 손이 나오는 제품은 이번 조사에서 확인하지 못했습니다.'],
  ['시장 규모', '해외 전망으로 스마트 클락 시장은 2025년 13억 달러에서 2029년 25억 달러로 커집니다. 국내 베개 제조 출하액은 577억 원인데 시장 규모는 아닙니다. 우리 3년차 매출 54억 원은 이 출하액의 약 9%입니다.'],
  ['1대당 손익', '소비자가 99,000원에서 부가세를 빼면 회사 매출은 90,000원입니다. 만드는 비용 45,500원과 파는 비용 27,000원을 빼면 한 대에 17,500원이 남습니다. 모두 우리가 정한 가정입니다.'],
  ['3년 매출·이익 전망', '고정비 3.5억 원을 17,500원으로 나누면 2만 대가 손익분기입니다. 그래서 1년차 1만 대, 매출 9억 원은 1.75억 원 적자이고, 2년차부터 흑자, 3년차 6만 대는 매출 54억 원, 영업이익률 11.6%를 계획합니다.'],
  ['사회 환원', '번 돈은 사회와 나눕니다. 국내 100대 기업 평균은 매출의 0.12%인데, 우리는 매출의 0.5%를 제품 40, 후원금 30, 재능기부와 봉사 각 15%로 돌려드립니다. 1년차는 450만 원이고, 적자인 해에도 지키도록 매출 기준으로 정했습니다.'],
  ['리스크와 다음 단계', '남은 과제는 안전, 인증, 특허, 수요입니다. 소비자 설문으로 9.9만 원 지불 의사를 확인하고, 부품 견적과 안전 시험, 유사 특허 조사를 먼저 하겠습니다. 모닝펀치, 소리 대신 손길로 깨웁니다. 감사합니다.'],
];
const NOTE = i => SCRIPT[i][1];

(async () => {
  const P = d.pres.ShapeType;
  // 1 cover
  d.cover({ label: 'MORNING PUNCH', title: [{ text: '베개 속 손이', options: { breakLine: true } }, { text: '깨워주는', options: { breakLine: true } }, { text: '모닝펀치', options: { color: C.accent1 } }], lead: '자동기상베개 · 3분 발표', meta: '가상 창업 시나리오  ·  발표용', notes: NOTE(0) });

  // 2 problem
  let s = d.body({ section: '발표', label: '01  문제', title: '알람은 끄면 끝입니다', lead: '알람을 미루는 일은 해외 조사와 한국 설문 모두에서 확인됩니다.', tag: '사실', notes: NOTE(1) });
  [['69%', '알람을 미루거나 여러 개 맞춘다', '스웨덴 스톡홀름대 설문 1,732명, 평균 22분 미룸'], ['55.7%', '알람을 쓴 밤에 스누즈를 눌렀다', '미국 수면 앱 약 2.1만 명, 300만 일 밤, 평균 10.8분'], ['32.1%', '지각 이유 1위는 늦잠', '인크루트 직장인 설문 2011년 310명, 35.2%가 자주 지각']].forEach((e, i) => {
    const x = ML + i * 3.98;
    hair(s, x, 2.25, 3.6, NAVY, 1.25);
    tx(s, e[0], x, 2.38, 3.6, 0.95, { fontSize: 52, bold: true, valign: 'middle' }, '큰 숫자');
    tx(s, e[1], x, 3.4, 3.6, 0.32, { fontSize: 13.5, bold: true, color: C.accent2 }, '숫자 라벨');
    tx(s, e[2], x, 3.76, 3.6, 0.55, { fontSize: 11.5, color: C.text2 }, '숫자 출처');
  });
  panel(s, ML, 4.65, 6.9, 1.9, '해석 패널');
  tx(s, '해석할 때 주의', ML + 0.4, 4.78, 5, 0.28, { fontSize: 10.5, bold: true, color: C.accent2 }, '주의 제목');
  tx(s, paras(['· 스누즈가 해롭다는 뜻이 아니라 알람을 미루는 일이 흔하다는 뜻입니다.', '· 우리 제품의 가치는 건강 개선이 아니라 정시 기상과 지각 방지입니다.', '· 한국 자료는 2011년뿐이고 최근 3년 설문은 찾지 못했습니다.']), ML + 0.4, 5.13, 6.2, 1.3, { fontSize: 12, paraSpaceAfter: 4 }, '주의 내용');
  panel(s, 7.9, 4.65, 4.63, 1.9, '핵심 문장 패널', true);
  tx(s, '알람은 소리라서,\n끄면 끝입니다', 8.3, 4.65, 3.6, 1.9, { fontSize: 26, bold: true, color: C.background1, valign: 'middle' }, '핵심 문장');

  // 3 solution
  s = d.body({ section: '발표', label: '02  해법', title: '소리 대신 손길로 깨우는 모닝펀치', lead: '접혀 있던 로봇팔이 펼쳐져, 손 모양 패드가 쿠션을 가볍게 두드립니다.', tag: '가정', notes: NOTE(2) });
  s.addShape(P.ellipse, { x: 0.8, y: 2.0, w: 4.7, h: 4.7, fill: { color: 'FFFFFF', transparency: 100 }, line: { color: NAVY, width: 1 }, objectName: '그림 원형 테두리' });
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
    s.addShape(P.roundRect, { x, y: 5.4, w: 1.5, h: 0.36, rectRadius: 0.18, fill: { color: 'FFFFFF' }, line: { color: NAVY, width: 0.9 }, objectName: '구조 태그 틀' });
    tx(s, t, x, 5.4, 1.5, 0.36, { fontSize: 11.5, bold: true, align: 'center', valign: 'middle' }, '구조 태그');
  });
  tx(s, '안전(우리 설계 가정): 힘 제한 · 장애물 정지 센서 · 전원 차단', 6.2, 5.92, 6.3, 0.28, { fontSize: 11, color: C.text2 }, '안전 문구');
  panel(s, 6.2, 6.3, 6.33, 0.5, '핵심 문장 패널', true);
  tx(s, '소리는 끌 수 있어도, 손길은 모른 척하기 어렵다', 6.5, 6.3, 5.4, 0.5, { fontSize: 13, bold: true, color: C.background1, valign: 'middle' }, '핵심 문장');

  // 4 BOM + certification
  s = d.body({ section: '발표', label: '03  제품 구성과 원가', title: '재료비 34,000원, 인증비 약 700만원', lead: '부품 단가는 대부분 가정이고, 인증 시험비는 공식 수수료표로 계산했습니다.', tag: '가정', notes: NOTE(3) });
  const BOM = [['베개 본체 (폼·커버)', 7000], ['모터·링크 (서보)', 6000], ['배터리·충전회로', 5000], ['MCU·블루투스', 4500], ['하우징·PCB·부자재', 4000], ['포장', 3000], ['실리콘 손', 2500], ['센서 (압력·IMU)', 2000]];
  tx(s, '1대당 재료비 구성 (원)', ML, 2.2, 5, 0.28, { fontSize: 10.5, bold: true, color: C.accent2 }, '막대 제목');
  hbars(s, BOM.map(r => ({ label: r[0], value: r[1], text: r[1].toLocaleString('en-US') })), { x: ML, y: 2.65, labelW: 2.3, trackW: 3.0, gap: 0.5, barH: 0.18, max: 7000, highlight: -1, labelSize: 12, valSize: 12 });
  [['34,000원', '재료비 합계 (공급가 90,000원의 37.8%)', '본체·모터·배터리 세 가지가 절반 이상(52.9%)'], ['약 680~770만원', '인증 시험비 (추정)', 'KTL 표: 배터리 267만 + 전기안전 108만 + 증명서 5만 + 블루투스 300~390만'], ['$1.47 · $1~2', '서보 · MCU 도매 목록가 (일부 확인)', '서보 1,000개 기준, 소량 소매가는 $11~14로 편차가 큼']].forEach((r, i) => {
    const y = 2.2 + i * 1.5;
    hair(s, 7.9, y, 4.63, i === 1 ? ORANGE : NAVY, 1.25);
    tx(s, r[0], 7.9, y + 0.1, 4.63, 0.6, { fontSize: 28, bold: true, color: i === 1 ? C.accent2 : C.text1, valign: 'middle' }, '큰 숫자');
    tx(s, r[1], 7.9, y + 0.74, 4.63, 0.28, { fontSize: 12.5, bold: true }, '숫자 라벨');
    tx(s, r[2], 7.9, y + 1.02, 4.63, 0.45, { fontSize: 10.5, color: C.text2 }, '숫자 설명');
  });
  tx(s, '※ 배터리 셀 대량 단가와 제품의 인증 품목 분류는 확정하지 못했습니다.', ML, 6.55, 7, 0.28, { fontSize: 10, color: C.text2 }, '미확인 각주');

  // 5 competition
  s = d.body({ section: '발표', label: '04  경쟁 제품', title: '비슷한 제품은 소리·빛·센서가 중심', lead: '손이 나오는 베개와 같은 제품은 이번 조사에서 확인하지 못했습니다.', tag: '사실', notes: NOTE(4) });
  d.tableFrom(s, [['제품', '깨우는 방식', '가격', '판매·규모 근거'], ['Clocky', '바퀴로 도망가는 알람시계 (소리)', '출시가 약 $50', '누적 50만 대 이상 (2012 인터뷰)'], ['Hatch Restore', '빛과 소리로 서서히 기상', 'Restore 3 약 $170', '회사 전체 매출 약 $140M(2023) → $200M(최근)'], ['스마트 베개 (ZEEQ 등)', '센서로 수면 단계를 보고 진동·빛·소리', '$199 ~ 299 (예정가)', 'Kickstarter 2016~17, 현재 판매 미확인'], ['모닝펀치 (우리)', '접힌 팔이 쿠션을 두드림 (촉각)', '$71 (가정)', '아직 만들어지지 않은 아이디어']], { x: ML, y: 2.25, w: CW, colW: [2.3, 3.5, 2.2, 3.733], rowH: 0.58, boldFirst: true, emphRows: [4], fontSize: 12, headSize: 11 });
  panel(s, ML, 5.4, CW, 1.2, '매출 추정 패널');
  d.tagInline(s, '추정', ML + 0.4, 5.55);
  tx(s, 'Clocky 연 평균 약 $4M (약 59억원)', ML + 1.1, 5.5, 5.2, 0.35, { fontSize: 16, bold: true, valign: 'middle' }, '추정 값');
  tx(s, '누적 50만 대 ÷ 약 6년 × $50, 정가 기준 상한 추정', ML + 0.4, 5.95, 5.8, 0.5, { fontSize: 11, color: C.text2 }, '추정 설명');
  tx(s, 'Hatch 회사 전체 연 약 $140~200M (보도)', ML + 6.5, 5.5, 5.2, 0.35, { fontSize: 16, bold: true, valign: 'middle' }, '보도 값');
  tx(s, '아기 제품 포함 회사 전체 매출이며 수면 시계만의 매출은 확인하지 못했습니다.', ML + 6.5, 5.95, 5.0, 0.5, { fontSize: 11, color: C.text2 }, '보도 설명');

  // 6 market
  s = d.body({ section: '발표', label: '05  시장 규모', title: '해외 시장은 성장, 국내는 출하액만 확인', lead: '해외 전망은 참고용이고, 국내 숫자는 통계청 제조 출하액 한 가지입니다.', notes: NOTE(5) });
  [['$13.2억 → $25.2억', '스마트 클락 시장', '2025 → 2029년 전망, 연평균 17.6% (TBRC, 신뢰도 낮음)'], ['+$9.4억', '스마트 베개 시장', '2024~2029년 증가분 전망, 연평균 21.1% (Technavio, 신뢰도 낮음)'], ['577억원', '국내 베개 제조 출하액', '통계청 2024, 직원 10명 이상 사업체 16개 (시장 규모 아님)']].forEach((r, i) => {
    const x = ML + i * 3.98;
    hair(s, x, 2.25, 3.6, NAVY, 1.25);
    tx(s, r[0], x, 2.4, 3.6, 0.75, { fontSize: i === 0 ? 24 : 30, bold: true, valign: 'middle' }, '큰 숫자');
    tx(s, r[1], x, 3.25, 3.6, 0.3, { fontSize: 13.5, bold: true, color: C.accent2 }, '숫자 라벨');
    tx(s, r[2], x, 3.6, 3.6, 0.7, { fontSize: 11.5, color: C.text2 }, '숫자 설명');
  });
  tx(s, '국내 출하액 대비 우리 목표 (억원, 추정)', ML, 4.6, 6, 0.28, { fontSize: 10.5, bold: true, color: C.accent2 }, '비교 제목');
  hbars(s, [{ label: '국내 베개 제조 출하액 (2024)', value: 577, text: '577' }, { label: '모닝펀치 3년차 매출 목표', value: 54, text: '54 (약 9%)' }, { label: '모닝펀치 1년차 매출 목표', value: 9, text: '9 (약 1.6%)' }], { x: ML, y: 5.0, labelW: 3.3, trackW: 6.0, gap: 0.5, barH: 0.2, max: 577, highlight: 1, labelSize: 12, valSize: 12.5 });

  // 7 unit economics
  s = d.body({ section: '발표', label: '06  1대당 손익', title: '한 대에 17,500원이 남습니다', lead: '소비자가에서 부가세를 빼고, 만드는 비용과 파는 비용을 빼면 남는 돈입니다.', tag: '가정', notes: NOTE(6) });
  d.tableFrom(s, [['항목', '금액(원)', '공급가 대비'], ['소비자가 (부가세 포함)', '99,000', '-'], ['공급가 (부가세 제외)', '90,000', '100%'], ['재료비', '34,000', '37.8%'], ['제작 인건비 · 인증 · 물류', '11,500', '12.8%'], ['만드는 비용 소계', '45,500', '50.6%'], ['판매 수수료 · 마케팅 · 반품', '27,000', '30.0%'], ['한 대에 남는 돈 (공헌이익)', '17,500', '19.4%']], { x: ML, y: 2.25, w: 6.9, colW: [3.5, 1.7, 1.7], rowH: 0.5, align: ['left', 'right', 'right'], emphRows: [5, 7], fontSize: 12.5, headSize: 11 });
  [['90,000원', '회사 매출', '99,000 ÷ 1.1, 부가세 9,000원은 나라에 내는 돈'], ['45,500 + 27,000원', '만드는 비용 + 파는 비용', '판매 수수료는 채널을 섞어 평균 11%로 가정'], ['17,500원', '한 대에 남는 돈', '공급가의 19.4%, 고정비 차감 전']].forEach((r, i) => {
    const y = 2.25 + i * 1.45;
    hair(s, 8.55, y, 3.98, i === 2 ? ORANGE : NAVY, 1.25);
    tx(s, r[0], 8.55, y + 0.1, 3.98, 0.6, { fontSize: i === 1 ? 22 : 30, bold: true, color: i === 2 ? C.accent2 : C.text1, valign: 'middle' }, '큰 숫자');
    tx(s, r[1], 8.55, y + 0.74, 3.98, 0.28, { fontSize: 12.5, bold: true }, '숫자 라벨');
    tx(s, r[2], 8.55, y + 1.02, 3.98, 0.4, { fontSize: 10.5, color: C.text2 }, '숫자 설명');
  });

  // 8 three-year
  s = d.body({ section: '발표', label: '07  3개년 전망', title: '2년차 흑자, 3년차 매출 54억원', lead: '고정비 3.5억원을 17,500원으로 나누면 2만 대가 손익분기입니다.', tag: '가정', notes: NOTE(7) });
  tx(s, '매출 (억원)', ML, 2.15, 4, 0.28, { fontSize: 10.5, bold: true, color: C.accent2 }, '차트 제목');
  const yrs = [['1년차', 9, '-1.75'], ['2년차', 27, '+1.14'], ['3년차', 54, '+6.26']];
  const base = 6.0, maxH = 3.0;
  hair(s, ML, base, 6.2, MUTE, 0.75, '기준선');
  yrs.forEach((y, i) => {
    const h = Math.max(0.2, y[1] / 54 * maxH), x = ML + 0.5 + i * 1.95;
    rect(s, x, base - h, 1.1, h, i === 2 ? ORANGE : NAVY, `매출 막대 ${i + 1}`);
    tx(s, `${y[1]}억`, x - 0.3, base - h - 0.42, 1.7, 0.38, { fontSize: 19, bold: true, align: 'center' }, '막대 값');
    tx(s, y[0], x - 0.3, base + 0.08, 1.7, 0.28, { fontSize: 12, bold: true, align: 'center' }, '연차');
  });
  d.tableFrom(s, [['구분 (억원)', '1년차', '2년차', '3년차'], ['판매 대수 (대)', '10,000', '30,000', '60,000'], ['매출액', '9.00', '27.00', '54.00'], ['영업이익', '-1.75', '1.14', '6.26'], ['영업이익률', '-19.4%', '4.2%', '11.6%']], { x: 7.5, y: 2.25, w: 5.03, colW: [1.73, 1.1, 1.1, 1.1], rowH: 0.46, align: ['left', 'right', 'right', 'right'], emphRows: [3], fontSize: 12, headSize: 10.5 });
  tx(s, '1년차 시나리오 (영업손익)', 7.5, 4.75, 5, 0.28, { fontSize: 10.5, bold: true, color: C.accent2 }, '시나리오 제목');
  [['보수 5,000대', '약 -2.6억'], ['기본 1만 대', '-1.75억'], ['낙관 2만 대', '0 (손익분기)']].forEach((r, i) => {
    const x = 7.5 + i * 1.7;
    hair(s, x, 5.1, 1.55, i === 1 ? ORANGE : NAVY, 1.25);
    tx(s, r[0], x, 5.2, 1.55, 0.28, { fontSize: 11, color: C.text2 }, '시나리오 이름');
    tx(s, r[1], x, 5.5, 1.6, 0.5, { fontSize: 14, bold: true, valign: 'top' }, '시나리오 값');
  });
  tx(s, '※ 판매 대수·원가·고정비는 모두 우리가 정한 가정이고, 초기 필요 자금은 약 4억원(추정)입니다.', ML, 6.55, 11, 0.28, { fontSize: 10, color: C.text2 }, '가정 각주');

  // 9 CSR
  s = d.body({ section: '발표', label: '08  사회 환원', title: '번 돈의 0.5%를 사회와 나눕니다', lead: '이익이 아닌 매출 기준이라 적자인 해에도 지킬 수 있는 약속입니다.', tag: '가정', notes: NOTE(8) });
  tx(s, '매출 대비 기부 비율', ML, 2.2, 5, 0.28, { fontSize: 10.5, bold: true, color: C.accent2 }, '벤치마크 제목');
  hbars(s, [{ label: '국내 100대 기업 평균', value: 0.12, text: '0.12%' }, { label: '필수소비재 업종', value: 0.52, text: '0.52%' }, { label: '모닝펀치 제안', value: 0.5, text: '0.5%' }, { label: 'Patagonia', value: 1.0, text: '1.0%' }], { x: ML, y: 2.65, labelW: 2.6, trackW: 3.2, gap: 0.55, barH: 0.2, max: 1.0, highlight: 2 });
  tx(s, '출처: 2024 사회공헌백서(2023년, 90개사), Patagonia', ML, 4.75, 7, 0.28, { fontSize: 10, color: C.text2 }, '벤치마크 출처');
  tx(s, '연도별 환원액 (만원)', 7.9, 2.2, 4.6, 0.28, { fontSize: 10.5, bold: true, color: C.accent2 }, '금액 제목');
  [['1년차', '450'], ['2년차', '1,350'], ['3년차', '2,700']].forEach((r, i) => {
    const x = 7.9 + i * 1.6;
    hair(s, x, 2.55, 1.45, NAVY, 1.25);
    tx(s, r[1], x, 2.65, 1.5, 0.6, { fontSize: 28, bold: true, color: i === 0 ? C.accent2 : C.text1, valign: 'middle' }, '큰 숫자');
    tx(s, r[0], x, 3.3, 1.5, 0.28, { fontSize: 12, color: C.text2 }, '연차');
  });
  stacked(s, [{ v: 40, color: NAVY, short: '제품 기부 40%' }, { v: 30, color: '3B4A73', short: '후원금 30%' }, { v: 15, color: ORANGE, short: '재능 15' }, { v: 15, color: 'A9C6EE', short: '봉사 15', dark: true }], { x: 7.9, y: 3.8, w: 4.63, h: 0.5, labelSize: 10 });
  tx(s, '※ 구성 비율은 우리가 정한 가정입니다.', 7.9, 4.4, 4.6, 0.25, { fontSize: 10, color: C.text2 }, '구성 주석');
  panel(s, ML, 5.3, CW, 1.3, '세법 패널');
  d.tagInline(s, '사실', ML + 0.4, 5.45);
  tx(s, '세법: 기부금은 한도가 있고, 현물은 장부가액으로 계산합니다', ML + 1.1, 5.4, 10, 0.34, { fontSize: 15, bold: true, valign: 'middle' }, '세법 제목');
  tx(s, '일반기부금 한도는 (소득금액−결손금 등)의 10%이고 초과분은 10년간 이월합니다(법인세법 제24조). 현물 기부는 장부가액으로 평가합니다(시행령 제36조). 제품 기부의 부가세 처리는 세무사 확인이 필요합니다.', ML + 0.4, 5.85, CW - 0.8, 0.65, { fontSize: 11.5, color: C.text2 }, '세법 설명');

  // 10 risks + next steps
  s = d.body({ section: '발표', label: '09  리스크와 다음 단계', title: '출시 전에 풀어야 할 과제', lead: '수면 중 몸에 닿는 제품이라 안전과 인증이 가장 중요합니다.', notes: NOTE(9) });
  [['안전', '수면 중 접촉으로 어린이·고령자가 다칠 수 있어 힘 제한, 정지 센서, PL 보험을 갖춥니다.'], ['인증', 'KC 배터리, 전기기기 안전, 블루투스 시험이 필요하고 약 680~770만원(추정)입니다.'], ['특허', '유사 특허·디자인 침해 여부를 변리사 선행기술 조사로 확인합니다.'], ['수요', '9.9만원 지불 의사는 검증되지 않아 설문과 사전예약 전환율로 확인합니다.']].forEach((r, i) => {
    const x = ML + (i % 2) * 3.55, y = 2.25 + Math.floor(i / 2) * 1.55;
    hair(s, x, y, 3.3, NAVY, 1.25);
    tx(s, r[0], x, y + 0.12, 3.3, 0.35, { fontSize: 16, bold: true }, '리스크 제목');
    tx(s, r[1], x, y + 0.52, 3.3, 0.95, { fontSize: 11, color: C.text2 }, '리스크 설명');
  });
  tx(s, '12개월 로드맵', 8.15, 2.2, 4, 0.28, { fontSize: 10.5, bold: true, color: C.accent2 }, '로드맵 제목');
  [['0~3개월', '제품 개발', '시제품, 안전 설계, 특허·상표 조사'], ['3~6개월', '선판매', '크라우드펀딩, 수요와 가격 검증'], ['6~12개월', '정식 출시', '자사몰·마켓 판매, 기부 프로그램 시작']].forEach((r, i) => {
    const y = 2.55 + i * 0.85;
    hair(s, 8.15, y, 4.38, i === 0 ? ORANGE : NAVY, 1.25);
    tx(s, r[0], 8.15, y + 0.1, 1.2, 0.3, { fontSize: 11, bold: true, color: C.accent2 }, '기간');
    tx(s, r[1], 9.4, y + 0.08, 3.1, 0.32, { fontSize: 15, bold: true }, '단계 이름');
    tx(s, r[2], 9.4, y + 0.45, 3.1, 0.3, { fontSize: 10.5, color: C.text2 }, '단계 설명');
  });
  panel(s, ML, 5.45, CW, 1.2, '마무리 패널', true);
  tx(s, '소리 대신 손길로 깨웁니다', ML + 0.5, 5.5, 8.5, 0.65, { fontSize: 26, bold: true, color: C.background1, valign: 'middle' }, '마무리 문장');
  tx(s, '다음 단계   ①  소비자 설문   ②  부품 견적과 안전 시험   ③  유사 특허 조사', ML + 0.5, 6.15, 10, 0.4, { fontSize: 13, color: C.accent6, valign: 'middle' }, '다음 단계');

  await d.finish();

  const cnt = t => t.replace(/\s/g, '').length;
  const total = SCRIPT.reduce((a, r) => a + cnt(r[1]), 0);
  const secs = r => Math.round(cnt(r[1]) / 280 * 60);
  let md = `# 모닝펀치 3분 발표 대본 (10장)\n\n슬라이드 ${SCRIPT.length}장. 분당 280자(공백 제외) 기준으로 공백 제외 ${total}자, 약 ${Math.floor(total / 280)}분 ${Math.round((total / 280 % 1) * 60)}초입니다. 슬라이드는 자세히 담았고, 대본은 핵심만 말하도록 썼습니다.\n\n`;
  SCRIPT.forEach((r, i) => { md += `## 슬라이드 ${i + 1}. ${r[0]} (약 ${secs(r)}초, ${cnt(r[1])}자)\n\n${r[1]}\n\n`; });
  md += '## 발표 팁\n\n- 슬라이드의 모든 숫자를 읽지 말고, 대본에 나온 숫자만 말하세요. 나머지는 질문이 나올 때 설명하면 됩니다.\n- 숫자는 "확인한 사실"인지 "우리가 정한 가정"인지 함께 말하세요. 4, 7, 8, 9번 슬라이드의 숫자는 대부분 가정입니다.\n- Hatch는 "회사 전체 매출", 577억 원은 "시장 규모가 아닌 출하액"이라는 단서를 꼭 붙이세요.\n- 5번 슬라이드에서 "같은 제품이 없다"고 단정하지 말고 "이번 조사에서 확인하지 못했다"고 말하세요.\n- 발표자 이름을 소개하려면 1번 슬라이드 대본 맨 앞에 넣으세요.\n';
  fs.writeFileSync(MD, md, 'utf8');
  console.log('done', total, SCRIPT.map(r => cnt(r[1])));
})();
