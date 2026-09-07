# T-007 · JS 분할 계획

> ## ✅ 완료 (2026-09-08)
>
> | | 착수 전 | 완료 후 |
> |---|---|---|
> | 파일 | 단일 HTML 4,365줄 | `index.html` + `css/style.css` + **JS 11개** |
> | 인라인 `<script>` | 2,658줄 / 함수 87개 | **`console.log` 15줄 / 함수 0개** |
> | 함수 총계 | 87 | **73** (참고자료 14개 제거) |
>
> **커밋 범위** `3c85a0c` ~ `e338d35` (T-007a~i, 회귀 수정 `71c81d2` 포함)
> **검증** 매 단계 `tools/fnmap.py` 이름별 본문 md5 대조 → 차이 0 (순수 이동 증명).
> T-007i는 삭제 단계라 "사라진 14개가 지정 목록과 일치 + 남은 73개 본문 동일"로 확인.
>
> 진행 기록 [`worklog/2026-09-08.md`](./worklog/2026-09-08.md) ·
> 원리·함정 [`devlog.md`](./devlog.md)
>
> 아래 본문은 **착수 당시의 계획서**다. 실제와 다른 부분은 각 절에 정정 표기를 남겼다.

> `index.html` 3,154줄 기준. 인라인 `<script>` = 494~3151줄, 함수 87개

## 핵심 전제 — 위험이 낮은 이유

일반 `<script>` 태그라 **모든 파일이 하나의 전역 공간을 공유**한다.
ES 모듈이 아니므로 `import`/`export`가 없다.

### ⚠ 호이스팅으로 설명하면 틀린다

호이스팅은 **같은 스크립트 안에서만** 일어난다.
아직 실행되지 않은 다른 `<script>` 의 함수는 그 시점에 **존재하지 않는다.**
`config.js` 가 로드되는 중에 `prompts.js` 의 함수를 부르면 `ReferenceError` 다.

**지금 안전한 진짜 이유는 하나다:**
**모든 파일 로드가 끝난 뒤 `DOMContentLoaded` 에서 함수를 호출하기 때문이다.**
로드 도중에는 함수 선언만 등록될 뿐 아무것도 실행되지 않는다.

### 지켜야 할 3원칙 ★

1. **기능 파일에는 함수 선언만 둔다.**
   초기화 호출·이벤트 등록은 전부 `main.js` 로. 파일 최상위에서 뭔가를 *실행*하는 순간
   로드 순서에 의존하게 되고, 이 전제가 무너진다.
2. **공유 상태 선언은 `config.js` 에 유지한다.**
   최상위 `let`/`const` 는 스크립트끼리 공유되지만 TDZ가 있어서,
   선언한 스크립트가 실행되기 전에 접근하면 `ReferenceError` 다.
3. **`<script>` 순서를 유지하고 `async` 를 붙이지 않는다.**
   `async` 는 로드 완료 순서대로 실행해 순서를 깨뜨린다. `defer` 도 넣지 않는다
   (지금은 `</body>` 직전 배치라 불필요).

이 3원칙을 지키는 한, 순서상 강제되는 것은 둘뿐이다:
1. `config.js` 가 **맨 먼저** (공유 상태 선언)
2. `main.js` (`DOMContentLoaded`) 가 **맨 마지막**

나머지 8개 파일은 서로 순서 무관.

---

## 로드 순서 (index.html 하단)

```html
<script src="js/config.js"></script>
<script src="js/ui.js"></script>
<script src="js/storage.js"></script>
<script src="js/categories.js"></script>
<script src="js/prompts.js"></script>
<script src="js/tags.js"></script>
<script src="js/search-history.js"></script>
<script src="js/selection.js"></script>
<script src="js/thumbnail.js"></script>
<script src="js/import.js"></script>
<script src="js/main.js"></script>
```

---

## config.js — 전역 상수·상태 (맨 먼저)

`index.html` 안에 흩어져 있는 top-level 선언을 전부 모은다.

| 줄 | 내용 |
|---|---|
| 513~516 | `STORAGE_KEY` `FAVORITES_KEY` `THEME_KEY` `CATEGORIES_KEY` |
| 519~534 | `allPrompts` `favoriteIds` `categories` `defaultCategories` |
| 534~604 | `sampleData` (P1에서 제거 예정이나 지금은 유지) |
| 810~812 | `currentFilter` `currentSearchQuery` `currentSortOrder` |
| 1068 | `currentDetailId` |
| 1878~1880 | `SEARCH_HISTORY_KEY` `MAX_SEARCH_HISTORY` `searchHistory` |
| 1983~1984 | `isSelectionMode` `selectedPromptIds` |
| 2151 | `currentThumbnailData` |

