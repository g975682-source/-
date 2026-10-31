# 실제 축구 선수의 움직임 분석과 게임 비교

작성 2026-10-31. 목적: 선수 움직임을 실제 경기처럼 자연스럽게 만들기 위한 기준과 우선순위.

## 0. 방법과 한계

- 이 작업 환경에서는 영상을 직접 재생하거나 볼 수 없습니다. 대신 **실제 경기 영상·추적 데이터·모션 캡처를 분석한
  연구와 지도 자료**를 웹에서 찾아 정리했습니다. 대부분 요약(초록·검색 결과)으로 확인했고, 전문을 읽지 못한 수치는
  "약"으로 표시했습니다. 연구마다 속도 기준이 달라 숫자는 경향으로 봐야 합니다.
- 우리 게임은 `tools/measure_match_motion.js`로 AI 대 AI 경기를 21분(경기 진행 시간) 돌려 같은 항목을 쟀습니다(필드
  플레이어 20명, 0.1초마다). 그 경기는 0:15로 끝나 정상 경기라고 보기 어렵습니다. 비율의 경향만 참고합니다.

## 1. 실제 경기에서 선수들은 어떻게 움직이나

### 1-1. 얼마나 빨리, 얼마나 자주 (경기 영상·GPS 분석)

| 항목 | 실제 | 출처 |
|---|---|---|
| 시간 비율 | 서 있기 약 10%, 걷기 약 33%, 조깅 약 33%, 달리기 약 16%, 고강도 약 7%, 전력 질주 약 1% | 한 연구 표 [JISSN] |
| 저강도 비율 | 시간의 약 91%가 서 있기·걷기·조깅. 달리기 6.5%, 고속 2%, 질주 0.5% (유로 대회 수준) | Bradley 2010 요약 [cissik] |
| 질주 | 9–27 m, 45–90초마다 한 번. 고속·질주의 70–84%가 10 m 미만 | [Human Kinetics], [JOHK] |
| 가속·감속 | 고강도 감속이 고강도 가속보다 더 많음 | Harper 2019 메타분석 [cronfa] |
| 활동 변화 | 경기당 약 1,431번 (모든 동작 전환) | Rienzi 2000 [cronfa] |

### 1-2. 어느 방향으로 (Bloomfield 2007, 프리미어리그 55명 영상 분석)

- 의미 있는 움직임 시간 중 **앞으로 똑바로는 약 49%**, 제자리 약 21%, 나머지(약 30%)는 뒤·옆·대각·호(곡선).
- 경기당 **700번 넘게 방향을 틈**, 대부분 0–90°. 90° 이상 꺾는 방향 전환도 90번 이상 (Robinson 2011).
- 수비수는 다른 포지션보다 뒤로 움직이는 시간이 많음.

### 1-3. 동작별 자세

