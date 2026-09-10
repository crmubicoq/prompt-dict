# 프롬프트 전자사전 (prompt-dict) — 진행상황 및 계획

> 로컬 완성 → GitHub 커밋 → 서버(8807) 배포 순서로 진행
> 원본: `프롬프트_전자사전.html` (단일 파일, 4,365줄)
> 상위 문서: [`PRD.md`](./PRD.md) — 무엇을·왜 / 이 문서 — 어떻게·언제

**진행 순서:** P0 구조정리 → P1 등록마찰 제거 → **D1 실데이터 수집** → P3·P4 서버 → P2 재확정

**현재 상태 (확인됨)**
- 실데이터 0건 (샘플 3개만) → 마이그레이션·하위호환 태스크 삭제
- 참고자료 실사용 0건 → 활성 코드에서 제외
- 이관 대상 프롬프트 **150개 이상**, 소스는 메모장 / 카톡·슬랙 / LLM 대화기록 (전부 비정형)
- **최대 병목은 코드가 아니라 등록 마찰** (PRD P-4)

---

## 0. 현황 스냅샷 (as-is)

| 항목 | 상태 |
|---|---|
| 구조 | 단일 HTML (CSS/JS 인라인), 4,365줄 |
| 저장소 | localStorage 6개 키 |
| 인증 | 없음 |
| 백엔드 | 없음 (완전 클라이언트 사이드) |
| 배포 | 로컬 파일 직접 열기 |

### localStorage 키

| 키 | 내용 |
|---|---|
| `promptDictionary_data` | 프롬프트 배열 |
| `promptDictionary_favorites` | 즐겨찾기 ID 배열 |
| `promptDictionary_categories` | 카테고리 (emoji + name) |
| `promptDictionary_theme` | light / dark |
| `promptDictionary_searchHistory` | 최근 검색어 최대 5개 |
| `promptDictionary_references` | 참고자료 배열 |

### 프롬프트 데이터 구조

```js
{
  id: Number,            // Date.now()
  title: String,
  content: String,
  category: String,
  tags: [String],
  description: String,
  notes: String,
  thumbnailImage: String, // base64 (선택)
  createdAt: ISOString,
  isFavorite: Boolean     // favoriteIds Set과 중복 관리 중
}
```

### 구현 완료 기능

- [x] 프롬프트 추가 / 수정 / 삭제 / 복제
- [x] 카테고리 동적 추가·수정·삭제 (삭제 시 "기타"로 이동)
- [x] 태그 입력 + 자동완성 + 태그 클릭 필터
- [x] 검색 (제목 / 본문 / 설명 / 태그)
- [x] 최근 검색어 5개
- [x] 정렬 5종 (최신 / 오래된 / 이름 asc·desc / 카테고리)
- [x] 즐겨찾기
- [x] 상세 보기 모달
- [x] 클립보드 복사 (fallback 포함) + 토스트
- [x] 다크모드 (localStorage 유지)
- [x] JSON 내보내기 / 불러오기 (병합·덮어쓰기 선택)
- [x] 파일 업로드 파서 (JSON / CSV / TXT)
- [x] 선택 모드 일괄 삭제
- [x] 썸네일 이미지 (파일 업로드 / URL)
- [x] 참고자료 섹션 (별도 CRUD)
- [x] 반응형 CSS (768px / 360px)

---

## 1. 발견된 문제 (수정 대상)

### 심각 — 서버 배포 전 필수

| # | 문제 | 위치 | 영향 |
|---|---|---|---|
| B1 | HTML 이스케이프 없음 | `createPromptCard`, `createReferenceCard` | 저장형 XSS. 다중 사용자 환경에서 위험 |
| B2 | 태그에 작은따옴표 → `onclick` 깨짐 | `createPromptCard` 태그 HTML | 현재도 재현되는 실버그 |
| B3 | 내보내기에 categories·references·searchHistory 누락 | `exportData()` | **로컬→서버 이관 시 데이터 손실** |
| B4 | 썸네일 base64를 localStorage에 저장 | `handleFormSubmit` | 5MB 쿼터 초과 시 저장 실패 |
| B5 | `id = Date.now()` | `handleFormSubmit` | 동시 입력·일괄 임포트 시 충돌 |