**주의:** `REFERENCES_KEY` `allReferences` `currentReferenceId` `isReferencesView` (2347~2350)
는 참고자료 제외 대상이므로 **옮기지 않는다.**

---

## ui.js — 공용 유틸 — 토스트, 날짜 포맷, 테마

함수 4개 / 약 71줄

| 함수 | index.html 줄 | 줄수 |
|---|---|---|
| `showToast` | 1219~1235 | 17 |
| `formatDate` | 929~937 | 9 |
| `fallbackCopy` | 1200~1218 | 19 |
| `setupThemeToggle` | 1236~1261 | 26 |

---

## storage.js — localStorage 입출력 + 내보내기/불러오기

함수 7개 / 약 168줄

| 함수 | index.html 줄 | 줄수 |
|---|---|---|
| `initializeData` | 605~636 | 32 |
| `loadFromLocalStorage` | 637~651 | 15 |
| `saveToLocalStorage` | 652~665 | 14 |
| `saveCategories` | 666~677 | 12 |
| `setupDataManagement` | 1262~1275 | 14 |
| `exportData` | 1276~1298 | 23 |
| `importData` | 1299~1356 | 58 |

---

## categories.js — 카테고리 렌더링·관리

함수 11개 / 약 377줄

| 함수 | index.html 줄 | 줄수 |
|---|---|---|
| `renderCategoryList` | 678~700 | 23 |
| `setupCategoryButtons` | 701~716 | 16 |
| `updateCategoryCounts` | 717~742 | 26 |
| `renderCategoryDropdown` | 743~813 | 71 |
| `setupCategoryManagement` | 1357~1388 | 32 |
| `closeCategoryModal` | 1389~1398 | 10 |
| `addNewCategory` | 1399~1437 | 39 |
| `renderCategoryManageList` | 1438~1456 | 19 |
| `deleteCategory` | 1457~1510 | 54 |
| `editCategory` | 1511~1587 | 77 |
| `validateCategory` | 2748~2757 | 10 |

---

## prompts.js — 프롬프트 검색·정렬·렌더링·CRUD·상세모달

함수 17개 / 약 768줄

| 함수 | index.html 줄 | 줄수 |
|---|---|---|
| `setupSearchAndFilters` | 814~841 | 28 |
| `applyFilters` | 842~883 | 42 |
| `sortPrompts` | 884~928 | 45 |
| `createPromptCard` | 938~999 | 62 |
| `filterByTag` | 1000~1007 | 8 |
| `renderPromptList` | 1008~1043 | 36 |
| `toggleFavorite` | 1044~1070 | 27 |
| `openDetailModal` | 1071~1136 | 66 |
| `closeDetailModal` | 1137~1179 | 43 |
| `copyToClipboard` | 1180~1199 | 20 |
| `openEditPromptModal` | 1588~1640 | 53 |
| `deletePrompt` | 1641~1713 | 73 |
| `duplicatePrompt` | 1813~1882 | 70 |
| `setupModalEvents` | 2958~2983 | 26 |
| `openModal` | 2984~2990 | 7 |
| `closeModal` | 2991~3028 | 38 |
| `handleFormSubmit` | 3029~3152 | 124 |

---

## tags.js — 태그 자동완성

함수 4개 / 약 99줄

| 함수 | index.html 줄 | 줄수 |
|---|---|---|
| `setupTagAutocomplete` | 1714~1741 | 28 |
| `getAllTags` | 1742~1756 | 15 |
| `showTagSuggestions` | 1757~1791 | 35 |
| `insertTag` | 1792~1812 | 21 |

---

## search-history.js — 최근 검색어

함수 7개 / 약 104줄

| 함수 | index.html 줄 | 줄수 |
|---|---|---|
| `loadSearchHistory` | 1883~1893 | 11 |
| `saveSearchHistory` | 1894~1902 | 9 |
| `addToSearchHistory` | 1903~1923 | 21 |
| `renderSearchHistory` | 1924~1945 | 22 |
| `applySearchHistory` | 1946~1955 | 10 |
| `removeFromSearchHistory` | 1956~1962 | 7 |
| `setupSearchHistoryTracking` | 1963~1986 | 24 |

---

## selection.js — 선택 모드·일괄 삭제