| 상황 | 실제 자세·기술 | 출처 |
|---|---|---|
| 일반 달리기 | 팔꿈치 약 90°, 손은 골반–가슴 사이, 손목 중립. 걷기는 팔꿈치를 거의 편 채 흔듦 | [Yegian 2019], [MoveGoals], [Gait&Posture 2018] |
| 방향 전환 | **마지막 바로 전 걸음(penultimate)에서 브레이크**. 세 관절(엉덩이·무릎·발목)을 굽혀 몸을 낮추고, **몸통을 새 방향으로 기울임**. 60° 이상 꺾을 때 특히 | Dos'Santos 2019·2025 [MMU], [Frontiers 2025] |
| 드리블 | 빠른 선수일수록 **공 터치 빈도가 높음(초당 약 3번)**, 경로가 짧고 곧음, 엉덩이·무릎 움직임 폭이 작음, 무게중심을 낮춤. 돌아설 때 몸통 굽힘·회전과 팔 벌림 | Zago 2016 (13세 이하 모션캡처) [AIR], [LIDA] |
| 1대1 수비 (jockeying) | **몸을 비스듬히(side-on)**, 무릎 굽혀 낮게, 짧고 빠른 걸음, **뒤로 물러나며** 상대를 앞에 둠, 뛰어들지 않음, 바깥·약한 발 쪽으로 몰기 | 지도 자료 [St Albert], [iCoachFootball] |
| 볼 지키기 (shielding) | 공과 상대 사이에 몸, 상대 쪽 어깨를 상대에게, 무릎 굽힘, 발은 어깨너비, **상대 쪽 팔은 균형용으로 벌림(밀기 아님)**, 공은 먼 발에 | [SoccerXpert], [Mojo] |
| 어깨 경합 (공정한 차징) | **어깨 대 어깨, 팔꿈치는 몸에 붙임, 최소 한 발은 땅에**, 공이 닿는 거리 안에서. 팔은 균형용만, 밀기·잡기 불가 | 심판 지침 [Ask a Soccer Referee], IFAB 12조 |
| 서서 하는 태클 (block) | 디딤발을 공 옆에, 태클 발목은 고정, 무릎 굽혀 낮게, **몸을 태클 쪽으로 실음**(빠지면 짐) | [Human Kinetics tackles] |
| 슬라이딩 태클 | 서서 하는 태클보다 타이밍이 중요. 쓸 발을 미리 정하고, 상대와 나란히, 태클하지 않는 발이 상대 쪽 | [Human Kinetics tackles] |
| 공중볼 경합 | **팔 흔들기가 점프 높이를 올림**, 공의 최고점에서 맞추기, 끝까지 공을 봄 | [ISBS 헤딩 연구] |
| 슛·롱패스 (인스텝) | 공에 **24–43° 비스듬히 접근** (30°에서 정강이 속도 최대, 45°에서 공 속도 최대), **디딤발은 공 옆 약간 뒤, 차는 방향과 나란히**, 발목 고정, 엉덩이→무릎→발로 채찍처럼 | [Isokawa & Lees], [JSSM 2009], [arXiv 2024] |
| 골키퍼 준비 자세 | 발 너비 다리 길이의 약 33%, **무릎 약 62°·엉덩이 약 63° 굽힘**, 체중 앞쪽, 가까운 슛일수록 낮게. 손은 허리 높이(핸드볼 연구) | [Frontiers 2019], [Substack set position] |

## 2. 우리 게임과의 차이

### 2-1. 측정 (AI 대 AI, 21분)

| 항목 | 우리 게임 | 실제 |
|---|---|---|
| 속도 비율 | 서 있기 0.5%, 걷기 9%, 조깅 28%, 달리기 27%, 고속 19%, 질주 16% | 서 있기 약 10%, 걷기 약 33%, 조깅 약 33%, 달리기 약 16%, 고속 약 7%, 질주 약 1% |
| 이동 방향 (움직일 때) | 앞 91%, 대각 4%, 옆 3.5%, 뒤 1.4% | 앞 약 49%(제자리 포함 기준), 나머지 약 30%가 뒤·옆·대각·곡선 |
| 공을 보며 이동 | 움직이는 시간의 22% | (해당 수치 없음) |
| 그려지는 동작 | 달리기 상태 96.5%, 서 있기 0.7%, 나머지 3% | — |

(속도 기준이 연구마다 달라 정확한 비교는 아니지만 차이가 큽니다.)

### 2-2. 해석

1. **선수들이 너무 많이, 너무 빨리 뜁니다.** 실제는 시간의 90% 가까이가 서 있기·걷기·조깅인데, 우리 게임은 고속·질주가
   35%입니다. 화면 전체가 "다들 계속 전력 질주"로 보이는 가장 큰 원인입니다. 이건 그래픽이 아니라 **AI의 이동
   속도 선택** 문제라, 고치려면 게임 AI 변경 승인이 필요합니다.
