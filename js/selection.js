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
        }