함수 8개 / 약 167줄

| 함수 | index.html 줄 | 줄수 |
|---|---|---|
| `toggleSelectionMode` | 1987~2009 | 23 |
| `updateSelectedCount` | 2010~2017 | 8 |
| `toggleSelectAll` | 2018~2037 | 20 |
| `updateCheckboxes` | 2038~2056 | 19 |
| `togglePromptSelection` | 2057~2072 | 16 |
| `deleteSelectedPrompts` | 2073~2127 | 55 |
| `cancelSelectionMode` | 2128~2132 | 5 |
| `setupBulkDelete` | 2133~2153 | 21 |

---

## thumbnail.js — 썸네일 업로드

함수 9개 / 약 199줄

| 함수 | index.html 줄 | 줄수 |
|---|---|---|
| `toggleThumbnailSection` | 2154~2171 | 18 |
| `setupUploadTabs` | 2172~2196 | 25 |
| `setupThumbnailFileUpload` | 2197~2231 | 35 |
| `setupThumbnailUrlUpload` | 2232~2259 | 28 |
| `loadImageFromUrl` | 2260~2287 | 28 |
| `showThumbnailPreview` | 2288~2298 | 11 |
| `clearThumbnail` | 2299~2312 | 14 |
| `setupThumbnailRemoveButton` | 2313~2320 | 8 |
| `setupThumbnailFeature` | 2321~2352 | 32 |

---

## import.js — 파일 업로드 파서 (JSON/CSV/TXT)

함수 6개 / 약 265줄

| 함수 | index.html 줄 | 줄수 |
|---|---|---|
| `setupFileUpload` | 2683~2721 | 39 |
| `handleFileSelect` | 2722~2729 | 8 |
| `handleFile` | 2730~2747 | 18 |
| `parseJSONFile` | 2758~2830 | 73 |
| `parseCSVFile` | 2831~2904 | 74 |
| `parseTXTFile` | 2905~2957 | 53 |

---

## main.js — 초기화 (맨 마지막)

`DOMContentLoaded` 블록이 **2개**로 나뉘어 있다.
**`main.js` 한 파일에 담되, `addEventListener('DOMContentLoaded', ...)` 를 2회 호출해
리스너를 분리한 채로 유지한다.**

| 리스너 | 원본 위치 | 내용 |
|---|---|---|
| 1 | index.html 754~804 | 메인 초기화 (데이터 로드 → 렌더링 → 각 setup 호출) |
| 2 | index.html 1144~1173 | 상세 모달 버튼 이벤트 (닫기/복사/수정/복제/삭제) |

```js
// main.js — 이 형태를 유지한다
document.addEventListener('DOMContentLoaded', function() { /* 초기화 */ });

document.addEventListener('DOMContentLoaded', function() { /* 상세 모달 버튼 */ });
```

### ⛔ 두 리스너를 하나로 합치지 말 것 ★

**이유: 합치면 초기화에서 예외가 날 때 상세 모달 버튼 등록까지 통째로 유실된다.**
별도 리스너면 DOM 명세상 서로 격리되어, 리스너1이 던져도 리스너2는 정상 실행된다.

헤드리스 Chrome A/B 대조로 재현 확인 (`initializeData` 에 예외 주입):

```
A · 리스너 2개 (현재)   close=true  copy=true  edit=true  dup=true  del=true
B · 리스너 1개 (합침)   close=false copy=false edit=false dup=false del=false
```

T-007a에서 실수로 합쳤다가 Codex 검수에서 지적되어 `71c81d2` 로 되돌렸다.
**향후 어떤 단계에서도 다시 합치지 않는다.**

**참고자료 제외에 따른 수정 — 1곳뿐:**
- 첫 블록(리스너1) 마지막의 `setupReferences();` 호출 삭제

> ~~`renderCategoryDropdown()` 안의 `setupReferences()` 호출 삭제~~ → **계획서 오류였음.**
> `renderCategoryDropdown()` 본문에는 그런 호출이 없다. 실제 호출부는 `js/main.js` 한 곳뿐.

---

## 제외 — 참고자료 (js/ 로 옮기지 않음)

실사용 0건(`promptDictionary_references` 키 미생성). `legacy/original.html` 과 git 히스토리에 보존됨.

함수 14개 / 약 330줄:

- `loadReferences` — 2353~2363 (11줄)
- `saveReferences` — 2364~2372 (9줄)
- `showReferencesView` — 2373~2408 (36줄)
- `showPromptsView` — 2409~2427 (19줄)
- `renderReferencesList` — 2428~2458 (31줄)
- `createReferenceCard` — 2459~2490 (32줄)
- `openReferenceModal` — 2491~2503 (13줄)
- `closeReferenceModal` — 2504~2512 (9줄)
- `handleReferenceSubmit` — 2513~2553 (41줄)
- `openReferenceDetailModal` — 2554~2587 (34줄)
- `closeReferenceDetailModal` — 2588~2595 (8줄)
- `openEditReferenceModal` — 2596~2615 (20줄)
- `deleteReference` — 2616~2638 (23줄)
- `setupReferences` — 2639~2682 (44줄)

**같이 제거할 것**
- 전역 변수 4개 (index.html 2347~2350)
- HTML `#references-btn` 버튼 (index.html 48)
- HTML 모달 2개: `#reference-modal-overlay` (393~), `#reference-detail-modal-overlay` (456~)
- CSS는 이번엔 건드리지 않는다 (별도 정리)

**외부와의 연결은 단 1곳:** `js/main.js` 초기화 블록(리스너1)의 `setupReferences();` 호출.

```
js/main.js:50            setupReferences();      ← 유일한 진입점
```

**마지막 제거 단계(T-007i)에서 이 호출을 반드시 함께 삭제한다.**
함수만 지우고 호출을 남기면 `setupReferences is not defined` (ReferenceError) 가 나고,
**리스너1이 그 지점에서 통째로 중단된다.** `setupReferences()` 는 리스너1의 마지막 문장이라
겉보기엔 멀쩡해 보이지만, 앞에 새 초기화를 추가하는 순간 조용히 깨진다.
(리스너2는 별도 등록이라 살아남는다 — 커밋 `71c81d2` 참조)

반대로 참고자료가 외부에서 쓰던 것(`applyFilters` `formatDate` `showToast`)은 그대로 남는다.

---

## 전역 유지 필수 — HTML onclick에서 호출

아래 7개는 인라인 `onclick` 속성에서 불린다. 일반 `<script>` 라 자동으로 전역이지만,
나중에 ES 모듈로 바꾸면 깨진다. **P1의 T-113(이벤트 위임 전환)에서 함께 정리한다.**

`toggleFavorite` `filterByTag` `deleteCategory` `editCategory`
`applySearchHistory` `removeFromSearchHistory` `togglePromptSelection`

---

## 나중 항목 — T-007 범위 밖 (잊지 말 것)

분할 중 발견했지만 **이번에는 고치지 않는다.** T-007을 순수 이동으로 유지해야
"차이 0" 검증이 성립하기 때문이다.

### N-1 · `js/ui.js` `fallbackCopy` — 조용한 실패 ★

`document.execCommand('copy')` 는 **실패해도 예외를 던지지 않고 `false` 를 반환**한다.
현재 코드는 반환값을 버리고 무조건 성공 토스트를 띄운다.

```js
try {
    document.execCommand('copy');   // ← 반환값(boolean) 무시
    showToast('복사 완료! ✅');       // ← 복사 실패해도 이게 뜬다
} catch (error) {
    showToast('복사 실패 ❌');        // ← 예외가 날 때만 도달
}
```

CLAUDE.md **"조용한 실패 금지"** 정면 위반. **P1에서 처리** — 반환값을 받아 분기한다.
(`copyToClipboard` 의 `navigator.clipboard` 경로는 Promise 거부를 잡으므로 문제없다.)

### N-2 · "Phase N 완료" 로그를 검증 근거로 쓰지 말 것

index.html 인라인 `<script>` **최상위**에 있는 아래 5개 로그는
**파싱 시점에 즉시 출력**된다. 실제 초기화(`DOMContentLoaded`)보다 **먼저** 찍힌다.

```
console.log('Phase 6~8 완료 ✅ - 검색 및 필터 기능 완성');
console.log('Phase 9~10 완료 ✅ - 상세 보기 및 복사 기능 완성');
console.log('Phase 11~15 완료 ✅ - 모든 기능 완성!');
console.log('Phase 4 완료 ✅ - 프롬프트 추가 기능 완성');
console.log('Phase 5 완료 ✅ - 프롬프트 목록 표시 기능 완성');
```

콘솔에 "완료 ✅" 가 보여도 **초기화가 성공했다는 뜻이 아니다.**
초기화가 첫 줄에서 터져도 이 5개는 그대로 찍힌다.
동작 확인은 화면과 실제 조작으로 한다. (정리는 P1 이후 별도 판단)

