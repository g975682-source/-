# 다음 단계 검토: 축구 애니메이션 자산 확보와 발 IK 도입 타당성

이번 단계에서 한 것은 조사와 설계 검토뿐입니다.
- 하지 않은 것
  - IK 구현, 선수 방향 제어 변경, 게임 본체 수정
  - 기존 CMU 킥 재보정, 커밋·푸시·배포
- 기존 파일과 결과
  - `README.md`, `REPORT_v2.md`, `check_player.js`, `lab.js`, `retarget.js`, `out/`는 수정·삭제하지 않았습니다.
  - 게임 본체 `ground-legends/index.html`과 `docs/index.html`은 읽기만 했고, SHA-256이 이전과 같습니다.

## 0. 출발점: REPORT_v2의 실패 원인 요약 (측정값)

| 실패 | 원인 | 크기 |
|---|---|---|
| 디딤발 밀림·킥 중 미끄럼 | 게임 선수의 이동 ≠ 클립 자체 이동 (D) | 서서 0.60 m(빠진 클립 경로 0.36 m), 달리기 1.42 m(게임 1.655 − 클립 0.254) |
| 지면 관통 | 발 +31%·허벅지 +13.5% 비율 차(B), 원본 발가락 미굴곡(A) | −4.0 ~ −4.5 cm. 발가락만 펴면 발바닥으로 옮겨감 |
| 대각 방향 | 게임이 공을 선수 정면에서 35.8–37.1° 옆으로 보내는데, 선수 방향은 0° 변화 (D) | −35 ~ −38° (한계 15°) |
| 타이밍 | 접촉 순간 공 위치 0.50–0.59 m의 변동 (D) + 측정 순서 영향 (F) | 최근접 0.8–2.2 cm |

여기에 이번에 게임 코드를 읽어서 확인한 사실 두 가지를 더합니다.
- **게임은 양발로 찹니다**: `kickFoot()`가 공의 좌우 위치와 슛 방향으로 왼발/오른발을 고르고, 결과가 `visSide`로 동기화됩니다. 오른발 킥만으로는 모자랍니다.
- **게임은 슛할 때 감속합니다**: D 프레스 때 5.5 m/s → 접촉 때 2.36 m/s → 이후 5.7 m/s(`out/game_probe.json`).

## 1. 조사한 애니메이션 자산과 출처

조사는 웹 검색 결과로만 했습니다.
- 공식 판매·배포 페이지는 이 세션의 네트워크 허용 목록 밖이라 열 수 없었습니다(`curl` 000, `WebFetch` ENOTFOUND).
  - 대상: helpx.adobe.com, gumroad.com, assetstore.unity.com, fab.com, cgtrader.com, quaternius.com, itch.io, 80.lv, cgchannel.com, fling.seas.upenn.edu, renderhub.com
- 그래서 아래 표의 모든 항목은 **공식 출처 미확인** 상태입니다. "검색 요약"은 2차 자료입니다.
- 각 행의 번호(①~⑤)는 아래 다섯 가지 동작 중 무엇을 다루는지 나타냅니다.
  - ① 고속 직선 달리기 킥
  - ② 30–40° 대각 킥
  - ③ 킥 후 앞으로 이어지는 회복
  - ④ 공 몰기 달리기
  - ⑤ 고속에서의 감속

