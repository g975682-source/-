const { THEME, H, makePres, helpers, applyTheme } = require('./lib');
const OUT = '/home/user/-/MorningHands_Research_Summary.pptx';
const { pres, C } = makePres('모닝핸즈(가칭) 조사 결과 정리', '모닝핸즈(가칭) · 가상 창업 시나리오 · 조사 정리본', 28);
const { card, tx, iconCircle, tag, th, td, border } = helpers(pres, C);
let secs = {};
const slide = (sec, title, notes) => {
  if (!secs[sec]) { pres.addSection({ title: sec }); secs[sec] = true; }
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: sec });
  s.addText(title, { placeholder: 'title' });
  if (notes) s.addNotes(notes);
  return s;
};
const lv = t => td(t, { align: 'center', bold: true, color: t.includes('낮음') ? C.accent4 : C.text1, fontSize: 13 });

(async () => {
  // 1 title
  pres.addSection({ title: '표지' });
  let s = pres.addSlide({ masterName: 'TITLE', sectionTitle: '표지' });
  s.addText('모닝핸즈 조사 결과 정리', { placeholder: 'title' });
  s.addText('베개 속 손이 깨워주는 베개\n가상 창업 시나리오 · 지금까지 조사한 내용', { placeholder: 'body' });

  // 2 how to read
  s = slide('개요', '이 자료를 읽는 법', '모든 숫자에 사실, 추정, 가정 표시를 붙였고, 출처의 종류에 따라 신뢰도를 높음, 중, 낮음으로 나눴습니다.');
  const kinds = [['사실', '자료에서 직접 확인한 값', '예) 법령 조문, 공식 수수료표, 통계청 값, 설문 결과'], ['추정', '확인한 자료로 계산한 값', '예) Clocky 연 평균 매출, 인증 비용 합계'], ['가정', '우리가 정한 값', '예) 부품 원가, 판매 대수, 고정비, 환원 비율']];
  for (let i = 0; i < 3; i++) {
    const y = 1.6 + i * 1.5;
    card(s, 0.6, y, 6.2, 1.3, `표시 카드 ${i + 1}`);
    tag(s, kinds[i][0], 0.9, y + 0.2);
    tx(s, kinds[i][1], 2.0, y + 0.18, 4.6, 0.4, { fontSize: 17, bold: true }, `표시 설명 ${i + 1}`);
    tx(s, kinds[i][2], 0.9, y + 0.72, 5.7, 0.5, { fontSize: 14, color: C.text2 }, `표시 예 ${i + 1}`);
  }
  card(s, 7.1, 1.6, 5.63, 4.3, '신뢰도 카드', C.text2);
  tx(s, '신뢰도 기준', 7.45, 1.85, 4.9, 0.45, { fontSize: 20, bold: true, color: C.accent1 }, '신뢰도 제목');
  s.addText([
    { text: '높음: ', options: { bold: true, color: C.accent1 } }, { text: '법령 원문, 공식 수수료표, 정부 통계', options: { breakLine: true } },
    { text: '중: ', options: { bold: true, color: C.accent1 } }, { text: '언론 보도, 업체 공개 자료, 비교 사이트', options: { breakLine: true } },
    { text: '낮음: ', options: { bold: true, color: C.accent1 } }, { text: '가정, 단일 출처, 출처끼리 숫자가 다름' },
  ], { x: 7.45, y: 2.5, w: 4.9, h: 1.8, fontSize: 16, color: C.background1, margin: 0, valign: 'top', paraSpaceAfter: 12, isTextBox: true, objectName: '신뢰도 기준 내용' });
  tx(s, '조사 방법: 웹 검색, 공식 사이트 직접 접속(KTL·KTC·KTR·국립전파연구원·중소기업중앙회·KOSIS), 법령 PDF, 제공받은 법령·상담 자료', 7.45, 4.45, 4.9, 1.3, { fontSize: 14, color: C.accent6 }, '조사 방법');
  tx(s, '※ 모든 금액은 부가세 제외, 환율 1,400원/$ 가정입니다.', 0.6, 6.3, 12.13, 0.4, { fontSize: 14, color: C.text2 }, '개요 각주');

  // 3 key results
  s = slide('개요', '한눈에 보는 핵심 결과', '여섯 가지 핵심 결과입니다. 자세한 근거는 뒤 슬라이드에 있습니다.');
  const key = [
    ['69%', '알람 미루기는 흔하다', '스웨덴 1,732명 설문. 미국 앱(약 2.1만 명)은 알람 쓴 밤의 55.7%에서 스누즈', '사실'],
    ['연 약 $200M', 'Hatch 회사 전체 매출', '언론 보도, 아기 제품 포함. Clocky는 연 평균 약 $4M. 수면 시계만의 매출은 미확인', '추정'],
    ['577억원', '국내 베개 제조 출하액', '통계청 2024, 직원 10명 이상, 사업체 16개. 시장 규모는 아님', '사실'],
    ['17,500원', '1대 팔 때 남는 돈', '공급가 90,000원 기준. 손익분기 2만 대. 우리 원가는 대부분 가정', '가정'],
    ['약 680~770만원', '인증 시험비', 'KTL 표로 계산: 배터리 팩 267만 + 전기안전 108만 + 증명서 5만 + 블루투스 300~390만', '추정'],
    ['0.5%', '사회 환원 제안(매출 기준)', '100대 기업 평균 0.12%, 필수소비재 0.52%, Patagonia 1%', '가정'],
  ];
  for (let i = 0; i < 6; i++) {
    const x = 0.6 + (i % 3) * 4.14, y = 1.55 + Math.floor(i / 3) * 2.7;
    card(s, x, y, 3.85, 2.5, `핵심 카드 ${i + 1}`);
    tag(s, key[i][3], x + 2.85, y + 0.15);
    tx(s, key[i][0], x + 0.25, y + 0.2, 2.6, 0.7, { fontSize: i === 4 ? 22 : 28, bold: true, valign: 'middle' }, `핵심 숫자 ${i + 1}`);
    tx(s, key[i][1], x + 0.25, y + 1.0, 3.4, 0.4, { fontSize: 16, bold: true }, `핵심 라벨 ${i + 1}`);
    tx(s, key[i][2], x + 0.25, y + 1.45, 3.4, 0.95, { fontSize: 13, color: C.text2 }, `핵심 설명 ${i + 1}`);
  }

  // 4 problem evidence
  s = slide('1. 문제와 경쟁', '1. 늦잠은 정말 흔한 문제일까?', '해외 연구 두 건과 2011년 국내 설문 한 건으로 알람을 미루고 늦잠으로 지각하는 일이 흔하다는 점을 확인했습니다. 최근 3년 이내 한국 설문은 찾지 못했습니다.');
  tag(s, '사실', 11.9, 0.65);
  const ev = [['FaUsers', '69%', '스웨덴 스톡홀름대 설문 (1,732명)', '스누즈를 습관적으로 쓰거나 알람을 여러 개 맞춘다고 답했고, 평균 22분을 미뤘습니다.'], ['FaBell', '55.7%', '미국 수면 앱 (약 2.1만 명)', '알람을 쓴 300만 일 밤 중 절반 이상에서 스누즈를 눌렀고, 평균 10.8분을 미뤘습니다.'], ['FaClock', '32.1%', '인크루트 직장인 설문 (2011, 310명)', '지각 이유 1위가 늦잠입니다. 35.2%가 자주 지각하고 38.5%가 인사평가 불이익을 겪었습니다.']];
  for (let i = 0; i < 3; i++) {
    const x = 0.6 + i * 4.14;
    card(s, x, 1.55, 3.85, 3.9, `근거 카드 ${i + 1}`);
    await iconCircle(s, ev[i][0], x + 0.3, 1.8, 0.65, H.accent2, H.lt1, `근거 ${i + 1}`);
    tx(s, ev[i][1], x + 0.3, 2.6, 3.2, 0.9, { fontSize: 44, bold: true, valign: 'middle' }, `근거 숫자 ${i + 1}`);
    tx(s, ev[i][2], x + 0.3, 3.55, 3.3, 0.6, { fontSize: 15, bold: true }, `근거 출처 ${i + 1}`);
    tx(s, ev[i][3], x + 0.3, 4.2, 3.3, 1.1, { fontSize: 13, color: C.text2 }, `근거 설명 ${i + 1}`);
  }
  card(s, 0.6, 5.7, 12.13, 1.1, '근거 주의 카드', C.text2);
  tx(s, '주의: 이 조사들은 스누즈가 해롭다는 뜻이 아니라 알람을 미루는 일이 흔하다는 뜻입니다. 한국 자료는 2011년 것뿐이며, 잡코리아·사람인·인크루트·엠브레인에서 최근 3년 이내 지각·기상 설문은 찾지 못했습니다.', 0.9, 5.7, 11.5, 1.1, { fontSize: 15, bold: true, color: C.background1, valign: 'middle' }, '근거 주의');

  // 5 products
  s = slide('1. 문제와 경쟁', '2. 비슷한 제품은 무엇이 있나', '손이 나오는 베개와 같은 상용 제품은 확인하지 못했고, 깨우는 방식이 비슷한 제품을 비교했습니다.');
  tag(s, '사실', 11.9, 0.65);
  s.addTable([
    [th('제품'), th('깨우는 방식'), th('가격'), th('판매·규모 근거'), th('신뢰도', { align: 'center' })],
    [td('Clocky', { bold: true }), td('바퀴로 도망가는 시계'), td('출시가 약 $50'), td('누적 50만 대 이상 (2012 창업자 인터뷰, 위키백과)'), lv('낮음')],
    [td('Sonic Bomb + 침대 진동기', { bold: true }), td('큰 소리와 침대 진동'), td('진동기 $17.99~, 세트 $44.99'), td('판매량 비공개'), lv('중')],
    [td('Hatch Restore', { bold: true }), td('빛과 소리로 점진적 기상'), td('Restore 3 약 $170'), td('회사 전체 매출 $140M(2023)~$200M(최근) 보도'), lv('중')],
    [td('스마트 베개 (ZEEQ, Sunrise)', { bold: true }), td('센서로 수면 단계를 보고 진동·빛·소리'), td('ZEEQ $299(예정가), Sunrise $199'), td('Kickstarter 2016~17, ZEEQ 약 $24만 모금. 현재 판매 미확인'), lv('중')],
    [td('Ruggie (바닥 매트 알람)', { bold: true }), td('매트를 밟아야 알람이 꺼짐'), td('$79~99 (보도마다 다름)'), td('Kickstarter 목표 $5만, 약 $22만 모금'), lv('중')],
    [td('Wake-up Machine', { bold: true }), td('고무 팔이 얼굴을 때림'), td('시판 안 함'), td('개인 제작 작품, 판매 없음'), lv('높음')],
  ], { x: 0.6, y: 1.5, w: 12.13, colW: [2.5, 2.6, 2.3, 3.9, 0.83], border, rowH: [0.45, 0.7, 0.6, 0.7, 0.85, 0.7, 0.6], fill: { color: C.background1 }, objectName: '경쟁 제품 표' });
  tx(s, '“베개에서 손이 나오는” 동일 상용 제품은 이번 조사에서 확인하지 못했습니다. 다만 조사 범위가 제한적이라 없다고 단정하지 않고, 유사 특허 조사를 다음 단계로 둡니다.', 0.6, 6.25, 12.13, 0.6, { fontSize: 14, bold: true, color: C.text2 }, '경쟁 결론');

  // 6 competitor revenue
  s = slide('1. 문제와 경쟁', '3. 경쟁 제품의 매출 규모', 'Clocky는 공개 재무자료가 없어 누적 판매량으로 계산한 추정이고, Hatch는 비공개 기업의 언론 보도 수치입니다.');
  tag(s, '추정', 11.9, 0.65);
  card(s, 0.6, 1.55, 5.9, 2.3, 'Clocky 카드');
  tx(s, 'Clocky', 0.9, 1.7, 5.3, 0.4, { fontSize: 17, bold: true, color: C.text2 }, 'Clocky 이름');
  tx(s, '연 평균 약 $4M (추정)', 0.9, 2.15, 5.3, 0.65, { fontSize: 28, bold: true, valign: 'middle' }, 'Clocky 숫자');
  tx(s, '약 59억원. 소매가 기준 상한 추정이며, 출시 시점이 불명확해 신뢰도는 낮음입니다.', 0.9, 2.95, 5.3, 0.8, { fontSize: 14, color: C.text2 }, 'Clocky 설명');
  card(s, 0.6, 4.05, 5.9, 2.5, 'Hatch 카드', C.text2);
  tx(s, 'Hatch (수면·기상 시계)', 0.9, 4.2, 5.3, 0.4, { fontSize: 17, bold: true, color: C.accent1 }, 'Hatch 이름');
  tx(s, '약 $140M → $200M', 0.9, 4.65, 5.3, 0.65, { fontSize: 28, bold: true, color: C.background1, valign: 'middle' }, 'Hatch 숫자');
  tx(s, '회사 전체 매출입니다. Modern Retail(2024.5) 약 $140M, 더 최근 Inc 인용 보도(IBTimes, 2026.5) 연 $200M. 아기 제품 포함, 수면 시계만의 매출은 확인하지 못했습니다.', 0.9, 5.4, 5.3, 1.1, { fontSize: 13, color: C.background1 }, 'Hatch 설명');
  tx(s, 'Clocky 계산 따라가기', 6.9, 1.55, 5.8, 0.45, { fontSize: 20, bold: true }, '계산 제목');
  const cc = [['누적 판매', '50만 대 이상 (2012 창업자 인터뷰)'], ['÷ 판매 기간', '약 6년 (2006~07년 출시 후, 가정)'], ['= 1년 평균', '약 83,000대'], ['× 가격', '$50 → 약 $4.2M'], ['× 환율 1,400원', '약 59억원']];
  for (let i = 0; i < 5; i++) {
    const y = 2.15 + i * 0.82;
    card(s, 6.9, y, 5.83, 0.7, `계산 줄 ${i + 1}`, i === 4 ? C.text2 : C.background2);
    tx(s, cc[i][0], 7.1, y, 1.9, 0.7, { fontSize: 14, bold: true, color: i === 4 ? C.accent1 : C.accent2, valign: 'middle' }, `계산 이름 ${i + 1}`);
    tx(s, cc[i][1], 9.0, y, 3.6, 0.7, { fontSize: 14, color: i === 4 ? C.background1 : C.text1, valign: 'middle' }, `계산 내용 ${i + 1}`);
  }
  tx(s, '※ 다른 자료(샤크탱크 블로그)의 “연 $6.9M”은 언론 두 건과 맞지 않아 쓰지 않았습니다. Inc 원문은 접속이 거부(403)되어 읽지 못했고, 검색 결과에 인용된 문구만 확인했습니다.', 6.9, 6.35, 5.83, 0.6, { fontSize: 12, color: C.text2 }, '매출 각주');

  // 7 market
  s = slide('1. 문제와 경쟁', '4. 시장 규모', '기상 베개 단독 시장 수치는 없어서 인접 시장 전망과 국내 제조 출하액을 참고했습니다. 출하액은 시장 규모가 아닙니다.');
  const mk = [['FaClock', '$13.2억 → $25.2억', '스마트 클락 시장', '2025 → 2029년 전망, 연평균 약 17.6% (The Business Research Company)', '낮음'], ['FaBed', '+$9.4억', '스마트 베개 시장', '2024~2029년 증가분 전망, 연평균 21.1% (Technavio)', '낮음'], ['FaIndustry', '577억원', '국내 베개 제조 출하액', '통계청 광업제조업조사 2024, 직원 10명 이상 사업체 16개, 생산액 578억원, 연말재고 33.5억원', '높음']];
  for (let i = 0; i < 3; i++) {
    const x = 0.6 + i * 4.14;
    card(s, x, 1.55, 3.85, 3.7, `시장 카드 ${i + 1}`, i === 2 ? C.text2 : C.background2);
    await iconCircle(s, mk[i][0], x + 0.3, 1.8, 0.65, i === 2 ? H.accent1 : H.accent2, i === 2 ? H.dk1 : H.lt1, `시장 ${i + 1}`);
    tx(s, mk[i][1], x + 0.3, 2.65, 3.3, 0.7, { fontSize: 24, bold: true, valign: 'middle', color: i === 2 ? C.accent1 : C.text1 }, `시장 숫자 ${i + 1}`);
    tx(s, mk[i][2], x + 0.3, 3.4, 3.3, 0.4, { fontSize: 16, bold: true, color: i === 2 ? C.background1 : C.text1 }, `시장 라벨 ${i + 1}`);
    tx(s, mk[i][3], x + 0.3, 3.9, 3.3, 1.2, { fontSize: 13, color: i === 2 ? C.background1 : C.text2 }, `시장 설명 ${i + 1}`);
    tx(s, `신뢰도 ${mk[i][4]}`, x + 0.3, 4.85, 3.3, 0.3, { fontSize: 12, bold: true, color: i === 2 ? C.accent6 : C.accent4 }, `시장 신뢰도 ${i + 1}`);
  }
  card(s, 0.6, 5.5, 12.13, 1.3, '시장 해석 카드');
  tx(s, '리서치사 전망은 정의와 기준 연도가 달라 서로 비교할 수 없으며 참고용입니다. 출하액은 수입과 소규모 사업체가 빠진 공장 출하가라서 시장 규모와 다릅니다. 우리 3년차 매출 54억원은 이 출하액의 약 9%, 1년차 9억원은 약 1.6%입니다(추정). 신뢰할 만한 국내 시장 규모 자료는 찾지 못했습니다.', 0.9, 5.5, 11.5, 1.3, { fontSize: 14, valign: 'middle' }, '시장 해석');

  // 8 unit economics
  s = slide('2. 비용과 손익', '5. 1대당 손익 (가격과 원가)', '소비자가 99,000원에서 부가세를 빼면 공급가 90,000원이고, 모든 원가는 견적 전의 가정입니다.');
  tag(s, '가정', 11.9, 0.65);
  const ue = [['소비자가 (부가세 포함)', '99,000', '-'], ['공급가 (부가세 제외)', '90,000', '100%'], ['재료비 (BOM)', '34,000', '37.8%'], ['제작 인건비 (OEM 조립)', '6,000', '6.7%'], ['인증·품질관리', '1,500', '1.7%'], ['물류·포장', '4,000', '4.4%'], ['제조원가 소계', '45,500', '50.6%'], ['판매 수수료·유통', '9,900', '11.0%'], ['마케팅', '13,500', '15.0%'], ['반품·AS 충당', '3,600', '4.0%'], ['공헌이익 (고정비 차감 전)', '17,500', '19.4%']];
  const rowsUE = [[th('항목'), th('금액(원)', { align: 'right' }), th('공급가 대비', { align: 'right' })]];
  ue.forEach((r, i) => { const f = (i === 6 || i === 10) ? { fill: { color: C.background2 }, bold: true } : {}; rowsUE.push([td(r[0], Object.assign({}, f)), td(r[1], Object.assign({ align: 'right' }, f)), td(r[2], Object.assign({ align: 'right' }, f))]); });
  s.addTable(rowsUE, { x: 0.6, y: 1.5, w: 7.4, colW: [3.8, 1.8, 1.8], border, rowH: 0.4, fill: { color: C.background1 }, objectName: '단위 손익 표' });
  const b3 = [['99,000원', '소비자가 (부가세 10% 포함)'], ['90,000원', '회사 매출 기준 (99,000 ÷ 1.1)'], ['17,500원', '1대당 남는 돈. 고정비 3.5억원 ÷ 17,500 = 손익분기 2만 대']];
  for (let i = 0; i < 3; i++) {
    const y = 1.5 + i * 1.6;
    card(s, 8.4, y, 4.33, 1.45, `핵심 숫자 카드 ${i + 1}`, i === 2 ? C.text2 : C.background2);
    tx(s, b3[i][0], 8.7, y + 0.15, 3.8, 0.65, { fontSize: 30, bold: true, valign: 'middle', color: i === 2 ? C.accent1 : C.text1 }, `핵심 숫자 ${i + 1}`);
    tx(s, b3[i][1], 8.7, y + 0.85, 3.8, 0.55, { fontSize: 13, color: i === 2 ? C.background1 : C.text2 }, `핵심 설명 ${i + 1}`);
  }
  tx(s, '※ 수수료 11%는 채널별 요율을 섞은 가정입니다(다음 슬라이드). 1대당 남는 돈 = 공급가 × 0.85 − 59,000원.', 0.6, 6.4, 12.13, 0.4, { fontSize: 13, color: C.text2 }, '손익 각주');

  // 9 cost evidence
  s = slide('2. 비용과 손익', '6. 비용 근거: 수수료·인증·부품·보험', '공식 자료로 확인한 비용 근거입니다. 인증 합계는 제가 계산한 추정이고, 보험료는 요율표가 공개되어 있지 않았습니다.');
  const q = [
    ['FaStore', '판매 수수료 (사실)', '와디즈: 서비스 12% + 결제·정산 3% + 9.9만원 (VAT 별도, 2026.2~). 스마트스토어(검색 유입): 결제 3.30% + 판매 2.73% = 6.03%. 쿠팡 생활가전 약 7.8%(비교 사이트). 채널 비중을 섞어 평균 약 11%로 가정.'],
    ['FaCheckCircle', '인증 시험비 (추정)', 'KTL 공식 표: 배터리 팩 KC+CB 267.1만원, 전기기기 안전시험 108.3만원~(+증명서 5만원), 블루투스 무선 성능 126~216만원 + EMC 144만원 + 처리 30만원. 합계 약 680~770만원. 제품이 어느 품목인지에 따라 달라집니다.'],
    ['FaIndustry', '부품 가격 (목록가)', '서보 모터 1,000개 약 $1.47(알리바바 목록가), MCU 모듈 약 $1~2(LCSC). 소량 소매가는 $11~14라 편차가 큽니다. 배터리 셀 가격은 확인하지 못했습니다. 우리 부품 원가는 대부분 가정입니다.'],
    ['FaShieldAlt', 'PL 보험 (요율표 없음)', '중소기업중앙회 단체보험은 요율표 없이 산출질문서로 보험료를 산정합니다. 일반 보험사 대비 국내 28% 저렴(안내 문구), 지자체 13곳이 보험료 10~30%(최대 1~2백만원, 2026) 지원. 우리 조건의 보험료는 알 수 없습니다.'],
  ];
  for (let i = 0; i < 4; i++) {
    const x = 0.6 + (i % 2) * 6.17, y = 1.5 + Math.floor(i / 2) * 2.7;
    card(s, x, y, 5.96, 2.5, `비용 카드 ${i + 1}`);
    await iconCircle(s, q[i][0], x + 0.25, y + 0.2, 0.55, H.accent2, H.lt1, `비용 ${i + 1}`);
    tx(s, q[i][1], x + 1.0, y + 0.22, 4.8, 0.5, { fontSize: 17, bold: true, valign: 'middle' }, `비용 제목 ${i + 1}`);
    tx(s, q[i][2], x + 0.25, y + 0.9, 5.5, 1.5, { fontSize: 12.5, color: C.text2 }, `비용 설명 ${i + 1}`);
  }

  // 10 sales
  s = slide('3. 매출과 환원', '7. 매출·손익 예상 (우리 가정)', '1년차는 고정비 때문에 적자이고 2년차부터 흑자가 되는 계획입니다. 판매 대수와 원가는 대부분 가정이며 소비자 설문과 부품 견적으로 바꿔야 합니다.');
  tag(s, '가정', 11.9, 0.65);
  const R = (a, b, c, d, o) => [td(a, Object.assign({}, o)), td(b, Object.assign({ align: 'right' }, o)), td(c, Object.assign({ align: 'right' }, o)), td(d, Object.assign({ align: 'right' }, o))];
  const sub = { fill: { color: C.background2 }, bold: true };
  s.addTable([
    [th('구분 (억원)'), th('1년차', { align: 'right' }), th('2년차', { align: 'right' }), th('3년차', { align: 'right' })],
    R('판매 대수 (대)', '10,000', '30,000', '60,000'), R('매출액', '9.00', '27.00', '54.00', sub), R('제조원가', '4.55', '12.60', '23.70'), R('판매비', '2.70', '7.56', '14.04'),
    R('공헌이익', '1.75', '6.84', '16.26', sub), R('고정비', '3.50', '5.70', '10.00'), R('영업이익', '-1.75', '1.14', '6.26', sub), R('영업이익률', '-19.4%', '4.2%', '11.6%'),
  ], { x: 0.6, y: 1.5, w: 6.9, colW: [2.4, 1.5, 1.5, 1.5], border, rowH: 0.42, fill: { color: C.background1 }, objectName: '3개년 손익 표' });
  s.addTable([
    [th('1년차 시나리오'), th('판매 대수', { align: 'right' }), th('영업손익', { align: 'right' })],
    [td('보수'), td('5,000대', { align: 'right' }), td('약 -2.6억', { align: 'right' })],
    [td('기본', { bold: true }), td('10,000대', { align: 'right', bold: true }), td('-1.75억', { align: 'right', bold: true })],
    [td('낙관'), td('20,000대', { align: 'right' }), td('약 0 (손익분기)', { align: 'right' })],
  ], { x: 7.9, y: 1.5, w: 4.83, colW: [1.3, 1.3, 2.23], border, rowH: 0.45, fill: { color: C.background1 }, objectName: '시나리오 표' });
  card(s, 7.9, 3.55, 4.83, 2.0, '민감도 카드', C.text2);
  tx(s, '민감도 (1만 대 기준)', 8.15, 3.65, 4.3, 0.4, { fontSize: 15, bold: true, color: C.accent1 }, '민감도 제목');
  tx(s, '소비자가 11.9만원: -0.20억\n소비자가 12.9만원: +0.57억\n재료비 +50%: -3.45억', 8.15, 4.1, 4.3, 1.4, { fontSize: 15, bold: true, color: C.background1 }, '민감도 내용');
  tx(s, '3년차 매출 54억원은 국내 베개 제조 출하액(577억원)의 약 9%라서 쉬운 목표가 아닙니다. 고정비 3.5억원(인건비 2.0 + 임차·운영 0.3 + 금형·개발·인증 0.9 + 기타 0.3)은 가정입니다. 초기 필요 자금은 약 4억원(추정)입니다.', 0.6, 5.85, 12.13, 0.9, { fontSize: 13.5, color: C.text2 }, '매출 각주');

  // 11 CSR
  s = slide('3. 매출과 환원', '8. 사회 환원: 기업은 얼마나 기부할까', '매출의 0.5%를 제안합니다. 국내 100대 기업 평균의 약 4배이고 필수소비재 업종 평균과 비슷하며, Patagonia의 절반입니다.');
  tx(s, '매출 대비 기부 비율', 0.6, 1.5, 6.3, 0.4, { fontSize: 18, bold: true }, '벤치마크 제목');
  tag(s, '사실', 11.9, 0.65);
  const bars = [['국내 100대 기업 평균 (2023, 90개사)', 0.12, C.accent5, '0.12%'], ['필수소비재 업종', 0.52, C.accent5, '0.52%'], ['우리 제안 (가정)', 0.5, C.accent1, '0.5%'], ['Patagonia', 1.0, C.accent5, '1.0%']];
  bars.forEach((b, i) => {
    const y = 2.05 + i * 0.95;
    tx(s, b[0], 0.6, y, 3.0, 0.7, { fontSize: 14, valign: 'middle' }, `막대 이름 ${i + 1}`);
    s.addShape(pres.ShapeType.roundRect, { x: 3.7, y: y + 0.08, w: Math.max(0.15, b[1] * 4.2), h: 0.55, rectRadius: 0.06, fill: { color: b[2] }, line: { color: b[2], width: 0.5 }, objectName: `막대 ${i + 1}` });
    tx(s, b[3], 3.7 + Math.max(0.15, b[1] * 4.2) + 0.12, y, 1.0, 0.7, { fontSize: 15, bold: true, valign: 'middle' }, `막대 값 ${i + 1}`);
  });
  tx(s, '출처: 2024 사회공헌백서(한국사회복지협의회) 보도, Patagonia 공식 안내', 0.6, 5.9, 8.0, 0.35, { fontSize: 12, color: C.text2 }, '벤치마크 출처');
  card(s, 9.2, 1.5, 3.53, 4.8, '환원 구성 카드');
  tx(s, '환원 구성 (가정)', 9.45, 1.65, 3.1, 0.4, { fontSize: 16, bold: true, color: C.accent2 }, '환원 제목');
  const al = [['제품 기부', 40, C.accent2], ['후원금', 30, C.accent1], ['재능기부', 15, C.accent3], ['봉사', 15, C.accent4]];
  al.forEach((a, i) => {
    const y = 2.2 + i * 0.7;
    s.addShape(pres.ShapeType.roundRect, { x: 9.45, y: y + 0.05, w: 0.3, h: 0.3, rectRadius: 0.05, fill: { color: a[2] }, line: { color: a[2], width: 0.5 }, objectName: `환원 색 ${i + 1}` });
    tx(s, `${a[0]} ${a[1]}%`, 9.9, y, 2.5, 0.4, { fontSize: 15, bold: true, valign: 'middle' }, `환원 항목 ${i + 1}`);
  });
  tx(s, '매출 9억원 × 0.5% = 450만원\n2년차 1,350만원, 3년차 2,700만원', 9.45, 5.1, 3.1, 1.1, { fontSize: 13, bold: true, color: C.text2 }, '환원 금액');

  // 12 tax
  s = slide('3. 매출과 환원', '9. 세법: 기부금 한도와 제품 기부', '법령 원문으로 확인한 내용과 비공식 상담으로만 확인한 내용을 구분했습니다. 세무사 확인은 여전히 필요합니다.');
  s.addTable([
    [th('항목'), th('내용'), th('근거'), th('신뢰도', { align: 'center' })],
    [td('일반기부금 한도', { bold: true }), td('(소득금액−결손금 등)의 10%. 사회적기업은 30%(2026.1.1 이후 사업연도)'), td('법인세법 제24조, 2026 개정세법 해설'), lv('높음')],
    [td('한도 초과분', { bold: true }), td('다음 사업연도부터 10년간 이월'), td('법인세법 제24조 제5항'), lv('높음')],
    [td('현물 기부 금액', { bold: true }), td('특수관계인이 아닌 자에게 하는 일반기부금은 기부했을 때의 장부가액'), td('법인세법 시행령 제36조 제1항'), lv('높음')],
    [td('기부 대상', { bold: true }), td('아동·노인·장애인복지시설 등. 2026.2.27부터 다함께돌봄센터·가족센터·갱생보호시설 추가'), td('법인세법 시행령 제39조 제1항'), lv('높음')],
    [td('제품 기부 부가세', { bold: true }), td('국가·지방자치단체·공익단체에 무상 공급하는 재화는 면세. 공익단체는 주무관청 허가·등록 단체 등'), td('부가세법 제26조 제1항 제20호(2차 인용), 시행령 제47조'), lv('높음·중')],
    [td('국세청 상담', { bold: true }), td('지정기부금단체에 재고 기부 시 면세, 매입세액 불공제 없음(기본통칙 38-0-6)'), td('국세청 상담 2018.7.27 (비공식)'), lv('중')],
    [td('주의', { bold: true }), td('고객·불특정 다수에게 증여하면 재화 공급으로 봄(예외 있음). 개인에게 직접 주는 경우는 다를 수 있음'), td('부가세법 제10조 제5항'), lv('높음')],
  ], { x: 0.6, y: 1.5, w: 12.13, colW: [1.9, 5.4, 3.9, 0.93], border, rowH: [0.42, 0.65, 0.5, 0.65, 0.75, 0.75, 0.65, 0.75], fill: { color: C.background1 }, objectName: '세법 표' });
  tx(s, '※ 한도율과 현물 평가는 원문으로 확인했지만, 실제 신고는 세무사 확인이 필요합니다.', 0.6, 6.7, 12.13, 0.3, { fontSize: 12, color: C.text2 }, '세법 각주');

  // 13 gaps
  s = slide('4. 한계', '10. 확인하지 못한 것과 접속 문제', '찾지 못한 항목은 덱에 넣지 않거나 추정, 가정으로 표시했습니다. 접속 문제는 우회하지 않고 그대로 기록했습니다.');
  card(s, 0.6, 1.5, 6.0, 5.2, '미확인 카드');
  tx(s, '찾지 못한 것', 0.9, 1.65, 5.4, 0.4, { fontSize: 18, bold: true, color: C.accent4 }, '미확인 제목');
  s.addText([
    '최근 3년 이내 한국 직장인 지각·기상 설문 (잡코리아·사람인·인크루트·엠브레인 검색에서 없음)',
    'Hatch 수면 시계만의 매출 (회사 전체만 확인)',
    'PL 보험료 요율표 (중소기업중앙회는 산출질문서 방식)',
    '국내 베개 “시장 규모” (제조 출하액만 확인)',
    '부가세법 제26조 제1항 제20호를 법령센터에서 직접 확인 (2차 인용으로만)',
    '부품 대량 견적(배터리 셀·모터)과 제품의 인증 품목 분류',
  ].map((t, j, a) => ({ text: t, options: { bullet: true, breakLine: j < a.length - 1 } })), { x: 0.9, y: 2.2, w: 5.4, h: 4.3, fontSize: 14, color: C.text1, margin: 0, valign: 'top', paraSpaceAfter: 8, isTextBox: true, objectName: '미확인 목록' });
  card(s, 6.9, 1.5, 5.83, 2.9, '접속 카드');
  tx(s, '접속하지 못한 곳', 7.2, 1.65, 5.3, 0.4, { fontSize: 18, bold: true, color: C.accent2 }, '접속 제목');
  s.addText([
    'Inc 기사: 서버가 자동 접속을 막아 403',
    '통계청 kostat.go.kr: mods.go.kr로 이전, 허용 목록 밖',
    '와디즈 메인: 403 (도움말 센터는 열림)',
    '법령센터·KOSIS 표 화면: 연결이 반복해서 끊김',
  ].map((t, j, a) => ({ text: t, options: { bullet: true, breakLine: j < a.length - 1 } })), { x: 7.2, y: 2.2, w: 5.3, h: 2.1, fontSize: 13, color: C.text1, margin: 0, valign: 'top', paraSpaceAfter: 6, isTextBox: true, objectName: '접속 목록' });
  card(s, 6.9, 4.6, 5.83, 2.1, '결정 카드', C.text2);
  tx(s, '정해야 할 것', 7.2, 4.72, 5.3, 0.4, { fontSize: 18, bold: true, color: C.accent1 }, '결정 제목');
  tx(s, '제품 이름(모닝핸즈 / 모닝펀치), 손 동작 설명(어깨를 톡톡 / 쿠션을 가볍게 두드림), 발표자 이름, 발표 시간', 7.2, 5.25, 5.3, 1.35, { fontSize: 14, color: C.background1 }, '결정 내용');

  // 14 reliability
  s = slide('4. 한계', '11. 숫자별 신뢰도 점검', '낮음 항목은 실제 견적과 공식 자료로 바꿔야 합니다.');
  const L = t => lv(t);
  s.addTable([
    [th('수치'), th('근거'), th('신뢰도', { align: 'center' }), th('보완 방법')],
    [td('경쟁 제품 가격', { bold: true }), td('소매 페이지, 언론 보도'), L('중'), td('현재 판매가 직접 확인')],
    [td('Clocky 판매량', { bold: true }), td('위키백과: 2012.10 인터뷰 50만 대 이상'), L('낮음'), td('상한 추정으로만 사용')],
    [td('Hatch 매출', { bold: true }), td('언론 2건($140M·$200M), 블로그($6.9M)와 상충'), L('중'), td('수면 시계 단독 매출은 미확인')],
    [td('시장 규모', { bold: true }), td('리서치사 전망(낮음), 통계청 출하액(높음)'), L('낮음·높음'), td('출하액은 시장 규모 아님')],
    [td('경쟁 제품 비용 비중', { bold: true }), td('업계 벤치마크 기반 가정'), L('낮음'), td('공급사 견적으로 대체')],
    [td('우리 부품 원가', { bold: true }), td('서보·MCU 목록가, 나머지 가정'), L('중'), td('OEM·부품사 3곳 견적')],
    [td('판매 수수료', { bold: true }), td('와디즈 공식 요금제, 스토어·쿠팡은 비교 자료'), L('중'), td('스토어·쿠팡 공식 요율')],
    [td('인증 비용', { bold: true }), td('KTL 공식 수수료표로 계산'), L('중'), td('품목 분류 확인 후 견적')],
    [td('PL 보험료', { bold: true }), td('요율표 없음'), L('낮음'), td('산출질문서 견적')],
    [td('기업 기부 비율', { bold: true }), td('2024 사회공헌백서 보도(2023, 90개사)'), L('중'), td('백서 원문 확인')],
    [td('세법', { bold: true }), td('법령 원문·시행령, 국세청 상담(비공식)'), L('높음·중'), td('세무사 확인')],
    [td('매출·손익 전망', { bold: true }), td('우리가 정한 가정'), L('낮음(가정)'), td('소비자 설문, 부품 견적')],
  ], { x: 0.6, y: 1.5, w: 12.13, colW: [2.6, 5.3, 1.5, 2.73], border, rowH: 0.4, fill: { color: C.background1 }, objectName: '신뢰도 표' });

  // 15 sources
  s = slide('출처', '출처', '링크를 눌러 원문을 확인할 수 있습니다. 링크가 없는 두 자료는 제공받은 문서입니다.');
  const src = [
    ['Wake-up Machine (Laughing Squid)', 'https://laughingsquid.com/the-wake-up-machine-a-robotic-rubber-hand-alarm-that-wakes-a-person-up-by-repeatedly-slapping-them-in-the-face/'],
    ['Clocky (Wikipedia)', 'https://en.wikipedia.org/wiki/Clocky'],
    ['Clocky 가격 (New Atlas)', 'https://newatlas.com/clocky-the-alarm-clock-that-runs-away/6959/'],
    ['Sonic Alert 침대 진동기', 'https://shop.chha.ca/products/sonic-alert-home-aware-bed-shaker'],
    ['Hatch 가격 (asinsight)', 'https://www.asinsight.com/report/US/sonic-alert-alarm-clock'],
    ['Hatch 매출 (Modern Retail)', 'https://www.modernretail.co/marketing/how-hatch-leaned-on-ugc-celebrity-love-gifting-to-go-from-baby-brand-to-viral-tiktok-clock/'],
    ['Hatch 매출 (IBTimes)', 'https://www.ibtimes.co.uk/hatch-alarm-clock-gen-z-sensation-1796247'],
    ['ZEEQ 베개 (Gearbrain)', 'https://www.gearbrain.com/zeeq-worlds-smartest-pillow-on-kickstarter-1922081846.html'],
    ['Sunrise 베개 (MobileSyrup)', 'https://mobilesyrup.com/2017/05/20/sunrise-smart-pillow-device/'],
    ['Ruggie 알람 (Ubergizmo)', 'https://www.ubergizmo.com/2016/01/ruggie-floor-mat-alarm'],
    ['스누즈 연구 (Discover)', 'https://www.discovermagazine.com/health/resisting-the-urge-to-hit-snooze-on-your-alarm-could-lead-to-better-sleep'],
    ['직장인 지각 설문 2011 (경향신문)', 'https://www.khan.co.kr/article/201108132144011'],
    ['스마트 클락 시장 (TBRC)', 'https://www.gii.co.jp/report/tbrc1695023-smart-clock-global-market-report.html'],
    ['스마트 베개 시장 (Technavio)', 'https://giikorea.co.kr/report/infi1915548-global-smart-pillows-market.html'],
    ['통계청 광업제조업조사 2024 (KOSIS)', 'https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1FP1124A'],
    ['와디즈 수수료 (도움말 센터)', 'https://helpcenter.wadiz.kr/hc/ko/articles/25375315142169-%EC%99%80%EB%94%94%EC%A6%88-%EC%88%98%EC%88%98%EB%A3%8C%EB%8A%94-%EC%96%BC%EB%A7%88%EC%9D%B8%EA%B0%80%EC%9A%94'],
    ['스토어·쿠팡 수수료 (glasswallet)', 'https://glasswallet.com/calculate/smartstore-fee/vs-other-platforms'],
    ['서보 도매 목록가 (Alibaba)', 'https://www.alibaba.com/product-detail/SG90-Servo-Motor-Micro-Servo-9G_60413874462.html'],
    ['MCU 모듈 가격 (LCSC)', 'https://lcsc.com/product-detail/image/ESP32-C3-WROOM-02U-N4_C2926676.html'],
    ['전기용품 안전관리법 수수료 (KTC)', 'https://www.ktc.re.kr/web_united/task/task.asp?pagen=1655'],
    ['EMC 시험 수수료 (KTC)', 'https://www.ktc.re.kr/web_united/task/task.asp?pagen=1593'],
    ['EMC 시험 수수료 (KTR)', 'https://www.ktr.or.kr/test-evaluation/led/contentsid/306/index.do'],
    ['무선·EMC 시험 수수료표 (KTL, 2026.6)', 'https://customer.ktl.re.kr/afile/fileDownload/I4Hmn'],
    ['KTL 이차전지시험 수수료', 'https://customer.ktl.re.kr/afile/fileDownload/yYomn'],
    ['KTL 전기용품 안전시험 수수료', 'https://customer.ktl.re.kr/afile/fileDownload/ieGmn'],
    ['지정시험기관 수수료 안내 (국립전파연구원)', 'https://www.rra.go.kr/ko/license/A_e_testorgan.do'],
    ['PL 단체보험 (중소기업중앙회)', 'https://www.kbiz.or.kr/ko/contents/contents/contents.do?mnSeq=341'],
    ['사회공헌백서 2024 (미래한국)', 'https://futurechosun.com/?p=112491'],
    ['Patagonia 1% for the Planet', 'https://www.patagonia.com/one-percent-for-the-planet.html'],
    ['법인세법 제24조', 'https://www.law.go.kr/법령/법인세법/제24조'],
    ['법인세법 시행령 제36조·제39조', 'https://www.law.go.kr/법령/법인세법시행령/제36조'],
    ['부가가치세법 제10조', 'https://www.law.go.kr/법령/부가가치세법/제10조'],
    ['부가가치세법 시행령 제47조', 'https://www.law.go.kr/법령/부가가치세법시행령/제47조'],
    ['부가가치세법 제26조 문구 (법령 인용, 2차)', 'https://www.nepla.ai/wiki/세금/부가세/-유권해석-부가가치세법-제26조-재화-또는-용역의-공급에-대한-면세-w5dnz32648e6'],
  ];
  const half = Math.ceil(src.length / 2);
  const mk2 = (arr, x, nm) => s.addText(arr.map((r, j) => ({ text: r[0], options: { hyperlink: { url: r[1] }, breakLine: j < arr.length - 1 } })), { x, y: 1.5, w: 5.9, h: 4.9, fontSize: 12, color: C.text1, margin: 0, valign: 'top', paraSpaceAfter: 4, isTextBox: true, objectName: nm });
  mk2(src.slice(0, half), 0.6, '출처 목록 1'); mk2(src.slice(half), 6.9, '출처 목록 2');
  tx(s, '링크가 없는 자료(제공받은 문서): 2026년 개정세법 해설(기획재정부), 국세청 상담 답변(2018.7.27)', 0.6, 6.5, 12.13, 0.35, { fontSize: 12, color: C.text2 }, '출처 각주');

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log('done');
})();