2. **거의 항상 앞으로만 달립니다.** 실제는 뒤·옆·대각 이동이 많고(특히 수비), 우리 AI는 91%가 앞입니다. 동시에, 우리
   게임이 공을 보며 옆·뒤로 움직이는 22%의 순간에 3D 모델은 **앞으로 달리는 클립**을 틀어서 발이 미끄러지는
   "문워크"가 됩니다. 이건 **그래픽(엔진) 쪽에서 바로 고칠 수 있습니다.**
3. **방향 전환에 브레이크 동작이 없습니다.** 게임은 몸 방향을 초당 7.5–10 rad로 돌리고 속도만 바꿉니다. 실제 선수는
   전환 전 걸음에서 낮아지며 브레이크를 걸고 몸통을 새 방향으로 기울입니다.
4. **드리블이 그냥 달리기입니다.** 공 터치와 발이 맞지 않고, 낮은 자세·짧은 보폭이 없습니다(조작하는 선수가 가장
   오래 보이는 장면).
5. **수비 견제, 볼 지키기, 어깨 경합이 화면에 안 보입니다.** 게임에는 이미 견제(`jockeyT`, 공 보기), 볼
   지키기(`shielding`, 느린 속도, 지키는 방향), 몸싸움(`bodyDuels`, 비틀거림 `A.stagger`)이 있습니다. 그런데 3D 모델은
   그냥 달리기·서 있기로 그립니다. 자세(비스듬히, 낮게, 팔 벌림)만 바꿔도 크게 달라집니다.
6. **킥 타이밍.** 게임이 공을 차는 순간 발은 아직 몸 뒤에 있고, 약 0.1초 뒤에 공 자리를 지납니다
   (`../prototypes/glb-viewer/player-animation/toe_visual_exp/`). 접근 각도(24–43°)와 디딤발 위치도 없습니다.
7. 태클·슬라이딩·헤딩·다이빙은 옛 모델 자세를 옮겨 쓰는 중이라 기능은 하지만 뻣뻣합니다.

## 3. 개선 순서 제안

| 순서 | 내용 | 바꾸는 곳 | 효과 | 자료 |
|---|---|---|---|---|
| 1 | **방향 인식 이동**: 하체는 이동 방향, 상체·머리는 바라보는 방향(공). 뒷걸음은 걷기·조깅 클립 역재생, 옆걸음은 엉덩이를 이동 방향으로 돌리고 상체를 비틈 | 엔진만 | 문워크 제거. 이동 시간의 22% | 기존 클립 |
| 2 | **수비 견제·볼 지키기·어깨 경합 자세**: 비스듬히, 무릎 굽혀 낮게, 상대 쪽 팔 벌림, 경합 때 어깨를 상대 쪽으로 | 엔진만 (게임이 이미 주는 상태 사용) | 경합 장면이 축구처럼 보임 | 절차 생성 + 위 기준값 |
| 3 | **방향 전환 브레이크**: 속도·방향 변화량으로 감속 기울기(뒤로), 낮아짐, 새 방향으로 몸통 기울기 | 엔진만 | 급정지·꺾기가 자연스러움 | 절차 생성 |
| 4 | **드리블 걸음**: 공 터치에 발을 맞추고 보폭을 줄이고 조금 낮게 | 엔진 (+ 게임의 공 위치 계산과 맞춤) | 조작 선수가 가장 많이 보이는 장면 | 클립 재생 속도 + 절차 생성 |
| 5 | **킥 접근과 타이밍**: 비스듬한 접근, 디딤발, 공 차는 순간에 발이 공에 닿게 | 엔진 + 게임 킥 시작 시점 (승인 필요) | 슛·패스 | CMU 킥 클립(구워 둠) |
| 6 | **AI 속도 배분**: 공과 먼 선수는 걷기·조깅, 필요할 때만 질주 | 게임 AI (승인 필요) | 화면 전체의 리듬 | — |
| 7 | 태클·헤딩·골키퍼 동작 교체 | 엔진 | 세부 | 모션 캡처 확보 필요 |