| # | 후보 | 다루는 동작 (검색 요약 기준) | 원본 스켈레톤 | 가격 | 출처 확인 |
|---|---|---|---|---|---|
| 1 | Anderson Rohr 무료 축구 모캡 팩 (Gumroad) | 드리블, 저글링, 킥, 키퍼 선방, 수비. 약 3분 분량. ④ 가능성, ①·② 미확인 | Rokoko 기본, Reallusion iClone(CC), UE5 Manny 3종 | 무료(원하면 후원) | 미확인: 80.lv·CGChannel 기사로만 확인 |
| 2 | Mixamo (Adobe) | 축구 클립이 있다는 것은 이전 지식일 뿐, 이번 검색으로는 확인 못 함. ①–⑤ 모두 미확인 | Mixamo (우리 모델과 같은 뼈 이름) | 무료(Adobe ID) | 미확인: 공식 FAQ 차단, 커뮤니티 사본만 |
| 3 | AA Soccer Player Animations (Unity Asset Store) | 모캡 약 135개: 패스, 슛, 크로스, 대기. ①·③·④ 가능성 | Unity Humanoid (FBX) | $67.99 | 미확인 |
| 4 | Soccer Animations Pack (CGTrader) | 28개: 달리기, 태클, 킥, 패스, 키퍼, 다이빙 + 리깅 모델 | 미확인 | $7 | 미확인 |
| 5 | Animo Mocap Soccer (RenderHub) | 축구 동작 | 미확인 | 유료 | 미확인 |
| 6 | Soccer Actions / Soccer Avatars Actions (Unity) | 공을 가진 선수 100개 등 | Unity Humanoid | 유료 | 미확인 |
| 7 | Quaternius Universal Animation Library 1·2 | 130개 이상. 근접 전투, 파쿠르, 이동 등. **축구 킥은 확인 안 됨**. ⑤ 가능성만 | 범용 휴머노이드(Mixamo 판 있음) | 무료(Standard) | 미확인 |
| 8 | Rokoko Motion Library 무료 150개 | 축구 동작 여부 미확인 | Rokoko | 무료 | 미확인(2020년 기사) |
| 9 | UPenn Multi-Modal Motion Capture DB | 축구 동작 여부 미확인 | 미확인 | 무료 | 미확인 |
| 10 | OmniContact (Hugging Face) | 축구공 킥 BVH(부분집합당 30–59개) | BVH | 연락처 제공 필요 | 미확인(라이선스 미표시) |
| 11 | KIT Whole-Body Motion DB | CMU에서 가져온 공 차기 | MMM/C3D | 무료 | 미확인. 원본이 CMU라 새 동작이 아님 |
| – | 직접 촬영 + 영상 모캡 서비스 (Rokoko Video, Move.ai, DeepMotion 등) | 게임 조건에 맞춰 찍을 수 있음 | 서비스별 | 유료/부분 무료 | 미확인(서비스 약관 확인 필요) |

**제외**(검색 요약 기준, 상업 이용 불가)
- AMASS: 비상업
- Bandai Namco Research: CC BY-NC-ND
- University of Cyprus 댄스 DB: 비상업
- CMU의 어떤 FBX 변환본: CC BY-NC 4.0으로 표기. cgspeed BVH와는 다른 변환본이라 그 변환본에만 해당합니다.
- LaFAN1: 1차 조사에서 비상업으로 제외

## 2. 라이선스 확인 결과와 미확인 사항

아래는 모두 **검색 결과의 2차 정보이며 공식 문서로 확인하지 못했습니다.** 확인하려면 해당 도메인을 세션 네트워크 설정에서 허용하거나, 사람이 원문을 저장해 넘겨 주어야 합니다.

| 후보 | 검색으로 보인 조건 | 우리 프로젝트에서의 쟁점 | 저작자 표시 |
|---|---|---|---|
| 1 Rohr 팩 | 개인·상업 프로젝트 모두 무료 사용 가능, 게임 사용 가능(기사) | 원본 파일 재배포 조건 미확인 | 기사상 불필요. 미확인 |
| 2 Mixamo | 게임 포함 유료·무료 프로젝트 사용 가능. **원본 캐릭터·애니메이션 파일 재배포 금지**(커뮤니티의 FAQ 사본) | 저장소가 공개라면 원본 FBX를 커밋하는 것이 재배포에 해당할 수 있음 → 원본은 로컬·gitignore, 게임에는 구운 결과만 | 불필요(커뮤니티 답변) |
| 3·6 Unity Asset Store | Unity 지원 문서상 다른 엔진 사용 가능(EULA 준수 시). 재배포 금지. Unity 에디터로만 내려받을 수 있다는 해석 있음 | 원본 커밋 불가. Unity 에디터 설치 필요할 수 있음. Unity 자체 제작 자산은 Unity 전용일 수 있음 | 미확인 |
| 4 CGTrader | "Royalty Free License (no AI)" | 원문 미확인 | 미확인 |
| 5 Animo | 상업 사용 가능한 확장 라이선스 포함 | 원문 미확인 | 미확인 |
| 7 Quaternius | CC0 | 가장 자유로운 조건이지만 축구 동작이 없을 가능성이 큼 | 불필요(CC0) |
| 8 Rokoko | 무료분 상업 사용 가능(2020년 기사) | 현재 조건 미확인 | 미확인 |
| 9 UPenn | 상업 제품에 포함 가능, 데이터 자체 재판매 불가 | CMU와 비슷한 조건 | 논문 인용 요청 |
| 10 OmniContact | 미표시 | 사용 불가로 간주 | – |
| CMU(기존) | cgspeed README: 제한 없음. 현재 공식 문구는 미확인(`mocap.cs.cmu.edu` 차단) | – | 감사 문구 요청 |

