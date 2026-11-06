# Ground Legends 인계 메모 (2026-11-06)

다른 세션이 이어서 작업할 때 먼저 읽을 것. 자세한 내용은 아래에 적힌 문서들에 있음.

## 0. 사용자 규칙 (꼭 지킬 것)

- **답은 한글로.**
- **커밋·배포는 계속 하되, 배포 전에 항상 백업**(아래 4절 절차).
- 최우선 과제: 새 3D 선수 엔진(`engine3d/`)을 FC Online처럼 자연스럽게. 옛 절차 생성 모델은 대체용으로 유지.
- 물리·조작·AI·온라인 동기화·리플레이는 함부로 바꾸지 말 것(바꿀 땐 측정·테스트로 근거).
- 라이선스 불분명한 자산은 넣지 말 것. 사용자가 올린 FC Online 화면 자료(선수 사진, 엠블럼, 유니폼, 팩 이미지)는
  공개 사이트·저장소에 넣으면 안 됨(참고용으로 새로 디자인만 가능). 실제 선수 자료 `prototypes/real-players/players.json`은 gitignore.
- 기존 테스트·기준 파일을 임의로 바꾸지 말 것.
- 사용자 C 드라이브(Windows)는 클라우드 세션에서 연결 불가.
- 영상은 직접 볼 수 없음: 실제 경기 데이터(아래 2절)로 분석해 왔음. 이 사실을 솔직하게 말할 것.

## 1. 위치

- 저장소 `g975682-source/-`, 브랜치 `claude/confident-cori-gi5b2h`(작업·배포 모두 여기).
- 게임: `ground-legends/index.html`(three.js r128 한 파일). 웹사이트 사본 `docs/index.html`과 `docs/engine3d/`는
  `python3 ground-legends/build_site.py`로 만듦(직접 고치지 말 것).
- claude.ai 아티팩트: https://claude.ai/artifact/K6QVNGTmDc1AhX8sLNHKsR (현재 버전 53, 사이드바에 고정됨).
  "그라운드 레전드 열어줘" → Artifact `open`. 아티팩트 파일: 페이지 `index.html` + `engine3d/player3d.js`,
  `engine3d/anim/clips.json`, `engine3d/models/mh_player.glb.json`(glb의 base64), `engine3d/vendor/*`.
- 3D 엔진 `ground-legends/engine3d/`: `player3d.js`(window.P3D), `models/mh_player.glb`(MakeHuman CC0, 52뼈),
  `anim/clips.json`(CMU 클립), `anim/real_body.json`(실제 선수 몸 수치), `README.md`, `LICENSES.md`,
  `MOVEMENT_ANALYSIS.md`(분석 전부: 1–8절), `tools/`(개발용, 사이트 사본에는 안 들어감).

## 2. 실제 데이터 (분석에만, 배포 안 함)

- SkillCorner 오픈 데이터(MIT, 출처 표기): 위치 추적 20경기(10 Hz), 동적 이벤트, 3D 몸 자세 2경기(관절 29개, 25 fps,
  Hugging Face). 받기: `engine3d/tools/fetch_skillcorner.sh <폴더>`(약 1.8 GB) + 몸 자세는
  `https://huggingface.co/datasets/SkillCorner/opendata-bodypose/resolve/main/raw/<1925299|1996435>.jsonl.zip`(각 약 620 MB,
  `curl -L -C - --retry 5`). 사용자가 허용한 도메인: huggingface.co, us.aws.cdn.hf.co, cdn-lfs.hf.co, cdn-lfs-us-1.hf.co,
  figshare.com, ndownloader.figshare.com, zenodo.org, polyhaven.com, ambientcg.com.
- CMU 모션 캡처: GitHub 미러 `https://raw.githubusercontent.com/Shriinivas/cmubvh/main/Sequence-XXX-YYY/<subj>/Data/<take>.zip`
  (피험자별 README에 동작 설명). 쓰는 BVH는 `prototypes/glb-viewer/player-animation/assets/cmu/`.
- 스크래치패드의 데이터·중간 결과는 세션이 끝나면 사라짐 → 필요하면 다시 받기.

## 3. 지금까지 한 일 (커밋 순)

1. 3D 엔진 단계 1–4: GLB 모델, 유니폼 색, 서기·걷기·조깅·달리기 클립, 방향 인식 이동, 경합 자세(견제·볼 지키기·어깨),
   브레이크/출발, 킥 클립 타이밍, 발 고정 IK, 드리블 위상, 키퍼/헤딩/태클 보정, 리플레이·온라인 자세.
2. 선수 외형: 등번호·이름(스키닝 데칼), 유니폼 무늬(셰이더: 줄무늬·가로줄·띠), 체형(W/M), 머리 3종·번, 수염, 키퍼 긴소매·장갑.
3. AI·이동을 실제 추적 데이터에 맞춤(`MOVEMENT_ANALYSIS.md` 6절): `locoStep`(가속·감속·회전 제한, 사용자 조작 선수는 예전 반응),
   `moveTo` 속도표, `trackSpot`(대형·마크 부드럽게), `aiPress`(구역별 거리, 태클 감소 → 퇴장 24→4), `formTarget` 계수,
   슛 선택, 동료가 다른 동료 패스 흘리기, 7명 미만 킥오프 오류 수정.
