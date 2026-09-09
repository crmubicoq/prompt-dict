        // ========================================
        // J. 검색 기록 기능
        // ========================================

        // 검색 기록 로드
        // T-009b: PromptStorage 경유
        // 실패를 빈 배열로 덮지 않는다(조용한 실패 금지). 예외는 호출부로 올린다.
        // 키가 없을 때(null)만 빈 배열로 시작한다.
        async function loadSearchHistory() {
            const saved = await PromptStorage.getSearchHistory();
            searchHistory = saved === null ? [] : saved;
        }

        // 검색 기록 추가
        // T-009c-2: keydown 핸들러에서 호출되어 Promise 를 받는 곳이 없다
        async function addToSearchHistory(query) {
            try {
                if (!query || query.trim().length === 0) return;

                const trimmedQuery = query.trim();

                // 실패 시 되돌릴 스냅샷 (filter + unshift + slice 3연산)
                const snapshotHistory = [...searchHistory];

                // 중복 제거 (이미 있으면 제거 후 맨 앞에 추가)
                searchHistory = searchHistory.filter(item => item !== trimmedQuery);

                // 맨 앞에 추가
                searchHistory.unshift(trimmedQuery);

                // 최대 개수 유지
                if (searchHistory.length > MAX_SEARCH_HISTORY) {
                    searchHistory = searchHistory.slice(0, MAX_SEARCH_HISTORY);
                }

                if (await PromptStorage.saveSearchHistory(searchHistory) !== true) {
                    searchHistory = snapshotHistory;
                    renderSearchHistory();
                    showToast('저장 실패 — 변경을 되돌렸습니다 ❌');
                    return;
                }

                renderSearchHistory();
            } catch (error) {
                console.error('[검색 기록] 추가 실패:', error);
                showToast('검색 기록 저장 중 오류가 발생했습니다 ❌');
            }
        }

        // 검색 기록 렌더링
        function renderSearchHistory() {
            const container = document.getElementById('search-history-container');
            const list = document.getElementById('search-history-list');
            
            if (!container || !list) return;
            
            if (searchHistory.length === 0) {
                container.style.display = 'none';
                return;
            }
            
            container.style.display = 'block';
            
            list.innerHTML = searchHistory.map((query, index) => `
                <div class="search-history-item">
                    <!-- ★ onclick 은 T-113에서 이벤트 위임으로 전환 예정.
                         이스케이프로는 막을 수 없다 (devlog 참조).
                         남아 있는 replace 는 보안 조치가 아니라 따옴표가 든 검색어에서
                         핸들러가 구문 오류로 죽는 것을 막는 임시 방편이다. -->
                    <span onclick="applySearchHistory('${query.replace(/'/g, "\\'")}'); event.stopPropagation();">${escapeHtml(query)}</span>
                    <span class="remove-btn" onclick="removeFromSearchHistory(${index}); event.stopPropagation();" title="삭제">×</span>
                </div>
            `).join('');
        }

        // 검색 기록 적용
        function applySearchHistory(query) {
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.value = query;
                currentSearchQuery = query.toLowerCase();
                applyFilters();
            }
        }

        // 검색 기록 삭제
        // T-009c-2: 인라인 onclick 호출 — Promise 누출 방지
        async function removeFromSearchHistory(index) {
            try {
                const snapshotHistory = [...searchHistory];

                searchHistory.splice(index, 1);

                if (await PromptStorage.saveSearchHistory(searchHistory) !== true) {
                    searchHistory = snapshotHistory;
                    renderSearchHistory();
                    showToast('저장 실패 — 변경을 되돌렸습니다 ❌');
                    return;
                }

                renderSearchHistory();
            } catch (error) {
                console.error('[검색 기록] 삭제 실패:', error);
                showToast('검색 기록 삭제 중 오류가 발생했습니다 ❌');
            }
        }

        // 검색 입력 감지 (Enter 키)
        function setupSearchHistoryTracking() {
            const searchInput = document.getElementById('search-input');
            if (!searchInput) return;
            
            searchInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    const query = this.value.trim();
                    if (query.length > 0) {
                        addToSearchHistory(query);
                    }
                }
            });
        }
