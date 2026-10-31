# engine3d 자산 라이선스

| 파일 | 출처 | 라이선스 | 근거 |
|---|---|---|---|
| `models/mh_player.glb` | `prototypes/glb-viewer/player-animation/build_player.py`가 MakeHuman MPFB2 자산(base mesh, macro targets, Mixamo 이름 rig와 weights)으로 생성. 생성 코드는 자체 작성, MPFB 코드 미포함. `out/mh_player_nofingers.glb`와 같은 파일(SHA-256 `32f618f7…`) | CC0 1.0 | `prototypes/glb-viewer/player-animation/assets/mpfb2/LICENSE.md`, `LICENSE.ASSETS.md`, 커밋 `6ff1eb35…` (github.com/makehumancommunity/mpfb2) |
| `vendor/GLTFLoader.js`, `vendor/SkeletonUtils.js` | three.js r128 `examples/js` (`prototypes/glb-viewer/vendor/`의 사본) | MIT | three.js 저장소 LICENSE. 배포할 때 저작권 표시 유지 |
| `player3d.js` | 이 프로젝트에서 작성 | 프로젝트와 같음 | — |

쓰지 않는 것: `prototypes/glb-viewer/models/`의 Xbot, Soldier(라이선스 확인 안 됨), CesiumMan(CC-BY 4.0, 저작자 표시
필요, 선수 모델로 맞지 않음). 2단계에서 쓸 CMU 모션 캡처(`assets/cmu/`)는 CMU Graphics Lab 데이터베이스의 이용 조건(제품에
포함 가능, 데이터 자체의 판매는 불가)을 따르며, 적용 전에 문구를 다시 확인합니다.