---

## 진행 방식 — 한 파일씩

한 번에 다 쪼개지 않는다. **파일 하나 = 커밋 하나.**

```
T-007a  config.js + main.js + 빈 파일 9개 생성, <script> 태그 연결
T-007b  ui.js
T-007c  storage.js
T-007d  categories.js
T-007e  prompts.js
T-007f  tags.js + search-history.js
T-007g  selection.js + thumbnail.js
T-007h  import.js
T-007i  참고자료 제거
```

T-007a에서 뼈대를 먼저 만들고, 그다음부터는 `index.html` 의 함수를 잘라내
해당 파일에 붙이는 단순 작업이 된다.

---

## 검증 방법 (매 단계)

**1. 이름별 본문 동일성 비교 ★ 기본 검증**

> **개수 비교만으로는 부족하다.** 하나를 빠뜨리고 다른 하나를 두 번 붙여넣으면
> **누락과 중복이 상쇄되어** 합계는 87개 그대로다. 실제로 재현해 확인했다:
>
> ```
> 개수 검증:      87 = 87        ← 통과해버림
> 이름별 본문 비교:
>   < formatDate  05cfbc690ef7  7     ← 누락 검출
>   > showToast   f16765eda17c  10    ← 중복 검출
> ```

개수가 아니라 **함수 이름 → 본문**을 대조한다. 스크립트는 `tools/fnmap.py` 에 있다.

```python
# tools/fnmap.py — stdin 의 JS/HTML 에서 '함수이름 <TAB> 본문md5 <TAB> 줄수' 를 정렬 출력
import sys, re, hashlib
src = sys.stdin.buffer.read().decode('utf-8')
out, name, buf = [], None, []
for line in src.split('\n'):
    m = re.match(r'^        (?:async )?function ([A-Za-z0-9_$]+)\s*\(', line)
    if m and name is None:
        name, buf = m.group(1), [line]
        continue
    if name is not None:
        buf.append(line)
        if line == '        }':
            body = '\n'.join(buf)
            out.append('%s\t%s\t%d' % (name, hashlib.md5(body.encode()).hexdigest()[:12], len(buf)))
            name, buf = None, []
print('\n'.join(sorted(out)))
```

```bash
# 어떤 커밋/워킹트리의 전체 함수 지문을 뽑는다
snap() { { git show "$1:index.html"; echo
           for f in $(git ls-tree --name-only -r "$1" js/); do git show "$1:$f"; echo; done
         } | python tools/fnmap.py; }

now()  { { cat index.html; echo; for f in js/*.js; do cat "$f"; echo; done; } | python tools/fnmap.py; }

diff <(snap HEAD) <(now)     # 순수 이동이면 차이 0
```

**차이 0 = 함수 87개의 이름·본문·줄수가 전부 동일** = 이동 외에 아무것도 안 바뀌었다는 뜻.
차이가 나오면 그 줄이 곧 누락·중복·변형이다.

> ⚠ 양쪽을 **같은 정렬 규칙**으로 뽑아야 한다. 파이썬 `sorted()` 출력에 GNU `sort` 를
> 다시 걸면 로케일 차이로 전체가 어긋난 것처럼 보인다. 위 `snap`/`now` 만 쓸 것.

**2. 함수 개수 (보조 지표)**

```bash
{ cat index.html; echo; cat js/*.js; } | grep -c '^        \(async \)\?function '
```

전체 합계가 항상 **87개** (참고자료 제거 후 **73개**) 여야 한다.
단독으로는 위 상쇄 때문에 신뢰할 수 없으니 **1번과 함께** 본다.

**2-b. 구문 검사**

```bash
for f in js/*.js; do node --check "$f" || echo "FAIL $f"; done
# 인라인 <script> 도 잘라내서 검사
# 전 파일을 이어붙여 파싱하면 let/const 중복 선언까지 걸린다
```

**2. 브라우저**
- F12 Console 에러 0건
- Network 탭에서 모든 `js/*.js` 가 200
- 프롬프트 추가 / 수정 / 삭제 / 복제
- 검색 / 정렬 / 카테고리 필터 / 태그 클릭
- 즐겨찾기 토글
- 다크모드
- 내보내기 → 불러오기
- 선택 모드 → 일괄 삭제

**3. 되돌리기**

문제 생기면 그 커밋만 되돌린다.

```powershell
git reset --hard HEAD~1
```