### 보통

| # | 문제 | 비고 |
|---|---|---|
| B6 | `updatedAt` 필드 없음 | 수정해도 최신순 미반영 |
| B7 | `isFavorite` / `favoriteIds` 이중 관리 | 단일 소스로 정리 |
| B8 | 검색에 `notes` 미포함 | 메모에 적은 팁 검색 불가 |
| B9 | 참고자료에 검색·정렬·태그 없음 | 개수 늘면 사용 불가 |
| B10 | `filterByTag`가 검색창에 값을 넣는 방식 | 정확 일치가 아닌 부분 일치 |
| B11 | 삭제가 즉시 영구 (confirm만) | 휴지통 필요 |
| B12 | 샘플 데이터 자동 주입 | 서버 배포 시 제거 |
| B13 | CSV 파서가 `split(',')` 단순 분할 | 본문에 쉼표 있으면 열 밀림. 사실상 사용 불가 |
| B14 | JSON/CSV/TXT 파서 모두 `notes` 누락 | **내보내기→불러오기 시 메모 전량 소실** |
| B15 | 썸네일이 `'이미지 생성'` 카테고리에 하드코딩 | 기본 카테고리에 없어 기능이 숨겨짐 |
| B16 | TXT 파서가 `---` 로 분리 | 본문의 마크다운 수평선에서 오분할 |
| B17 | `Esc` 키로 모달 닫기 없음 | 모달 6개 전부 |
| B18 | 검색 디바운스 없음 | 100개 이상에서 입력 지연 |

---

## 2. 로드맵

### P0 — 저장소 정리 및 구조 분리

**목표: 서버 이식 비용을 미리 낮춘다. 이 단계가 전체에서 가장 중요.**

> ## ✅ **P0 완료** (2026-09-08) — 커밋 `173d388` ~ `18e2f11`
> T-006 · T-007(a~i) · T-008 · T-009(a~c) · T-010 · T-011 · T-012 · T-013 전부 완료.
> Codex 검수 3회, 지적 9건 전부 반영.
> 상세 [`docs/worklog/2026-09-08.md`](./docs/worklog/2026-09-08.md) ·
> 기술 기록 [`docs/devlog.md`](./docs/devlog.md)

- [x] GitHub 저장소 생성 (`prompt-dict`)
- [x] `git config --local` 로 계정 설정 (공용 서버, `--global` 금지)
- [x] 단일 HTML 파일 분리 — **4,365줄 → `index.html` + CSS 1개 + JS 11개**
  - `index.html` (446줄) — 인라인 `<script>` 에는 `console.log` 15줄만 남음
  - `css/style.css` (1,210줄)
  - `js/config.js` — 전역 상수·상태
  - `js/storage.js` — 저장 계층
  - `js/ui.js` · `js/categories.js` · `js/prompts.js` · `js/tags.js`
    `js/search-history.js` · `js/selection.js` · `js/thumbnail.js` · `js/import.js`
  - `js/main.js` — `DOMContentLoaded` 진입점 (**리스너 2개 유지**, 예외 격리)
  - ※ 최초안의 `js/references.js` 는 만들지 않음 — 참고자료 **기능 자체를 제거**
    (실사용 0건. `legacy/original.html` 과 git 히스토리에 보존)
  - ※ 함수 **87개 → 73개** (T-007 시점. T-010에서 죽은 함수 4개 제거 후 최종 69개).
    매 단계 `tools/fnmap.py` 이름별 본문 md5 대조로 무손실 확인
- [x] **저장 계층 추상화 — 인터페이스** (T-008)
- [x] **저장 계층 추상화 — 호출부 교체** (T-009a~c, T-010)

```js
// js/storage.js — 어댑터만 교체하면 서버 전환 완료
const PromptStorage = {
  adapter: LocalStorageAdapter,        // P3에서 ApiAdapter 로 교체
  async getPrompts() {},        async savePrompts(list) {},
  async getFavorites() {},      async saveFavorites(set) {},
  async getCategories() {},     async saveCategories(list) {},
  async getSearchHistory() {},  async saveSearchHistory(list) {},
  async getSetting(k) {},       async setSetting(k, v) {},
  async removeAll() {}
};
// 로컬: LocalStorageAdapter
// 서버: ApiAdapter (fetch → FastAPI)
```

