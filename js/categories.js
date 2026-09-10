        // 사이드바 카테고리 목록 렌더링
        function renderCategoryList() {
            const categoryList = document.getElementById('category-list');
            
            // 전체 프롬프트 개수
            const totalCount = allPrompts.length;
            
            // 전체 버튼 (고정)
            //
            // ★ T-128: 여기서 active 를 박지 않는다.
            //   전에는 항상 "전체"에 active 가 붙어, 재렌더가 일어날 때마다
            //   사이드바가 실제 currentFilter 와 어긋났다.
            //   (카테고리 추가·삭제·개명·불러오기가 전부 이 함수를 부른다)
            let html = `<li><button class="category-btn" data-category="all">전체 (${totalCount})</button></li>`;
            
            // 동적 카테고리
            categories.forEach(cat => {
                // 각 카테고리별 프롬프트 개수 계산
                const count = allPrompts.filter(p => p.category === cat.name).length;
                html += `<li><button class="category-btn" data-category="${escapeHtml(cat.name)}">${escapeHtml(cat.emoji)} ${escapeHtml(cat.name)} (${count})</button></li>`;
            });

            // T-101: 미분류는 categories 배열 밖의 고정 항목이다.
            // 관리 화면에 뜨지 않으므로 삭제·수정될 수 없다.
            const uncategorizedCount = allPrompts.filter(p => p.category === UNCATEGORIZED).length;
            html += `<li><button class="category-btn" data-category="${UNCATEGORIZED}">📥 ${UNCATEGORIZED} (${uncategorizedCount})</button></li>`;

            categoryList.innerHTML = html;
            
            // 카테고리 버튼 이벤트 다시 등록
            setupCategoryButtons();

            // T-128: active 표시는 currentFilter 에서만 나온다
            syncCategoryActive();
        }

        // T-128: 사이드바 active 표시를 currentFilter 하나에서 만든다.
        //
        // ★ 전에는 표시를 만드는 곳이 셋이었다 —
        //   renderCategoryList 가 "전체"에 하드코딩, 카테고리 버튼 클릭 핸들러가
        //   자기 자신에, 즐겨찾기 버튼 핸들러가 또 따로. 그래서
        //   - 카테고리를 추가하면 보고 있던 필터의 표시가 "전체"로 튀고
        //   - 즐겨찾기를 본 뒤 카테고리를 누르면 **둘 다 켜져 있었다**
        //     (즐겨찾기 버튼은 #category-list 밖이라 클릭 핸들러의
        //      해제 대상에서 빠져 있었다)
        //
        // ★ 일치하는 버튼이 없으면 아무것도 켜지 않는다. 그 상태는
        //   "currentFilter 가 목록에 없는 값을 가리킨다"는 뜻이고,
        //   임의로 "전체"를 켜면 그 어긋남을 감춘다. 부르는 쪽이
        //   삭제·개명 뒤에 currentFilter 를 옮겨 줘야 한다 (F4).
        function syncCategoryActive() {
            document.querySelectorAll('.category-btn').forEach(function (btn) {
                btn.classList.remove('active');
            });

            if (currentFilter === 'favorites') {
                const favoritesBtn = document.getElementById('favorites-btn');
                if (favoritesBtn) favoritesBtn.classList.add('active');
                return;
            }

            // ★ 속성 선택자를 쓰지 않는다 — 카테고리 이름에 따옴표가 들어가면
            //   선택자가 깨진다. dataset 값을 직접 비교한다.
            document.querySelectorAll('#category-list .category-btn').forEach(function (btn) {
                if (btn.dataset.category === currentFilter) btn.classList.add('active');
            });
        }

        // 카테고리 버튼 이벤트 등록
        function setupCategoryButtons() {
            // ★ #category-list 안으로 한정한다.
            //   전역으로 잡으면 목록 밖의 #favorites-btn·#manage-categories-btn 까지
            //   걸리는데, 그 둘은 재렌더돼도 사라지지 않으므로
            //   renderCategoryList 를 부를 때마다 **리스너가 하나씩 쌓인다.**
            //   (실측: 5회 재렌더 후 1클릭에 applyFilters 7회 호출)
            //   게다가 카테고리 관리 버튼은 data-category 가 없어
            //   currentFilter 를 'all' 로 되돌려, 관리 모달을 열면 필터가 풀렸다.
            const categoryBtns = document.querySelectorAll('#category-list .category-btn');
            categoryBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    // 필터 적용 — 표시는 syncCategoryActive 가 만든다 (T-128)
                    currentFilter = this.dataset.category || 'all';
                    syncCategoryActive();
                    applyFilters();
                });
            });
        }

        // 카테고리 및 즐겨찾기 개수 업데이트
        function updateCategoryCounts() {
            // 전체 개수
            const totalCount = allPrompts.length;
            const allBtn = document.querySelector('.category-btn[data-category="all"]');
            if (allBtn) {
                allBtn.textContent = `전체 (${totalCount})`;
            }
            
            // 각 카테고리 개수
            categories.forEach(cat => {
                const count = allPrompts.filter(p => p.category === cat.name).length;
                const btn = document.querySelector(`.category-btn[data-category="${cat.name}"]`);
                if (btn) {
                    btn.textContent = `${cat.emoji} ${cat.name} (${count})`;
                }
            });
            
            // T-101: 미분류 개수
            const uncategorizedBtn = document.querySelector(`.category-btn[data-category="${UNCATEGORIZED}"]`);
            if (uncategorizedBtn) {
                const uncategorizedCount = allPrompts.filter(p => p.category === UNCATEGORIZED).length;
                uncategorizedBtn.textContent = `📥 ${UNCATEGORIZED} (${uncategorizedCount})`;
            }

            // 즐겨찾기 개수
            const favoritesBtn = document.getElementById('favorites-btn');
            if (favoritesBtn) {
                // ★ T-118: Set 크기가 아니라 **실제 존재하는 프롬프트와의 교집합**이다.
                //   삭제된 프롬프트의 id 가 favoriteIds 에 남아 있을 수 있는데,
                //   size 를 쓰면 그 유령까지 세어 사이드바 숫자가 부풀었다.
                //   이 한 줄이 "남은 id 는 무해하다" 를 성립시키고,
                //   그 덕에 삭제 경로에서 즐겨찾기 저장을 필수에서 뺄 수 있다.
                const favCount = allPrompts.filter(function (p) {
                    return favoriteIds.has(p.id);
                }).length;
                favoritesBtn.textContent = `⭐ 즐겨찾기 (${favCount})`;
            }
        }

        // 카테고리 <select> 를 채우는 공용 함수
        //
        // ★ value 는 id 다 (T-113). 이름은 editCategory 가 바꾸는 가변 값이라 키가 될 수 없다.
        // ★ 미분류는 categories 배열 밖의 상수라 id 가 없다. value="" 를 미분류로 쓴다.
        // ★ 이전 선택은 살린다 — 같은 작업을 이어 할 때 매번 다시 고르지 않게.
        //
        // T-104(일괄 붙여넣기)와 T-105(일괄 분류)가 같은 드롭다운을 쓴다.
        // 각자 만들면 미분류 표현이 언젠가 어긋난다.
        function renderCategoryOptionsInto(select) {
            if (!select) return;

            const previous = select.value;

            let html = '<option value="">' + escapeHtml(UNCATEGORIZED) + '</option>';
            categories.forEach(function (cat) {
                html += '<option value="' + escapeHtml(cat.id) + '">' +
                        escapeHtml(cat.emoji) + ' ' + escapeHtml(cat.name) + '</option>';
            });
            select.innerHTML = html;

            select.value = previous;
            if (select.value !== previous) select.value = '';
        }

        // 카테고리 드롭다운 렌더링 (프롬프트 추가 폼)
        function renderCategoryDropdown() {
            const select = document.getElementById('prompt-category');
            
            // T-101: 빈 값 = 미분류. 나중에 정리할 수 있도록 선택을 강제하지 않는다.
            let html = '<option value="">선택 안 함 (미분류)</option>';
            categories.forEach(cat => {
                html += `<option value="${escapeHtml(cat.name)}">${escapeHtml(cat.emoji)} ${escapeHtml(cat.name)}</option>`;
            });
            
            select.innerHTML = html;
        }

        // ========================================
        // 카테고리 관리 기능
        // ========================================

        function setupCategoryManagement() {
            const manageCatBtn = document.getElementById('manage-categories-btn');
            const catModal = document.getElementById('category-modal-overlay');
            const closeCatBtn = document.getElementById('close-category-modal');
            const addCatBtn = document.getElementById('add-category-btn');

            // 모달 열기
            manageCatBtn.addEventListener('click', function() {
                catModal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
                renderCategoryManageList();
            });

            // 모달 닫기
            closeCatBtn.addEventListener('click', closeCategoryModal);
            catModal.addEventListener('click', function(e) {
                if (e.target === catModal) {
                    closeCategoryModal();
                }
            });

            // 카테고리 추가
            addCatBtn.addEventListener('click', addNewCategory);

            // 엔터키로 추가
            document.getElementById('new-category-name').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    addNewCategory();
                }
            });
        }

        function closeCategoryModal() {
            const catModal = document.getElementById('category-modal-overlay');
            catModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            
            // 입력 필드 초기화
            document.getElementById('new-category-emoji').value = '';
            document.getElementById('new-category-name').value = '';
        }

        async function addNewCategory() {
            const emoji = document.getElementById('new-category-emoji').value.trim();
            const name = document.getElementById('new-category-name').value.trim();

            // 유효성 검사
            if (!name) {
                alert('카테고리 이름을 입력해주세요.');
                return;
            }

            // 중복 검사
            const exists = categories.some(cat => cat.name === name);
            if (exists) {
                alert('이미 존재하는 카테고리입니다.');
                return;
            }

            // 카테고리 추가
            const newCategory = {
                id: newId(),   // T-113: 인덱스가 아니라 id 로 식별한다
                emoji: emoji || '📁',
                name: name
            };

            // T-009c-1: 실패 시 되돌릴 스냅샷 (이 함수는 categories 만 바꾼다)
            const snapshotCategories = [...categories];

            categories.push(newCategory);

            if (await PromptStorage.saveCategories(categories) !== true) {
                categories = snapshotCategories;
                showToast('저장 실패 — 변경을 되돌렸습니다 ❌');
                return;
            }

            // UI 업데이트
            renderCategoryList();
            renderCategoryDropdown();
            renderCategoryManageList();

            // 입력 필드 초기화
            document.getElementById('new-category-emoji').value = '';
            document.getElementById('new-category-name').value = '';

            showToast(`카테고리 "${name}" 추가 완료! ✅`);
            console.log('카테고리 추가:', newCategory);
        }

        function renderCategoryManageList() {
            const container = document.getElementById('category-list-manage');
            
            let html = '';
            categories.forEach(cat => {
                html += `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background-color: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border-color);">
                        <span style="font-size: 14px; font-weight: 500;">${escapeHtml(cat.emoji)} ${escapeHtml(cat.name)}</span>
                        <div style="display: flex; gap: 8px;">
                            <button data-action="edit" data-cat-id="${escapeHtml(cat.id)}" class="btn-submit" style="padding: 6px 12px; font-size: 12px; background-color: var(--bg-hover); color: var(--text-primary); border: 1px solid var(--border-color);">수정</button>
                            <button data-action="delete" data-cat-id="${escapeHtml(cat.id)}" class="btn-cancel" style="padding: 6px 12px; font-size: 12px;">삭제</button>
                        </div>
                    </div>
                `;
            });

            container.innerHTML = html;
        }

        // T-009c-2: 위임 리스너에서 호출 — Promise 누출 방지 try/catch
        // T-113: 배열 인덱스가 아니라 id 로 찾는다 (검수 F3).
        async function deleteCategory(categoryId) {
            try {
                const category = categories.find(cat => cat.id === categoryId);
                if (!category) {
                    showToast('카테고리를 찾을 수 없습니다 ❌');
                    return;
                }

                // 프롬프트 개수 확인
                const promptCount = allPrompts.filter(p => p.category === category.name).length;

                // 1차 확인
                const firstConfirm = confirm(
                    `⚠️ "${category.name}" 카테고리를 삭제하시겠습니까?\n\n` +
                    `• 이 카테고리의 프롬프트: ${promptCount}개\n` +
                    `• 모든 프롬프트는 "${UNCATEGORIZED}"로 이동됩니다\n\n` +
                    `정말 삭제하시겠습니까?`
                );

                if (!firstConfirm) {
                    return;
                }

                // 2차 확인 (이중 안전장치)
                const secondConfirm = confirm(
                    `🔴 최종 확인\n\n` +
                    `"${category.name}" 카테고리를 삭제하면 복구할 수 없습니다.\n\n` +
                    `계속하시겠습니까?`
                );

                if (!secondConfirm) {
                    return;
                }

                // 실패 시 되돌릴 스냅샷
                // ★ 프롬프트는 객체를 제자리에서 바꾸므로 배열 복사로는 못 되돌린다.
                //   바뀐 프롬프트와 원래 카테고리 이름을 따로 기록한다.
                const snapshotCategories = [...categories];
                const oldCategoryName = category.name;
                const changedPrompts = [];

                // 해당 카테고리의 프롬프트를 미분류로 변경
                //
                // ★ T-128: 전에는 '기타' 문자열이 여기 박혀 있었다. 두 가지로 깨졌다.
                //   1) "기타"를 개명하면 프롬프트가 **없는 카테고리**를 가리켰다
                //   2) "기타" 자신을 삭제하면 자기 자신으로 옮긴 뒤 그 카테고리를
                //      지워, 소속 프롬프트가 통째로 고아가 됐다
                //
                // ★ 미분류가 맞는 이유 — decisions §10 이 세운 정의를 그대로 따른다.
                //   "기타 = 골라서 넣은 것, 미분류 = 아직 안 고른 것".
                //   카테고리 삭제로 옮겨진 프롬프트는 사용자가 기타를 고른 적이 없다.
                //   T-105(일괄 분류)가 생긴 뒤로 미분류는 "잃어버리는 곳"이 아니라
                //   **다시 분류할 대기열**이다. 옛 판단(§T-104f 주석)은 그 수단이
                //   없던 시점의 것이라 뒤집는다.
                //
                // ★ 이미 저장된 '기타' 소속은 건드리지 않는다. 사용자가 직접 고른
                //   것일 수 있다. 이 변경은 앞으로의 삭제에만 적용된다.
                allPrompts.forEach(p => {
                    if (p.category === oldCategoryName) {
                        // T-117: 소속이 실제로 바뀌므로 수정으로 본다.
                        //   되돌릴 때를 대비해 이전 수정 시각도 기록한다.
                        changedPrompts.push({
                            prompt: p,
                            previousCategory: oldCategoryName,
                            previousUpdatedAt: p.updatedAt
                        });
                        p.category = UNCATEGORIZED;
                        touchPrompt(p);
                    }
                });

                // 카테고리 삭제
                // ★ confirm 두 번을 지나온 뒤이므로 위치를 다시 찾는다.
                //   렌더 시점 인덱스를 들고 있었다면 그 사이 배열이 바뀌었을 때
                //   엉뚱한 카테고리가 지워진다.
                const deleteIndex = categories.findIndex(cat => cat.id === categoryId);
                if (deleteIndex === -1) {
                    changedPrompts.forEach(restoreMovedPrompt);
                    showToast('카테고리를 찾을 수 없습니다 ❌');
                    return;
                }
                categories.splice(deleteIndex, 1);

                // 저장 — 카테고리와 프롬프트 둘 다 바뀌었다
                const okCategories = await PromptStorage.saveCategories(categories);
                const okPrompts = okCategories === true
                    ? await PromptStorage.savePrompts(allPrompts)
                    : false;

                if (okCategories !== true || okPrompts !== true) {
                    categories = snapshotCategories;
                    changedPrompts.forEach(restoreMovedPrompt);

                    // 카테고리만 저장된 상태면 되돌린 값으로 다시 써 둔다 (최선 노력)
                    if (okCategories === true) {
                        await PromptStorage.saveCategories(categories);
                    }

                    renderCategoryList();
                    renderCategoryDropdown();
                    renderCategoryManageList();
                    applyFilters();
                    showToast('저장 실패 — 변경을 되돌렸습니다 ❌');
                    return;
                }

                // F4: 방금 지운 카테고리를 보고 있었다면 필터가 없는 이름을
                //     붙들어 목록이 빈 화면이 됐다. 옮겨간 곳으로 따라간다.
                //
                // ★ 옮긴 것이 있으면 미분류로 — 사용자가 방금 보던 프롬프트가
                //   그대로 화면에 남고, 그 자리가 곧 다시 분류할 대기열이다.
                //   옮긴 것이 없으면(빈 카테고리 삭제) 미분류는 남의 목록이라
                //   전체로 보낸다.
                // ★ 다른 카테고리를 보고 있었다면 그대로 둔다.
                if (currentFilter === oldCategoryName) {
                    currentFilter = changedPrompts.length > 0 ? UNCATEGORIZED : 'all';
                }

                // UI 업데이트 (renderCategoryList 안에서 active 표시가 맞춰진다)
                renderCategoryList();
                renderCategoryDropdown();
                renderCategoryManageList();
                applyFilters(); // 현재 필터 다시 적용

                // 어디로 갔는지 밝힌다 — 조용히 옮기지 않는다
                showToast(changedPrompts.length > 0
                    ? `카테고리 "${oldCategoryName}" 삭제 완료! ✅ 프롬프트 ${changedPrompts.length}개를 ${UNCATEGORIZED}로 옮겼습니다`
                    : `카테고리 "${oldCategoryName}" 삭제 완료! ✅`);
                console.log('카테고리 삭제:', oldCategoryName,
                            `→ ${UNCATEGORIZED} ${changedPrompts.length}개`);
            } catch (error) {
                console.error('[카테고리] 삭제 실패:', error);
                showToast('카테고리 삭제 중 오류가 발생했습니다 ❌');
            }
        }

        // 카테고리 삭제로 옮겨졌던 프롬프트를 되돌린다.
        // ★ updatedAt 이 undefined 였다면 키를 지워야 "수정된 적 없음" 으로 돌아간다.
        function restoreMovedPrompt(item) {
            item.prompt.category = item.previousCategory;
            if (item.previousUpdatedAt === undefined) {
                delete item.prompt.updatedAt;
            } else {
                item.prompt.updatedAt = item.previousUpdatedAt;
            }
        }

        // 카테고리 수정 함수
        // T-009c-2: 위임 리스너에서 호출 — Promise 누출 방지 try/catch
        // T-113: 배열 인덱스가 아니라 id 로 찾는다 (검수 F3).
        async function editCategory(categoryId) {
            try {
                const category = categories.find(cat => cat.id === categoryId);
                if (!category) {
                    showToast('카테고리를 찾을 수 없습니다 ❌');
                    return;
                }

                // 프롬프트 개수 확인
                const promptCount = allPrompts.filter(p => p.category === category.name).length;

                // 확인 메시지
                const shouldEdit = confirm(
                    `⚠️ "${category.name}" 카테고리를 수정하시겠습니까?\n\n` +
                    `• 이 카테고리의 프롬프트: ${promptCount}개\n` +
                    `• 모든 프롬프트의 카테고리가 함께 변경됩니다\n\n` +
                    `계속하시겠습니까?`
                );

                if (!shouldEdit) {
                    return;
                }

                // 새 이모지 입력
                const newEmoji = prompt('새 이모지를 입력하세요 (취소하면 기존 유지)', category.emoji);
                if (newEmoji === null) {
                    return; // 취소
                }

                // 새 이름 입력
                const newName = prompt('새 카테고리 이름을 입력하세요 (취소하면 기존 유지)', category.name);
                if (newName === null) {
                    return; // 취소
                }

                const trimmedName = newName.trim();
                if (!trimmedName) {
                    alert('카테고리 이름을 입력해주세요.');
                    return;
                }

                // 중복 검사 (자기 자신 제외)
                const exists = categories.some(cat => cat.id !== categoryId && cat.name === trimmedName);
                if (exists) {
                    alert('이미 존재하는 카테고리 이름입니다.');
                    return;
                }

                // 기존 이름 저장
                const oldName = category.name;

                // 실패 시 되돌릴 스냅샷
                // ★ 배열 얕은 복사로는 안 된다 — category 객체와 프롬프트 객체를
                //   제자리에서 바꾸므로, 바뀌는 값들을 따로 기록해 둔다.
                const snapshotCategory = { emoji: category.emoji, name: category.name };
                const changedPrompts = [];

                // 카테고리 수정
                category.emoji = newEmoji.trim() || category.emoji;
                category.name = trimmedName;

                // 모든 프롬프트의 카테고리 이름 변경
                allPrompts.forEach(p => {
                    if (p.category === oldName) {
                        changedPrompts.push(p);
                        p.category = trimmedName;
                    }
                });

                // 저장 — 카테고리와 프롬프트 둘 다 바뀌었다
                const okCategories = await PromptStorage.saveCategories(categories);
                const okPrompts = okCategories === true
                    ? await PromptStorage.savePrompts(allPrompts)
                    : false;

                if (okCategories !== true || okPrompts !== true) {
                    category.emoji = snapshotCategory.emoji;
                    category.name = snapshotCategory.name;
                    changedPrompts.forEach(p => { p.category = oldName; });

                    // 카테고리만 저장된 상태면 되돌린 값으로 다시 써 둔다 (최선 노력)
                    if (okCategories === true) {
                        await PromptStorage.saveCategories(categories);
                    }

                    renderCategoryList();
                    renderCategoryDropdown();
                    renderCategoryManageList();
                    applyFilters();
                    showToast('저장 실패 — 변경을 되돌렸습니다 ❌');
                    return;
                }

                // F4: 개명한 카테고리를 보고 있었다면 필터도 새 이름으로.
                //     프롬프트의 category 는 위에서 이미 새 이름으로 바뀌었으므로
                //     여기를 빼면 옛 이름과 일치하는 것이 하나도 없어 빈 화면이 된다.
                if (currentFilter === oldName) {
                    currentFilter = trimmedName;
                }

                // UI 업데이트 (renderCategoryList 안에서 active 표시가 맞춰진다)
                renderCategoryList();
                renderCategoryDropdown();
                renderCategoryManageList();
                applyFilters(); // 현재 필터 다시 적용

                showToast(`카테고리 "${oldName}" → "${trimmedName}" 수정 완료! ✅`);
                console.log('카테고리 수정:', oldName, '→', trimmedName);
            } catch (error) {
                console.error('[카테고리] 수정 실패:', error);
                showToast('카테고리 수정 중 오류가 발생했습니다 ❌');
            }
        }

        // 카테고리 검증 함수
        //
        // ★ T-104f: 폴백이 '기타' 가 아니라 미분류다.
        //   기타 = 사용자가 골라서 넣은 것. 미분류 = 아직 아무도 고르지 않은 것.
        //   파일에서 들어온 항목은 아무도 고르지 않았다. '기타'로 보내면
        //   T-105(일괄 분류) 정리 대상에서 빠져, 150개 이관의 핵심 구분이 무너진다.
        //
        //   없는 카테고리 이름(예: 파일에 "마케팅")도 마찬가지다.
        //   사용자가 고르긴 했지만 이 시스템에 없는 값이라 재분류가 필요하다.
        //
        // ※ T-128 정정 — deleteCategory 도 미분류로 보낸다.
        //   T-104f 시점에는 "이미 분류했던 것이라 미분류로 되돌리면 정보를
        //   잃는다"고 봤다. 그 판단은 미분류를 정리할 수단이 없던 때의 것이다.
        //   T-105(일괄 분류) 이후 미분류는 대기열이고, 무엇보다
        //   "기타로 이동"은 사용자가 고르지 않은 분류를 대신 고르는 일이었다.
        function validateCategory(category) {
            if (!category) return UNCATEGORIZED;

            // T-101: 미분류는 categories 배열에 없지만 유효한 값이다.
            if (category === UNCATEGORIZED) return UNCATEGORIZED;

            // 시스템에 존재하는 카테고리인지 확인
            const exists = categories.some(cat => cat.name === category);

            return exists ? category : UNCATEGORIZED;
        }
