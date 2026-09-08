        // 5.7: 날짜 포맷팅 함수
        function formatDate(isoString) {
            const date = new Date(isoString);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        // 구형 브라우저용 복사 (폴백)
        function fallbackCopy(text) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            
            try {
                document.execCommand('copy');
                showToast('복사 완료! ✅');
            } catch (error) {
                showToast('복사 실패 ❌');
            }
            
            document.body.removeChild(textarea);
        }

        // 10.6 ~ 10.7: 토스트 메시지 표시
        function showToast(message) {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.classList.add('show');

            // 3초 후 자동 사라짐
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }

        // ========================================
        // Phase 12: 다크모드 (Task 12.1 ~ 12.7)
        // ========================================

        // T-009b: 읽기만 PromptStorage 경유. 아래 토글 핸들러의 쓰기는 T-009c
        async function setupThemeToggle() {
            const themeBtn = document.getElementById('theme-toggle');
            
            // 페이지 로드 시 저장된 테마 적용
            const savedTheme = (await PromptStorage.getSetting(THEME_KEY)) || 'light';
            if (savedTheme === 'dark') {
                document.body.classList.add('dark-mode');
                themeBtn.textContent = '☀️';
            }

            // 테마 토글 버튼
            // T-009c-1: 저장 실패 시 화면 상태까지 되돌린다
            themeBtn.addEventListener('click', async function() {
                const wasDark = document.body.classList.contains('dark-mode');

                document.body.classList.toggle('dark-mode');

                const isDark = document.body.classList.contains('dark-mode');
                themeBtn.textContent = isDark ? '☀️' : '🌙';

                const saved = await PromptStorage.setSetting(THEME_KEY, isDark ? 'dark' : 'light');
                if (saved !== true) {
                    document.body.classList.toggle('dark-mode', wasDark);
                    themeBtn.textContent = wasDark ? '☀️' : '🌙';
                    showToast('테마 저장 실패 — 되돌렸습니다 ❌');
                    return;
                }

                console.log('테마 변경:', isDark ? '다크모드' : '라이트모드');
            });
        }
