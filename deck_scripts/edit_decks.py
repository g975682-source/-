import copy, re, sys
from pptx import Presentation
from pptx.util import Emu, Inches

B = '/home/user/-/MorningHands_Business_Analysis.pptx'
S = '/home/user/-/MorningHands_Student_Presentation.pptx'
MD = '/home/user/-/MorningHands_Presentation_Script.md'
log = []

# ---------- generic helpers ----------
def para_replace(par, old, new):
    full = ''.join(r.text for r in par.runs)
    if old not in full or not par.runs:
        return False
    par.runs[0].text = full.replace(old, new)
    for r in par.runs[1:]:
        r._r.getparent().remove(r._r)
    return True

def frames(prs):
    for i, s in enumerate(prs.slides, 1):
        for sh in s.shapes:
            if sh.has_text_frame:
                yield i, sh.name, sh.text_frame
            if sh.has_table:
                for r in sh.table.rows:
                    for c in r.cells:
                        yield i, sh.name, c.text_frame
        if s.has_notes_slide:
            yield i, 'NOTES', s.notes_slide.notes_text_frame

def replace_all(prs, old, new, label, expect=1):
    n = 0
    for i, name, tf in frames(prs):
        for par in tf.paragraphs:
            if para_replace(par, old, new):
                n += 1
    log.append((label, n))
    if n != expect:
        print(f'!! {label}: matched {n} (expected {expect})')
    return n

def find_shape(slide, name):
    return [s for s in slide.shapes if s.name == name][0]

def add_link_para(textframe, text, url):
    last = textframe.paragraphs[-1]
    new_p = copy.deepcopy(last._p)
    last._p.addnext(new_p)
    from pptx.text.text import _Paragraph
    par = _Paragraph(new_p, textframe)
    # first run holds the hyperlink; drop extras
    for r in par.runs[1:]:
        r._r.getparent().remove(r._r)
    par.runs[0].text = text
    par.runs[0].hyperlink.address = url

def remove_para(textframe, startswith):
    for par in list(textframe.paragraphs):
        if ''.join(r.text for r in par.runs).startswith(startswith):
            par._p.getparent().remove(par._p)
            return True
    print('!! paragraph not found:', startswith)
    return False

def set_cell(cell, text):
    par = cell.text_frame.paragraphs[0]
    par.runs[0].text = text
    for r in par.runs[1:]:
        r._r.getparent().remove(r._r)

# ---------- shared text pairs for MD script ----------
md_pairs = []

# =====================================================================
# BUSINESS DECK
# =====================================================================
pb = Presentation(B)

# slide 5: recent Korean surveys not found
replace_all(pb, '한국 자료는 오래되고 표본이 작아 최신 설문을 직접 해야 합니다.',
            '한국 자료는 2011년·310명뿐입니다. 최근 3년 이내 설문은 잡코리아·사람인·인크루트에서 찾지 못해 직접 조사가 필요합니다.', 'B5 caution')
replace_all(pb, '국내 자료는 2011년 것입니다.',
            '국내 자료는 2011년 것입니다. 잡코리아·사람인·인크루트에서 최근 3년 이내 지각 설문을 찾아봤지만 찾지 못했습니다.', 'B5 notes')

# slide 19: tax card + notes
replace_all(pb, '한도는 (소득금액−결손금 등)의 10%, 초과분 10년 이월(법인세법 제24조). 지정기부금단체에 제품 기부 시 부가세 면제로 안내(국세청 상담 2018, 참고)',
            '한도는 (소득금액−결손금 등)의 10%, 초과분 10년 이월(제24조). 현물은 장부가액 평가(시행령 제36조). 지정기부금단체 기부는 부가세 면제로 안내(국세청 상담)', 'B19 tax card')

# slide 21: footnote + notes
replace_all(pb, '(제조원가 환산)', '(장부가액=제조원가 기준 환산, 시행령 제36조)', 'B21 footnote')
replace_all(pb, '제품 기부는 내부적으로 제조원가 기준으로 환산해 계산하므로, 같은 예산으로 더 많은 제품을 전달할 수 있습니다.',
            '일반기부금을 특수관계인이 아닌 단체에 현물로 기부하면 기부했을 때의 장부가액으로 계산합니다(법인세법 시행령 제36조). 그래서 제조원가 기준으로 환산해 같은 예산으로 더 많은 제품을 전달할 수 있습니다.', 'B21 notes')

# slide 22: safety (PL), certification, notes
replace_all(pb, '수면 중 접촉으로 어린이·고령자가 다칠 수 있습니다. 힘 제한, 정지 센서, 제조물책임(PL) 보험을 갖춥니다. 지자체 보험료 지원 사업도 확인합니다.',
            '수면 중 접촉으로 어린이·고령자가 다칠 수 있습니다. 힘 제한, 정지 센서, PL 보험을 갖춥니다. 중기중앙회 단체보험은 산출질문서로 견적, 일부 지자체가 보험료 10~30% 지원.', 'B22 safety')
