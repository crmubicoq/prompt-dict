# 프롬프트 전자사전 (prompt-dict)

교육지원팀이 **잘 만든 프롬프트를 잃어버리지 않고, 서로 찾아 쓰고, 개선 과정을 남기는** 팀 공용 사전.

메모장·카톡·LLM 대화기록에 흩어진 프롬프트를 한곳에 모아 검색·공유하고, 고쳐 쓴 이력을 남긴다.

> **상태: 개발 중 (P0 — 구조 분리)**
> 현재는 브라우저에서 `index.html` 을 열어 쓰는 로컬 전용. 데이터는 `localStorage` 에 저장된다.
> 팀 서버 배포(포트 8807)는 P4 계획.

---

## 실행

설치·빌드·의존성 없음. 저장소를 받아 파일을 열면 끝이다.

```bash
git clone https://github.com/crmubicoq/prompt-dict.git
cd prompt-dict
```

`index.html` 을 브라우저로 연다. (CSS·JS를 상대경로로 불러오므로 **프로젝트 루트에서** 열 것)

첫 실행 시 샘플 프롬프트 3개가 자동으로 들어간다.

---

## 기능

| | |
|---|---|
| 프롬프트 | 추가 · 수정 · 삭제 · 복제 · 즐겨찾기 |
| 검색 | 제목 / 본문 / 설명 / 태그, 최근 검색어 5개 |
| 분류 | 카테고리 동적 추가·수정·삭제(삭제 시 "기타"로 이동), 태그 자동완성·클릭 필터 |
| 정렬 | 최신 / 오래된 / 이름 오름·내림 / 카테고리 |
| 입출력 | JSON 내보내기·불러오기(병합/덮어쓰기), 파일 업로드 파서(JSON·CSV·TXT) |
| 기타 | 상세 모달, 클립보드 복사, 선택 모드 일괄 삭제, 썸네일 이미지, 다크모드, 반응형 |

---

## 구조

```
index.html          진입점. 인라인 <script> 는 로그만 남음
css/style.css       전체 스타일
js/
  config.js         전역 상수·상태          (맨 먼저 로드)
  ui.js             토스트·날짜 포맷·테마
  storage.js        저장 계층 — PromptStorage / LocalStorageAdapter
  categories.js     카테고리 렌더링·관리
  prompts.js        검색·정렬·렌더링·CRUD·모달·폼
  tags.js           태그 자동완성
  search-history.js 최근 검색어
  selection.js      선택 모드·일괄 삭제
  thumbnail.js      썸네일 업로드
  import.js         파일 파서 (JSON/CSV/TXT)
  main.js           DOMContentLoaded 진입점  (맨 마지막 로드)
tools/fnmap.py      리팩터링 무손실 검증 도구
legacy/original.html  분할 전 원본 (수정 금지, 비교 기준점)
docs/               문서 (아래 참조)
```

### 알아둘 점

일반 `<script>` 태그로 전역 공간을 공유한다. ES 모듈이 아니다. 그래서 세 가지를 지킨다.

1. **기능 파일에는 함수 선언만 둔다.** 초기화 호출·이벤트 등록은 전부 `main.js`
2. **공유 상태 선언은 `config.js`** 에 모은다
3. **`<script>` 순서를 유지하고 `async` 를 붙이지 않는다**

`main.js` 의 `DOMContentLoaded` 리스너 **2개는 합치지 않는다.** 합치면 초기화 중 예외 하나에
상세 모달 버튼 등록이 통째로 유실된다. 자세한 이유는 [`docs/devlog.md`](docs/devlog.md) §3.

---

## 저장 계층

`localStorage` 를 직접 부르지 않고 `PromptStorage` 를 경유한다. 서버 전환 시
`adapter` 만 `ApiAdapter` 로 바꾸면 된다.

```js
const PromptStorage = {
  adapter: LocalStorageAdapter,        // P3에서 ApiAdapter 로 교체
  async getPrompts(),        async savePrompts(list),
  async getFavorites(),      async saveFavorites(set),
  async getCategories(),     async saveCategories(list),
  async getSearchHistory(),  async saveSearchHistory(list),
  async getSetting(k),       async setSetting(k, v),   // _theme 등 평문
  async removeAll()
};
```

읽기는 세 가지를 구분한다 — **키 없음 `null` / 파싱 실패 `throw` / 정상 값.**
파싱에 실패하면 원본을 `rawBackup` 에 보관하고 **이후 모든 저장을 차단**한다.
깨진 상태에서 자동 저장이 원본을 덮어쓰는 것을 막기 위해서다. `removeAll()` 만 이 가드를 우회한다.