공통 원칙(1차부터 유지)은 라이선스 원문을 확인하기 전에는 게임 통합 후보로 보지 않는다는 것입니다. 유료 자산은 구매가 필요하므로 별도 승인 대상입니다.

## 3. 후보별 모델·모션 호환성

현재 파이프라인 사실(코드로 확인):
- `retarget.js`는 CMU cgspeed BVH의 뼈 이름(`MAP`: `LowerBack`, `Spine`, `LeftUpLeg`…)과 프레임 0의 T자세를 기준으로 Mixamo 이름 모델에 옮깁니다.
- 로더는 GLTF와 BVH만 있습니다(`vendor/`). FBX 로더는 없습니다.
- 우리 모델은 MakeHuman A자세이고, Mixamo 이름 뼈 52개(손가락 제외 22개), 관절 회전은 단위 회전입니다.

| 후보 | 받아올 형식 | 필요한 작업 | 호환 위험 |
|---|---|---|---|
| Mixamo | FBX(또는 GLB 변환) | FBX 로더(three r128 examples, MIT) 추가. 이름은 그대로 대응. 기준 자세를 프레임 0이 아닌 바인드 자세로 잡도록 리타깃 일반화 | 낮음–중간: 이름이 같고, A/T자세 차이만 처리하면 됨. 손가락 뼈 이름 일치 |
| Rohr 팩 | FBX (Rokoko / CC / UE5 Manny) | 위 FBX 경로 + 뼈 이름 대응표 1개. UE5 Manny는 `pelvis`, `spine_01`…, `thigh_l`, `calf_l`, `foot_l`, `ball_l` 같은 구조(일반 지식, 파일로 확인 안 함) | 중간: 척추 마디 수 차이(5 vs 3), 쇄골·발가락 처리. 쇄골 문제는 이번에 이미 해결 방식 있음 |
| Unity Humanoid 팩 | FBX | 위와 같음 + 팩마다 이름 대응표 | 중간 |
| Quaternius | GLB / FBX (Mixamo 판) | GLB면 바로 읽음, Mixamo 이름 판이면 대응 쉬움 | 낮음(축구 동작이 없으면 의미 없음) |
| 직접 촬영 | 서비스 출력(FBX/BVH) | 서비스 스켈레톤 대응표 | 촬영 품질에 따라 다름 |

모든 후보에 공통으로 남는 위험:
- **비율 차(B)**: REPORT_v2의 비율 차는 어떤 원본이든 생깁니다. 원본 배우의 발이 우리 모델보다 짧으면 관통이 다시 나옵니다. 그래서 자산을 바꿔도 cm 단위 지면 보정(§4 A)은 필요할 가능성이 큽니다(가설).
- **양발**: 게임이 양발로 차므로, 왼발 킥 자산이 따로 필요하거나 오른발 킥을 좌우 반전해야 합니다. 좌우 반전은 새 기술 항목이라 별도 승인이 필요합니다.

## 4. 발 IK 접근법 비교 (구현하지 않음)

### 4-1. 현재 구조에서 IK가 들어갈 곳 (코드로 확인)

