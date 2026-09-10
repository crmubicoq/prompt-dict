        // T-011(F2): 처리되지 않은 Promise 거부 안전망
        // async 이벤트 핸들러는 반환 Promise 를 받는 곳이 없어, 저장이 아닌
        // 렌더 경로에서 예외가 나면 롤백을 건너뛴 채 콘솔에만 남는다.
        // 개별 try/catch(인라인 onclick 5곳)는 원인별 문구가 더 친절하므로 그대로 두고,
        // 여기서는 어디서도 못 잡은 것만 받는 최후 안전망 역할을 한다.
        // ★ 리스너1보다 먼저 등록되어야 초기화 중 발생한 거부도 잡는다.
        window.addEventListener('unhandledrejection', function (event) {
            console.error('[처리되지 않은 오류]', event.reason);
            if (typeof showToast === 'function') {
                showToast('처리 중 오류가 발생했습니다 ❌');
            }
        });

        // 페이지 로드 시 데이터 초기화
        // T-009b: 읽기 경로가 async 가 되어 리스너1도 async 다.
        // ★ 아래 리스너2(상세 모달 버튼)는 동기 그대로 둔다. 합치지도 않는다. (71c81d2)
        document.addEventListener('DOMContentLoaded', async function() {
            // ★ 초기화에 실패하면 렌더링하지 않고 중단한다.
            //   손상된 상태로 화면을 그리면 사용자가 데이터가 날아간 줄 알고
            //   새로 입력하게 되고, 그 순간 원본이 덮어써진다.
            //   (저장 자체는 PromptStorage 의 isReadFailed 가드가 이미 막는다)
            try {
                await initializeData();
            } catch (error) {
                console.error('[초기화 실패] 저장된 데이터를 읽지 못했습니다:', error);

                // T-115: 화면이 비어도 이것만은 조작할 수 있어야 한다.
                //   배너는 정적 마크업을 보이는 것뿐이라 렌더 경로에 의존하지 않는다.
                showRecoveryBanner({ fatal: true });
                return;
            }

            // 카테고리 렌더링
            renderCategoryList();
            renderCategoryDropdown();

            // Phase 4: 모달 관련 이벤트 리스너 등록 (Task 4.4 ~ 4.10)
            setupModalEvents();

            // T-113: 이벤트 위임 등록
            // ★ 첫 렌더보다 먼저 걸어 둔다. 위임이라 렌더 순서와 무관하지만,
            //   나중에 옮기면 그 사이 클릭이 죽는 창이 생긴다.
            setupEventDelegation();

            // Phase 5: 초기 목록 렌더링 (Task 5.5 ~ 5.8)
            renderPromptList(allPrompts);

            // Phase 6~8: 검색 및 필터 이벤트 리스너 등록
            setupSearchAndFilters();

            // Phase 12: 다크모드 설정
            await setupThemeToggle();

            // Phase 13: 데이터 관리 설정
            setupDataManagement();

            // 카테고리 관리 모달 설정
            setupCategoryManagement();

            // 파일 업로드 설정
            setupFileUpload();

            // T-104: 일괄 붙여넣기 설정
            setupBulkPaste();

            // 태그 자동완성 설정
            setupTagAutocomplete();

            // 검색 기록 설정
            // 부가 기능이라 실패해도 나머지 초기화는 계속한다.
            // 조용히 넘기는 것은 아니다 — 어댑터가 이미 alert 를 띄웠고
            // isReadFailed 가드로 저장도 차단된 상태다.
            try {
                await loadSearchHistory();
                renderSearchHistory();
                setupSearchHistoryTracking();
            } catch (error) {
                console.error('[검색 기록] 불러오기 실패 — 검색 기록 없이 계속합니다:', error);
            }

            // 일괄 삭제 설정
            setupBulkDelete();

            // 이미지 썸네일 설정
            setupThumbnailFeature();

            // T-211: 맨 위 / 맨 아래 스크롤 버튼
            setupScrollButtons();

            // T-123: Esc 로 모달 닫기
            setupEscapeToClose();

            // T-115: 초기화는 됐지만 일부 키가 손상된 경우
            //   (검색 기록처럼 치명적이지 않은 키는 여기까지 온다)
            if (PromptStorage.isReadFailed) {
                showRecoveryBanner({ fatal: false });
            }
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
