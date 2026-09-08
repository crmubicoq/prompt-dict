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
                    let defaultCategoryCount = 0; // "기타"로 분류된 개수
                    
                    prompts.forEach(prompt => {
                        if (prompt.title && prompt.content) {
                            const originalCategory = prompt.category || '기타';
                            const validatedCategory = validateCategory(originalCategory);
                            
                            // 카테고리가 변경되었으면 카운트
                            if (originalCategory !== '기타' && validatedCategory === '기타') {
                                defaultCategoryCount++;
                            }
                            
                            const newPrompt = {
                                id: newId(),
                                title: prompt.title,
                                content: prompt.content,
                                category: validatedCategory,
                                tags: prompt.tags || [],
                                description: prompt.description || '',
                                createdAt: prompt.createdAt || new Date().toISOString(),
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
                        
                        // 메시지 생성
                        let message = `${addedCount}개의 프롬프트 추가 완료! ✅`;
                        if (defaultCategoryCount > 0) {
                            message += `\n(${defaultCategoryCount}개가 '기타'로 분류됨)`;
                        }
                        
                        showToast(message);
                        console.log(`${addedCount}개 프롬프트 추가됨 (기타: ${defaultCategoryCount}개)`);
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
                    let defaultCategoryCount = 0; // "기타"로 분류된 개수
                    
                    // 데이터 행 처리
                    for (let i = 1; i < lines.length; i++) {
                        const values = lines[i].split(',').map(v => v.trim());
                        
                        if (values.length >= 2) {
                            const originalCategory = values[2] || '기타';
                            const validatedCategory = validateCategory(originalCategory);
                            
                            // 카테고리가 변경되었으면 카운트
                            if (originalCategory !== '기타' && validatedCategory === '기타') {
                                defaultCategoryCount++;
                            }
                            
                            const newPrompt = {
                                id: newId(),
                                title: values[0] || `프롬프트 ${i}`,
                                content: values[1] || '',
                                category: validatedCategory,
                                tags: values[3] ? values[3].split(';').map(t => t.trim()) : [],
                                description: values[4] || '',
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
                        if (defaultCategoryCount > 0) {
                            message += `\n(${defaultCategoryCount}개가 '기타'로 분류됨)`;
                        }
                        
                        showToast(message);
                        console.log(`${addedCount}개 프롬프트 추가됨 (CSV, 기타: ${defaultCategoryCount}개)`);
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
                                category: '기타',
                                tags: [],
                                description: '',
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
