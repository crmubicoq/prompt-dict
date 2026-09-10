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

        // ========================================
        // T-126: 목록 갱신은 반드시 applyFilters 를 거친다
        // ========================================
        //
        // ★ renderPromptList(allPrompts) 를 직접 부르면 세 가지가 통째로 빠진다.
        //   1) sortPrompts — 사용자가 고른 정렬이 임포트 때마다 조용히 무시됐다
        //   2) 카테고리·검색 필터 — 격자에는 전체가 뜨는데 사이드바는
        //      고른 카테고리가 눌린 채였다. 화면이 스스로 모순됐다
        //   3) syncSelectionWithView(T-105) — 선택 모드에서 화면 밖 항목의
        //      선택이 남아, 이어지는 일괄 분류·삭제에 휩쓸릴 수 있었다
        //
        //   T-117 이 prompts.js 안의 세 곳만 고치고 이 파일을 놓쳤다.
        //   정당한 renderPromptList 직접 호출은 applyFilters 자신 한 곳뿐이다.
        //
        // ★ 성공 뒤에도 필터를 풀지 않는다 — storage.js 의 importData 와 다르다.
        //   저기는 "이 백업 상태로 되돌린다"라 전체 상태를 갈아끼우지만,
        //   여기는 기존 사전에 더하는 병합이다. 사용자가 보던 화면을
        //   파일 하나가 옮기지 않는다. 새로 들어온 항목은 미분류에 쌓이고
        //   토스트가 그 개수를 알린다.

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
                                createdAt: prompt.createdAt || new Date().toISOString()
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
                            applyFilters();
                            showToast('저장 실패 — 불러오기를 되돌렸습니다 ❌');
                            return;
                        }

                        applyFilters();
                        
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
                                createdAt: new Date().toISOString()
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
                            applyFilters();
                            showToast('저장 실패 — 불러오기를 되돌렸습니다 ❌');
                            return;
                        }

                        applyFilters();
                        
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
                    //
                    // ★ T-121(B16): 구분자를 '---' 에서 '===PROMPT===' 로 바꿨다.
                    //   전에는 text.split('---') — 줄 앵커도 없는 단순 부분문자열 분할이라
                    //   마크다운 수평선은 물론 본문 중간의 "a---b" 까지 쪼갰다.
                    //
                    // ★ 분할은 splitChunks(T-104a)를 쓴다. 규칙을 두 벌 두면 언젠가 어긋난다.
                    //   'custom' 은 리터럴 문자열 분할이라 정규식 이스케이프가 필요 없다.
                    //
                    // ★ 옛 '---' 파일로 되돌아가지 않는다.
                    //   폴백을 두면 B16 을 그대로 되살리는 셈이다.
                    //   마커가 없으면 **전체를 1개로** 넣는다 — 과분할보다 훨씬 싸다.
                    //   사용자는 "1개 등록" 을 즉시 알아채고, 되돌린 뒤
                    //   일괄 붙여넣기(구분자에 '---' 옵션이 있다)로 다시 넣으면 된다.
                    const TXT_MARKER = '===PROMPT===';
                    const hasMarker = text.indexOf(TXT_MARKER) !== -1;
                    const prompts = hasMarker
                        ? splitChunks(text, 'custom', TXT_MARKER)
                        : splitChunks(text, 'none');
                    
                    let addedCount = 0;
                    prompts.forEach((promptText, index) => {
                        // ★ 제목은 첫 번째 **비어 있지 않은** 줄.
                        //   본문은 그 줄을 뺀 **나머지 원문 그대로** —
                        //   전에는 filter(l => l.trim()) 로 빈 줄을 전부 지워
                        //   문단 구분이 사라졌다 (본문 원문 보존 위반).
                        //
                        // ★ 제목 규칙은 T-104 와 다르게 둔다.
                        //   '===PROMPT===' 를 손으로 넣은 파일은 **구조를 가진 형식**이고,
                        //   그런 형식에서 첫 줄이 제목인 것은 자연스러운 약속이다.
                        //   T-104 는 아무 텍스트나 받으므로 suggestTitle 을 쓴다.
                        const rawLines = promptText.split('\n');
                        let titleIndex = -1;
                        for (let i = 0; i < rawLines.length; i++) {
                            if (rawLines[i].trim()) { titleIndex = i; break; }
                        }
                        
                        if (titleIndex !== -1) {
                            const titleLine = rawLines[titleIndex].trim();
                            const body = rawLines.slice(titleIndex + 1).join('\n').trim();
                            const newPrompt = {
                                id: newId(),
                                title: titleLine || `프롬프트 ${index + 1}`,
                                content: body || titleLine,
                                // T-104f: TXT 는 카테고리 정보가 없다 — 아무도 고르지 않았다
                                category: UNCATEGORIZED,
                                tags: [],
                                description: '',
                                // T-114(B14): TXT 에는 메모 개념이 없다. 빈 값으로 명시한다
                                notes: '',
                                createdAt: new Date().toISOString()
                            };
                            
                            allPrompts.unshift(newPrompt);
                            addedCount++;
                        }
                    });

                    if (addedCount > 0) {
                        // T-009c-3: 즐겨찾기는 바뀌지 않으므로 프롬프트만 저장
                        if (await PromptStorage.savePrompts(allPrompts) !== true) {
                            allPrompts = snapshotPrompts;
                            applyFilters();
                            showToast('저장 실패 — 불러오기를 되돌렸습니다 ❌');
                            return;
                        }

                        applyFilters();
                        let txtMessage = `${addedCount}개의 프롬프트 추가 완료! ✅`;
                        if (!hasMarker) {
                            txtMessage += `\n구분자 ${TXT_MARKER} 를 찾지 못해 전체를 1개로 넣었습니다.` +
                                           `\n나누려면 📋 여러 개 붙여넣기를 이용하세요.`;
                        }
                        showToast(txtMessage);
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
