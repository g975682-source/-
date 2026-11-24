import copy
exec(open('edit_decks.py').read().split('# ---------- shared text pairs')[0])
from pptx import Presentation
SRC_BATT = ('KTL 이차전지시험 수수료 (KTL)', 'https://customer.ktl.re.kr/afile/fileDownload/yYomn')
SRC_SAFE = ('KTL 전기용품 안전시험 수수료 (KTL)', 'https://customer.ktl.re.kr/afile/fileDownload/ieGmn')
SRC_VAT26 = ('부가가치세법 제26조 문구 (법령 인용, 2차)', 'https://www.nepla.ai/wiki/세금/부가세/-유권해석-부가가치세법-제26조-재화-또는-용역의-공급에-대한-면세-w5dnz32648e6')

# ---------------- Business deck
pb = Presentation(B)
replace_all(pb, '안전확인 증명서 5만원+시험비(시험기관 산정). 블루투스 무선시험은 KTL 표로 계산하면 약 300~390만원(추정). 배터리 시험은 공식 표 없음.',
            'KTL 수수료표 기준 배터리 팩 KC+CB 267만원, 전기기기 안전시험 108만원~, 블루투스 300~390만원. 합계 약 680~770만원(추정).', 'B22 cert')
replace_all(pb, '전기용품 안전확인 시험비와 배터리 시험비는 시험기관 견적이 필요합니다. 블루투스 시험비는 KTL 수수료표(2026.6)로 계산한 추정입니다.',
            'KTL 수수료표로 계산한 합계(배터리 팩 267만+전기안전 108만+증명서 5만+블루투스 300~390만)는 추정이며, 제품이 어느 품목으로 분류되는지에 따라 달라져 시험기관 견적이 필요합니다.', 'B22 notes')
tbl = [sh for sh in pb.slides[23].shapes if sh.has_table][0].table
rows = {r.cells[0].text: r for r in tbl.rows}
set_cell(rows['인증 비용·기간'].cells[1], 'KTL 공식 수수료표로 계산(배터리·전기안전·블루투스)')
set_cell(rows['인증 비용·기간'].cells[3], '품목 분류 확인 후 견적')
set_cell(rows['시장 규모'].cells[1], '리서치사 전망. 국내 베개: KOSIS 표는 찾았으나 값 미확인')
set_cell(rows['세법'].cells[3], '20호는 2차 인용으로 확인')
replace_all(pb, '법 제26조 제1항 제20호 원문은 미확인', '법 제26조 제1항 제20호 문구는 법령 인용문(2차)으로 확인', 'B25 assumption')
src2 = find_shape(pb.slides[24], '출처 목록 2').text_frame
for t, u in (SRC_BATT, SRC_SAFE, SRC_VAT26):
    add_link_para(src2, t, u)
pb.save(B)

# ---------------- Student deck
ps = Presentation(S)
pairs = [
 ('안전확인 증명서 5만원+시험비(견적). 블루투스 무선시험은 KTL 표로 계산하면 약 300~390만원. 배터리 시험은 공식 표가 없어요.',
  'KTL 수수료표로 계산하면 배터리 팩 267만원, 전기안전 시험 108만원~, 블루투스 300~390만원. 합계 약 680~770만원(추정).', 'S17 cert card'),
 ('넷째, 인증입니다. 전기용품 안전확인은 신고 증명서가 5만 원이고 시험비는 시험기관이 정합니다. 블루투스 무선 시험은 한국산업기술시험원 수수료표로 계산하면 약 300만에서 390만 원인데, 배터리 시험은 공식 수수료표를 찾지 못해 견적을 받아야 합니다.',
  '넷째, 인증입니다. 한국산업기술시험원 수수료표로 계산하면 배터리 팩 시험이 약 267만 원, 전기용품 안전시험이 108만 원부터, 블루투스 무선 시험이 약 300만에서 390만 원이고, 증명서 발급비 5만 원을 더하면 합계 약 680만에서 770만 원입니다. 다만 우리 제품이 어느 품목으로 분류되는지에 따라 달라지므로 실제 견적을 받아야 합니다.', 'S17 notes cert'),
]
md_pairs = []
for old, new, label in pairs:
    replace_all(ps, old, new, label); md_pairs.append((old, new))
t2 = find_shape(ps.slides[21], '출처 목록 2').text_frame
for t, u in (SRC_BATT, SRC_SAFE, SRC_VAT26):
    add_link_para(t2, t, u)
ps.save(S)

md = open(MD, encoding='utf-8').read()
md_pairs.append(('A. 전기용품 안전확인은 신고 증명서가 5만원이고 시험비는 시험기관이 정해요. 블루투스 무선 시험은 KTL 수수료표(2026.6)로 계산하면 약 300~390만원이에요. 배터리 시험은 공식 수수료표를 못 찾아서 견적이 필요해요.',
  'A. KTL 수수료표로 계산하면 배터리 팩 시험이 약 267만원, 전기용품 안전시험이 108만원부터, 블루투스 무선 시험이 약 300~390만원이고, 증명서 5만원을 더하면 합계 약 680~770만원이에요. 제품이 어느 품목으로 분류되는지에 따라 달라서 실제 견적이 필요해요.'))
for old, new in md_pairs:
    if old not in md: print('!! md missing', old[:40])
    md = md.replace(old, new)
open(MD, 'w', encoding='utf-8').write(md)
print(log)
