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

                // T-209: setupCategoryButtons 가 더는 이 버튼을 잡지 않으므로
                //   active 표시를 여기서 직접 한다.
                this.classList.add('active');

                currentFilter = 'favorites';
                applyFilters();
            });
        }

        // 통합 필터 적용 함수
        function applyFilters() {
            // T-105(A안): 보이는 대상이 바뀌었으면 선택을 먼저 비운다.
            //   화면 밖 선택이 일괄 분류·삭제에 휩쓸리지 않게 한다.
            syncSelectionWithView();

            let filteredPrompts = [...allPrompts];

            // 1. 카테고리/즐겨찾기 필터 적용
            if (currentFilter === 'favorites') {
                filteredPrompts = filteredPrompts.filter(p => favoriteIds.has(p.id));
            } else if (currentFilter !== 'all') {
                filteredPrompts = filteredPrompts.filter(p => p.category === currentFilter);
            }

            // 2. 검색어 필터 적용
            //
            // ★ T-119: 검색 대상은 제목 · 본문 · 설명 · 태그 · **메모**.
            //   프롬프트의 텍스트 필드를 전수 확인해 빠진 것이 notes 뿐임을 확인했다.
            //
            //   일부러 뺀 것들:
            //   - category — 사이드바에 전용 필터가 있다. 검색에 넣으면
            //     "개발" 을 치는 순간 그 카테고리 전체가 쏟아진다
            //   - createdAt / updatedAt — 날짜다. "2026" 이 전부와 일치한다
            //   - thumbnailImage — base64 data URI 다. "gif" 를 치면
            //     썸네일 있는 프롬프트가 전부 걸린다. 넣으면 해롭다
            //   - id — UUID
            if (currentSearchQuery) {
                filteredPrompts = filteredPrompts.filter(p => {
                    // ★ 필드가 없을 수 있다(손으로 고친 백업 등).
                    //   여기서 던지면 filter 가 통째로 실패해 목록이 안 그려진다.
                    const titleMatch = (p.title || '').toLowerCase().includes(currentSearchQuery);
                    const contentMatch = (p.content || '').toLowerCase().includes(currentSearchQuery);
                    const descMatch = (p.description || '').toLowerCase().includes(currentSearchQuery);
                    const notesMatch = (p.notes || '').toLowerCase().includes(currentSearchQuery);
                    const tagMatch = (p.tags || []).some(
                        tag => String(tag).toLowerCase().includes(currentSearchQuery));
                    
                    return titleMatch || contentMatch || descMatch || notesMatch || tagMatch;
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
                    
                case 'updated':
                    // T-117: 수정순 (마지막 수정 내림차순)
                    // ★ 동률이면 createdAt 내림차순으로 갈라 순서를 안정시킨다.
                    //   updatedAt 이 없는 항목끼리는 폴백값이 곧 createdAt 이라
                    //   결국 최신순과 같아진다.
                    sorted.sort((a, b) => {
                        const diff = new Date(promptUpdatedAt(b)) - new Date(promptUpdatedAt(a));
                        if (diff !== 0) return diff;
                        return new Date(b.createdAt) - new Date(a.createdAt);
                    });
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
                    `<span class="tag-chip" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</span>`
                  ).join('')
                : '';

            // 설명 (없으면 빈 문자열)
            const description = prompt.description || '';

            // 선택 모드 체크박스
            const checkboxHTML = isSelectionMode 
                ? `<input type="checkbox" class="prompt-checkbox"
                          ${selectedPromptIds.has(prompt.id) ? 'checked' : ''}>`
                : '';

            const selectionClass = isSelectionMode ? 'selection-mode' : '';
            const selectedClass = selectedPromptIds.has(prompt.id) ? 'selected' : '';

            // 썸네일 이미지 HTML (있으면 표시)
            // ★ T-112: 스킴 화이트리스트를 통과한 URL 만 렌더한다.
            //   통과하지 못하면 자리표시자를 띄운다 — 조용히 감추면 사용자는
            //   썸네일이 사라진 이유를 알 수 없다.
            const thumbnailUrl = safeImageUrl(prompt.thumbnailImage);
            const thumbnailHTML = !prompt.thumbnailImage
                ? ''
                : thumbnailUrl
                    ? `<img src="${escapeHtml(thumbnailUrl)}" alt="${escapeHtml(prompt.title)}" class="card-thumbnail">`
                    : `<div class="card-thumbnail card-thumbnail-blocked">🚫 표시할 수 없는 이미지 형식</div>`;

            // 카드 HTML
            return `
                <div class="prompt-card ${selectionClass} ${selectedClass}" data-id="${escapeHtml(prompt.id)}">
                    ${checkboxHTML}
                    
                    <!-- 썸네일 이미지 -->
                    ${thumbnailHTML}
                    
                    <div class="card-header">
                        <h3 class="card-title">${escapeHtml(prompt.title)}</h3>
                        <button class="favorite-btn ${isFavorite ? 'active' : ''}"
                                data-id="${escapeHtml(prompt.id)}">
                            ${favoriteIcon}
                        </button>
                    </div>
                    
                    <div class="card-meta">
                        <span class="${escapeHtml(categoryClass(prompt.category))}">${escapeHtml(prompt.category)}</span>
                        ${tagsHTML ? `<div class="card-tags">${tagsHTML}</div>` : ''}
                    </div>
                    
                    ${description ? `<p class="card-description">${escapeHtml(description)}</p>` : ''}
                    
                    <div class="card-footer">
                        <span class="card-date">📅 ${formatDate(prompt.createdAt)}</span>
                    </div>
                </div>
            `;
        }

        // ========================================
        // T-113: 이벤트 위임
        // ========================================
        //
        // 인라인 onclick 을 전부 없앤다. 이스케이프로는 막을 수 없기 때문이다 —
        // HTML 파서가 엔티티를 되돌린 뒤 그 결과를 JS 로 파싱하므로, 따옴표가
        // 속성을 탈출해 임의 HTML 이 삽입된다 (T-112에서 실측).
        //
        // ★ 리스너는 재렌더에도 살아남는 고정 컨테이너에 건다.
        //   innerHTML 대입은 자식만 갈아치우고 컨테이너 자신은 남으므로
        //   #prompts-grid / #category-list-manage / #search-history-list 에
        //   한 번만 걸면 된다. 항목마다 걸면 재렌더 때마다 다시 걸어야 한다.
        //
        // ★ 식별자는 dataset 으로 읽는다. 속성에는 escapeHtml 로 넣고,
        //   dataset 은 브라우저가 엔티티를 푼 원본 문자열을 돌려준다.
        //
        // ★ 리스너를 async 로 두고 본문 전체를 try/catch 로 감싼다.
        //   각 핸들러의 try/catch(T-009c-2)는 원인별 문구가 더 친절하므로 남기고,
        //   여기서는 그 바깥에서 새는 것만 받는다 — 두 겹으로 막아
        //   위임 리스너가 거부된 Promise 를 흘리지 않게 한다.
        function setupEventDelegation() {
            // ---------- 카드 그리드 ----------
            const grid = document.getElementById('prompts-grid');
            if (grid) {
                grid.addEventListener('click', async function (event) {
                    try {
                        const target = event.target;
                        if (!target || typeof target.closest !== 'function') return;

                        const card = target.closest('.prompt-card');
                        if (!card) return;
                        const id = card.dataset.id;

                        // 썸네일 클릭은 아무 동작도 하지 않는다 (기존 stopPropagation 동작 유지)
                        if (target.closest('.card-thumbnail')) return;

                        const chip = target.closest('.tag-chip');
                        if (chip) {
                            filterByTag(chip.dataset.tag);
                            return;
                        }

                        if (target.closest('.prompt-checkbox')) {
                            togglePromptSelection(id);
                            return;
                        }

                        if (target.closest('.favorite-btn')) {
                            await toggleFavorite(id);
                            return;
                        }

                        openDetailModal(id);
                    } catch (error) {
                        console.error('[카드] 처리 중 예외:', error);
                        showToast('처리 중 오류가 발생했습니다 ❌');
                    }
                });
            }

            // ---------- 카테고리 관리 목록 ----------
            const manageList = document.getElementById('category-list-manage');
            if (manageList) {
                manageList.addEventListener('click', async function (event) {
                    try {
                        const target = event.target;
                        if (!target || typeof target.closest !== 'function') return;

                        const btn = target.closest('button[data-cat-id]');
                        if (!btn) return;

                        // ★ 인덱스가 아니라 id 다 (검수 F3).
                        const catId = btn.dataset.catId;
                        if (btn.dataset.action === 'edit') {
                            await editCategory(catId);
                        } else if (btn.dataset.action === 'delete') {
                            await deleteCategory(catId);
                        }
                    } catch (error) {
                        console.error('[카테고리] 처리 중 예외:', error);
                        showToast('처리 중 오류가 발생했습니다 ❌');
                    }
                });
            }

            // ---------- 검색 기록 ----------
            const historyList = document.getElementById('search-history-list');
            if (historyList) {
                historyList.addEventListener('click', async function (event) {
                    try {
                        const target = event.target;
                        if (!target || typeof target.closest !== 'function') return;

                        const el = target.closest('[data-action]');
                        if (!el) return;

                        // ★ 인덱스가 아니라 검색어 자체가 키다.
                        //   addToSearchHistory 가 중복을 제거하므로 유일하다.
                        const query = el.dataset.query;
                        if (el.dataset.action === 'apply') {
                            applySearchHistory(query);
                        } else if (el.dataset.action === 'remove') {
                            await removeFromSearchHistory(query);
                        }
                    } catch (error) {
                        console.error('[검색 기록] 처리 중 예외:', error);
                        showToast('처리 중 오류가 발생했습니다 ❌');
                    }
                });
            }
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

                // ★ 빈 목록에서도 사이드바 개수는 갱신해야 한다.
                //   여기서 건너뛰면, 필터의 마지막 항목을 분류·삭제해 목록이 비는 순간
                //   사이드바가 옛 숫자에 멈춘다 (T-105 검증에서 드러남).
                updateCategoryCounts();
                return;
            }

            // 카드들 생성
            const cardsHTML = prompts.map(prompt => createPromptCard(prompt)).join('');
            grid.innerHTML = cardsHTML;

            // T-113: 카드별 리스너를 걸지 않는다.
            //   #prompts-grid 에 위임 리스너 하나가 걸려 있다 (setupEventDelegation).

            console.log(`${prompts.length}개의 프롬프트 카드 렌더링 완료 ✅`);
            
            // 카테고리 및 즐겨찾기 개수 업데이트
            updateCategoryCounts();
        }

        // 즐겨찾기 토글 함수 (Phase 11에서 완성 예정)
        // T-009c-2: 인라인 onclick 에서 호출되므로 반환 Promise 를 받는 곳이 없다.
        // 본문 전체를 try/catch 로 감싸 예외가 unhandledrejection 으로 새지 않게 한다.
        async function toggleFavorite(id) {
            try {
                // 실패 시 되돌릴 스냅샷
                const snapshotFavorites = new Set(favoriteIds);

                if (favoriteIds.has(id)) {
                    favoriteIds.delete(id);
                } else {
                    favoriteIds.add(id);
                }

                // 즐겨찾기만 바뀐다 — 프롬프트는 저장할 필요가 없다
                if (await PromptStorage.saveFavorites(favoriteIds) !== true) {
                    favoriteIds = snapshotFavorites;
                    applyFilters();
                    showToast('저장 실패 — 변경을 되돌렸습니다 ❌');
                    return;
                }

                // 현재 필터 유지하면서 새로고침
                applyFilters();

                // 토스트 메시지
                const isFavorite = favoriteIds.has(id);
                showToast(isFavorite ? '즐겨찾기 추가! ⭐' : '즐겨찾기 해제! ☆');

                console.log('즐겨찾기 토글:', id, isFavorite ? '추가' : '해제');
            } catch (error) {
                console.error('[즐겨찾기] 처리 실패:', error);
                showToast('즐겨찾기 처리 중 오류가 발생했습니다 ❌');
            }
        }

        // ========================================
        // Phase 9: 상세 보기 모달 (Task 9.3 ~ 9.6)
        // ========================================

        // 9.3: 상세 모달 열기
        function openDetailModal(id) {
            const prompt = allPrompts.find(p => p.id === id);
            if (!prompt) return;

            currentDetailId = id;

            // 9.4: 모달에 데이터 표시
            document.getElementById('detail-title').textContent = prompt.title;
            
            // 썸네일 이미지
            const detailThumbnail = document.getElementById('detail-thumbnail');
            // T-112: 카드와 같은 스킴 검증을 적용한다.
            const detailThumbnailUrl = safeImageUrl(prompt.thumbnailImage);
            if (detailThumbnailUrl) {
                detailThumbnail.src = detailThumbnailUrl;
                detailThumbnail.style.display = 'block';
            } else {
                detailThumbnail.removeAttribute('src');
                detailThumbnail.style.display = 'none';
            }
            
            // 카테고리
            const categoryBadge = document.getElementById('detail-category');
            categoryBadge.textContent = prompt.category;
            categoryBadge.className = categoryClass(prompt.category);

            // 태그
            const tagsContainer = document.getElementById('detail-tags');
            if (prompt.tags && prompt.tags.length > 0) {
                tagsContainer.innerHTML = prompt.tags
                    .map(tag => `<span class="tag-chip">${escapeHtml(tag)}</span>`)
                    .join('');
                tagsContainer.style.display = 'flex';
            } else {
                tagsContainer.style.display = 'none';
            }

            // 설명
            const descContainer = document.getElementById('detail-description');
            if (prompt.description) {
                descContainer.textContent = prompt.description;
                descContainer.style.display = 'block';
            } else {
                descContainer.style.display = 'none';
            }

            // 프롬프트 본문
            document.getElementById('detail-content').textContent = prompt.content;

            // 메모
            const notesWrapper = document.getElementById('detail-notes-wrapper');
            const notesContainer = document.getElementById('detail-notes');
            if (prompt.notes && prompt.notes.trim()) {
                notesContainer.textContent = prompt.notes;
                notesWrapper.style.display = 'block';
            } else {
                notesWrapper.style.display = 'none';
            }

            // 날짜
            document.getElementById('detail-date').textContent = `📅 ${formatDate(prompt.createdAt)}`;

            // 모달 표시
            const modalOverlay = document.getElementById('detail-modal-overlay');
            modalOverlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }

        // 9.6: 상세 모달 닫기
        function closeDetailModal() {
            const modalOverlay = document.getElementById('detail-modal-overlay');
            modalOverlay.style.display = 'none';
            document.body.style.overflow = 'auto';
            currentDetailId = null;
        }

        // ========================================
        // Phase 10: 복사 기능 (Task 10.3 ~ 10.7)
        // ========================================

        // 10.3: 클립보드 복사 함수
        async function copyToClipboard() {
            const content = document.getElementById('detail-content').textContent;

            try {
                // 클립보드 API 사용
                await navigator.clipboard.writeText(content);
                
                // 10.6: 토스트 메시지 표시
                showToast('복사 완료! ✅');
                
                console.log('클립보드 복사 성공');
            } catch (error) {
                console.error('복사 실패:', error);
                
                // 구형 브라우저 대응
                fallbackCopy(content);
            }
        }

        // ========================================
        // 프롬프트 수정 기능
        // ========================================

        function openEditPromptModal() {
            const promptId = currentDetailId;
            if (!promptId) return;

            const prompt = allPrompts.find(p => p.id === promptId);
            if (!prompt) {
                alert('프롬프트를 찾을 수 없습니다.');
                return;
            }

            // 상세 모달 닫기
            closeDetailModal();

            // 편집 모달 열기
            const modalOverlay = document.getElementById('modal-overlay');
            const modalTitle = document.getElementById('modal-title');
            
            // 모달 제목 변경
            modalTitle.textContent = '✏️ 프롬프트 수정';

            // 폼에 기존 데이터 채우기
            document.getElementById('editing-prompt-id').value = prompt.id;
            document.getElementById('prompt-title').value = prompt.title;
            document.getElementById('prompt-category').value = prompt.category;
            document.getElementById('prompt-tags').value = prompt.tags.join(', ');
            document.getElementById('prompt-description').value = prompt.description || '';
            document.getElementById('prompt-content').value = prompt.content;
            document.getElementById('prompt-notes').value = prompt.notes || '';

            // T-102: 채워진 값이 접힌 채로 숨지 않도록, 값이 있으면 펼친다.
            // 제목·본문만 있는 프롬프트라면 접힌 채로 둔다.
            setAdvancedOpen(hasAdvancedValue() || !!prompt.thumbnailImage);

            // 카테고리에 따라 이미지 섹션 표시/숨김
            toggleThumbnailSection();

            // 기존 썸네일 이미지 로드
            if (prompt.thumbnailImage) {
                currentThumbnailData = prompt.thumbnailImage;
                showThumbnailPreview(currentThumbnailData);
            } else {
                clearThumbnail();
            }

            // 모달 표시
            modalOverlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';

            console.log('프롬프트 수정 모드 열림:', prompt.id);
        }

        // ========================================
        // 프롬프트 삭제 기능
        // ========================================

        async function deletePrompt() {
            const promptId = currentDetailId;
            if (!promptId) return;

            const prompt = allPrompts.find(p => p.id === promptId);
            if (!prompt) {
                alert('프롬프트를 찾을 수 없습니다.');
                return;
            }

            // 1차 확인
            const firstConfirm = confirm(
                `⚠️ 프롬프트를 삭제하시겠습니까?\n\n` +
                `제목: "${prompt.title}"\n` +
                `카테고리: ${prompt.category}\n\n` +
                `이 작업은 취소할 수 없습니다.`
            );

            if (!firstConfirm) {
                return;
            }

            // 2차 확인 (이중 안전장치)
            const secondConfirm = confirm(
                `🔴 최종 확인\n\n` +
                `"${prompt.title}" 프롬프트를 정말 삭제하시겠습니까?\n\n` +
                `삭제하면 복구할 수 없습니다!`
            );

            if (!secondConfirm) {
                return;
            }

            // T-009c-1: 실패 시 되돌릴 스냅샷
            // ★ T-118: 즐겨찾기는 더 이상 스냅샷에 넣지 않는다 (아래 참조)
            const snapshotPrompts = [...allPrompts];

            // 프롬프트 삭제
            const index = allPrompts.findIndex(p => p.id === promptId);
            if (index !== -1) {
                allPrompts.splice(index, 1);
            }

            // ★ T-118: 저장은 프롬프트 하나만 필수다.
            //   전에는 프롬프트와 즐겨찾기를 함께 저장하고 하나라도 실패하면
            //   둘 다 되돌렸다 — 두 키를 원자적으로 써야 하는 구조였다.
            //   favCount 를 교집합으로 바꾼 뒤로 남은 id 는 아무 데서도 읽히지 않으므로,
            //   즐겨찾기 정리는 실패해도 되는 뒷정리가 됐다.
            if (await PromptStorage.savePrompts(allPrompts) !== true) {
                allPrompts = snapshotPrompts;
                applyFilters();
                showToast('저장 실패 — 변경을 되돌렸습니다 ❌');
                return;
            }

            // 삭제가 확정된 뒤 즐겨찾기를 정리한다 (최선 노력).
            // 실패해도 되돌리지 않는다 — 남은 id 는 무해하고 다음 로드에서 정리된다.
            if (favoriteIds.has(promptId)) {
                favoriteIds.delete(promptId);
                if (await PromptStorage.saveFavorites(favoriteIds) !== true) {
                    console.warn('[삭제] 즐겨찾기 정리를 저장하지 못했습니다 — 다음 로드에서 정리됩니다.');
                }
            }

            // 상세 모달 닫기
            closeDetailModal();

            // UI 업데이트
            currentFilter = 'all';
            currentSearchQuery = '';
            document.getElementById('search-input').value = '';
            
            // 카테고리 버튼 "전체" 활성화
            const categoryBtns = document.querySelectorAll('.category-btn');
            categoryBtns.forEach(btn => btn.classList.remove('active'));
            document.querySelector('.category-btn[data-category="all"]').classList.add('active');
            
            // 목록 새로고침
            //
            // ★ renderPromptList 를 직접 부르면 sortPrompts 를 건너뛴다.
            //   사용자가 고른 정렬이 저장·삭제·복제 때마다 조용히 무시됐다.
            //   T-117 의 "수정순" 은 바로 이 경로에서 값을 내야 하는데,
            //   방금 수정한 항목이 최상단으로 오지 않아 드러났다.
            //   applyFilters 는 정렬과 선택 동기화(T-105)까지 거친다.
            //   위에서 필터·검색어를 all/빈값으로 되돌렸으므로 결과는 전체 목록이다.
            applyFilters();

            showToast(`프롬프트 "${prompt.title}" 삭제 완료! 🗑️`);
            console.log('프롬프트 삭제:', prompt.title);
        }

        // ========================================
        // I. 프롬프트 복제 기능
        // ========================================

        async function duplicatePrompt() {
            const promptId = currentDetailId;
            if (!promptId) return;

            const prompt = allPrompts.find(p => p.id === promptId);
            if (!prompt) {
                alert('프롬프트를 찾을 수 없습니다.');
                return;
            }

            // 확인 메시지
            const shouldDuplicate = confirm(
                `📋 프롬프트를 복제하시겠습니까?\n\n` +
                `원본: "${prompt.title}"\n\n` +
                `복제본이 생성되며 제목에 "(복사본)"이 추가됩니다.`
            );

            if (!shouldDuplicate) {
                return;
            }

            // 새 프롬프트 객체 생성 (복제)
            const duplicatedPrompt = {
                id: newId(), // 새 ID
                title: prompt.title + ' (복사본)',
                content: prompt.content,
                category: prompt.category,
                tags: [...prompt.tags], // 배열 복사
                description: prompt.description || '',
                createdAt: new Date().toISOString(), // 새 생성 시간
            };

            // T-009c-1: 실패 시 되돌릴 스냅샷 (이 함수는 프롬프트만 바꾼다)
            const snapshotPrompts = [...allPrompts];

            // 배열 맨 앞에 추가
            allPrompts.unshift(duplicatedPrompt);

            // 저장 — 즐겨찾기는 바뀌지 않으므로 프롬프트만
            if (await PromptStorage.savePrompts(allPrompts) !== true) {
                allPrompts = snapshotPrompts;
                applyFilters();
                showToast('저장 실패 — 변경을 되돌렸습니다 ❌');
                return;
            }

            // 상세 모달 닫기
            closeDetailModal();

            // UI 업데이트
            currentFilter = 'all';
            currentSearchQuery = '';
            document.getElementById('search-input').value = '';
            
            // 카테고리 버튼 "전체" 활성화
            const categoryBtns = document.querySelectorAll('.category-btn');
            categoryBtns.forEach(btn => btn.classList.remove('active'));
            document.querySelector('.category-btn[data-category="all"]').classList.add('active');
            
            // 목록 새로고침
            //
            // ★ renderPromptList 를 직접 부르면 sortPrompts 를 건너뛴다.
            //   사용자가 고른 정렬이 저장·삭제·복제 때마다 조용히 무시됐다.
            //   T-117 의 "수정순" 은 바로 이 경로에서 값을 내야 하는데,
            //   방금 수정한 항목이 최상단으로 오지 않아 드러났다.
            //   applyFilters 는 정렬과 선택 동기화(T-105)까지 거친다.
            //   위에서 필터·검색어를 all/빈값으로 되돌렸으므로 결과는 전체 목록이다.
            applyFilters();

            showToast(`프롬프트 복제 완료! 📋\n"${duplicatedPrompt.title}"`);
            console.log('프롬프트 복제:', duplicatedPrompt.title);
        }

        // ========================================
        // Phase 4: 모달 기능 (Task 4.4 ~ 4.10)
        // ========================================

        function setupModalEvents() {
            const modalOverlay = document.getElementById('modal-overlay');
            const addBtn = document.getElementById('add-prompt-btn');
            const closeBtn = document.getElementById('close-modal');
            const cancelBtn = document.getElementById('cancel-btn');
            const form = document.getElementById('prompt-form');

            // 4.4: 모달 열기
            addBtn.addEventListener('click', openModal);

            // 4.5: 모달 닫기 (X 버튼)
            closeBtn.addEventListener('click', closeModal);
            cancelBtn.addEventListener('click', closeModal);

            // 4.5: 모달 닫기 (배경 클릭)
            modalOverlay.addEventListener('click', function(e) {
                if (e.target === modalOverlay) {
                    closeModal(); // closeModal에서 확인 처리
                }
            });

            // T-102: '자세히' 토글
            const advancedBtn = document.getElementById('toggle-advanced-btn');
            if (advancedBtn) {
                advancedBtn.addEventListener('click', function() {
                    const fields = document.getElementById('advanced-fields');
                    setAdvancedOpen(fields.style.display === 'none');
                });
            }

            // T-103: 제목을 비워두면 무엇이 들어갈지 미리 보여준다.
            // ★ value 가 아니라 placeholder 로 넣는다 — 값으로 채우면 사용자가
            //   지우고 써야 해서 오히려 마찰이 늘고, 본문을 고칠 때마다
            //   덮어쓸지 말지가 애매해진다. placeholder 는 절대 방해하지 않는다.
            const titleInput = document.getElementById('prompt-title');
            const contentInput = document.getElementById('prompt-content');
            if (titleInput && contentInput) {
                const defaultHint = titleInput.placeholder;
                contentInput.addEventListener('input', function() {
                    const suggestion = suggestTitle(contentInput.value.trim());
                    titleInput.placeholder = suggestion ? `비워두면: ${suggestion}` : defaultHint;
                });
            }

            // 4.7 ~ 4.10: 폼 제출 처리
            form.addEventListener('submit', handleFormSubmit);
        }

        // 4.4: 모달 열기 함수
        // T-102: '자세히' 영역 펼침/접힘
        function setAdvancedOpen(open) {
            const fields = document.getElementById('advanced-fields');
            const btn = document.getElementById('toggle-advanced-btn');
            if (!fields || !btn) return;

            fields.style.display = open ? 'block' : 'none';
            btn.setAttribute('aria-expanded', open ? 'true' : 'false');
            btn.textContent = open
                ? '▾ 자세히 (카테고리 · 태그 · 설명 · 메모)'
                : '▸ 자세히 (카테고리 · 태그 · 설명 · 메모)';
        }

        // T-102: 접힌 필드 중 하나라도 값이 있는지
        // 수정 모드에서 채워진 값이 접힌 채로 숨어 있으면 사용자가 못 본다.
        function hasAdvancedValue() {
            return ['prompt-category', 'prompt-tags', 'prompt-description', 'prompt-notes']
                .some(id => {
                    const el = document.getElementById(id);
                    return el && el.value.trim() !== '';
                });
        }

        function openModal() {
            const modalOverlay = document.getElementById('modal-overlay');

            // T-102: 추가 모드는 항상 접힌 채로 시작한다.
            // 마지막 상태를 기억하면, 한 번 펼친 뒤로는 계속 펼쳐진 채라
            // '최소 입력'이라는 목적이 무너진다.
            setAdvancedOpen(false);

            modalOverlay.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // 스크롤 방지
        }

        // 4.5: 모달 닫기 함수
        function closeModal() {
            // 입력된 내용 확인
            const title = document.getElementById('prompt-title').value.trim();
            const content = document.getElementById('prompt-content').value.trim();
            const description = document.getElementById('prompt-description').value.trim();
            const tags = document.getElementById('prompt-tags').value.trim();
            const notes = document.getElementById('prompt-notes').value.trim();
            
            // 하나라도 입력되어 있으면 확인
            if (title || content || description || tags || notes) {
                const shouldClose = confirm(
                    '⚠️ 작성 중인 내용이 있습니다.\n' +
                    '정말 닫으시겠습니까?\n\n' +
                    '입력한 내용이 모두 사라집니다.'
                );
                if (!shouldClose) {
                    return; // 취소하면 닫지 않음
                }
            }
            
            // 모달 닫기 처리
            const modalOverlay = document.getElementById('modal-overlay');
            const form = document.getElementById('prompt-form');
            const modalTitle = document.getElementById('modal-title');
            
            modalOverlay.style.display = 'none';
            document.body.style.overflow = 'auto'; // 스크롤 복원
            form.reset(); // 폼 초기화
            
            // 편집 모드 초기화
            document.getElementById('editing-prompt-id').value = '';
            modalTitle.textContent = '✨ 새 프롬프트 추가';
            
            // 썸네일 이미지 초기화
            clearThumbnail();
        }

        // 4.7 ~ 4.10: 폼 제출 처리 함수
        async function handleFormSubmit(e) {
            e.preventDefault(); // 폼 기본 동작 방지

            // 4.7: 데이터 수집
            const title = document.getElementById('prompt-title').value.trim();
            // T-101: 카테고리는 선택 사항. 미선택이면 '미분류'로 저장하고 나중에 정리한다.
            const category = document.getElementById('prompt-category').value || UNCATEGORIZED;
            const tagsInput = document.getElementById('prompt-tags').value.trim();
            const description = document.getElementById('prompt-description').value.trim();
            const content = document.getElementById('prompt-content').value.trim();
            const notes = document.getElementById('prompt-notes').value.trim();
            const editingId = document.getElementById('editing-prompt-id').value;

            // 4.8: 입력값 유효성 검사
            // T-103: 제목은 선택 사항. 비우면 본문에서 만든다.
            //   본문은 여전히 필수다 — 본문이 없으면 제목을 만들 근거도 없고,
            //   본문 없는 프롬프트는 사전에 담을 이유가 없다.
            if (!content) {
                alert('프롬프트 본문을 입력해주세요.');
                return;
            }

            // 태그 배열로 변환 (쉼표로 구분)
            const tags = tagsInput 
                ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag)
                : [];

            // T-103: 제목 미입력 시 본문에서 자동 생성
            const autoTitled = !title;
            const finalTitle = title || suggestTitle(content) || '제목 없음';

            // T-009c-1: 실패 시 되돌릴 스냅샷
            const snapshotPrompts = [...allPrompts];
            let editedIndex = -1;
            let editedOriginal = null;
            let successMessage = '';

            // 편집 모드인지 확인
            if (editingId) {
                // 수정 모드
                const promptId = editingId; // T-116: UUID 문자열
                const prompt = allPrompts.find(p => p.id === promptId);
                
                if (!prompt) {
                    alert('프롬프트를 찾을 수 없습니다.');
                    return;
                }

                // 확인 메시지
                const shouldUpdate = confirm(
                    `⚠️ 프롬프트를 수정하시겠습니까?\n\n` +
                    `제목: "${prompt.title}"\n\n` +
                    `수정 내용이 즉시 저장됩니다.`
                );

                if (!shouldUpdate) {
                    return;
                }

                // 롤백용 원본 사본 — 얕은 배열 복사는 제자리 수정을 되돌리지 못한다
                editedIndex = allPrompts.indexOf(prompt);
                editedOriginal = { ...prompt };

                // 프롬프트 업데이트
                prompt.title = finalTitle;
                prompt.content = content;
                prompt.category = category;
                prompt.tags = tags;
                prompt.description = description;
                prompt.notes = notes;
                
                // 썸네일 이미지 업데이트 (있으면)
                if (currentThumbnailData) {
                    prompt.thumbnailImage = currentThumbnailData;
                } else if (category !== '이미지 생성' && category !== '이미지') {
                    // 카테고리가 변경되어 이미지 카테고리가 아니면 썸네일 제거
                    delete prompt.thumbnailImage;
                }

                // T-117: 사용자가 이 프롬프트를 직접 고쳤다
                touchPrompt(prompt);

                console.log('프롬프트 수정 완료:', prompt);
                successMessage = autoTitled
                    ? '프롬프트가 수정되었습니다! ✅ (제목 자동 생성)'
                    : '프롬프트가 수정되었습니다! ✅';

            } else {
                // 추가 모드
                // 4.9: 새 프롬프트 객체 생성
                const newPrompt = {
                    id: newId(), // T-116: 같은 밀리초 충돌 방지
                    title: finalTitle,
                    content: content,
                    category: category,
                    tags: tags,
                    description: description,
                    notes: notes,
                    createdAt: new Date().toISOString()
                };
                
                // 썸네일 이미지 추가 (있으면)
                if (currentThumbnailData) {
                    newPrompt.thumbnailImage = currentThumbnailData;
                }

                // 배열에 추가
                allPrompts.unshift(newPrompt); // 맨 앞에 추가 (최신순)

                console.log('새 프롬프트 추가 완료:', newPrompt);
                successMessage = autoTitled
                    ? '프롬프트가 추가되었습니다! ✅ (제목 자동 생성)'
                    : '프롬프트가 추가되었습니다! ✅';
            }

            // 저장 — 이 함수는 프롬프트만 바꾼다 (즐겨찾기는 건드리지 않음)
            if (await PromptStorage.savePrompts(allPrompts) !== true) {
                // 롤백: 추가 모드는 배열 복원, 수정 모드는 바뀐 객체까지 복원
                allPrompts = snapshotPrompts;
                if (editedIndex !== -1) {
                    allPrompts[editedIndex] = editedOriginal;
                }
                applyFilters();
                showToast('저장 실패 — 변경을 되돌렸습니다 ❌');
                return;
            }

            showToast(successMessage);

            // 4.10: 모달 닫기
            closeModal();

            // 필터 초기화 후 전체 목록 표시
            currentFilter = 'all';
            currentSearchQuery = '';
            document.getElementById('search-input').value = '';
            
            // 카테고리 버튼 "전체" 활성화
            const categoryBtns = document.querySelectorAll('.category-btn');
            categoryBtns.forEach(btn => btn.classList.remove('active'));
            document.querySelector('.category-btn[data-category="all"]').classList.add('active');
            
            // 목록 새로고침
            //
            // ★ renderPromptList 를 직접 부르면 sortPrompts 를 건너뛴다.
            //   사용자가 고른 정렬이 저장·삭제·복제 때마다 조용히 무시됐다.
            //   T-117 의 "수정순" 은 바로 이 경로에서 값을 내야 하는데,
            //   방금 수정한 항목이 최상단으로 오지 않아 드러났다.
            //   applyFilters 는 정렬과 선택 동기화(T-105)까지 거친다.
            //   위에서 필터·검색어를 all/빈값으로 되돌렸으므로 결과는 전체 목록이다.
            applyFilters();
        }
