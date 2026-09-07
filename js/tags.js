        // ========================================
        // H. 태그 자동완성 기능
        // ========================================

        function setupTagAutocomplete() {
            const tagInput = document.getElementById('prompt-tags');
            const suggestionsDiv = document.getElementById('tag-suggestions');
            
            if (!tagInput || !suggestionsDiv) return;

            // 입력 이벤트
            tagInput.addEventListener('input', function() {
                const value = this.value;
                const lastComma = value.lastIndexOf(',');
                const currentTag = lastComma >= 0 ? value.substring(lastComma + 1).trim() : value.trim();

                if (currentTag.length > 0) {
                    showTagSuggestions(currentTag, suggestionsDiv, tagInput);
                } else {
                    suggestionsDiv.style.display = 'none';
                }
            });

            // 포커스 해제 시 제안 숨김
            tagInput.addEventListener('blur', function() {
                setTimeout(() => {
                    suggestionsDiv.style.display = 'none';
                }, 200);
            });
        }

        // 모든 기존 태그 수집
        function getAllTags() {
            const tagsSet = new Set();
            allPrompts.forEach(prompt => {
                if (prompt.tags && Array.isArray(prompt.tags)) {
                    prompt.tags.forEach(tag => {
                        if (tag && tag.trim()) {
                            tagsSet.add(tag.trim());
                        }
                    });
                }
            });
            return Array.from(tagsSet).sort();
        }

        // 태그 제안 표시
        function showTagSuggestions(currentTag, suggestionsDiv, inputElement) {
            const allTags = getAllTags();
            const lowerCurrentTag = currentTag.toLowerCase();
            
            // 현재 입력과 일치하는 태그 필터링
            const matchedTags = allTags.filter(tag => 
                tag.toLowerCase().includes(lowerCurrentTag) && 
                tag.toLowerCase() !== lowerCurrentTag
            );

            if (matchedTags.length === 0) {
                suggestionsDiv.style.display = 'none';
                return;
            }

            // 제안 목록 HTML 생성
            const suggestionsHTML = matchedTags.slice(0, 5).map(tag => 
                `<div class="tag-suggestion-item" data-tag="${tag}">${tag}</div>`
            ).join('');

            suggestionsDiv.innerHTML = suggestionsHTML;
            suggestionsDiv.style.display = 'block';

            // 제안 항목 클릭 이벤트
            const items = suggestionsDiv.querySelectorAll('.tag-suggestion-item');
            items.forEach(item => {
                item.addEventListener('click', function() {
                    const selectedTag = this.getAttribute('data-tag');
                    insertTag(selectedTag, inputElement);
                    suggestionsDiv.style.display = 'none';
                });
            });
        }

        // 선택한 태그 삽입
        function insertTag(tag, inputElement) {
            const value = inputElement.value;
            const lastComma = value.lastIndexOf(',');
            
            if (lastComma >= 0) {
                // 마지막 쉼표 이후 텍스트를 선택한 태그로 교체
                inputElement.value = value.substring(0, lastComma + 1) + ' ' + tag + ', ';
            } else {
                // 쉼표가 없으면 전체를 교체
                inputElement.value = tag + ', ';
            }
            
            inputElement.focus();
        }
