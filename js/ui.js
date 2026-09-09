        // T-111: HTML 이스케이프 유틸
        //
        // innerHTML 로 들어가는 사용자 입력은 전부 이 함수를 통과해야 한다.
        // 이번 태스크는 유틸만 만들고, 실제 적용은 T-112에서 한다.
        //
        // ★ & 를 가장 먼저 치환한다. 순서를 바꾸면 앞서 만든 &lt; 의 & 가
        //   뒤이어 &amp;lt; 로 다시 잡혀 이중 이스케이프된다.
        //
        // ★ ' 는 &#39; 로 쓴다. &apos; 는 HTML4에 없는 엔티티라
        //   구형 파서에서 그대로 노출될 수 있다. 숫자 참조는 어디서나 안전하다.
        //
        // ★ 이 함수는 **HTML 텍스트·속성값 문맥만** 안전하게 만든다.
        //   인라인 onclick="fn('...')" 안쪽은 보호하지 못한다 —
        //   HTML 파서가 &#39; 를 ' 로 되돌린 다음 그 결과를 JS 로 파싱하기 때문에
        //   따옴표 탈출이 그대로 살아난다. B2(태그 따옴표)의 진짜 해결은
        //   T-113의 이벤트 위임이다. 이스케이프로 덮었다고 착각하지 않는다.
        //
        // ★ javascript: 스킴도 막지 못한다. src/href 에 들어가는 URL 은
        //   이스케이프가 아니라 스킴 검증이 필요하다 (썸네일 URL — T-112에서 판단).
        function escapeHtml(value) {
            // null·undefined 는 빈 문자열로. "null" 이라는 글자가 화면에 찍히지 않게 한다.
            if (value === null || value === undefined) return '';
            return String(value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        // T-112: 이미지 URL 스킴 화이트리스트
        //
        // 허용: https:// , http:// , data:image/
        //
        // ★ 검사 전에 코드 0x20 이하 문자를 전부 지운다.
        //   브라우저는 URL 안의 탭·개행을 무시하고 이어붙이므로
        //   "java(탭)script:" 같은 우회가 성립한다.
        //   ★ 지운 결과를 그대로 돌려준다 — 검사한 문자열과 렌더하는 문자열이
        //     달라지면 검사가 의미를 잃는다.
        //
        // ★ data: 는 image 서브타입만. data:text/html 은 통과시키지 않는다.
        //   data:image/svg+xml 은 허용한다 — <img> 로 불러온 SVG 는
        //   브라우저가 스크립트를 끈 상태로 렌더한다. 파일 업로드 경로가
        //   image/* 를 통과시키므로 여기서 막으면 앱이 만든 값을 앱이 거부한다.
        //   ※ 이 값을 <img> 밖(css background, <object>, href)에서 쓰게 되면
        //     이 판단을 다시 해야 한다.
        function safeImageUrl(value) {
            if (value === null || value === undefined) return '';
            const raw = String(value);
            let url = '';
            for (let i = 0; i < raw.length; i++) {
                if (raw.charCodeAt(i) > 0x20) url += raw[i];
            }
            // 스킴 비교만 소문자로. base64 본문은 대소문자가 의미를 가지므로 원본을 반환한다.
            const probe = url.toLowerCase();
            if (probe.startsWith('https://')) return url;
            if (probe.startsWith('http://')) return url;
            if (probe.startsWith('data:image/')) return url;
            return '';
        }

        // T-112: 카테고리 이름 → CSS 클래스 문자열
        //
        // ★ class="category-badge ${name}" 은 이름에 공백이 있으면 클래스가 쪼개진다.
        //   기본 카테고리 "이미지 생성" 이 이미 그렇다 — 클래스가
        //   category-badge / 이미지 / 생성 셋으로 갈라진다.
        //   "무언가 기타" 같은 이름이면 .category-badge.기타 색을 엉뚱하게 물려받는다.
        function categoryClass(name) {
            const token = (name === null || name === undefined ? '' : String(name))
                .trim()
                .replace(/\s+/g, '-');
            return token ? 'category-badge ' + token : 'category-badge';
        }

        // T-116: 프롬프트 ID 생성
        //
        // ★ crypto.randomUUID() 는 **보안 컨텍스트에서만** 제공된다.
        //   file:// 과 https 는 보안 컨텍스트지만, P4의 팀 서버는 http(8807)라
        //   그대로 두면 undefined 가 되어 ID 생성이 통째로 깨진다.
        //   getRandomValues 는 비보안 컨텍스트에서도 쓸 수 있으므로 v4 를 직접 만든다.
        //
        //   Math.random 으로는 떨어지지 않는다 — 충돌 회피가 목적인데
        //   약한 난수로 대체하면 조용히 같은 문제가 남는다.
        function newId() {
            if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
                return crypto.randomUUID();
            }

            if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
                const bytes = crypto.getRandomValues(new Uint8Array(16));
                bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
                bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
                const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
                return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) +
                       '-' + hex.slice(16, 20) + '-' + hex.slice(20);
            }

            throw new Error('이 브라우저에서는 안전한 ID를 생성할 수 없습니다.');
        }

        // T-103: 본문에서 제목 제안
        // T-104(일괄 붙여넣기)에서 조각마다 호출하므로 독립 함수로 둔다.
        //
        // 규칙
        //   1. 앞쪽 빈 줄은 건너뛴다
        //   2. 마크다운 장식(# 헤더, 불릿, 인용, 번호 목록, 구분선)을 떼어낸다
        //   3. 떼고 나서 2자 이하로 남으면 다음 줄로 넘어간다
        //      — '---', '#', '요' 같은 줄이 제목이 되는 것을 막는다
        //   4. 30자를 넘으면 공백 경계에서 자르고 말줄임을 붙인다
        //   5. 쓸 만한 줄이 하나도 없으면 본문 전체를 한 줄로 눌러 잘라 쓴다
        //
        // ★ 첫 줄이 "너는 ~로서" 같은 역할 지정이어도 그대로 쓴다.
        //   패턴을 감지해 건너뛰면 동작이 예측하기 어려워지고, 가장 정보량이
        //   많은 줄을 버릴 수 있다. 어차피 제안일 뿐이고 사용자가 고칠 수 있다.
        function suggestTitle(content) {
            const MAX = 30;
            if (!content) return '';

            const lines = String(content).split('\n');

            for (const line of lines) {
                let text = line.trim();
                if (!text) continue;

                text = text
                    .replace(/^#{1,6}\s*/, '')      // # 헤더
                    .replace(/^[-*+]\s+/, '')       // 불릿
                    .replace(/^>\s*/, '')           // 인용
                    .replace(/^\d+[.)]\s+/, '')     // 번호 목록
                    .replace(/^[-=*_]{3,}$/, '')    // 구분선
                    .trim();

                if (text.length <= 2) continue;

                if (text.length <= MAX) return text;

                // 단어 중간에서 끊기지 않도록 30자 안의 마지막 공백을 찾는다
                const head = text.slice(0, MAX);
                const cut = head.lastIndexOf(' ');
                return (cut > MAX / 2 ? head.slice(0, cut) : head).trim() + '…';
            }

            const flat = String(content).replace(/\s+/g, ' ').trim();
            if (!flat) return '';
            return flat.length <= MAX ? flat : flat.slice(0, MAX) + '…';
        }

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