4. 3D 동작을 실제 몸 자세에 맞춤(7절): 달리기 클립 CMU 127_08, 옆걸음 143_40(조깅은 16_35 유지), 걸음 박자 실제 주기(`CYC`)
   + 보폭 0.95–1.25배, 상체 기울기 보정(`TLEAN`, ×1.35, 목으로 시선 수평), 어깨 반대 회전, 회전 기울기, 머리 공 쪽.
   게임 `STRIDES`(드리블 터치 주기)는 엔진 주기와 같게.
5. 공과 선수 접촉(그리는 공만, `ballContact`): 드리블 터치·킥·헤딩·키퍼 손. 키퍼 다이빙 시점 `gkDive`(꼭대기 = 공 도착).
6. 신체 부위별 상세 분석(8절, `anim/real_body.json`, `tools/pose_detail.py`)과 적용(8-11절): 서기 발 폭 0.29 m,
   팔 벌림·뒤로 흔들기(`ARMK`), 손목 10°, 발끝 바깥(`legs()`), 견제 웅크림 0.52, 공 가진 선수 팔, 옆걸음 70–120°,
   머리(키퍼·침투), 손동작 레이어(`gestureTick`/`gesture`: 팔 들기·벌리기·가리키기).

7. 구단 모드: 대출·파산(`settleFinance`, `debtCrisis`, 경기당 이자 20%, 한도 300,000 BP), 백업 `pre-club-debt-2026-11-04`.
8. 통계·시상(2026-11-04, 백업 `pre-stats-awards-2026-11-04`): 구단 탭 "통계 · 시상". 리그 경기만 셈.
   `club.ss`(이번 시즌 선수별 기록: 골 g, 도움 a, 경고 y, 퇴장 r, 출전 ap, 키퍼 출전 kp, 무실점 cs, 실점 gc, 선방 sv, 평점 합 rs),
   `club.ssLast`(지난 시즌), `club.awards`(역대 수상자). 리그 상대 팀 선수는 `lgRoster(id)`(4-3-3 고정 명단, 경기 때와 같은 이름).
   우리 경기는 실제 경기 기록(`ssMyMatch`), 다른 팀끼리 경기는 점수에 맞춰 포지션별로 배분(`ssSim`). 시즌 끝(`seasonAwards`):
   득점왕(골→도움), 야신상(무실점→경기당 실점, 팀 경기 절반 이상), 발롱도르(평균 평점+골·도움+팀 순위). 우리 선수 수상 시
   30,000/30,000/60,000 BP. 개발용 `__game.club`, `clubPlay()`, `clubMatch`, `clubGo()`, `clubView(tab,{stat,when})`, `faces()`.
   우리 경기는 짧아서(3–12분) 우리 키퍼의 무실점이 많이 나오는 편(알려진 치우침).
9. 구단 기록(2026-11-04, 백업 `pre-career-records-2026-11-04`): "통계 · 기록" 탭 안에 보기 3개(리그 순위·시상 / 구단 통산 기록 /
   골·선방 기록). 리그 순위에 선방·무실점 탭 추가. 저장: `club.tot`(all/lg/cup: 경기·승무패·득실·선방·무실점, `since` 시즌),
   `club.career[id]`(all/lg/cup 선수 통산, 떠난 선수도 남음), `club.glog`(골 200개, 최신 먼저, 분·당시 점수·득점자·도움),
   `club.mlog`(경기 80개: 상대 슈팅·유효·선방·키퍼), `club.seasons`(시즌별 리그 기록). 기록은 `clubResult`→`clubRecord`
   (리그·대회 모두, apply 전에), 골은 `goalScored`의 `matchGoals`. 옛 저장은 `clubTot()`이 이번 시즌 순위표·대회 결과·리그 통계로 채움
   (그 전 선수 기록은 없음).

10. 전체 시즌 통계(`club.ssAll`, 시즌 끝 `allStats(ss)`로 더함, 리그 순위에 "전체 시즌" 버튼, 이번 시즌 포함)와
    상황별 동작(`MOVEMENT_ANALYSIS.md` 8-14): 키퍼 다이빙 5종(`p.diveK` 2–6)·서서 잡기 3종, 슛 정면 발리·바이시클·시저스·
    슬라이딩 마무리(`shotMotion`, `OVIS`). 기존 상태의 side 값 2 이상으로 그림(새 상태 없음 → 기준 파일 그대로).
    화면 확인 `engine3d/tools/render_actions.js`. 백업 `pre-career-records-2026-11-04`(아티팩트 53 = 이 둘 배포 전).

11. (2026-11-05) 리액션·세리머니·볼 컨트롤·넘어짐·블록·키퍼 펀칭/펀트(`RX`, `react()`, `OVIS`, `CELEB`, `CONCEDE`),
    실제 자세 비율로 맞춤(`MOVEMENT_ANALYSIS.md` 8-15, `tools/situ_pose.py`). 개인기 발-공 접촉 IK(`legIK`, 각 계열 `touch`).
    강화 게이지: 대상보다 OVR 3 낮은 재료까지 1칸(25%). 백업 `pre-motions2-2026-11-05`.