`localStorage` 직접 호출 — **`LocalStorageAdapter` 내부 4건뿐**
(`getItem` ×2, `setItem`, `removeItem`). 앱 코드에는 0건.

- [x] 분리 후 동작 확인 — 헤드리스 Chrome 실행: 미처리 예외 0건, 렌더링·초기화 정상
- [x] 초기 커밋 + `CLAUDE.md` + `README.md`

> **P0 완료.** 함수 87 → 69개(참고자료 14개 제거 + 죽은 저장 함수 4개 제거).
> 저장 계층이 격리되어 P3에서 `PromptStorage.adapter` 만 교체하면 서버 전환이 된다.
> 저장 실패는 스냅샷 롤백으로 되돌리고, 데이터 손상은 해당 키만 잠근다.
>
> **P1 1-A 완료 · 1-B 대부분 완료 → D1 1회차 진행 중.**
> 등록 마찰 제거(T-101~T-106)와 일괄 붙여넣기(T-104)가 끝나 D1을 시작했고,
> 2026-09-10 에 **33건을 등록**했다. 지금은 T-105로 분류하는 중이다.

### P1 — 등록 마찰 제거 + 버그·보안 수정

**1-A · 등록 마찰 제거 — ✅ 완료**

- [x] 카테고리 필수 해제 + "미분류" 도입 (T-101 · T-106)
- [x] 빠른 등록 모드 — 고급 필드 접기 (T-102)
- [x] 제목 자동 제안 (T-103)
- [x] **일괄 붙여넣기** (T-104a~f) — 메모장풍 텍스트 12개 한 번에 등록
- [x] 미분류 일괄 분류 UI (T-105)

**1-B · 버그 및 보안 수정 — 대부분 완료**

- [x] `escapeHtml()` 유틸 추가, 카드 렌더링 전면 적용 (B1) — T-111 · T-112
- [x] 인라인 `onclick` → 이벤트 위임(delegation)으로 교체 (B2) — T-113
      인라인 핸들러 0건. 검수 F3(인덱스 식별자)도 함께 해결
- [x] `exportData()` 전체 데이터 포함하도록 확장 + `version: '2.0'` (B3) — T-114
- [x] `importData()` 가 v1.0 / v2.0 둘 다 처리 (하위 호환) — T-114
      버전이 아니라 **필드 존재로 분기**한다
- [x] 내보내기 → 삭제 → 불러오기 왕복 전량 복원 확인 (T-115)
      손상 복구 배너도 함께 (검수 F1 후속)
- [x] ID 생성을 `crypto.randomUUID()` 로 교체 (B5) — T-116
- [x] 임포트 파서 3종에 `notes` 필드 추가 (B14) — T-114에서 함께
      `parseJSONFile` 이 `thumbnailImage` 도 버리던 것을 같이 고쳤다

**남은 것**

- [ ] `updatedAt` 추가, 정렬 옵션 "수정순" 추가 (B6) — T-117
- [ ] `favoriteIds` 단일 소스로 통일, `isFavorite` 필드 제거 (B7) — T-118
- [ ] 검색 범위에 `notes` 포함 (B8) — T-119
- [ ] CSV 파서를 따옴표·개행 처리 가능하게 재작성 (B13)
- [ ] TXT 구분자를 `---` 대신 충돌 없는 마커로 변경 (B16)
- [ ] 썸네일 노출 조건을 카테고리 하드코딩 → 별도 체크박스로 변경 (B15)
- [ ] `Esc` 키 전역 모달 닫기 (B17)
- [ ] 검색 디바운스 200ms (B18)
- [ ] **전체 백업 1회 실행** (P2 진입 전 필수)

### ★ D1 — 실데이터 수집 1회차 (진행 중)

| | |
|---|---|
| 1회차 등록 | ✅ **33건** (2026-09-10, 일괄 붙여넣기) |
| 분류 | 진행 중 — T-105로 미분류를 카테고리별로 정리하는 중 |
| 2회차 (이미지 소스) | P4 이후 — 용량 때문에 지금은 불가 ([devlog §7](docs/devlog.md)) |

