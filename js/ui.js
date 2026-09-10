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

        // ========================================
        // T-115: 손상 복구 배너
        // ========================================
        //
        // ★ 정상 렌더 경로에 의존하지 않는다.
        //   프롬프트·즐겨찾기·카테고리 중 하나라도 깨지면 initializeData 가 throw 하고
        //   main.js 리스너1이 렌더링을 중단한다 — 화면이 통째로 비는 상황에서
        //   조작할 수 있는 것이 이 배너뿐이어야 한다.
        //   그래서 index.html 에 미리 있는 정적 마크업을 보이기만 한다.
        //
        // ★ 이 함수는 예외를 던지지 않는다. 복구 UI 가 깨지면 복구가 불가능해진다.

        // 내부 키 → 사람이 읽는 이름
        //
        // ★ 둘 다 보여준다. 이름만 보여주면 무엇을 잃었는지는 알지만
        //   내려받은 파일명·콘솔 로그와 이어지지 않는다.
        //   키만 보여주면 심각도를 가늠할 수 없다.
        function storageKeyLabel(key) {
            if (key === STORAGE_KEY) return '프롬프트 목록';
            if (key === FAVORITES_KEY) return '즐겨찾기';
            if (key === CATEGORIES_KEY) return '카테고리';
            if (key === SEARCH_HISTORY_KEY) return '검색 기록';
            if (key === THEME_KEY) return '테마 설정';
            return key;
        }

        // 손상된 원본 내려받기 (rawBackup)
        //
        // ★ exportData() 를 쓰지 않는다. 초기화가 중단된 상태에서는 allPrompts 가
        //   비어 있어 **빈 백업**이 나오고, 사용자는 백업했다고 믿게 된다.
        //   그것이 가장 위험한 결과다.
        //   rawBackup 은 파싱이 필요 없는 원본 문자열이라 손상 상태에서도 항상 된다.
        function downloadRawBackups() {
            try {
                const raw = (typeof PromptStorage !== 'undefined' && PromptStorage.rawBackup) || {};
                const keys = Object.keys(raw);

                if (keys.length === 0) {
                    showToast('내려받을 손상 원본이 없습니다');
                    return;
                }

                const today = new Date().toISOString().split('T')[0];
                keys.forEach(function (key) {
                    const blob = new Blob([raw[key]], { type: 'text/plain;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    // 파일명에는 내부 키를 쓴다 — 콘솔 로그·배너와 같은 이름이라야 추적된다
                    a.download = 'prompt-dict-손상원본-' + key + '-' + today + '.txt';
                    a.click();
                    URL.revokeObjectURL(url);
                });

                // ★ 순서 강제용 표시. removeAll() 이 rawBackup 을 비우므로
                //   내려받기가 반드시 초기화보다 먼저여야 한다.
                const banner = document.getElementById('recovery-banner');
                if (banner) banner.dataset.downloaded = '1';

                showToast(keys.length + '개 원본을 내려받았습니다 — 파일을 확인한 뒤 초기화하세요');
            } catch (error) {
                console.error('[복구] 원본 내려받기 실패:', error);
                showToast('원본을 내려받지 못했습니다 ❌ 콘솔의 PromptStorage.rawBackup 을 확인하세요');
            }
        }

        // 저장소 전체 초기화 후 새로고침
        //
        // ★ removeAll() 은 저장소만 비운다. allPrompts·categories·favoriteIds 는
        //   메모리에 그대로 남아, 이후 무엇이든 저장하면 지운 데이터가 되살아난다.
        //   전역을 하나씩 리셋하면 빠뜨린 하나가 그대로 버그가 되므로
        //   새로고침으로 통째로 초기화한다. 사용자가 확인한 의도적 동작이다.
        async function resetAllStoredData() {
            try {
                const banner = document.getElementById('recovery-banner');
                const downloaded = !!(banner && banner.dataset.downloaded === '1');

                // ★ 원본을 안 받았으면 한 번 더 막는다. 되돌릴 수 없는 지점이다.
                if (!downloaded) {
                    const proceed = confirm(
                        '⚠️ 손상된 원본을 아직 내려받지 않았습니다.\n\n' +
                        '초기화하면 원본이 영구히 사라져 복구할 수 없습니다.\n' +
                        '먼저 "손상된 원본 내려받기"를 누르시길 권합니다.\n\n' +
                        '그래도 계속하시겠습니까?'
                    );
                    if (!proceed) return;
                }

                const first = confirm(
                    '⚠️ 저장된 데이터를 전부 삭제합니다.\n\n' +
                    '프롬프트 · 카테고리 · 즐겨찾기 · 검색 기록 · 테마가 모두 사라집니다.\n\n' +
                    '계속하시겠습니까?'
                );
                if (!first) return;

                const second = confirm(
                    '🔴 최종 확인\n\n' +
                    '되돌릴 수 없습니다. 정말 초기화하시겠습니까?'
                );
                if (!second) return;

                if (await PromptStorage.removeAll() !== true) {
                    showToast('초기화에 실패했습니다 ❌ 원본은 그대로입니다');
                    return;
                }

                location.reload();
            } catch (error) {
                console.error('[복구] 초기화 실패:', error);
                showToast('초기화 중 오류가 발생했습니다 ❌');
            }
        }

        // 배너 표시
        //
        // options.fatal — 초기화가 중단된 상황(화면이 비어 있다). 닫기를 숨긴다.
        function showRecoveryBanner(options) {
            try {
                const banner = document.getElementById('recovery-banner');
                if (!banner) return;

                const fatal = !!(options && options.fatal);
                const keys = (typeof PromptStorage !== 'undefined' && PromptStorage.failedKeys)
                    ? Array.from(PromptStorage.failedKeys)
                    : [];

                if (keys.length === 0 && !fatal) return;

                // ★ 여러 키가 깨져도 배너는 하나다. 목록으로 보여준다.
                //   배너를 쌓으면 되돌릴 수 없는 [초기화] 버튼이 여러 개 생기는데,
                //   초기화는 어차피 전체 대상이라 키마다 두는 것 자체가 틀린 그림이다.
                const listHtml = keys.length > 0
                    ? '<ul class="recovery-keys">' + keys.map(function (key) {
                          return '<li><strong>' + escapeHtml(storageKeyLabel(key)) + '</strong> ' +
                                 '<code>' + escapeHtml(key) + '</code></li>';
                      }).join('') + '</ul>'
                    : '';

                const headline = fatal
                    ? '저장된 데이터를 읽지 못해 화면을 그리지 않았습니다'
                    : '일부 저장 데이터가 손상되었습니다';

                const detail = fatal
                    ? '손상된 원본을 덮어쓰지 않기 위한 조치입니다. 아래 순서로 복구하세요.'
                    : '해당 항목의 저장만 잠갔습니다. 다른 항목은 정상 동작합니다.';

                const body = banner.querySelector('.recovery-body');
                if (body) {
                    body.innerHTML =
                        '<div class="recovery-title">⚠ ' + escapeHtml(headline) + '</div>' +
                        '<div class="recovery-detail">' + escapeHtml(detail) + '</div>' +
                        listHtml +
                        '<div class="recovery-steps">' +
                            '① 원본을 내려받아 보관 → ② 초기화 → ③ 상단 [불러오기]로 백업 복원' +
                        '</div>';
                }

                const closeBtn = banner.querySelector('#recovery-close-btn');
                if (closeBtn) closeBtn.style.display = fatal ? 'none' : '';

                wireRecoveryBanner(banner);
                banner.style.display = 'block';
            } catch (error) {
                // ★ 여기서 던지면 복구 자체가 막힌다. 콘솔에만 남긴다.
                console.error('[복구 배너] 표시 실패:', error);
            }
        }

        function hideRecoveryBanner() {
            const banner = document.getElementById('recovery-banner');
            if (banner) banner.style.display = 'none';
        }

        // 리스너는 한 번만 건다. 배너를 띄우는 쪽에서 호출하므로
        // "배선되지 않은 배너"가 나올 수 없다 — 초기화 순서에 의존하지 않는다.
        function wireRecoveryBanner(banner) {
            if (!banner || banner.dataset.wired === '1') return;
            banner.dataset.wired = '1';

            const downloadBtn = banner.querySelector('#recovery-download-btn');
            if (downloadBtn) downloadBtn.addEventListener('click', downloadRawBackups);

            const resetBtn = banner.querySelector('#recovery-reset-btn');
            if (resetBtn) {
                resetBtn.addEventListener('click', function () { resetAllStoredData(); });
            }

            const closeBtn = banner.querySelector('#recovery-close-btn');
            if (closeBtn) closeBtn.addEventListener('click', hideRecoveryBanner);
        }

        // ========================================
        // T-211: 맨 위 / 맨 아래 스크롤 버튼
        // ========================================
        //
        // ★ 두 버튼을 다 두되 각자 필요할 때만 보인다.
        //   맨 위에서 ↑, 맨 아래에서 ↓ 는 눌러도 아무 일이 없는데,
        //   죽은 버튼이 계속 보이면 사용자가 컨트롤 자체를 무시하게 된다.
        //   하나로 합쳐 상황에 따라 뜻을 바꾸는 것은 더 나쁘다 —
        //   같은 자리가 다른 일을 하면 예측할 수 없고, 목록 중간에서는 둘 다 필요하다.
        //
        // ★ 숨길 때 display 가 아니라 visibility 를 쓴다.
        //   display:none 이면 ↓ 가 사라질 때 ↑ 가 그 자리로 내려온다 —
        //   커서 아래에서 버튼이 움직이면 오클릭이 난다. 자리는 항상 고정.
        //   (visibility:hidden 은 탭 순서에서도 빠지므로 키보드 접근도 맞다)

        // 버튼이 나타나는 기준 — 화면 높이의 절반
        //
        // ★ 고정 px 로 잡으면 900px 화면과 1440px 화면에서 체감이 달라진다.
        //   "한 화면의 절반쯤 지나왔다" 는 화면 크기에 비례해야 같은 의미가 된다.
        function scrollButtonThreshold() {
            return Math.max(200, window.innerHeight / 2);
        }

        // 스크롤 위치에 따라 두 버튼의 표시를 갱신한다.
        function updateScrollButtons() {
            const box = document.getElementById('scroll-buttons');
            if (!box) return;

            const topBtn = document.getElementById('scroll-top-btn');
            const bottomBtn = document.getElementById('scroll-bottom-btn');

            const doc = document.documentElement;
            const scrolled = window.pageYOffset || doc.scrollTop || 0;
            const viewport = window.innerHeight;
            const total = Math.max(doc.scrollHeight, document.body.scrollHeight);
            const remaining = total - viewport - scrolled;
            const threshold = scrollButtonThreshold();

            // ★ 스크롤할 것이 없으면 통째로 감춘다.
            //   필터로 2~3개만 남았을 때 떠 있는 버튼은 방해만 된다.
            //
            // ★ 기준을 임계값과 같게 잡는다. 스크롤 가능 거리가 임계값 이하면
            //   scrolled > threshold 도 remaining > threshold 도 결코 참이 될 수 없어
            //   두 버튼이 영원히 숨어 있다 — 그럴 바엔 상자째 없앤다.
            //   (카드 1장일 때 문서가 뷰포트보다 10px 큰 경우가 실제로 나왔다.
            //    몇 px 이라도 스크롤되면 표시하는 기준은 쓸모없는 버튼을 남긴다)
            if (total - viewport <= threshold) {
                box.style.display = 'none';
                return;
            }
            box.style.display = '';

            if (topBtn) topBtn.style.visibility = scrolled > threshold ? 'visible' : 'hidden';
            if (bottomBtn) bottomBtn.style.visibility = remaining > threshold ? 'visible' : 'hidden';
        }

        // 부드럽게 스크롤한다.
        //
        // ★ 즉시 이동하면 150개 목록에서 "어디로 왔는지" 감각이 끊긴다.
        //   다만 prefers-reduced-motion 을 존중한다 — 움직임에 민감한 사용자에게는
        //   부드러운 스크롤이 그 자체로 문제다.
        function scrollToPosition(top) {
            let behavior = 'smooth';
            if (window.matchMedia &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                behavior = 'auto';
            }

            try {
                window.scrollTo({ top: top, behavior: behavior });
            } catch (error) {
                // 옵션 객체를 못 받는 환경 대비
                window.scrollTo(0, top);
            }
        }

        function setupScrollButtons() {
            const box = document.getElementById('scroll-buttons');
            if (!box) return;

            const topBtn = document.getElementById('scroll-top-btn');
            const bottomBtn = document.getElementById('scroll-bottom-btn');

            if (topBtn) {
                topBtn.addEventListener('click', function () { scrollToPosition(0); });
            }
            if (bottomBtn) {
                bottomBtn.addEventListener('click', function () {
                    const doc = document.documentElement;
                    scrollToPosition(Math.max(doc.scrollHeight, document.body.scrollHeight));
                });
            }

            // ★ 스크롤 이벤트마다 레이아웃을 읽으면 150개에서 버벅인다.
            //   requestAnimationFrame 으로 한 프레임에 한 번만 계산한다.
            //   passive: true — 이 핸들러는 preventDefault 를 쓰지 않으므로
            //   브라우저가 스크롤을 기다리지 않아도 된다고 알려준다.
            let ticking = false;
            function onScroll() {
                if (ticking) return;
                ticking = true;
                requestAnimationFrame(function () {
                    ticking = false;
                    updateScrollButtons();
                });
            }

            window.addEventListener('scroll', onScroll, { passive: true });
            window.addEventListener('resize', onScroll, { passive: true });

            updateScrollButtons();
        }

        // T-117: 프롬프트의 "마지막 수정 시각"
        //
        // ★ updatedAt 이 없으면 createdAt 으로 폴백한다.
        //   기존 데이터에 값을 채워 넣지 않는 이유: createdAt 을 복사하면
        //   "생성 시각에 수정됨" 이라는 **거짓을 저장**하게 되고,
        //   진짜 수정과 구별할 수 없어진다.
        //   **부재가 곧 정보다 — 생성 후 한 번도 수정되지 않았다는 뜻.**
        //   폴백을 여기 한 곳에 가둬 읽는 쪽이 매번 기억하지 않게 한다.
        function promptUpdatedAt(prompt) {
            if (!prompt) return 0;
            return prompt.updatedAt || prompt.createdAt;
        }

        // 수정 시각 도장. 제자리 변경 경로에서 부른다.
        //
        // ★ "수정" 은 사용자가 **그 프롬프트를 대상으로** 한 변경만이다.
        //   - 폼 수정 / 일괄 분류(T-105) / 카테고리 삭제로 인한 소속 변경 → 갱신
        //   - editCategory(이름 변경) → 갱신하지 않는다.
        //     소속은 그대로고 라벨만 바뀐다. 개명 한 번에 100개가 같은 시각이
        //     되면 "수정순" 정렬이 통째로 무너진다.
        //   - 즐겨찾기 → 갱신하지 않는다. 프롬프트 객체를 건드리지 않고,
        //     갱신하면 별 하나에 allPrompts 를 저장해야 해서
        //     T-118 이 떼어내려는 두 키 동시 저장이 되살아난다.
        function touchPrompt(prompt) {
            if (prompt) prompt.updatedAt = new Date().toISOString();
        }