12. (2026-11-06) 풀게이지 자동 발사(`autoFull`), 리그 스타(`STARS`, `starTeams`, `withStar`; 상위 5팀, 능력치 105, 그 팀과의
    경기는 cupWC AI; 실명은 `prototypes/real-players/stars.json`(gitignore)에서 읽어 아티팩트에만 함께 발행, 공개 사이트는 대체 이름).
    GL-Motion 모션 매칭(`MOVEMENT_ANALYSIS.md` 9절): 지금은 옆걸음만 사용, 나머지는 측정상 기존 클립이 나음. DB 다시 굽기:
    `sh engine3d/tools/fetch_100style.sh <폴더>` 후 `MM_EXTRA=<폴더>/cmu node engine3d/tools/bake_mm.js`. 백업 `pre-glmotion-2026-11-06`.

## 4. 배포 절차 (매번)

1. 백업: 아티팩트 페이지 읽기(Artifact `read`, path `index.html`) → 아래 스크립트(스크래치패드에 없으면 다시 만들기):
   ```bash
   # backup.sh <label> <아티팩트 index.html 저장 경로>   (저장소 루트에서)
   L="$1"; ART="$2"; B="docs/backup/$L"; mkdir -p "$B" tmp_head
   git archive HEAD docs/index.html docs/engine3d | tar -x -C tmp_head && cp -r tmp_head/docs/index.html tmp_head/docs/engine3d "$B/" && rm -rf tmp_head
   git tag -l "$L" | grep -q . || git tag "$L" HEAD
   cp "$ART" "ground-legends/backup/artifact-K6QVNGTmDc1AhX8sLNHKsR-$L.html"
   ```
   라벨 예: `pre-<내용>-<날짜>`. 태그도 push.
2. `python3 ground-legends/build_site.py`
3. 테스트(아래 5절), 사이트 사본도 `P3D_SITE=docs node ground-legends/tests/p3d_smoke.js`
4. 커밋(끝에 Co-Authored-By/Claude-Session 줄) → `git push -u origin claude/confident-cori-gi5b2h`
5. 아티팩트 publish: url 위 주소, file_path `ground-legends/index.html`, files에 바뀐 엔진 파일
   (`engine3d/player3d.js`, `engine3d/anim/clips.json` 등). 발행된 파일을 이 세션에서 안 읽었으면 먼저 `read`(path).

## 5. 테스트·측정

- 테스트: `node ground-legends/tests/p3d_smoke.js`(무거운 백그라운드 작업 중엔 "arrows moved" 항목이 시간 때문에 실패할 수
  있음 → 한가할 때 다시), `tests/anim_baseline.js`(A|kick, C|kick 차이는 예전부터 알려진 것, RESULT PASS면 됨),
  `tests/account_save.js`, `tests/legacy/`의 t21(실행마다 8–12/12로 흔들림), t24, t30, t31(가끔 UI 타임아웃), t51, t80, t83,
  t115(자체 판정). legacy는 `cd ground-legends/tests/legacy && node tXX.js`, 다른 버전과 비교는 `GAME=<파일>`.
- 측정 도구(`engine3d/tools/`): `measure_loco.js`(발 미끄러짐), `render_loco.js`(SCENE=loco|kick|dribble|moves|contest|brake),
  `render_look.js`(외형), `export_match_track.js`+`track_an.py`(AI 이동 vs 실제), `export_match_pose.js`+`pose_full.py`
  (3D 관절 vs 실제), `pose_detail.py`(부위별·손동작·킥).

## 6. 현재 수치와 남은 과제

- 실제와 거의 맞음: 달리기 걸음 수·보폭, 상체 기울기, 팔꿈치·무릎, 팔 벌림·흔들기 위치, 서기 발 폭, 발끝 방향.
- 2026-11-03 처리: 슛 동작 보정(`kickShape`)·디딤발 스텝, 걷기 클립 CMU 35_01, 7 m/s 드리블 발 튐, 전력 팔꿈치
  (`MOVEMENT_ANALYSIS.md` 8-12). 아티팩트 버전 50, 백업 `pre-kick-walk-2026-11-03`.
- 남은 것:
  - 7 m/s 드리블 미끄러짐 상위 10% 0.41 m/s(배포 전 0.27). 걸음 수는 1.0 m/s 이하에서 실제보다 느림(1.6, 실제 1.9).
  - 손동작·옆걸음 비율은 화면 확인 안 됨.
  - 경기 흐름이 실제보다 너무 빠름: AI 경기 45분에 슛 약 105, 골 약 22, 패스 성공 약 60%(실제 90분 슛 25, 골 3.3, 패스 80%).
    고치려면 게임 밸런스 결정 필요(사용자에게 물어볼 것).
  - 옆걸음 비율, 손동작은 화면 확인 안 됨.