실사용에서 UI 마찰 **4건**이 나와 바로 고쳤다.
**헤드리스 검증으로는 나오지 않는 종류다** — 스크롤 거리와 반복 횟수는
실제로 손을 움직여 봐야 드러난다. 여기서 나오는 메모가 P2의 우선순위를 정한다.

| 태스크 | 내용 | 커밋 |
|---|---|---|
| T-208 | 선택 모드 버튼을 검색·정렬 줄로 | `5634306` |
| T-209 | 사이드바 상하 분리 (목록만 스크롤) | `5634306` |
| T-210 | 새 프롬프트 · 일괄 붙여넣기 버튼 상단 이동 | `a404721` ※ |
| T-211 | 맨 위 · 맨 아래 스크롤 버튼 | `a404721` |

> ※ T-210 은 T-211 커밋에 섞여 들어갔다. 커밋 메시지에 내용이 없어
> 이력만으로는 추적되지 않는다 — 상세는 [TODO.md](TODO.md) 참조.

넷 다 **카드 그리드 아래·사이드바 아래에 있던 조작 버튼을 위로 올리는** 일이었다.
33건에서 이미 스크롤이 부담이었고, 150건이면 쓸 수 없었을 것이다.

### 로컬 완성 기준 (Definition of Done)

P3 진입 전 아래가 모두 통과해야 함.

- [x] 내보내기 → 브라우저 데이터 전체 삭제 → 불러오기 시
      프롬프트·카테고리·즐겨찾기·**메모**가 전부 복원됨 (T-115)
      ※ 참고자료는 T-007i 에서 활성 코드에서 제외됐다
- [x] 제목·태그에 `<`, `'`, `"` 입력해도 화면·필터가 정상 (T-112 · T-113)
- [ ] 프롬프트 100개 상태에서 검색·정렬·필터 지연 없음
- [ ] 썸네일 3장 이상 저장해도 쿼터 실패 없음
- [x] **`localStorage` 직접 호출 0건** (전부 `PromptStorage` 경유) — P0 T-009 · T-010

### P2 — 로컬 기능 보강

> 우선순위 근거: PRD 통증 P-1(못 찾음) → 검색 / P-3(이력 없음) → 버전 관리

**상위 — 통증 직결**

- [ ] **버전 이력** — 수정 시 이전 내용 스냅샷 저장 (직전 3개), 상세에서 보기 + 되돌리기 *(P-3)*
- [ ] 검색어 하이라이트 *(P-1)*
- [ ] 태그 관리 화면 (이름 변경 / 병합 / 삭제) — 오타 태그가 검색을 망침 *(P-1)*
- [ ] 프롬프트 100개 이상 렌더링 성능 확보 (가상 스크롤 또는 페이지네이션) *(S-1)*
- [ ] 휴지통 (소프트 삭제 `deletedAt`, 30일 후 정리) *(우선순위 2위)*

**중위**

- [ ] 사용 통계 — `usageCount`, `lastUsedAt`, 복사 시 증가 *(S-2 측정)*
- [ ] 정렬에 "자주 쓰는 순" / "최근 사용순" / "수정순" 추가
- [ ] 즐겨찾기 상단 고정 옵션
- [ ] 모델 구분 필드 (Claude / GPT / Gemini / NotebookLM / 기타)
- [ ] 키보드 단축키 (`Ctrl+K` 검색, `Ctrl+Enter` 저장)
- [ ] 참고자료 검색·정렬·태그 (B9)
- [ ] 태그 정확 일치 필터 (B10)

**하위 — 있으면 좋음**

- [ ] 변수 치환 `{{변수}}` — 실제 통증으로 확인되지 않음. 여유 있을 때

### P3 — 서버 이식 준비

- [ ] SQLite 스키마 설계 (`~/team-data/prompts.db`)