replace_all(pb, '배터리 KC 700~1,500만원(4~12주), 블루투스 RF·EMC 시험 200~300만원(각 2~3주). 합계 약 900~1,800만원(견적 필요).',
            '안전확인 증명서 5만원+시험비(시험기관 산정). 블루투스 무선시험은 KTL 표로 계산하면 약 300~390만원(추정). 배터리 시험은 공식 표 없음.', 'B22 cert')
replace_all(pb, '인증 비용과 기간은 시험기관 견적이 필요합니다.',
            '전기용품 안전확인 시험비와 배터리 시험비는 시험기관 견적이 필요합니다. 블루투스 시험비는 KTL 수수료표(2026.6)로 계산한 추정입니다.', 'B22 notes')

# slide 24: reliability table
s24 = pb.slides[23]
tbl_shape = [sh for sh in s24.shapes if sh.has_table][0]
tbl = tbl_shape.table
rows = {r.cells[0].text: r for r in tbl.rows}
set_cell(rows['시장 규모'].cells[1], '리서치사 전망(정의 상이). 국내 베개 시장은 자료 없음')
set_cell(rows['인증 비용·기간'].cells[1], '안전확인 5만원·블루투스는 공식 수수료표. 배터리는 표 없음')
set_cell(rows['인증 비용·기간'].cells[3], '배터리 시험 견적')
set_cell(rows['세법'].cells[1], '한도·현물 평가: 법령 원문. 부가세: 시행령 제47조+국세청 상담')
set_cell(rows['세법'].cells[2], '높음·중')
set_cell(rows['세법'].cells[3], '법 제26조 제1항 제20호 원문 확인')
# new PL row (copy of last row)
new_tr = copy.deepcopy(tbl._tbl.tr_lst[-1])
tbl._tbl.append(new_tr)
newrow = tbl.rows[len(tbl.rows) - 1]
for c, t in zip(newrow.cells, ['PL 보험료', '중기중앙회 안내: 요율표 없음, 산출질문서로 산정', '낮음', '산출질문서 견적']):
    set_cell(c, t)
for r in tbl.rows:
    r.height = Inches(0.41)
log.append(('B24 table rows', len(tbl.rows)))

# slide 25: assumptions + sources
s25 = pb.slides[24]
replace_all(pb, '세법은 제24조 원문과 2026년 개정세법 해설(기재부)로 확인. 제품 기부의 부가세는 국세청 상담(2018, 비공식), 현물 평가 방법은 세무사 확인 필요',
            '세법은 법인세법 제24조·시행령 제36조·제39조 원문과 2026년 개정세법 해설로 확인. 제품 기부 부가세는 부가가치세법 시행령 제47조와 국세청 상담(2018, 비공식)으로 확인, 법 제26조 제1항 제20호 원문은 미확인', 'B25 assumption')
src1 = find_shape(s25, '출처 목록 1').text_frame
src2 = find_shape(s25, '출처 목록 2').text_frame
remove_para(src2, '배터리 KC 인증 (Ufine)')
remove_para(src2, '블루투스 KC 시험 (KC전기)')
NEW_SRC = [
    ('전기용품 안전관리법 수수료 (KTC)', 'https://www.ktc.re.kr/web_united/task/task.asp?pagen=1655'),
    ('EMC 시험 수수료 (KTC)', 'https://www.ktc.re.kr/web_united/task/task.asp?pagen=1593'),
    ('EMC 시험 수수료 (KTR)', 'https://www.ktr.or.kr/test-evaluation/led/contentsid/306/index.do'),
    ('무선·EMC 시험 수수료표 (KTL, 2026.6)', 'https://customer.ktl.re.kr/afile/fileDownload/I4Hmn'),
    ('지정시험기관 수수료 안내 (국립전파연구원)', 'https://www.rra.go.kr/ko/license/A_e_testorgan.do'),
    ('PL 단체보험 (중소기업중앙회)', 'https://www.kbiz.or.kr/ko/contents/contents/contents.do?mnSeq=341'),
    ('법인세법 시행령 제36조·제39조', 'https://www.law.go.kr/법령/법인세법시행령/제36조'),
    ('부가가치세법 시행령 제47조', 'https://www.law.go.kr/법령/부가가치세법시행령/제47조'),
]
for t, u in NEW_SRC:
    add_link_para(src2, t, u)
pb.save(B)