> ⚠️ 호출부 교체는 아직 진행 중이다 (T-009 / T-010). 현재는 기존 함수와 어댑터가 공존한다.

### localStorage 키

| 키 | 내용 |
|---|---|
| `promptDictionary_data` | 프롬프트 배열 |
| `promptDictionary_favorites` | 즐겨찾기 ID 배열 |
| `promptDictionary_categories` | 카테고리 (emoji + name) |
| `promptDictionary_theme` | `light` / `dark` (평문) |
| `promptDictionary_searchHistory` | 최근 검색어 최대 5개 |

---

## 검증

리팩터링이 **순수 이동인지** 기계로 증명한다. 함수 개수만 세면 누락 1건과 중복 1건이
상쇄되어 통과해버리므로, 이름별 본문 해시를 대조한다.

```bash
snap() { { git show "$1:index.html"; echo
           for f in $(git ls-tree --name-only -r "$1" js/); do git show "$1:$f"; echo; done
         } | python tools/fnmap.py; }
now()  { { cat index.html; echo; for f in js/*.js; do cat "$f"; echo; done; } | python tools/fnmap.py; }

diff <(snap HEAD) <(now)     # 차이 0 이면 순수 이동
```

구문 검사와 실제 동작은 따로 본다.

```bash
for f in js/*.js; do node --check "$f" || echo "FAIL $f"; done
```

브라우저에서 F12 → Console 에러 0건, Network 탭에서 `js/*.js` 11개가 모두 200인지 확인.

> 콘솔의 `... 완료 ✅` 로그는 **검증 근거가 아니다.** 인라인 `<script>` 최상위에 있어
> 파싱 시점에 즉시 출력되며, 초기화가 실패해도 그대로 찍힌다.

---

## 문서

| 경로 | 내용 |
|---|---|
| [`PRD.md`](PRD.md) | 무엇을·왜 (1단계) |
| [`PROGRESS.md`](PROGRESS.md) | 로드맵 P0~P5 (2단계) |
| [`TODO.md`](TODO.md) | 실행 단위 태스크 (3단계) |
| [`CLAUDE.md`](CLAUDE.md) | 작업 규칙·금지사항 (Claude Code가 세션 시작 시 읽음) |
| [`docs/devlog.md`](docs/devlog.md) | 기술 기록 — 원리·함정·패턴 (주제별) |
| [`docs/worklog/`](docs/worklog/) | 날짜별 작업일지 |
| [`docs/decisions/`](docs/decisions/) | 판단 기록 — 왜 그 길로 갔나 (GON 작성) |
| [`docs/T007-split-plan.md`](docs/T007-split-plan.md) | JS 분할 계획서 (완료) |

읽는 순서는 `PRD.md` → `PROGRESS.md` → `TODO.md`.

---

## 로드맵

| 단계 | 내용 | 상태 |
|---|---|---|
| **P0** | 저장소 정리·구조 분리, 저장 계층 추상화 | 진행 중 (T-009·T-010·T-012·T-013 남음) |
| **P1** | 등록 마찰 제거 ★ + 보안·데이터 수정 | |
| **D1** | 실데이터 수집 1회차 (150개 이상 이관) | |
| **P2** | 버전 이력·diff, 한글 초성 검색, 성능 | |
| **P3** | SQLite + FastAPI, `ApiAdapter` | |
| **P4** | 팀 서버 배포 (8807), 인증, AI 자동정리 | |

**최대 병목은 코드가 아니라 등록 마찰이다.** 옮겨야 할 프롬프트가 150개 이상인데
소스가 전부 비정형(메모장·카톡·대화기록)이라, 모달로 하나씩 넣는 방식으로는 불가능하다.
P1의 **일괄 붙여넣기**가 핵심 기능인 이유다.

---

## 개발 규칙

전체는 [`CLAUDE.md`](CLAUDE.md) 참조. 특히 지킬 것:

- **프롬프트 본문(`content`)을 임의로 수정·정리하지 않는다.** 한 글자가 결과를 바꾼다.
  AI 자동정리도 메타데이터(제목·분류·태그)만 건드린다
- **조용한 실패 금지.** 실패는 드러낸다. 임의 기본값으로 덮지 않는다
- **`localStorage` 직접 호출 금지** (P0 이후). 반드시 `PromptStorage` 경유
- **태스크 1개 = 커밋 1개**
- **`docs/decisions/` 는 GON 전용.** Claude Code는 읽기만 한다
- 서버는 사양이 낮고 서비스 7개가 이미 돈다. 검색·필터·정렬·diff는 **전부 클라이언트**에서.
  임베딩 시맨틱 검색, SSR 프레임워크, PostgreSQL, 상시 백그라운드 작업은 쓰지 않는다

---

내부용 프로젝트입니다.
