        // 페이지 로드 시 데이터 초기화
        document.addEventListener('DOMContentLoaded', function() {
            console.log('페이지 로드 완료');
            initializeData();
            
            // 테스트: 콘솔에 데이터 출력
            console.log('현재 프롬프트 개수:', allPrompts.length);
            console.log('첫 번째 프롬프트:', allPrompts[0]);

            // 카테고리 렌더링
            renderCategoryList();
            renderCategoryDropdown();

            // Phase 4: 모달 관련 이벤트 리스너 등록 (Task 4.4 ~ 4.10)
            setupModalEvents();

            // Phase 5: 초기 목록 렌더링 (Task 5.5 ~ 5.8)
            renderPromptList(allPrompts);

            // Phase 6~8: 검색 및 필터 이벤트 리스너 등록
            setupSearchAndFilters();

            // Phase 12: 다크모드 설정
            setupThemeToggle();

            // Phase 13: 데이터 관리 설정
            setupDataManagement();

            // 카테고리 관리 모달 설정
            setupCategoryManagement();

            // 파일 업로드 설정
            setupFileUpload();

            // 태그 자동완성 설정
            setupTagAutocomplete();

            // 검색 기록 설정
            loadSearchHistory();
            renderSearchHistory();
            setupSearchHistoryTracking();

            // 일괄 삭제 설정
            setupBulkDelete();

            // 이미지 썸네일 설정
            setupThumbnailFeature();

            // 참고자료 설정
            setupReferences();
        });

        // 상세 모달 닫기 버튼 이벤트
        document.addEventListener('DOMContentLoaded', function() {
            const closeDetailBtn = document.getElementById('close-detail-modal');
            const detailOverlay = document.getElementById('detail-modal-overlay');

            closeDetailBtn.addEventListener('click', closeDetailModal);

            // 배경 클릭으로 닫기
            detailOverlay.addEventListener('click', function(e) {
                if (e.target === detailOverlay) {
                    closeDetailModal();
                }
            });

            // Phase 10: 복사 버튼 이벤트
            const copyBtn = document.getElementById('copy-btn');
            copyBtn.addEventListener('click', copyToClipboard);

            // 수정 버튼 이벤트
            const editBtn = document.getElementById('edit-prompt-btn');
            editBtn.addEventListener('click', openEditPromptModal);

            // 복제 버튼 이벤트
            const duplicateBtn = document.getElementById('duplicate-prompt-btn');
            duplicateBtn.addEventListener('click', duplicatePrompt);

            // 삭제 버튼 이벤트
            const deleteBtn = document.getElementById('delete-prompt-btn');
            deleteBtn.addEventListener('click', deletePrompt);
        });
