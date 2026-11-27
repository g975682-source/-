# 게임 모음

| 게임 | 경로 | 설명 |
|---|---|---|
| **PokeForge** | `/pokeforge/` | 포켓몬을 확률로 강화·진화시켜 최강에 도전하는 팬 게임 (1025종 도감, 가방 패시브, 상점) |
| 포켓몬 배틀 | `/pokemon-battle.html` | 포켓몬 챔피언스 스타일 3대3 싱글 배틀 |
| 11-X 팬 레벨 | `/` | 얼음과 불꽃 스타일 리듬 게임 |

모두 빌드 없이 동작하는 정적 파일입니다. 비공식 팬 게임입니다.

## 로컬에서 실행

```bash
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000/pokeforge/ 열기
```

## GitHub Pages로 공개

저장소 **Settings → Pages → Build and deployment**에서 Source를 `Deploy from a branch`로 두고,
Branch를 이 브랜치(루트 `/`)로 선택하면 `https://<사용자>.github.io/<저장소>/pokeforge/` 로 열립니다.