```sql
prompts(id TEXT PK, owner TEXT, is_private INT DEFAULT 0, title, content,
        category, tags TEXT, description, notes, thumbnail_path,
        model, usage_count INT, last_used_at, created_at, updated_at, deleted_at)
categories(id, owner, emoji, name, sort_order)
references(id, owner, title, url, notes, created_at, updated_at)
prompt_versions(id, prompt_id, title, content, notes, saved_at)  -- 직전 3개만 보관
```

- [ ] FastAPI 엔드포인트 설계 (`/api/prompts`, `/api/categories`, `/api/references`)
- [ ] `ApiAdapter` 구현 → `Storage` 어댑터 교체
- [ ] 로컬 데이터 → DB 마이그레이션 스크립트 (P1 백업 JSON 입력)
- [ ] 썸네일: base64 → 파일 저장 + 경로 참조로 전환 (B4)
- [ ] 샘플 데이터 제거 (B12)

### P4 — 서버 배포 (8807)

- [ ] 포트 8807 확정 (8800~8806 사용 중)
- [ ] `accounts.py` 공유 모듈로 인증 연결 (**절대 수정 금지, import만**)
- [ ] 게이트 로그인 연동 (hub 경유)
- [ ] **소유자 격리 가드** — wiki 개인 배너 `_banner_guard` 패턴 재사용
  - 전 엔드포인트에 owner 검증 (이중 방어)
- [ ] 소유자 표시 배지 (기본 전체 공유, 작성자만 수정·삭제)
- [ ] FAB "🏠 Hub" 버튼 삽입 (기존 스니펫 재사용)
- [ ] hub 카드 등록 + `_safe_next` 화이트리스트 추가
- [ ] systemd 서비스 등록 (`stt.service` 템플릿 기준)
- [ ] `prompts.db` 를 4시 자동 백업 대상에 추가
- [ ] `REQUIRE_AUTH` 롤백 스위치
- [ ] 서버 전체 지도 문서(`00_서버_전체_지도.md`) 갱신

### P5 — 배포 후 정리 (대폭 축소)

> PRD에서 대부분 범위 밖으로 확정. 아래만 남김.

- [ ] 사용 통계 서버 집계 (S-2 측정용, 단순 카운트)
- [ ] 팀원 온보딩 확인 — 설명 없이 첫 등록 성공하는지 (S-5)
- [ ] 운영 1개월 후 회고 → 실제로 안 쓰는 기능 제거

**삭제된 항목 (범위 밖):** 관리자 승인 워크플로우, 인기 프롬프트 대시보드,
"내 사전으로 복사", 평가·별점·댓글, AI 자동 개선 제안

---

## 3. 로컬 버전 / 서버 버전 분기 원칙

파일을 통째로 복사한 별도 버전(포크)을 만들지 않는다.
두 벌 관리가 되면 버그 수정이 항상 두 번씩 필요해진다.

**실제로 달라지는 부분은 세 군데뿐:**

| 구분 | 로컬 | 서버 |
|---|---|---|
| 저장 | `LocalStorageAdapter` | `ApiAdapter` (FastAPI + SQLite) |
| 인증 | 없음 | `accounts.py` + 게이트 로그인 |
| 설정 | 없음 | 포트 / 소유자 / 공유 여부 |

렌더링·검색·정렬·모달·다크모드·변수 치환은 **양쪽 동일**.
서버 전용 UI(FAB 홈 버튼, 공유·개인 배지, 로그인 표시)만 서버 브랜치에서 추가.

---

## 4. 서버 배포 시 준수사항 (기존 규칙)

- `~/team-data/team.db` — 공용 인증 저장소
- `~/apps/team_accounts/accounts.py` — 공유 모듈, 개별 앱에서 수정 금지
- 게이트 로그인: hub = 공용 비밀번호 / 개별 도구 = 사용자별 로그인
- git: `--local` 설정만 사용
- 폴더: `~/apps` (프로그램) / `~/data` (데이터) / `~/docs` (문서)
- 용어: 사이트/영역 = 배너, 허브 링크 = 카드

---

## 5. 커밋 규칙

```
feat: 변수 치환 기능 추가
fix: 카드 렌더링 XSS 방어
refactor: 저장 계층 어댑터 분리
docs: PROGRESS.md 갱신
```

각 Phase 완료 시 PROGRESS.md 체크박스 갱신 후 커밋.