- **프로토타입**: `lab.js`의 `Player.step()`에서 `mixer.update(dt)`로 자세가 정해진 뒤, 홀더 위치·방향을 놓기 직전입니다. 측정(`probe`)은 그 뒤에 일어나므로, IK 전후를 같은 게이트로 비교할 수 있습니다.
- **게임**: 지금의 절차형 리그는 `visA / visT / visPh / spd / visSide`(동기화되는 값)로 자세를 계산하고, 선수마다 프레임마다 그립니다. IK도 같은 자리, 즉 자세 계산 뒤·렌더 전의 표시 전용 단계에 두면 물리·조작·동기화 데이터를 건드리지 않습니다(설계상 판단).
- **필요한 정보**
  - 관절: 골반(Hips) 위치, 허벅지–정강이–발목 3관절의 월드 위치와 회전, 무릎을 굽힐 방향(정강이 앞쪽, 원래 클립의 무릎 방향), 발가락 관절
  - 뼈 길이: 허벅지 0.459 m, 정강이 0.455 m(측정)
  - 지면: 이 게임의 경기장은 y=0 평면이므로 지면 조회가 필요 없습니다(코드상 `p.y`는 점프에만 씀).
- **접지 판단**: 세 방법을 생각할 수 있습니다.
  - (a) 클립마다 미리 표시: 원본 발 관절의 높이와 속도로 접지 구간을 구워 둠
  - (b) 실행 중 발 관절 높이·속도 임계값
  - (c) 메시 정점 검사: 지금 검사 도구의 방식(발 정점 약 1,040개/발)인데, 실행 중에 쓰기에는 무거움
  - 권장은 (a). 크로스페이드 중에는 두 클립의 접지 가중치를 섞습니다(설계).

### 4-2. IK로 고칠 수 있는 오차의 크기 (기하 계산이며, IK를 측정한 값이 아님)

- 다리 길이는 0.914 m이고, 기본자세에서 거의 펴져 있습니다(엉덩이 관절 0.982 m, 발목 0.075 m).
- 발을 땅의 한 점에 고정한 채 몸이 수평으로 d만큼 더 가면, 다리가 닿기 위해 골반이 약 L − √(L² − d²)만큼 내려가야 합니다.
  - d 0.10 m → 0.5 cm
  - d 0.30 m → 5.1 cm
  - d 0.60 m → 22 cm
  - d 1.42 m → 불가능(다리 길이 초과)
- **결론**: IK는 cm 단위 오차(관통 4 cm, 0.1 m 이하의 미끄럼)에는 맞습니다. 하지만 REPORT_v2의 주된 실패인 서서 0.60 m, 달리기 1.42 m 미끄럼은 IK로 고칠 수 없는 크기입니다. 이것은 동작 자산이 게임의 이동과 맞아야 풀립니다.

### 4-3. A와 B 비교

| | A. 지지발만 제한 IK | B. 지지발 + 킥발 IK |
|---|---|---|
| 하는 일 | 접지 구간의 발을 월드에 고정하고 발바닥을 y ≥ 0으로 올림. 필요하면 골반을 조금 내림. 2본 해석해(허벅지·정강이) + 발목·발가락 각도 | A + 킥발을 게임의 공 위치(접촉 틱)로 끌어감 |
| 고치는 것 | 관통(−4 cm), 작은 미끄럼, 페이드 중 발 미끄럼(0.03–0.14 m) | A에 더해 접촉 간격·타이밍(공 0.50–0.59 m 변동) |
| 못 고치는 것 | 0.3 m 이상 미끄럼(§4-2), 대각 방향 | 같음. 방향은 킥발만 돌리면 다리가 비틀어짐 |
| 실패 위험 | 고정을 풀 때 발이 튐, 무릎 과신전(펴지는 한계), 골반이 위아래로 출렁임, 빠른 페이드 중 접지 판단이 흔들림 | A의 위험 + 킥발이 공을 쫓아가면서 스윙 궤적이 부자연스러워짐. **접촉을 IK로 맞추면 "공 접촉 임의 보정 금지" 원칙과 충돌**하므로, 허용 범위와 판정 기준을 새로 승인받아야 함 |
| 기존 애니메이션과 간섭 | 지지발 구간만 바뀜. 킥 스윙은 원본 그대로 | 킥의 핵심 동작이 바뀜. 원본 품질 평가가 무의미해짐 |
| 구현 범위(추정) | 2본 IK 1개 함수, 접지 메타데이터 굽기, 고정·해제 블렌드, 검사 게이트 추가 | A + 공 목표 계산, 킥 스윙 구간 블렌드, 새 판정 기준 |
| 연산 비용 | **추정**: 선수당 프레임당 약 5–15 µs(다리 2개, 행렬 갱신 포함). 22명이면 0.1–0.35 ms | **추정**: A의 약 1.5배 |

