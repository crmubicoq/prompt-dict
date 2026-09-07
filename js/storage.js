        // ========================================
        // 저장 계층 (T-008)
        //
        //   PromptStorage        앱이 쓰는 유일한 저장 인터페이스. 전부 async
        //   LocalStorageAdapter  로컬 구현체. P3에서 ApiAdapter 로 교체된다
        //
        //   객체 이름이 Storage 가 아닌 이유:
        //   Storage 는 브라우저 내장 인터페이스라 전역에서 섀도잉하면
        //   localStorage instanceof Storage 가 깨진다.
        //
        //   ※ T-008 시점에는 정의만 있고 호출부가 없다.
        //     호출부 교체는 T-009, 아래 기존 함수 제거는 T-010.
        // ========================================

        // ----------------------------------------
        // 읽기 반환 규약
        //   키 없음 (한 번도 저장 안 됨)  →  null    ("저장된 빈 배열"과 구분하기 위함)
        //   파싱 실패                     →  throw   (빈 배열로 덮지 않는다)
        //   정상                          →  파싱된 값
        //
        // 쓰기 반환 규약
        //   저장 성공 → true / 실패·차단 → false
        // ----------------------------------------

        const LocalStorageAdapter = {
            name: 'LocalStorageAdapter',

            // --- 내부: JSON 읽기 ---
            _readJson(key) {
                const raw = localStorage.getItem(key);
                if (raw === null) return null;

                try {
                    return JSON.parse(raw);
                } catch (error) {
                    // 조용히 넘어가지 않는다. 원본을 보존하고 예외를 올린다.
                    PromptStorage._recordReadFailure(key, raw, error);
                    throw new Error('저장된 데이터(' + key + ')가 손상되어 읽을 수 없습니다.');
                }
            },

            // --- 내부: 평문 읽기 (_theme 등) ---
            _readText(key) {
                return localStorage.getItem(key);
            },

            // --- 내부: 쓰기 ---
            _write(key, value) {
                try {
                    localStorage.setItem(key, value);
                    return true;
                } catch (error) {
                    console.error('[PromptStorage] 저장 실패 (' + key + '):', error);
                    alert('데이터 저장에 실패했습니다. 저장 공간을 확인해주세요.');
                    return false;
                }
            },

            // --- 내부: 삭제 ---
            _remove(key) {
                localStorage.removeItem(key);
            },

            // --- 내부: 이 어댑터가 다루는 전체 키 ---
            _allKeys() {
                return [STORAGE_KEY, FAVORITES_KEY, CATEGORIES_KEY, SEARCH_HISTORY_KEY, THEME_KEY];
            },

            // --- 프롬프트 ---
            async getPrompts() {
                return this._readJson(STORAGE_KEY);
            },
            async savePrompts(list) {
                return this._write(STORAGE_KEY, JSON.stringify(list));
            },

            // --- 즐겨찾기 (Set / 배열 모두 허용) ---
            async getFavorites() {
                return this._readJson(FAVORITES_KEY);
            },
            async saveFavorites(set) {
                return this._write(FAVORITES_KEY, JSON.stringify(Array.from(set)));
            },

            // --- 카테고리 ---
            async getCategories() {
                return this._readJson(CATEGORIES_KEY);
            },
            async saveCategories(list) {
                return this._write(CATEGORIES_KEY, JSON.stringify(list));
            },

            // --- 검색 기록 ---
            async getSearchHistory() {
                return this._readJson(SEARCH_HISTORY_KEY);
            },
            async saveSearchHistory(list) {
                return this._write(SEARCH_HISTORY_KEY, JSON.stringify(list));
            },

            // --- 평문 설정 (_theme 등) ---
            async getSetting(key) {
                return this._readText(key);
            },
            async setSetting(key, value) {
                return this._write(key, String(value));
            },

            // --- 전체 삭제 ---
            async removeAll() {
                this._allKeys().forEach(key => this._remove(key));
                return true;
            }
        };

        const PromptStorage = {
            adapter: LocalStorageAdapter,

            // 읽기 실패 상태. 한 번이라도 파싱에 실패하면 true 로 고정된다.
            isReadFailed: false,

            // 파싱에 실패한 원본 문자열 보관소 (키 → 원본). 수동 복구용.
            rawBackup: {},

            // --- 어댑터가 파싱 실패를 보고하는 지점 ---
            _recordReadFailure(key, raw, error) {
                this.isReadFailed = true;
                this.rawBackup[key] = raw;

                console.error('[PromptStorage] 저장 데이터 파싱 실패 (' + key + '):', error);
                console.error('[PromptStorage] 원본 ' + raw.length + '자를 PromptStorage.rawBackup 에 보관했습니다. 키: ' + key);
                console.error('[PromptStorage] 이후 모든 저장이 차단됩니다. 원본을 확보한 뒤 PromptStorage.removeAll() 로 초기화하세요.');

                alert(
                    '저장된 데이터를 읽지 못했습니다.\n' +
                    '손상된 키: ' + key + '\n\n' +
                    '데이터를 덮어쓰지 않기 위해 저장 기능을 잠급니다.\n' +
                    '원본은 개발자 도구 콘솔의 PromptStorage.rawBackup 에서 확인할 수 있습니다.'
                );
            },

            // --- 쓰기 가드: 읽기에 실패한 상태면 저장을 막는다 ---
            _blockedByReadFailure(label) {
                if (!this.isReadFailed) return false;

                console.warn('[PromptStorage] 읽기 실패 상태이므로 ' + label + ' 저장을 건너뜁니다.');
                console.warn('[PromptStorage] 손상된 원본을 덮어쓰지 않기 위한 의도된 차단입니다.');
                return true;
            },

            // --- 프롬프트 ---
            async getPrompts() {
                return this.adapter.getPrompts();
            },
            async savePrompts(list) {
                if (this._blockedByReadFailure('프롬프트')) return false;
                return this.adapter.savePrompts(list);
            },

            // --- 즐겨찾기 ---
            async getFavorites() {
                return this.adapter.getFavorites();
            },
            async saveFavorites(set) {
                if (this._blockedByReadFailure('즐겨찾기')) return false;
                return this.adapter.saveFavorites(set);
            },

            // --- 카테고리 ---
            async getCategories() {
                return this.adapter.getCategories();
            },
            async saveCategories(list) {
                if (this._blockedByReadFailure('카테고리')) return false;
                return this.adapter.saveCategories(list);
            },

            // --- 검색 기록 ---
            async getSearchHistory() {
                return this.adapter.getSearchHistory();
            },
            async saveSearchHistory(list) {
                if (this._blockedByReadFailure('검색 기록')) return false;
                return this.adapter.saveSearchHistory(list);
            },

            // --- 평문 설정 (_theme 등) ---
            async getSetting(key) {
                return this.adapter.getSetting(key);
            },
            async setSetting(key, value) {
                if (this._blockedByReadFailure('설정(' + key + ')')) return false;
                return this.adapter.setSetting(key, value);
            },

            // --- 전체 삭제 (T-115 왕복 테스트 / 손상 복구용) ---
            // 손상 상태에서 벗어나는 유일한 경로이므로 쓰기 가드를 적용하지 않는다.
            async removeAll() {
                const result = await this.adapter.removeAll();
                this.isReadFailed = false;
                this.rawBackup = {};
                console.warn('[PromptStorage] 저장된 전체 데이터를 삭제했습니다.');
                return result;
            }
        };

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