# =====================================================================
# STUDENT DECK
# =====================================================================
ps = Presentation(S)
pairs = [
    ('한국 자료는 오래되고 표본이 작아서, 실제로 창업한다면 최신 설문을 직접 해야 합니다.',
     '한국 자료는 2011년 것뿐이고 표본도 작습니다. 잡코리아, 사람인, 인크루트에서 최근 3년 이내 지각 설문을 찾아봤지만 찾지 못했습니다. 실제로 창업한다면 최신 설문을 직접 해야 합니다.', 'S3 notes'),
    ('한국 자료는 오래됐어요.', '한국 자료는 2011년 것뿐이에요. 최근 3년 설문은 찾지 못했어요.', 'S3 caution'),
    ('일반기부금은 소득금액 등의 10%까지 비용 인정, 초과분은 10년 이월. 지정기부금단체에 제품 기부는 부가세 면제로 안내(국세청 상담 2018)',
     '소득금액 등의 10%까지 비용 인정, 초과분 10년 이월. 현물은 장부가액으로 계산(시행령 제36조). 지정기부금단체 기부는 부가세 면제로 안내(국세청 상담)', 'S15 card'),
    ('제품으로 기부할 때 부가세는, 지정기부금단체에 기부하면 면제된다고 국세청 상담 답변(2018년)에 나와 있습니다. 다만 상담 답변이라 공식 해석은 아니고 개인에게 직접 주는 경우는 다를 수 있어, 세무사 확인이 필요합니다.',
     '제품으로 기부하면 그 가액은, 특수관계인이 아닌 단체에 기부하는 일반기부금의 경우 기부했을 때의 장부가액으로 계산합니다. 법인세법 시행령 제36조에 나와 있습니다. 제품 기부의 부가세는, 지정기부금단체에 기부하면 면제된다고 국세청 상담 답변(2018년)에 나와 있습니다. 다만 상담 답변이라 공식 해석은 아니고, 개인에게 직접 주는 경우는 다를 수 있어 세무사 확인이 필요합니다.', 'S15 notes'),
    ('제조원가로 환산하면', '장부가액(제조원가 기준)으로 환산하면', 'S16 footnote'),
    ('제조원가로 계산하면 1년차에 약 40대입니다.', '법령에 따라 기부했을 때의 장부가액, 즉 제조원가로 계산하면 1년차에 약 40대입니다.', 'S16 notes'),
    ('배터리 KC 약 700~1,500만원, 블루투스 시험 약 200~300만원(업체 안내). 견적 필수.',
     '안전확인 증명서 5만원+시험비(견적). 블루투스 무선시험은 KTL 표로 계산하면 약 300~390만원. 배터리 시험은 공식 표가 없어요.', 'S17 cert card'),
    ('넷째, 인증입니다. 배터리 KC 인증이 업체 안내로 700만에서 1,500만 원, 블루투스 시험이 200만에서 300만 원 정도라고 하는데, 실제 견적을 받아야 합니다.',
     '넷째, 인증입니다. 전기용품 안전확인은 신고 증명서가 5만 원이고 시험비는 시험기관이 정합니다. 블루투스 무선 시험은 한국산업기술시험원 수수료표로 계산하면 약 300만에서 390만 원인데, 배터리 시험은 공식 수수료표를 찾지 못해 견적을 받아야 합니다.', 'S17 notes cert'),
    ('기부금 한도는 소득금액 등의 10%(법인세법 제24조). 제품은 지정기부금단체에 기부하면 부가세 면제로 안내(국세청 상담 2018). 세무사 확인 필요.',
     '한도는 소득금액 등의 10%, 현물은 장부가액으로 계산(법령 원문). 제품 기부 부가세는 지정기부금단체면 면제로 안내(국세청 상담). 세무사 확인 필요.', 'S17 tax card'),
    ('기부금 한도는 법인세법에 소득금액 등의 10%로 나와 있습니다.',
     '기부금 한도는 법인세법에 소득금액 등의 10%로, 현물 기부 금액은 시행령에 장부가액으로 나와 있습니다.', 'S17 notes tax'),
]
for old, new, label in pairs:
    replace_all(ps, old, new, label)
    md_pairs.append((old, new))

s22 = ps.slides[21]
t1 = find_shape(s22, '출처 목록 1').text_frame
t2 = find_shape(s22, '출처 목록 2').text_frame
remove_para(t2, '배터리 KC 인증 (Ufine)')
remove_para(t2, '블루투스 KC 시험 (KC전기)')
for t, u in [NEW_SRC[0], NEW_SRC[3], NEW_SRC[5], NEW_SRC[6], NEW_SRC[7]]:
    add_link_para(t2, t, u)
ps.save(S)

# =====================================================================
# MD script: same sentences + certification Q&A
# =====================================================================
md = open(MD, encoding='utf-8').read()
md_pairs.append((
    'A. 업체 안내로 배터리 KC가 약 700~1,500만원(4~12주), 블루투스 시험이 약 200~300만원이에요. 합치면 약 900~1,800만원인데, 실제 견적이 필요해요.',
    'A. 전기용품 안전확인은 신고 증명서가 5만원이고 시험비는 시험기관이 정해요. 블루투스 무선 시험은 KTL 수수료표(2026.6)로 계산하면 약 300~390만원이에요. 배터리 시험은 공식 수수료표를 못 찾아서 견적이 필요해요.'))
for old, new in md_pairs:
    c = md.count(old)
    if c == 0:
        print('!! md not found:', old[:40])
    md = md.replace(old, new)
open(MD, 'w', encoding='utf-8').write(md)
print(log)
