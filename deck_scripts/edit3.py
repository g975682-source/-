exec(open('edit_decks.py').read().split('# ---------- shared text pairs')[0])
from pptx import Presentation
KOSIS = ('통계청 광업제조업조사 2024 (KOSIS, 화면 캡처 확인)', 'https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1FP1124A')

pb = Presentation(B)
replace_all(pb, '국내 베개·수면 시장 규모는 신뢰할 자료를 찾지 못해 제외했습니다.',
            '국내 베개 제조 출하액은 통계청 조사(2024, 10명 이상)로 약 577억원(사업체 16개)이며 시장 규모와는 다릅니다.', 'B7 footnote')
replace_all(pb, '업체별 정의가 달라 직접 비교는 어렵습니다.',
            '업체별 정의가 달라 직접 비교는 어렵습니다. 국내 베개 제조 출하액은 통계청 광업제조업조사(2024년, 10명 이상 사업체)에서 사업체 16개, 출하액 577억원(57,728백만원)입니다. 수입과 소규모 사업체가 빠져 있어 시장 규모는 아닙니다. 우리 3년차 매출 54억원은 이 출하액의 약 9%, 1년차 9억원은 약 1.6%입니다(추정).', 'B7 notes')
tbl = [sh for sh in pb.slides[23].shapes if sh.has_table][0].table
rows = {r.cells[0].text: r for r in tbl.rows}
set_cell(rows['시장 규모'].cells[1], '리서치사 전망(낮음). 국내 베개 출하액은 통계청 값(높음)')
set_cell(rows['시장 규모'].cells[2], '낮음·높음')
set_cell(rows['시장 규모'].cells[3], '출하액은 시장 규모 아님')
add_link_para(find_shape(pb.slides[24], '출처 목록 2').text_frame, *KOSIS)
pb.save(B)

ps = Presentation(S)
replace_all(ps, '판매 1만 대, 3만 대, 6만 대로 늘고', '판매 1만 대, 3만 대, 6만 대로 늘고', 'S13 probe', expect=0) if False else None
n = 0
for i, name, tf in frames(ps):
    if name == 'NOTES' and i == 13:
        tf.paragraphs[-1].runs[-1].text += ' 참고로 국내 베개 제조 출하액은 통계청 조사로 약 577억 원(2024년, 직원 10명 이상 사업체)이어서, 3년차 매출 54억 원은 그 약 9%입니다. 시장 규모는 아니고 참고 비교입니다.'
        n += 1
print('S13 notes appended', n)
add_link_para(find_shape(ps.slides[21], '출처 목록 2').text_frame, *KOSIS)
for par in find_shape(ps.slides[21], '출처 목록 2').text_frame.paragraphs:
    par.space_after = Pt(5)
    for r in par.runs: r.font.size = Pt(12.5)
ps.save(S)

md = open(MD, encoding='utf-8').read()
add = ('**Q. 국내 베개 시장은 얼마나 되나요?**\n\nA. 시장 규모는 찾지 못했어요. 대신 통계청 광업제조업조사(2024년, 직원 10명 이상 사업체)에서 "베개 및 유사제품"의 출하액이 약 577억원(57,728백만원), 사업체가 16개예요. 수입과 소규모 사업체는 빠져 있어서 시장 규모는 아니에요. 우리 3년차 매출 54억원은 이 출하액의 약 9%예요.\n\n')
assert '## 발표 팁' in md
md = md.replace('## 발표 팁', add + '## 발표 팁')
# slide 13 notes in md
old = '다시 한번, 이 숫자는 모두 가정에 기반한 계획이며 실제 견적과 판매 결과로 바뀔 수 있습니다.'
if old in md:
    md = md.replace(old, old + ' 참고로 국내 베개 제조 출하액은 통계청 조사로 약 577억 원(2024년, 직원 10명 이상 사업체)이어서, 3년차 매출 54억 원은 그 약 9%입니다. 시장 규모는 아니고 참고 비교입니다.')
else:
    print('!! md slide13 sentence not found')
open(MD, 'w', encoding='utf-8').write(md)
print(log)
