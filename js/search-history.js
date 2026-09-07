        // ========================================
        // J. 검색 기록 기능
        // ========================================

        // 검색 기록 로드
        function loadSearchHistory() {
            try {
                const saved = localStorage.getItem(SEARCH_HISTORY_KEY);
                searchHistory = saved ? JSON.parse(saved) : [];
            } catch (error) {
                console.error('검색 기록 로드 실패:', error);
                searchHistory = [];
            }
        }

        // 검색 기록 저장
        function saveSearchHistory() {
            try {
                localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(searchHistory));
            } catch (error) {
                console.error('검색 기록 저장 실패:', error);
            }
        }

        // 검색 기록 추가
        function addToSearchHistory(query) {
            if (!query || query.trim().length === 0) return;
            
            const trimmedQuery = query.trim();
            
            // 중복 제거 (이미 있으면 제거 후 맨 앞에 추가)
            searchHistory = searchHistory.filter(item => item !== trimmedQuery);
            
            // 맨 앞에 추가
            searchHistory.unshift(trimmedQuery);
            
            // 최대 개수 유지
            if (searchHistory.length > MAX_SEARCH_HISTORY) {
                searchHistory = searchHistory.slice(0, MAX_SEARCH_HISTORY);
            }
            
            saveSearchHistory();
            renderSearchHistory();
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
                    <span onclick="applySearchHistory('${query.replace(/'/g, "\\'")}'); event.stopPropagation();">${query}</span>
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
        function removeFromSearchHistory(index) {
            searchHistory.splice(index, 1);
            saveSearchHistory();
            renderSearchHistory();
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