- 측정값과의 비교: 지금 `Player.step` 측정값은 선수당 28.7 µs(52뼈) / 12.6 µs(22뼈)입니다(1차 README, 이 컨테이너 CPU). IK 비용은 측정하지 않았습니다.
- 이동·회전과의 관계: 게임 모드에서 홀더는 게임 위치와 방향을 따릅니다.
  - 발 고정을 월드 좌표에 두면 선수가 그 자리에서 회전해도 발이 남습니다. 회전량이 크면(대각 30–40°) 다리가 꼬일 수 있습니다(가설).
  - 고정 해제 시점은 원본 클립의 발 떼기 시점을 따라야 합니다.
- **권장: A를 먼저.** B는 접촉 보정 원칙과 부딪치므로, 자산을 바꾼 뒤에도 접촉이 맞지 않을 때만 따로 검토합니다.

## 5. 선수 방향 제어 선택지 비교 (게임 코드 읽기만 함)

현재 흐름(코드로 확인):
- **방향 목표**: 움직일 때는 속도 방향, 공을 가졌을 때 회전 속도는 7.5 rad/s입니다.
  - 슛 준비 중에는 `plantT`로 회전이 0.3배(2.25 rad/s)로 줄어듭니다.
  - 이때 목표는 여전히 **속도 방향이지 공을 보낼 방향이 아닙니다.**
- **슛 방향**: `doShoot()`이 골대(`gx`, 입력에 따른 `tz`)를 향해 공 속도를 정하고, 선수 방향 `p.face`는 그대로 둡니다.
- **동기화**: 선수마다 위치, `face`, `visA`, `visT`, `visPh`, `spd`, `visSide`, 표시 여부 10개 값을 보냅니다. 조준 방향은 보내지 않습니다.
- **판단**: 대각 방향 오차 36°는 애니메이션 문제가 아닙니다. 게임이 접촉 순간 선수 방향을 바꾸지 않고 공만 옆으로 보내기 때문입니다(측정: 접촉 때 방향 변화 0°, 공 방향 35.8–37.1°).
  - 애니메이션 쪽 한계는, 정면으로만 차는 킥 하나뿐이라는 점입니다.

| 선택지 | 조작감 | 자연스러움 | 온라인 동기화 (형식 변경 없음) | 게임 로직 영향 |
|---|---|---|---|---|
| 1. 킥 전에 선수가 공 보낼 방향을 보도록 회전 | 0.24 s 준비 동안 몸이 돎. 반응이 둔해 보일 수 있음 | 몸과 공 방향이 맞아 자연스러움 | `face`가 이미 동기화되므로 손님·리플레이도 그대로 따라감 | **있음**: `face`는 `kickFoot()`(어느 발로 찰지), `fwd(p)`(파워 슛 이동 방향) 등 로직에 쓰이므로, 결과가 바뀔 수 있어 승인과 회귀 시험이 필요 |
| 2. 방향은 그대로, 킥 동작만 적용 (현재) | 변화 없음 | 대각 슛에서 36° 어긋나 보임(측정) | 영향 없음 | 없음 |
| 3. 킥 방향과 몸 방향 분리 (표시 전용: 킥 동안 몸 또는 상체·골반을 조준 쪽으로 돌림) | 변화 없음 | 좋아질 가능성 큼. 다리 꼬임이 위험 | 조준값이 동기화되지 않으므로, 손님 쪽은 동기화된 값(위치·팀→골대 중심)으로 근사해야 함. 슛의 좌우 편차 `tz`(±3 m)는 모름. 골대까지 16 m면 오차 최대 약 ±10.6°(계산) | 없음(표시만). 다만 판정 기준(방향 ≤ 15°)을 근사값으로 통과시키는 것이 원칙에 맞는지 승인 필요 |

