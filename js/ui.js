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

        function setupThemeToggle() {
            const themeBtn = document.getElementById('theme-toggle');
            
            // 페이지 로드 시 저장된 테마 적용
            const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
            if (savedTheme === 'dark') {
                document.body.classList.add('dark-mode');
                themeBtn.textContent = '☀️';
            }

            // 테마 토글 버튼
            themeBtn.addEventListener('click', function() {
                document.body.classList.toggle('dark-mode');
                
                const isDark = document.body.classList.contains('dark-mode');
                themeBtn.textContent = isDark ? '☀️' : '🌙';
                localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
                
                console.log('테마 변경:', isDark ? '다크모드' : '라이트모드');
            });
        }
