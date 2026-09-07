        // 3.5: 데이터 초기화 함수
        function initializeData() {
            const stored = localStorage.getItem(STORAGE_KEY);
            
            if (!stored || JSON.parse(stored).length === 0) {
                // 저장된 데이터가 없으면 샘플 데이터 사용
                allPrompts = [...sampleData];
                saveToLocalStorage();
                console.log('샘플 데이터 로드 완료 ✅');
            } else {
                // 저장된 데이터가 있으면 불러오기
                allPrompts = JSON.parse(stored);
                console.log(`저장된 프롬프트 ${allPrompts.length}개 로드 완료 ✅`);
            }

            // 즐겨찾기 불러오기
            const storedFavorites = localStorage.getItem(FAVORITES_KEY);
            if (storedFavorites) {
                favoriteIds = new Set(JSON.parse(storedFavorites));
            }

            // 카테고리 불러오기 (없으면 기본값 사용)
            const storedCategories = localStorage.getItem(CATEGORIES_KEY);
            if (storedCategories) {
                categories = JSON.parse(storedCategories);
            } else {
                categories = [...defaultCategories];
                saveCategories();
            }
            console.log(`카테고리 ${categories.length}개 로드 완료 ✅`);
        }

        // 3.6: LocalStorage에서 데이터 불러오기 함수
        function loadFromLocalStorage() {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    allPrompts = JSON.parse(stored);
                    return true;
                }
                return false;
            } catch (error) {
                console.error('데이터 불러오기 실패:', error);
                return false;
            }
        }

        // 3.7: LocalStorage에 데이터 저장하기 함수
        function saveToLocalStorage() {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(allPrompts));
                localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favoriteIds]));
                console.log('데이터 저장 완료 ✅');
                return true;
            } catch (error) {
                console.error('데이터 저장 실패:', error);
                alert('데이터 저장에 실패했습니다. 저장 공간을 확인해주세요.');
                return false;
            }
        }

        // 카테고리 저장
        function saveCategories() {
            try {
                localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
                console.log('카테고리 저장 완료 ✅');
                return true;
            } catch (error) {
                console.error('카테고리 저장 실패:', error);
                return false;
            }
        }

        // ========================================
        // Phase 13: 데이터 내보내기/불러오기
        // ========================================

        function setupDataManagement() {
            // 내보내기 버튼
            const exportBtn = document.getElementById('export-btn');
            exportBtn.addEventListener('click', exportData);

            // 불러오기 버튼
            const importBtn = document.getElementById('import-btn');
            const importFile = document.getElementById('import-file');
            
            importBtn.addEventListener('click', () => importFile.click());
            importFile.addEventListener('change', importData);
        }

        // 데이터 내보내기 (JSON 다운로드)
        function exportData() {
            const data = {
                prompts: allPrompts,
                favorites: [...favoriteIds],
                exportDate: new Date().toISOString(),
                version: '1.0'
            };

            const jsonStr = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `prompts-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            showToast('데이터 내보내기 완료! 💾');
            console.log('데이터 내보내기 완료');
        }

        // 데이터 불러오기 (JSON 업로드)
        function importData(e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const data = JSON.parse(event.target.result);
                    
                    if (!data.prompts || !Array.isArray(data.prompts)) {
                        throw new Error('유효하지 않은 파일 형식입니다.');
                    }

                    // 병합 or 덮어쓰기 확인
                    const shouldMerge = confirm(
                        '기존 데이터와 병합하시겠습니까?\n\n' +
                        '확인: 병합 (기존 데이터 유지)\n' +
                        '취소: 덮어쓰기 (기존 데이터 삭제)'
                    );

                    if (shouldMerge) {
                        // 병합: 새 프롬프트만 추가 (ID 중복 방지)
                        const existingIds = new Set(allPrompts.map(p => p.id));
                        const newPrompts = data.prompts.filter(p => !existingIds.has(p.id));
                        allPrompts = [...allPrompts, ...newPrompts];
                    } else {
                        // 덮어쓰기
                        allPrompts = data.prompts;
                    }

                    // 즐겨찾기 복원
                    if (data.favorites) {
                        favoriteIds = new Set(data.favorites);
                    }

                    saveToLocalStorage();
                    currentFilter = 'all';
                    currentSearchQuery = '';
                    renderPromptList(allPrompts);
                    
                    showToast('데이터 불러오기 완료! ✅');
                    console.log(`${data.prompts.length}개 프롬프트 불러옴`);
                } catch (error) {
                    alert('파일을 읽는 중 오류가 발생했습니다.\n' + error.message);
                    console.error('Import error:', error);
                }
            };
            
            reader.readAsText(file);
            e.target.value = ''; // 파일 선택 초기화
        }
