# engine3d 자산 라이선스

| 파일 | 출처 | 라이선스 | 근거 |
|---|---|---|---|
| `models/mh_player.glb` | `prototypes/glb-viewer/player-animation/build_player.py`가 MakeHuman MPFB2 자산(base mesh, macro targets, Mixamo 이름 rig와 weights)으로 생성. 생성 코드는 자체 작성, MPFB 코드 미포함. `out/mh_player_nofingers.glb`와 같은 파일(SHA-256 `32f618f7…`) | CC0 1.0 | `prototypes/glb-viewer/player-animation/assets/mpfb2/LICENSE.md`, `LICENSE.ASSETS.md`, 커밋 `6ff1eb35…` (github.com/makehumancommunity/mpfb2) |
| `vendor/GLTFLoader.js`, `vendor/SkeletonUtils.js` | three.js r128 `examples/js` (`prototypes/glb-viewer/vendor/`의 사본) | MIT | three.js 저장소 LICENSE. 배포할 때 저작권 표시 유지 |
| `anim/clips.json` | CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu), 피험자 143 (143_01, 143_02, 143_03, 143_24, 143_32)과 16 (16_35), cgspeed BVH 변환본(github.com/Shriinivas/cmubvh, `prototypes/glb-viewer/player-animation/assets/cmu/SOURCE`)을 `tools/bake_clips.js`로 이 모델에 리타게팅 | CMU 데이터베이스 이용 조건: 무료, 연구·상업 제품에 포함 가능, 동작 데이터 자체를 판매하는 것은 불가. 출처 표시 권장 ("The data used in this project was obtained from mocap.cs.cmu.edu. The database was created with funding from NSF EIA-0196217.") | CMU 사이트 문구. 이 환경에서는 사이트에 접속하지 못해 원문은 다시 확인하지 못했습니다 (`prototypes/glb-viewer/README.md` 참고) |
| `models/mh_player.glb.json` | `models/mh_player.glb`의 base64 사본 (`build_site.py`가 만듦) | CC0 1.0 | 위와 같음 |
| `player3d.js` | 이 프로젝트에서 작성 | 프로젝트와 같음 | — |

쓰지 않는 것: `prototypes/glb-viewer/models/`의 Xbot, Soldier(라이선스 확인 안 됨), CesiumMan(CC-BY 4.0, 저작자 표시
필요, 선수 모델로 맞지 않음). CMU 모션 캡처는 위 표대로 적용했습니다. 게임 화면이나 소개 문구에 출처 표시를 넣는 것을 권장합니다.
