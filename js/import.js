        // ========================================
        // 파일 업로드 (드래그&드롭) 기능
        // ========================================

        function setupFileUpload() {
            const uploadArea = document.getElementById('upload-area');
            const fileInput = document.getElementById('upload-file-input');

            // 클릭으로 파일 선택
            uploadArea.addEventListener('click', () => {
                fileInput.click();
            });

            // 파일 선택 시 처리
            fileInput.addEventListener('change', handleFileSelect);

            // 드래그 오버
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                uploadArea.classList.add('drag-over');
            });

            // 드래그 떠남
            uploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                e.stopPropagation();
                uploadArea.classList.remove('drag-over');
            });

            // 드롭
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                uploadArea.classList.remove('drag-over');

                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    handleFile(files[0]);
                }
            });
        }

        function handleFileSelect(e) {
            const files = e.target.files;
            if (files.length > 0) {
                handleFile(files[0]);
            }
            e.target.value = ''; // 파일 선택 초기화
        }

        function handleFile(file) {
            const fileName = file.name.toLowerCase();
            const fileExt = fileName.split('.').pop();

            console.log('파일 업로드:', fileName, '타입:', fileExt);

            if (fileExt === 'json') {
                parseJSONFile(file);
            } else if (fileExt === 'csv') {
                parseCSVFile(file);
            } else if (fileExt === 'txt') {
                parseTXTFile(file);
            } else {
                alert('지원하지 않는 파일 형식입니다.\nJSON, CSV, TXT 파일만 업로드 가능합니다.');
            }
        }

        // JSON 파일 파싱
        function parseJSONFile(file) {
            const reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    // T-009c-3: 실패 시 되돌릴 스냅샷 (요소 객체는 새로 만들어 추가만 한다)
                    const snapshotPrompts = [...allPrompts];
                    const data = JSON.parse(e.target.result);
                    
                    let prompts = [];
                    
                    // 배열인지 확인
                    if (Array.isArray(data)) {
                        prompts = data;
                    } else if (data.prompts && Array.isArray(data.prompts)) {
                        // {prompts: [...]} 형식
                        prompts = data.prompts;
                    } else {
                        // 단일 객체를 배열로
                        prompts = [data];
                    }

                    // 프롬프트 검증 및 추가
                    let addedCount = 0;
                    let uncategorizedCount = 0; // 미분류로 떨어진 개수
                    
                    prompts.forEach(prompt => {
                        if (prompt.title && prompt.content) {
                            // T-104f: 카테고리가 없으면 미분류. 아무도 고르지 않은 상태다.
                            const rawCategory = prompt.category;
                            const validatedCategory = validateCategory(rawCategory);
                            
                            // ★ 파일이 미분류라고 명시한 것이 아닌데 미분류로 떨어진 개수.
                            //   카테고리가 아예 없던 항목도 포함한다 — 그것도 재분류 대상이다.
                            //   (예전 조건은 값이 없는 항목을 세지 않아 메시지가 실제보다 적었다)
                            if (validatedCategory === UNCATEGORIZED && rawCategory !== UNCATEGORIZED) {
                                uncategorizedCount++;
                            }
                            
                            const newPrompt = {
                                id: newId(),
                                title: prompt.title,
                                content: prompt.content,
                                category: validatedCategory,
                                tags: prompt.tags || [],
                                description: prompt.description || '',
                                // T-114(B14): 메모가 통째로 소실되던 자리.
                                //   썸네일도 같은 이유로 빠져 있었다 — 백업을 여기로 다시
                                //   불러오면 둘 다 사라졌다.
                                notes: prompt.notes || '',
                                createdAt: prompt.createdAt || new Date().toISOString(),
                                isFavorite: false
                            };

                            if (prompt.thumbnailImage) {
                                newPrompt.thumbnailImage = prompt.thumbnailImage;
                            }

                            // T-117: 있을 때만 옮긴다. 없으면 없는 채로 —
                            //   부재가 "수정된 적 없음" 이라는 정보다.
                            //   (notes·thumbnailImage 가 소실됐던 바로 그 자리다)
                            if (prompt.updatedAt) {
                                newPrompt.updatedAt = prompt.updatedAt;
                            }
                            allPrompts.unshift(newPrompt);
                            addedCount++;
                        }
                    });

                    if (addedCount > 0) {
                        // T-009c-3: 즐겨찾기는 바뀌지 않으므로 프롬프트만 저장
                        if (await PromptStorage.savePrompts(allPrompts) !== true) {
                            allPrompts = snapshotPrompts;
                            renderPromptList(allPrompts);
                            showToast('저장 실패 — 불러오기를 되돌렸습니다 ❌');
                            return;
                        }

                        renderPromptList(allPrompts);
                        
                        // 메시지 생성
                        let message = `${addedCount}개의 프롬프트 추가 완료! ✅`;
                        if (uncategorizedCount > 0) {
                            message += `\n(${uncategorizedCount}개가 '${UNCATEGORIZED}'로 분류됨)`;
                        }
                        
                        showToast(message);
                        console.log(`${addedCount}개 프롬프트 추가됨 (${UNCATEGORIZED}: ${uncategorizedCount}개)`);
                    } else {
                        alert('유효한 프롬프트를 찾을 수 없습니다.\n제목(title)과 본문(content)이 필요합니다.');
                    }

                } catch (error) {
                    console.error('JSON 파싱 오류:', error);
                    alert('JSON 파일을 읽는 중 오류가 발생했습니다.\n' + error.message);
                }
            };
            reader.readAsText(file);
        }

        // CSV 파일 파싱
        function parseCSVFile(file) {
            const reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    // T-009c-3: 실패 시 되돌릴 스냅샷 (요소 객체는 새로 만들어 추가만 한다)
                    const snapshotPrompts = [...allPrompts];
                    const text = e.target.result;
                    const lines = text.split('\n').filter(line => line.trim());
                    
                    if (lines.length < 2) {
                        alert('CSV 파일이 비어있거나 형식이 올바르지 않습니다.');
                        return;
                    }

                    // 헤더 확인 (첫 줄)
                    const headers = lines[0].split(',').map(h => h.trim());
                    
                    let addedCount = 0;
                    let uncategorizedCount = 0; // 미분류로 떨어진 개수
                    
                    // 데이터 행 처리
                    for (let i = 1; i < lines.length; i++) {
                        const values = lines[i].split(',').map(v => v.trim());
                        
                        if (values.length >= 2) {
                            // T-104f: 카테고리가 없으면 미분류. 아무도 고르지 않은 상태다.
                            const rawCategory = values[2];
                            const validatedCategory = validateCategory(rawCategory);
                            
                            // ★ 파일이 미분류라고 명시한 것이 아닌데 미분류로 떨어진 개수.
                            if (validatedCategory === UNCATEGORIZED && rawCategory !== UNCATEGORIZED) {
                                uncategorizedCount++;
                            }
                            
                            const newPrompt = {
                                id: newId(),
                                title: values[0] || `프롬프트 ${i}`,
                                content: values[1] || '',
                                category: validatedCategory,
                                tags: values[3] ? values[3].split(';').map(t => t.trim()) : [],
                                description: values[4] || '',
                                // T-114(B14): 6번째 열이 있으면 메모로 읽는다
                                notes: values[5] || '',
                                createdAt: new Date().toISOString(),
                                isFavorite: false
                            };
                            
                            if (newPrompt.content) {
                                allPrompts.unshift(newPrompt);
                                addedCount++;
                            }
                        }
                    }

                    if (addedCount > 0) {
                        // T-009c-3: 즐겨찾기는 바뀌지 않으므로 프롬프트만 저장
                        if (await PromptStorage.savePrompts(allPrompts) !== true) {
                            allPrompts = snapshotPrompts;
                            renderPromptList(allPrompts);
                            showToast('저장 실패 — 불러오기를 되돌렸습니다 ❌');
                            return;
                        }

                        renderPromptList(allPrompts);
                        
                        // 메시지 생성
                        let message = `${addedCount}개의 프롬프트 추가 완료! ✅`;
                        if (uncategorizedCount > 0) {
                            message += `\n(${uncategorizedCount}개가 '${UNCATEGORIZED}'로 분류됨)`;
                        }
                        
                        showToast(message);
                        console.log(`${addedCount}개 프롬프트 추가됨 (CSV, ${UNCATEGORIZED}: ${uncategorizedCount}개)`);
                    } else {
                        alert('유효한 프롬프트를 찾을 수 없습니다.');
                    }

                } catch (error) {
                    console.error('CSV 파싱 오류:', error);
                    alert('CSV 파일을 읽는 중 오류가 발생했습니다.\n' + error.message);
                }
            };
            reader.readAsText(file);
        }

        // TXT 파일 파싱 (간단한 형식)
        function parseTXTFile(file) {
            const reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    // T-009c-3: 실패 시 되돌릴 스냅샷 (요소 객체는 새로 만들어 추가만 한다)
                    const snapshotPrompts = [...allPrompts];
                    const text = e.target.result;
                    
                    // --- 구분자로 프롬프트 나누기
                    const prompts = text.split('---').map(p => p.trim()).filter(p => p);
                    
                    let addedCount = 0;
                    prompts.forEach((promptText, index) => {
                        const lines = promptText.split('\n').filter(l => l.trim());
                        
                        if (lines.length > 0) {
                            const newPrompt = {
                                id: newId(),
                                title: lines[0].trim() || `프롬프트 ${index + 1}`,
                                content: lines.slice(1).join('\n').trim() || lines[0],
                                // T-104f: TXT 는 카테고리 정보가 없다 — 아무도 고르지 않았다
                                category: UNCATEGORIZED,
                                tags: [],
                                description: '',
                                // T-114(B14): TXT 에는 메모 개념이 없다. 빈 값으로 명시한다
                                notes: '',
                                createdAt: new Date().toISOString(),
                                isFavorite: false
                            };
                            
                            allPrompts.unshift(newPrompt);
                            addedCount++;
                        }
                    });

                    if (addedCount > 0) {
                        // T-009c-3: 즐겨찾기는 바뀌지 않으므로 프롬프트만 저장
                        if (await PromptStorage.savePrompts(allPrompts) !== true) {
                            allPrompts = snapshotPrompts;
                            renderPromptList(allPrompts);
                            showToast('저장 실패 — 불러오기를 되돌렸습니다 ❌');
                            return;
                        }

                        renderPromptList(allPrompts);
                        showToast(`${addedCount}개의 프롬프트 추가 완료! ✅`);
                        console.log(`${addedCount}개 프롬프트 추가됨 (TXT)`);
                    } else {
                        alert('유효한 프롬프트를 찾을 수 없습니다.');
                    }

                } catch (error) {
                    console.error('TXT 파싱 오류:', error);
                    alert('TXT 파일을 읽는 중 오류가 발생했습니다.\n' + error.message);
                }
            };
            reader.readAsText(file);
        }
