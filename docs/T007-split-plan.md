# T-007 · JS 분할 계획

> `index.html` 3,154줄 기준. 인라인 `<script>` = 494~3151줄, 함수 87개

## 핵심 전제 — 위험이 낮은 이유

일반 `<script>` 태그라 **모든 파일이 하나의 전역 공간을 공유**한다.
ES 모듈이 아니므로 `import`/`export`가 없고, 함수 선언은 호이스팅된다.
→ **함수를 어느 파일에 넣든 서로 호출된다.**

순서를 지켜야 하는 것은 둘뿐:
1. `config.js` (전역 상수·변수) 가 **맨 먼저**
2. `main.js` (`DOMContentLoaded`) 가 **맨 마지막**

나머지 8개 파일은 순서 무관.

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

`DOMContentLoaded` 블록이 **2개**로 나뉘어 있다. 하나로 합친다.

| 위치 | 내용 |
|---|---|
| index.html 755~802 | 메인 초기화 (데이터 로드 → 렌더링 → 각 setup 호출) |
| index.html 1145~1172 | 상세 모달 버튼 이벤트 (닫기/복사/수정/복제/삭제) |

**합칠 때 순서 유지.** 첫 번째 블록 내용 뒤에 두 번째 블록 내용을 이어 붙인다.

**참고자료 제외에 따른 수정 2곳:**
- 첫 블록 마지막의 `setupReferences();` 호출 삭제
- `renderCategoryDropdown()` 안에서 `setupReferences()` 를 부르는 부분 삭제 (index.html 743~813 내)

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

**외부와의 연결은 단 1곳:** `renderCategoryDropdown → setupReferences` — 이 호출만 삭제하면 끊긴다.
반대로 참고자료가 외부에서 쓰던 것(`applyFilters` `formatDate` `showToast`)은 그대로 남는다.

---

## 전역 유지 필수 — HTML onclick에서 호출

아래 7개는 인라인 `onclick` 속성에서 불린다. 일반 `<script>` 라 자동으로 전역이지만,
나중에 ES 모듈로 바꾸면 깨진다. **P1의 T-113(이벤트 위임 전환)에서 함께 정리한다.**

`toggleFavorite` `filterByTag` `deleteCategory` `editCategory`
`applySearchHistory` `removeFromSearchHistory` `togglePromptSelection`

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

**1. 함수 개수**

```powershell
# 옮기기 전 (index.html 안)
(Select-String -Path index.html -Pattern '^        (async )?function ' ).Count

# 옮긴 후 (index.html + js/*.js 합계가 같아야 함)
```

전체 합계가 항상 **87개** (참고자료 제거 후 **73개**) 여야 한다.

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
