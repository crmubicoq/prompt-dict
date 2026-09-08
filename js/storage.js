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
        //   파싱 실패 / 타입 불일치      →  throw   (빈 배열로 덮지 않는다)
        //   정상                          →  파싱된 값
        //
        // 쓰기 반환 규약
        //   저장 성공 → true / 실패·차단 → false
        // ----------------------------------------

        const LocalStorageAdapter = {
            name: 'LocalStorageAdapter',

            // --- 내부: JSON 읽기 ---
            // expectArray=true 면 파싱 결과가 배열인지까지 검증한다.
            //
            // ★ 타입 검증이 필요한 이유
            //   JSON.parse('null') / '123' / '"abc"' / '{}' 는 예외를 던지지 않는다.
            //   특히 저장소에 문자열 "null" 이 들어 있으면 파싱 결과가 null 이라
            //   "키 없음"과 구분되지 않는다. 그대로 두면 호출부가 미저장으로 오인해
            //   기본값을 만들어 저장하고, 그 순간 원본이 사라진다.
            //   기존 코드는 이 경우 예외가 나서 초기화가 중단되고 원본이 보존됐다.
            //   어댑터가 그 보호를 뚫지 않도록 배열이 아니면 손상으로 취급한다.
            _readJson(key, expectArray) {
                const raw = localStorage.getItem(key);
                if (raw === null) return null;          // 키 없음 — 실패가 아니다

                let value;
                try {
                    value = JSON.parse(raw);
                } catch (error) {
                    // 조용히 넘어가지 않는다. 원본을 보존하고 예외를 올린다.
                    PromptStorage._recordReadFailure(key, raw, error);
                    throw new Error('저장된 데이터(' + key + ')가 손상되어 읽을 수 없습니다.');
                }

                if (expectArray && !Array.isArray(value)) {
                    const kind = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
                    const error = new TypeError('배열이어야 하는데 ' + kind + ' 이 저장되어 있습니다.');
                    PromptStorage._recordReadFailure(key, raw, error);
                    throw new Error('저장된 데이터(' + key + ')가 배열이 아닙니다.');
                }

                return value;
            },

            // --- 내부: 평문 읽기 (_theme 등) ---
            _readText(key) {
                return localStorage.getItem(key);
            },

            // --- 내부: 쓰기 (문자열) ---
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

            // --- 내부: 쓰기 (직렬화 포함) ---
            // produce() 는 저장할 값을 만들어 주는 함수. 변환·직렬화를 전부
            // try 안에서 수행해야 순환 참조 같은 실패도 예외가 아니라 false 가 된다.
            // (공개 규약: 성공 true / 실패·차단 false — Promise rejection 아님)
            _writeJson(key, produce) {
                let json;
                try {
                    json = JSON.stringify(produce());
                } catch (error) {
                    console.error('[PromptStorage] 직렬화 실패 (' + key + '):', error);
                    alert('데이터를 저장할 수 없습니다.\n저장할 값을 JSON으로 변환하지 못했습니다.');
                    return false;
                }

                // JSON.stringify(undefined) 는 예외 없이 undefined 를 돌려준다.
                // 그대로 저장하면 "undefined" 문자열이 남아 다음 읽기가 깨진다.
                if (json === undefined) {
                    console.error('[PromptStorage] 직렬화 결과가 undefined (' + key + '). 저장하지 않습니다.');
                    return false;
                }

                return this._write(key, json);
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
                return this._readJson(STORAGE_KEY, true);
            },
            async savePrompts(list) {
                return this._writeJson(STORAGE_KEY, () => list);
            },

            // --- 즐겨찾기 (Set / 배열 모두 허용) ---
            async getFavorites() {
                return this._readJson(FAVORITES_KEY, true);
            },
            async saveFavorites(set) {
                // Array.from 도 실패할 수 있으므로 직렬화와 같은 try 안에서 실행한다.
                return this._writeJson(FAVORITES_KEY, () => Array.from(set));
            },

            // --- 카테고리 ---
            async getCategories() {
                return this._readJson(CATEGORIES_KEY, true);
            },
            async saveCategories(list) {
                return this._writeJson(CATEGORIES_KEY, () => list);
            },

            // --- 검색 기록 ---
            async getSearchHistory() {
                return this._readJson(SEARCH_HISTORY_KEY, true);
            },
            async saveSearchHistory(list) {
                return this._writeJson(SEARCH_HISTORY_KEY, () => list);
            },

            // --- 평문 설정 (_theme 등) ---
            async getSetting(key) {
                return this._readText(key);
            },
            async setSetting(key, value) {
                // String() 도 던질 수 있다 (Symbol, toString 이 throw 하는 객체 등)
                let text;
                try {
                    text = String(value);
                } catch (error) {
                    console.error('[PromptStorage] 문자열 변환 실패 (' + key + '):', error);
                    return false;
                }
                return this._write(key, text);
            },

            // --- 전체 삭제 ---
            async removeAll() {
                try {
                    this._allKeys().forEach(key => this._remove(key));
                    return true;
                } catch (error) {
                    console.error('[PromptStorage] 전체 삭제 실패:', error);
                    return false;
                }
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

                // 어댑터가 실패했으면 가드를 풀지 않는다.
                // 지우지도 못한 채 쓰기 차단만 해제하면 손상된 원본을 덮어쓰게 된다.
                if (result !== true) {
                    console.error('[PromptStorage] 전체 삭제에 실패했습니다. 읽기 실패 가드와 rawBackup 을 유지합니다.');
                    return false;
                }

                this.isReadFailed = false;
                this.rawBackup = {};
                console.warn('[PromptStorage] 저장된 전체 데이터를 삭제했습니다.');
                return true;
            }
        };

        // 3.5: 데이터 초기화 함수
        // T-009b/T-009c-3: 읽기·쓰기 모두 PromptStorage 경유
        //
        // ★ 순서 — 관련 읽기를 전부 끝낸 뒤에 첫 쓰기를 한다.
        //   기본값 저장이 즐겨찾기 읽기보다 먼저 일어나면, 즐겨찾기가 손상됐을 때
        //   실패 가드가 서기도 전에 빈 값으로 원본을 덮어쓴다.
        async function initializeData() {
            // --- 1) 읽기: 쓰기 전에 전부 끝낸다 ---
            const storedPrompts    = await PromptStorage.getPrompts();
            const storedFavorites  = await PromptStorage.getFavorites();
            const storedCategories = await PromptStorage.getCategories();

            // --- 2) 검증 및 전역 상태 대입 ---
            // 키 없음(null)과 저장된 빈 배열([]) 모두 "샘플 필요"로 본다 (기존 동작 유지)
            const needsSamplePrompts = !storedPrompts || storedPrompts.length === 0;
            allPrompts = needsSamplePrompts ? [...sampleData] : storedPrompts;

            if (storedFavorites) {
                favoriteIds = new Set(storedFavorites);
            }

            // 카테고리는 키가 없을 때만 기본값. 저장된 빈 배열은 존중한다 (기존 동작 유지)
            const needsDefaultCategories = storedCategories === null;
            categories = needsDefaultCategories ? [...defaultCategories] : storedCategories;

            // --- 3) 그다음에 기본값 저장 ---
            // 여기서 실패하면 되돌릴 이전 상태가 없다 — 비어 있어서 쓰는 것이다.
            // 롤백 대신 초기화 실패로 올려 main.js 리스너1이 렌더링을 중단하게 한다.
            if (needsSamplePrompts) {
                // 샘플 주입은 favoriteIds 를 건드리지 않으므로 프롬프트만 저장한다
                if (await PromptStorage.savePrompts(allPrompts) !== true) {
                    throw new Error('샘플 데이터를 저장하지 못했습니다.');
                }
                console.log('샘플 데이터 로드 완료 ✅');
            } else {
                console.log(`저장된 프롬프트 ${allPrompts.length}개 로드 완료 ✅`);
            }

            if (needsDefaultCategories) {
                if (await PromptStorage.saveCategories(categories) !== true) {
                    throw new Error('기본 카테고리를 저장하지 못했습니다.');
                }
            }
            console.log(`카테고리 ${categories.length}개 로드 완료 ✅`);
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
            reader.onload = async function(event) {
                try {
                    const data = JSON.parse(event.target.result);

                    // T-009c-1: 실패 시 되돌릴 스냅샷
                    const snapshot = { prompts: allPrompts, favorites: favoriteIds };
                    
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

                    // 저장 — 프롬프트와 즐겨찾기 둘 다 바뀌었다
                    const okPrompts = await PromptStorage.savePrompts(allPrompts);
                    const okFavorites = okPrompts === true
                        ? await PromptStorage.saveFavorites(favoriteIds)
                        : false;

                    if (okPrompts !== true || okFavorites !== true) {
                        allPrompts = snapshot.prompts;
                        favoriteIds = snapshot.favorites;

                        if (okPrompts === true) {
                            await PromptStorage.savePrompts(allPrompts);
                        }

                        renderPromptList(allPrompts);
                        showToast('저장 실패 — 불러오기를 되돌렸습니다 ❌');
                        return;
                    }

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