- **권장**: 3을 먼저 프로토타입에서 검토합니다(게임 로직과 동기화 형식 변경 없음).
  - 1은 게임 플레이가 바뀌므로 기획 결정이 필요합니다.
  - 어느 쪽이든 30–40° 대각 킥 자산이 있으면 몸을 덜 돌려도 되므로, 자산 확보가 먼저입니다.

## 6. 가장 현실적인 다음 단계와 근거

1. **자산 확보(승인 필요)**: 무료이면서 축구 동작이 있다고 보도된 Rohr 팩, 그리고 우리 모델과 뼈 이름이 같은 Mixamo부터 시작합니다. 둘 중 하나로 진행합니다.
   - (a) 세션 네트워크 허용 목록에 gumroad.com, mixamo.com, helpx.adobe.com 등을 추가
   - (b) 사람이 직접 받아서, 라이선스 원문(저장 페이지/PDF)과 함께 `player-animation/assets/` 아래 gitignore 폴더에 둠
   - 원본 파일은 커밋하지 않습니다.
2. **프로토타입 확장(승인 필요)**: FBX 로더와 뼈 이름 대응표를 추가하고, 기준 자세를 바인드 자세로 쓰는 리타깃을 새 파일로 만듭니다.
   - `retarget.js`는 수정하지 않습니다.
   - 그다음 `check_player.js --probe out/game_probe.json`의 같은 게이트로 기존 결과(58/178)와 비교합니다.
3. 자산이 게이트의 주요 항목을 통과하는 경우에만, 남은 cm 단위 오차를 위해 **IK A**를 프로토타입에서 검토합니다(승인 필요).
4. 방향은 선택지 3(표시 전용)을 프로토타입에서 검토하거나, 기획이 선택지 1을 결정합니다(승인 필요).

**근거**
- 실패의 대부분(0.3–1.42 m 미끄럼, 36° 방향)은 IK나 보정으로 고칠 수 없는 크기이거나 게임 로직 문제입니다(§4-2, §5).
- 그래서 게임 조건에 맞는 동작 자산이 다른 모든 단계보다 먼저입니다.

### 적합한 자산을 아직 찾지 못함: 필요한 모션 조건

공식 출처와 라이선스까지 확인된 적합 자산은 **아직 없습니다**. 찾거나 촬영해야 할 조건은 다음과 같습니다(게임 측정값 기준).

1. **달리며 차기**
   - 양발 각각. 접근은 약 5.5 m/s로 시작해, 프레스 후 0.33–0.53 s 사이에 2.3–2.5 m/s까지 줄어들면서 접촉합니다.
   - 접촉 때 공은 몸 앞 0.50–0.60 m, 디딤발은 공 옆입니다.
   - 준비 동작은 프레스 뒤 0.33 s 안에 끝나야 합니다(D 0.1 s 누름 기준).
2. **대각 킥**: 달리는 방향에서 좌우 30–40°로 차는 동작, 양발 각각. 몸이 조준 쪽으로 돌며 차는 동작이면 더 좋습니다.
3. **회복**: 킥 뒤 앞으로 2–5 m/s를 유지하며 0.5 s 안에 달리기로 이어지는 동작. 멈추는 판(0 m/s까지)도 하나씩.
4. **공 몰기 달리기**: 5.5–6 m/s, 공 터치 주기를 포함한 반복 가능한 한 주기.
5. **감속**: 6–7 m/s에서 1–1.5 s 안에 정지하는 동작.
6. **공통 조건**
   - 같은 배우, 같은 스켈레톤, 60 fps 이상
   - 바인드(T 또는 A) 자세 포함, 가능하면 접지 표시
   - 상업적 사용·수정·게임 안에 포함한 배포를 허용하는 라이선스 원문

## 7. 실제로 확인한 것과 가설

- **확인함(이 환경에서 직접)**
  - 게임 코드
    - 방향 목표와 슛 준비 중 0.3배 회전: `index.html` 3170–3178행
    - 슛 방향 결정(`doShoot`), 양발 선택(`kickFoot`)
    - 동기화 필드 10개(5473행 보내기 / 5572–5573행 받기)
    - 절차형 킥 자세(1789행)
  - 게임 기록 수치(`out/game_probe.json`)와 REPORT_v2 측정값
  - 다리 길이(진단 측정)와 그로부터의 기하 계산
  - 웹 검색 결과의 내용(2차 자료)
  - 공식 사이트 접속이 실패했다는 사실
