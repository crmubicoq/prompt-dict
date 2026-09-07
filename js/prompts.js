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
            if (prompt.thumbnailImage) {
                detailThumbnail.src = prompt.thumbnailImage;
                detailThumbnail.style.display = 'block';
            } else {
                detailThumbnail.style.display = 'none';
            }
            
            // 카테고리
            const categoryBadge = document.getElementById('detail-category');
            categoryBadge.textContent = prompt.category;
            categoryBadge.className = `category-badge ${prompt.category}`;

            // 태그
            const tagsContainer = document.getElementById('detail-tags');
            if (prompt.tags && prompt.tags.length > 0) {
                tagsContainer.innerHTML = prompt.tags
                    .map(tag => `<span class="tag-chip">${tag}</span>`)
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

        function deletePrompt() {
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

            // 프롬프트 삭제
            const index = allPrompts.findIndex(p => p.id === promptId);
            if (index !== -1) {
                allPrompts.splice(index, 1);
            }

            // 즐겨찾기에서도 제거
            if (favoriteIds.has(promptId)) {
                favoriteIds.delete(promptId);
            }

            // 저장
            saveToLocalStorage();

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
            renderPromptList(allPrompts);

            showToast(`프롬프트 "${prompt.title}" 삭제 완료! 🗑️`);
            console.log('프롬프트 삭제:', prompt.title);
        }

        // ========================================
        // I. 프롬프트 복제 기능
        // ========================================

        function duplicatePrompt() {
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
                id: Date.now(), // 새 ID
                title: prompt.title + ' (복사본)',
                content: prompt.content,
                category: prompt.category,
                tags: [...prompt.tags], // 배열 복사
                description: prompt.description || '',
                createdAt: new Date().toISOString(), // 새 생성 시간
                isFavorite: false // 즐겨찾기는 해제
            };

            // 배열 맨 앞에 추가
            allPrompts.unshift(duplicatedPrompt);

            // 저장
            saveToLocalStorage();

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
            renderPromptList(allPrompts);

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

            // 4.7 ~ 4.10: 폼 제출 처리
            form.addEventListener('submit', handleFormSubmit);
        }

        // 4.4: 모달 열기 함수
        function openModal() {
            const modalOverlay = document.getElementById('modal-overlay');
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
        function handleFormSubmit(e) {
            e.preventDefault(); // 폼 기본 동작 방지

            // 4.7: 데이터 수집
            const title = document.getElementById('prompt-title').value.trim();
            const category = document.getElementById('prompt-category').value;
            const tagsInput = document.getElementById('prompt-tags').value.trim();
            const description = document.getElementById('prompt-description').value.trim();
            const content = document.getElementById('prompt-content').value.trim();
            const notes = document.getElementById('prompt-notes').value.trim();
            const editingId = document.getElementById('editing-prompt-id').value;

            // 4.8: 입력값 유효성 검사
            if (!title) {
                alert('제목을 입력해주세요.');
                return;
            }

            if (!category) {
                alert('카테고리를 선택해주세요.');
                return;
            }

            if (!content) {
                alert('프롬프트 본문을 입력해주세요.');
                return;
            }

            // 태그 배열로 변환 (쉼표로 구분)
            const tags = tagsInput 
                ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag)
                : [];

            // 편집 모드인지 확인
            if (editingId) {
                // 수정 모드
                const promptId = parseInt(editingId);
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

                // 프롬프트 업데이트
                prompt.title = title;
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

                console.log('프롬프트 수정 완료:', prompt);
                showToast('프롬프트가 수정되었습니다! ✅');

            } else {
                // 추가 모드
                // 4.9: 새 프롬프트 객체 생성
                const newPrompt = {
                    id: Date.now(), // 현재 시간을 ID로 사용 (유니크함 보장)
                    title: title,
                    content: content,
                    category: category,
                    tags: tags,
                    description: description,
                    notes: notes,
                    createdAt: new Date().toISOString(),
                    isFavorite: false
                };
                
                // 썸네일 이미지 추가 (있으면)
                if (currentThumbnailData) {
                    newPrompt.thumbnailImage = currentThumbnailData;
                }

                // 배열에 추가
                allPrompts.unshift(newPrompt); // 맨 앞에 추가 (최신순)

                console.log('새 프롬프트 추가 완료:', newPrompt);
                showToast('프롬프트가 추가되었습니다! ✅');
            }

            // LocalStorage에 저장
            saveToLocalStorage();

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
            renderPromptList(allPrompts);
        }