모션 캡처 자료: 축구 전용으로 무료·라이선스가 확실한 것은 찾지 못했습니다. Soccer-X(SMGDiff 논문, 30명 10시간, 드리블
포함)는 라이선스·다운로드 미확인, OmniContact(Hugging Face)는 접근 승인 필요, Animo(RenderHub)는 유료 상업 자산입니다.
1–4번은 지금 있는 CMU 클립과 절차 생성으로 할 수 있습니다.

## 출처

- [JISSN 표: 경기 중 활동 비율](https://jissn.biomedcentral.com/articles/10.1186/s12970-019-0287-6/tables/2)
- [Bradley 2010 요약 (cissik)](https://www.cissik.com/blog/?p=1191)
- [Human Kinetics: Physical demands on the soccer player](https://us.humankinetics.com/blogs/excerpt/physical-demands-on-the-soccer-player)
- [JOHK: Sprint and High-Speed Running in Soccer](https://johk.pl/?p=9696)
- [Russell et al. (cronfa, Swansea)](https://cronfa.swansea.ac.uk/Record/cronfa23388)
- [Akenhead et al. (Northumbria)](https://nrl.northumbria.ac.uk/id/eprint/11146)
- [Bloomfield 2007, JSSM](https://jssm.org/jssm-06-63.xml-Fulltext)
- [Yegian & Tucker 2019: Straight arm walking, bent arm running](https://hsrc.himmelfarb.gwu.edu/smhs_psych_facpubs/1801)
- [MoveGoals: Arm swing for running](https://www.movegoals.com/arm-swing-for-running.html)
- [Gait & Posture 2018 (팔 관절 범위)](https://documentserver.uhasselt.be//bitstream/1942/26634/1/1-s2.0-S0966636218313006-main.pdf)
- [Dos'Santos: penultimate foot contact (MMU)](https://e-space.mmu.ac.uk/626016/3/The%20role%20of%20the%20PFC%20-%20R2.pdf)
- [Frontiers 2025: change of direction](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2025.1453859/pdf)
- [Zago 2016: dribbling determinants (AIR)](https://air.unimi.it/handle/2434/282240), [half-turn with the ball (LIDA)](https://lida.sport-iat.de/dfb/Record/4039389)
- [St Albert Soccer: Defending 1v1 jockeying](https://www.stalbertsoccer.com/wp-content/uploads/sites/1544/2019/01/Defending-1v1-Jockeying.pdf)
- [iCoachFootball: 1v1 defending](https://www.icoachfootball.net/1v1-defending-drills-jockeying/)
- [SoccerXpert: shielding](https://www.soccerxpert.com/tips/details/soccer-shielding), [Mojo: shielding](https://mojo.sport/coachs-corner/what-is-shielding-in-soccer/)
- [Ask a Soccer Referee: fair shoulder charge](https://www.askasoccerreferee.com/?p=2667), [IFAB Law 12](https://theifab.com/laws/chapter/32/section/93/)
- [Human Kinetics: three basic tackles](https://us.humankinetics.com/blogs/excerpt/soccer-has-three-basic-tackles)
- [ISBS: heading biomechanics](https://ojs.ub.uni-konstanz.de/cpa/article/view/6892)
- [JSSM 2009: instep kick](https://www.jssm.org/jssm-08-230.xml-Fulltext), [arXiv 2024: biomechanics-inspired kicking](https://arxiv.org/pdf/2407.14612)
- [Frontiers 2019: goalkeeper diving](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2019.00015/pdf), [The set position](https://williemcdonald.substack.com/p/the-set-position)
- [SMGDiff / Soccer-X](https://arxiv.org/pdf/2411.16216), [OmniContact](https://huggingface.co/datasets/lightcone02/OmniContact-Dataset), [Animo Mocap Soccer](https://www.renderhub.com/animo/animo-mocap-soccer)