- **가설 또는 추정**
  - 각 자산의 실제 내용, 품질, 라이선스 원문
  - Mixamo에 축구 클립이 있다는 것(이전 지식, 이번 미확인)
  - UE5 Manny 뼈 구조(일반 지식)
  - IK 연산 비용, IK 실패 위험의 실제 크기
  - 선택지 3의 근사 오차가 실제 경기에서 어떤지
  - 자산을 바꿔도 비율 차로 관통이 다시 날 것이라는 예상

## 8. 다음 단계에서 별도 승인이 필요한 작업

- 네트워크 허용 도메인 추가, 또는 사람이 자산과 라이선스 원문을 직접 받아 전달하기
- 유료 자산 구매(Unity $67.99, CGTrader $7, Animo 등), 촬영·영상 모캡 서비스 사용
- FBX 로더 추가와 새 리타깃 파일(프로토타입)
- 좌우 반전 킥 생성
- 발 IK 구현(A 먼저), 그리고 IK B를 쓸 경우 접촉 판정 기준의 재정의
- 방향 제어: 선택지 1(게임 로직 변경) 또는 3(표시 전용 근사)의 프로토타입
- 게임 본체 통합, 커밋, 푸시, 배포

## 출처 (웹 검색 결과, 공식 페이지 아님)

- Mixamo 라이선스(커뮤니티 FAQ 사본):
  - https://community.adobe.com/questions-696/mixamo-faq-licensing-royalties-ownership-eula-and-tos-589400
  - https://community.adobe.com/questions-696/characters-and-animation-for-commercial-use-589723
  - https://discussions.unity.com/t/asset-rejected-due-to-licenses-required-for-third-party-assets/871153
- Quaternius UAL:
  - https://quaternius.itch.io/universal-animation-library-2
  - https://quaternius.com/packs/universalanimationlibrary.html
  - https://80.lv/articles/get-this-animation-asset-library-with-over-130-diverse-items
  - https://digitalproduction.com/2026/02/10/130-animations-one-rig-zero-drama/
- Rohr 팩:
  - https://80.lv/articles/get-this-free-soccer-mocap-animation-pack-with-dribbles-juggling-more/
  - https://www.cgchannel.com/2026/09/download-130-free-fbx-mocap-moves-from-anderson-rohr/
- 유료 축구 팩:
  - https://marketplace.unity.com/packages/3d/animations/aa-soccer-player-animations-package-237656
  - https://www.cgtrader.com/3d-models/character/other/soccer-animations-pack
  - https://assetstore.unity.com/packages/3d/animations/soccer-actions-233382
  - https://assetstore.unity.com/packages/3d/animations/soccer-avatars-actions-233385
  - https://www.renderhub.com/animo/animo-mocap-soccer
- Unity·Fab 다른 엔진 사용:
  - https://support.unity.com/hc/en-us/articles/34387186019988-Can-I-use-assets-from-the-Asset-Store-with-other-engines
  - https://gamefromscratch.com/using-asset-store-assets-in-other-engines-is-it-legal/
  - https://www.unrealengine.com/en-US/blog/fab-epics-new-unified-content-marketplace-launches-today
  - https://www.cgchannel.com/2024/11/epic-games-to-share-new-free-assets-on-fab-every-two-weeks
- 데이터셋:
  - https://fling.seas.upenn.edu/~mocap/cgi-bin/i.php
  - https://amass.is.tue.mpg.de/license.html
  - https://huggingface.co/datasets/lightcone02/OmniContact-Dataset
  - https://motion-database.humanoids.kit.edu/details/motions/1063/?listpage=2
  - https://www.cgchannel.com/2022/05/download-3000-free-mocap-moves-from-bandai-namco-research/
  - https://dancemuseum.cs.ucy.ac.cy/license.html
  - https://www.cgchannel.com/2020/03/get-150-free-mocap-moves-from-rokokos-motion-library
- MoCap Online 라이선스(축구 팩 없음): https://mocaponline.com/products/free-mocap-animation-pack
- ActorCore(축구 팩 미확인): https://www.cgchannel.com/?p=121885
