        // ========================================
        // L. 일괄 삭제 기능
        // ========================================

        // 선택 모드 토글
        function toggleSelectionMode() {
            isSelectionMode = !isSelectionMode;
            selectedPromptIds.clear();

            const toggleBtn = document.getElementById('toggle-selection-mode-btn');
            const bulkActionsBar = document.getElementById('bulk-actions-bar');

            if (isSelectionMode) {
                // 카테고리는 그 사이 바뀌었을 수 있으니 켤 때마다 다시 그린다
                renderAssignCategoryDropdown();
                toggleBtn.textContent = '✓ 선택 모드 (켜짐)';
                toggleBtn.style.backgroundColor = 'var(--accent-primary)';
                bulkActionsBar.style.display = 'flex';
            } else {
                toggleBtn.textContent = '✓ 선택 모드';
                toggleBtn.style.backgroundColor = '#6c757d';
                bulkActionsBar.style.display = 'none';
            }

            // 카드 다시 렌더링
            applyFilters();
            updateSelectedCount();
        }

        // 선택된 개수 업데이트
        function updateSelectedCount() {
            const countSpan = document.getElementById('selected-count');
            if (countSpan) {
                countSpan.textContent = `${selectedPromptIds.size}개 선택됨`;
            }
        }

        // 전체 선택/해제
        function toggleSelectAll() {
            const currentPrompts = document.querySelectorAll('.prompt-card');
            
            if (selectedPromptIds.size === currentPrompts.length) {
                // 전체 해제
                selectedPromptIds.clear();
            } else {
                // 전체 선택
                currentPrompts.forEach(card => {
                    const id = card.dataset.id; // T-116: UUID 문자열
                    selectedPromptIds.add(id);
                });
            }

            // UI 업데이트
            updateCheckboxes();
            updateSelectedCount();
        }

        // 체크박스 상태 업데이트
        function updateCheckboxes() {
            const cards = document.querySelectorAll('.prompt-card');
            cards.forEach(card => {
                const id = card.dataset.id; // T-116: UUID 문자열
                const checkbox = card.querySelector('.prompt-checkbox');
                
                if (checkbox) {
                    checkbox.checked = selectedPromptIds.has(id);
                    
                    if (selectedPromptIds.has(id)) {
                        card.classList.add('selected');
                    } else {
                        card.classList.remove('selected');
                    }
                }
            });
        }

        // 프롬프트 선택/해제
        function togglePromptSelection(id, event) {
            if (event) {
                event.stopPropagation();
            }

            if (selectedPromptIds.has(id)) {
                selectedPromptIds.delete(id);
            } else {
                selectedPromptIds.add(id);
            }

            updateCheckboxes();
            updateSelectedCount();
        }

        // 선택된 프롬프트 삭제
        async function deleteSelectedPrompts() {
            if (selectedPromptIds.size === 0) {
                alert('삭제할 프롬프트를 선택해주세요.');
                return;
            }

            // 1차 확인
            const firstConfirm = confirm(
                `⚠️ ${selectedPromptIds.size}개의 프롬프트를 삭제하시겠습니까?\n\n` +
                `이 작업은 취소할 수 없습니다.`
            );

            if (!firstConfirm) {
                return;
            }

            // 2차 확인
            const secondConfirm = confirm(
                `🔴 최종 확인\n\n` +
                `정말 ${selectedPromptIds.size}개의 프롬프트를 삭제하시겠습니까?\n\n` +
                `삭제하면 복구할 수 없습니다!`
            );

            if (!secondConfirm) {
                return;
            }

            // T-009c-1: 실패 시 되돌릴 스냅샷
            // 배열 요소를 제거만 하므로 얕은 복사로 충분하다 (객체 내부는 안 바꿈)
            const snapshot = {
                prompts: [...allPrompts],
                favorites: new Set(favoriteIds),
                selected: new Set(selectedPromptIds)
            };

            // 삭제 처리
            selectedPromptIds.forEach(id => {
                const index = allPrompts.findIndex(p => p.id === id);
                if (index !== -1) {
                    allPrompts.splice(index, 1);
                }

                // 즐겨찾기에서도 제거
                if (favoriteIds.has(id)) {
                    favoriteIds.delete(id);
                }
            });

            const deletedCount = selectedPromptIds.size;
            selectedPromptIds.clear();

            // 저장 — 프롬프트와 즐겨찾기 둘 다 바뀌었다
            const okPrompts = await PromptStorage.savePrompts(allPrompts);
            const okFavorites = okPrompts === true
                ? await PromptStorage.saveFavorites(favoriteIds)
                : false;

            if (okPrompts !== true || okFavorites !== true) {
                allPrompts = snapshot.prompts;
                favoriteIds = snapshot.favorites;
                selectedPromptIds = snapshot.selected;

                // 프롬프트만 저장된 상태면 되돌린 값으로 다시 써 둔다 (최선 노력)
                if (okPrompts === true) {
                    await PromptStorage.savePrompts(allPrompts);
                }

                applyFilters();
                updateSelectedCount();
                showToast('저장 실패 — 변경을 되돌렸습니다 ❌');
                return;
            }

            // UI 업데이트
            applyFilters();
            updateSelectedCount();

            showToast(`${deletedCount}개의 프롬프트 삭제 완료! 🗑️`);
            console.log(`${deletedCount}개 프롬프트 일괄 삭제 완료`);
        }

        // 선택 모드 취소
        function cancelSelectionMode() {
            toggleSelectionMode();
        }

        // 일괄 삭제 이벤트 설정
        function setupBulkDelete() {
            const toggleBtn = document.getElementById('toggle-selection-mode-btn');
            const selectAllBtn = document.getElementById('select-all-btn');
            const deleteBtn = document.getElementById('delete-selected-btn');
            const cancelBtn = document.getElementById('cancel-selection-btn');

            if (toggleBtn) toggleBtn.addEventListener('click', toggleSelectionMode);
            if (selectAllBtn) selectAllBtn.addEventListener('click', toggleSelectAll);
            if (deleteBtn) deleteBtn.addEventListener('click', deleteSelectedPrompts);
            if (cancelBtn) cancelBtn.addEventListener('click', cancelSelectionMode);

            // T-105: 일괄 분류
            const assignBtn = document.getElementById('assign-category-btn');
            if (assignBtn) {
                // async 핸들러 — assignCategoryToSelected 내부가 try/catch 로 감싸
                // 거부된 Promise 가 새지 않게 한다 (T-009c-2 관례)
                assignBtn.addEventListener('click', function () { assignCategoryToSelected(); });
            }
        }

        // ========================================
        // T-105: 미분류 일괄 분류
        // ========================================

        // 분류용 카테고리 드롭다운
        //
        // ★ 미분류(value="")도 넣는다. 잘못 지정했을 때 되돌리는 손잡이가 된다.
        function renderAssignCategoryDropdown() {
            renderCategoryOptionsInto(document.getElementById('assign-category-select'));
        }

        // 드롭다운 선택 → 카테고리 이름
        function selectedAssignCategoryName() {
            const select = document.getElementById('assign-category-select');
            const id = select ? select.value : '';
            if (!id) return UNCATEGORIZED;

            const found = categories.filter(function (cat) { return cat.id === id; })[0];
            // 고른 카테고리가 그 사이 삭제됐다면 미분류로 — 없는 이름을 심지 않는다
            return found ? found.name : UNCATEGORIZED;
        }

        // 선택한 프롬프트를 한 카테고리로 분류한다.
        //
        // ★ savePrompts 1회 + 전량 롤백. 부분 성공 불허 (devlog §4.8).
        // ★ 즐겨찾기는 바뀌지 않으므로 saveFavorites 는 부르지 않는다.
        // ★ 확인은 1번이다. 재분류가 가능하니 과해 보이지만, 이 동작은
        //   '미분류' 표시 자체를 지운다 — 잘못 지정하면 어떤 것이 원래
        //   미분류였는지 복원할 수 없다. 그래서 0번은 아니고,
        //   D1 내내 반복되는 동작이라 2번도 아니다.
        async function assignCategoryToSelected() {
            if (selectedPromptIds.size === 0) {
                showToast('분류할 프롬프트를 선택해 주세요');
                return;
            }

            const categoryName = selectedAssignCategoryName();
            const count = selectedPromptIds.size;

            const shouldAssign = confirm(
                `${count}개의 프롬프트를 "${categoryName}" 로 분류합니다.\n\n` +
                `계속하시겠습니까?`
            );
            if (!shouldAssign) return;

            // ★ 프롬프트 객체를 제자리에서 바꾸므로 [...allPrompts] 로는 되돌릴 수 없다.
            //   바뀐 객체와 이전 카테고리 이름을 따로 기록한다
            //   (editCategory·deleteCategory 와 같은 방식, devlog §4.8).
            const changed = [];

            try {
                selectedPromptIds.forEach(function (id) {
                    const prompt = allPrompts.filter(function (p) { return p.id === id; })[0];
                    if (!prompt) return;
                    if (prompt.category === categoryName) return;   // 바뀔 것이 없으면 건드리지 않는다

                    changed.push({ prompt: prompt, previous: prompt.category });
                    prompt.category = categoryName;
                });

                if (changed.length === 0) {
                    showToast(`이미 모두 "${categoryName}" 입니다`);
                    return;
                }

                if (await PromptStorage.savePrompts(allPrompts) !== true) {
                    changed.forEach(function (item) { item.prompt.category = item.previous; });
                    applyFilters();
                    showToast('저장 실패 — 분류를 되돌렸습니다 ❌');
                    return;
                }

                // --- 성공 ---
                // 선택 모드는 켜둔 채 선택만 비운다 — 이어서 다음 묶음을 고른다
                selectedPromptIds.clear();
                applyFilters();
                updateSelectedCount();

                const remaining = allPrompts.filter(function (p) {
                    return p.category === UNCATEGORIZED;
                }).length;

                showToast(
                    `${changed.length}개를 "${categoryName}" 로 분류했습니다 ✅ · 미분류 ${remaining}개 남음`
                );
                console.log(`[일괄 분류] ${changed.length}개 → ${categoryName} (미분류 ${remaining}개 남음)`);
            } catch (error) {
                changed.forEach(function (item) { item.prompt.category = item.previous; });
                applyFilters();
                console.error('[일괄 분류] 실패:', error);
                showToast('분류 중 오류가 발생했습니다 — 되돌렸습니다 ❌');
            }
        }

        // ★ A안: 보이는 대상이 바뀌면 선택을 비운다.
        //
        // 필터나 검색어를 바꾸면 선택한 항목이 화면 밖으로 나가는데, 선택은 남는다.
        // 그 상태에서 일괄 분류·삭제를 하면 **보이지 않는 것까지 처리된다.**
        // 특히 삭제는 되돌릴 수 없다.
        //
        // ★ 정렬은 비우지 않는다. 순서만 바뀔 뿐 대상 집합이 그대로라
        //   화면 밖으로 나가는 항목이 없다. 비우면 안전 이득 없이 마찰만 는다.
        //   → 비움 조건을 currentFilter + currentSearchQuery 로만 잡으면
        //     정렬은 애초에 걸리지 않는다.
        //
        // ★ 조용히 비우지 않는다. 다만 선택이 실제로 있었을 때만 알린다 —
        //   알릴 것이 없으면 뜨지 않으므로 토스트가 쌓이지 않는다.
        //
        // applyFilters 맨 앞에서 부른다. 검색·카테고리·즐겨찾기·태그 클릭·
        // 검색기록 적용이 전부 applyFilters 를 거치므로 진입점마다 손댈 필요가 없고,
        // 저장 후 재렌더처럼 대상이 그대로인 호출에서는 키가 같아 아무 일도 하지 않는다.
        function syncSelectionWithView() {
            const viewKey = currentFilter + ' ' + currentSearchQuery;
            if (viewKey === lastViewKey) return;

            lastViewKey = viewKey;

            if (selectedPromptIds.size === 0) return;

            const cleared = selectedPromptIds.size;
            selectedPromptIds.clear();
            updateSelectedCount();
            showToast(`화면이 바뀌어 선택 ${cleared}개를 해제했습니다`);
        }
