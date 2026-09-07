        // ========================================
        // Phase 6~8: 검색 및 필터 기능
        // ========================================

        function setupSearchAndFilters() {
            // Phase 6: 검색 기능
            const searchInput = document.getElementById('search-input');
            searchInput.addEventListener('input', function(e) {
                currentSearchQuery = e.target.value.trim().toLowerCase();
                applyFilters();
            });

            // 정렬 드롭다운
            const sortSelect = document.getElementById('sort-select');
            sortSelect.addEventListener('change', function(e) {
                currentSortOrder = e.target.value;
                applyFilters();
            });

            // 즐겨찾기 버튼 (카테고리 버튼 이벤트는 setupCategoryButtons에서 처리)
            const favoritesBtn = document.getElementById('favorites-btn');
            favoritesBtn.addEventListener('click', function() {
                // 카테고리 버튼 비활성화
                const categoryBtns = document.querySelectorAll('.category-btn');
                categoryBtns.forEach(b => b.classList.remove('active'));
                
                currentFilter = 'favorites';
                applyFilters();
            });
        }

        // 통합 필터 적용 함수
        function applyFilters() {
            let filteredPrompts = [...allPrompts];

            // 1. 카테고리/즐겨찾기 필터 적용
            if (currentFilter === 'favorites') {
                filteredPrompts = filteredPrompts.filter(p => favoriteIds.has(p.id));
            } else if (currentFilter !== 'all') {
                filteredPrompts = filteredPrompts.filter(p => p.category === currentFilter);
            }

            // 2. 검색어 필터 적용 (제목, 본문, 설명에서 검색)
            if (currentSearchQuery) {
                filteredPrompts = filteredPrompts.filter(p => {
                    const titleMatch = p.title.toLowerCase().includes(currentSearchQuery);
                    const contentMatch = p.content.toLowerCase().includes(currentSearchQuery);
                    const descMatch = (p.description || '').toLowerCase().includes(currentSearchQuery);
                    const tagMatch = p.tags.some(tag => tag.toLowerCase().includes(currentSearchQuery));
                    
                    return titleMatch || contentMatch || descMatch || tagMatch;
                });
            }

            // 3. 정렬 적용
            filteredPrompts = sortPrompts(filteredPrompts, currentSortOrder);

            // 4. 결과 렌더링
            renderPromptList(filteredPrompts);

            // 검색 결과 없을 때 메시지
            if (filteredPrompts.length === 0 && (currentSearchQuery || currentFilter !== 'all')) {
                const grid = document.getElementById('prompts-grid');
                grid.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🔍</div>
                        <h3>검색 결과가 없습니다</h3>
                        <p>다른 검색어나 필터를 시도해보세요</p>
                    </div>
                `;
            }
        }

        // 정렬 함수
        function sortPrompts(prompts, sortOrder) {
            const sorted = [...prompts];
            
            switch(sortOrder) {
                case 'newest':
                    // 최신순 (createdAt 내림차순)
                    sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    break;
                    
                case 'oldest':
                    // 오래된순 (createdAt 오름차순)
                    sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                    break;
                    
                case 'name-asc':
                    // 이름순 가나다 (title 오름차순)
                    sorted.sort((a, b) => a.title.localeCompare(b.title, 'ko'));
                    break;
                    
                case 'name-desc':
                    // 이름순 하바파 (title 내림차순)
                    sorted.sort((a, b) => b.title.localeCompare(a.title, 'ko'));
                    break;
                    
                case 'category':
                    // 카테고리순 (category 오름차순, 같으면 최신순)
                    sorted.sort((a, b) => {
                        const catCompare = a.category.localeCompare(b.category, 'ko');
                        if (catCompare !== 0) return catCompare;
                        return new Date(b.createdAt) - new Date(a.createdAt);
                    });
                    break;
            }
            
            return sorted;
        }

        // Phase 8: 태그 클릭 필터 (카드 렌더링 시 태그에 클릭 이벤트 추가)
        // 이 기능은 renderPromptList 함수를 수정하여 구현

        // ========================================
        // Phase 5: 프롬프트 목록 표시 (Task 5.5 ~ 5.8)
        // ========================================

        // 5.6: 배열 데이터를 카드 HTML로 변환
        function createPromptCard(prompt) {
            // 즐겨찾기 상태
            const isFavorite = favoriteIds.has(prompt.id);
            const favoriteIcon = isFavorite ? '⭐' : '☆';

            // 태그 HTML 생성 (클릭 가능하게)
            const tagsHTML = prompt.tags && prompt.tags.length > 0
                ? prompt.tags.map(tag => 
                    `<span class="tag-chip" onclick="filterByTag('${tag}'); event.stopPropagation();">${tag}</span>`
                  ).join('')
                : '';

            // 설명 (없으면 빈 문자열)
            const description = prompt.description || '';

            // 선택 모드 체크박스
            const checkboxHTML = isSelectionMode 
                ? `<input type="checkbox" class="prompt-checkbox" 
                          onclick="togglePromptSelection(${prompt.id}, event);"
                          ${selectedPromptIds.has(prompt.id) ? 'checked' : ''}>` 
                : '';

            const selectionClass = isSelectionMode ? 'selection-mode' : '';
            const selectedClass = selectedPromptIds.has(prompt.id) ? 'selected' : '';

            // 썸네일 이미지 HTML (있으면 표시)
            const thumbnailHTML = prompt.thumbnailImage 
                ? `<img src="${prompt.thumbnailImage}" alt="${prompt.title}" class="card-thumbnail" onclick="event.stopPropagation();">` 
                : '';

            // 카드 HTML
            return `
                <div class="prompt-card ${selectionClass} ${selectedClass}" data-id="${prompt.id}">
                    ${checkboxHTML}
                    
                    <!-- 썸네일 이미지 -->
                    ${thumbnailHTML}
                    
                    <div class="card-header">
                        <h3 class="card-title">${prompt.title}</h3>
                        <button class="favorite-btn ${isFavorite ? 'active' : ''}" 
                                data-id="${prompt.id}"
                                onclick="toggleFavorite(${prompt.id}); event.stopPropagation();">
                            ${favoriteIcon}
                        </button>
                    </div>
                    
                    <div class="card-meta">
                        <span class="category-badge ${prompt.category}">${prompt.category}</span>
                        ${tagsHTML ? `<div class="card-tags">${tagsHTML}</div>` : ''}
                    </div>
                    
                    ${description ? `<p class="card-description">${description}</p>` : ''}
                    
                    <div class="card-footer">
                        <span class="card-date">📅 ${formatDate(prompt.createdAt)}</span>
                    </div>
                </div>
            `;
        }

        // Phase 8: 태그로 필터링
        function filterByTag(tag) {
            currentSearchQuery = tag.toLowerCase();
            document.getElementById('search-input').value = tag;
            applyFilters();
            console.log('태그 필터:', tag);
        }

        // 5.5: 목록 렌더링 함수
        function renderPromptList(prompts) {
            const grid = document.getElementById('prompts-grid');

            // 5.8: 빈 목록 처리
            if (!prompts || prompts.length === 0) {
                grid.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📭</div>
                        <h3>프롬프트가 없습니다</h3>
                        <p>"+ 새 프롬프트 추가" 버튼을 눌러 첫 프롬프트를 만들어보세요!</p>
                    </div>
                `;
                return;
            }

            // 카드들 생성
            const cardsHTML = prompts.map(prompt => createPromptCard(prompt)).join('');
            grid.innerHTML = cardsHTML;

            // 카드 클릭 이벤트 등록 (Phase 9에서 상세 보기 연결 예정)
            const cards = grid.querySelectorAll('.prompt-card');
            cards.forEach(card => {
                card.addEventListener('click', function() {
                    const id = parseInt(this.dataset.id);
                    // Phase 9: 상세 보기 모달 열기
                    openDetailModal(id);
                });
            });

            console.log(`${prompts.length}개의 프롬프트 카드 렌더링 완료 ✅`);
            
            // 카테고리 및 즐겨찾기 개수 업데이트
            updateCategoryCounts();
        }

        // 즐겨찾기 토글 함수 (Phase 11에서 완성 예정)
        function toggleFavorite(id) {
            if (favoriteIds.has(id)) {
                favoriteIds.delete(id);
            } else {
                favoriteIds.add(id);
            }
            saveToLocalStorage();
            
            // 현재 필터 유지하면서 새로고침
            applyFilters();
            
            // 토스트 메시지
            const isFavorite = favoriteIds.has(id);
            showToast(isFavorite ? '즐겨찾기 추가! ⭐' : '즐겨찾기 해제! ☆');
            
            console.log('즐겨찾기 토글:', id, isFavorite ? '추가' : '해제');
        }
