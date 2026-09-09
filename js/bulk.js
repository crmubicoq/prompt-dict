        // ========================================
        // T-104: 일괄 붙여넣기
        // ========================================
        //
        // ★ 이 파일에는 함수 선언만 둔다. 최상위 실행문·DOM 접근·전역 상태 변경 없음.
        //   초기화 호출은 main.js 에서 한다 (devlog §1.3).
        //
        // T-104a 는 분할 규칙만 담당한다. UI 연결은 T-104b, 저장은 T-104e.

        // 구분자 종류 — 라디오 버튼의 value 와 같은 문자열을 쓴다.
        //
        //   'blank2'  빈 줄 2개    /\n\s*\n\s*\n/
        //   'dashes'  ---          줄 전체가 하이픈 3개 이상일 때만
        //   'equals'  ===          줄 전체가 등호 3개 이상일 때만
        //   'custom'  직접 입력    사용자 문자열. 줄 전체 일치가 아니라 단순 분할
        //   'none'    나누지 않음  전체를 조각 1개로
        //
        // ★ 이름 있는 상수를 두지 않은 이유: 이 파일에 최상위 const 를 만들면
        //   그것도 최상위 실행문이다. 상수가 필요해지면 config.js 로 간다.

        // 줄바꿈 정규화
        //
        // ★ 이것이 trim 외에 조각 내용에 가하는 **유일한** 변형이다.
        //   윈도우 메모장에서 붙여넣으면 \r\n 이 들어온다. 섞인 채로 저장하면
        //   검색·내보내기·P2 개선이력 diff 가 전부 줄바꿈 차이에 걸린다.
        //   전송 과정에서 생긴 표기 차이지 사용자가 쓴 내용이 아니다.
        //   설계 문서 §2 "(\r\n 정규화 후)" 에 따른다.
        function normalizeLineEndings(text) {
            return String(text === null || text === undefined ? '' : text)
                .replace(/\r\n/g, '\n')
                .replace(/\r/g, '\n');
        }

        // 텍스트를 조각으로 나눈다.
        //
        //   splitChunks(text, 'blank2')
        //   splitChunks(text, 'custom', '###')
        //
        // 각 조각은 trim() 만 한다. 그 외 변형 없음 — 본문은 원문 그대로 보존한다
        // (CLAUDE.md 절대 금지). 빈 조각은 결과에서 뺀다.
        //
        // 반환: 문자열 배열. 나눌 것이 없으면 빈 배열.
        function splitChunks(text, delimiter, customDelimiter) {
            const normalized = normalizeLineEndings(text);

            // 공백뿐인 입력은 조각이 없다
            if (normalized.trim().length === 0) return [];

            let parts;

            switch (delimiter) {
                case 'blank2':
                    // 빈 줄 2개 = 줄바꿈 3개. 사이에 공백·탭만 있어도 빈 줄로 본다.
                    // \s 가 \n 을 포함하므로 줄바꿈이 4개 이상 연달아도 한 번에 잡힌다.
                    parts = normalized.split(/\n\s*\n\s*\n/);
                    break;

                case 'dashes':
                    // 줄 전체가 하이픈일 때만. 본문 중간의 "a---b" 는 나누지 않는다.
                    parts = normalized.split(/^[ \t]*-{3,}[ \t]*$/m);
                    break;

                case 'equals':
                    parts = normalized.split(/^[ \t]*={3,}[ \t]*$/m);
                    break;

                case 'custom': {
                    const needle = normalizeLineEndings(
                        typeof customDelimiter === 'string' ? customDelimiter : ''
                    );

                    // ★ 빈 구분자로는 나눌 수 없다. ''.split('') 은 글자 단위로 쪼개진다.
                    //   전체를 조각 1개로 돌려주면 사용자가 의도하지 않은 등록이 일어난다.
                    //   아무것도 없다고 보는 편이 안전하다 — 화면에 0개로 보인다.
                    if (needle.length === 0) return [];

                    // ★ 정규식이 아니라 문자열 분할이다. String.split 에 문자열을 주면
                    //   리터럴로 찾으므로 . * + ? 같은 특수문자를 이스케이프할 필요가 없다.
                    //   정규식을 만들어 쓰면 이스케이프가 필요해지고 빠뜨리면 오동작한다.
                    parts = normalized.split(needle);
                    break;
                }

                case 'none':
                    parts = [normalized];
                    break;

                default:
                    // 조용한 실패 금지 — 잘못된 구분자는 즉시 드러낸다
                    throw new Error('알 수 없는 구분자입니다: ' + delimiter);
            }

            return parts
                .map(function (part) { return part.trim(); })
                .filter(function (part) { return part.length > 0; });
        }

        // 모든 구분자의 분할 개수를 한 번에 계산한다 (설계 §2 "개수 전부 실시간 표시").
        //
        // ★ 개수를 따로 세지 않고 splitChunks 를 그대로 부른다.
        //   화면의 숫자는 "이 구분자를 고르면 이만큼 등록된다"는 약속이다.
        //   세는 코드를 따로 두면 두 구현이 언젠가 어긋나고, 그때 숫자는
        //   약속이 아니라 거짓말이 된다.
        //
        // 직접 입력은 값이 없으면 개수를 낼 수 없으므로 null 을 준다 (화면에는 "—").
        function countByDelimiter(text, customDelimiter) {
            const hasCustom = typeof customDelimiter === 'string' && customDelimiter.length > 0;

            return {
                blank2: splitChunks(text, 'blank2').length,
                dashes: splitChunks(text, 'dashes').length,
                equals: splitChunks(text, 'equals').length,
                custom: hasCustom ? splitChunks(text, 'custom', customDelimiter).length : null,
                none: splitChunks(text, 'none').length
            };
        }

        // ========================================
        // T-104b: 모달 · 구분자 개수 실시간 표시
        // ========================================
        //
        // ★ 인라인 onclick 을 쓰지 않는다 (T-113). 모달 컨테이너에 위임한다.
        // ★ 접힌/숨긴 영역에 required 를 두지 않는다 (T-102 회귀 항목).
        //   이 모달에는 required 가 하나도 없다 — 등록 가능 여부는 조각 개수로 판단한다.

        // 지금 선택된 구분자
        function currentBulkDelimiter() {
            const checked = document.querySelector('input[name="bulk-delimiter"]:checked');
            return checked ? checked.value : 'blank2';
        }

        // 조각이 너무 많을 때의 경고 (설계 §10.2)
        //
        // ★ 막지 않는다. 전량 롤백이 있어 실수해도 복구되고,
        //   막으면 정당한 대량 입력까지 막힌다.
        // ★ 개수만 보여주지 않는다. 실제 원인 1순위를 문장으로 지목한다 —
        //   숫자만 보면 사용자가 원인을 짐작해야 한다.
        function updateBulkWarning(count) {
            const el = document.getElementById('bulk-warning');
            if (!el) return;

            if (typeof count === 'number' && count > 200) {
                // textContent 다 — 숫자뿐이라 주입 여지가 없고, 이스케이프도 필요 없다
                el.textContent =
                    '⚠ 조각이 ' + count + '개입니다. 구분자를 잘못 고르셨을 수 있습니다.\n' +
                    '각 조각의 길이를 확인해 주세요. 등록을 막지는 않습니다 — ' +
                    '저장에 실패하면 전부 되돌립니다.';
                el.style.display = 'block';
            } else {
                el.textContent = '';
                el.style.display = 'none';
            }
        }

        // 툴바 요약 (T-104c 에서 "N개 중 M개 선택" 으로 확장된다)
        function updateBulkSummary(text, delimiter, count) {
            const el = document.getElementById('bulk-summary');
            if (!el) return;

            if (String(text).trim().length === 0) {
                el.textContent = '붙여넣은 텍스트가 없습니다';
            } else if (count === null) {
                el.textContent = '직접 입력 구분자를 입력해 주세요';
            } else {
                el.textContent = '조각 ' + count + '개';
            }
        }

        // 모든 구분자의 개수를 다시 계산해 화면에 반영한다.
        function refreshBulkCounts() {
            const textEl = document.getElementById('bulk-text');
            if (!textEl) return;

            const customEl = document.getElementById('bulk-custom-delimiter');
            const text = textEl.value;
            const counts = countByDelimiter(text, customEl ? customEl.value : '');

            // 옵션별 개수
            Object.keys(counts).forEach(function (kind) {
                const el = document.querySelector('[data-count-for="' + kind + '"]');
                if (!el) return;
                el.textContent = counts[kind] === null ? '(—)' : '(' + counts[kind] + '개)';
            });

            // 선택된 옵션 강조 — 무엇이 등록될지 한눈에 보이게 한다
            const selected = currentBulkDelimiter();
            const options = document.querySelectorAll('#bulk-delimiter-group .bulk-delimiter-option');
            options.forEach(function (option) {
                const radio = option.querySelector('input[type="radio"]');
                option.classList.toggle('selected', !!radio && radio.value === selected);
            });

            const selectedCount = counts[selected];
            updateBulkSummary(text, selected, selectedCount);
            updateBulkWarning(selectedCount);
        }

        function openBulkModal() {
            const overlay = document.getElementById('bulk-modal-overlay');
            if (!overlay) return;

            overlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';

            refreshBulkCounts();

            const textEl = document.getElementById('bulk-text');
            if (textEl) textEl.focus();
        }

        function closeBulkModal() {
            const textEl = document.getElementById('bulk-text');

            // ★ 기존 추가 모달(closeModal)과 같은 관례 — 작성 중인 내용이 있으면 확인한다.
            //   150개를 붙여넣고 배경을 잘못 눌러 날리는 것이 가장 아픈 실수다.
            //   등록 후에는 textarea 가 비므로 이 확인이 뜨지 않는다.
            if (textEl && textEl.value.trim().length > 0) {
                const shouldClose = confirm(
                    '⚠️ 붙여넣은 텍스트가 있습니다.\n' +
                    '정말 닫으시겠습니까?\n\n' +
                    '아직 등록하지 않은 내용이 모두 사라집니다.'
                );
                if (!shouldClose) return;
            }

            const overlay = document.getElementById('bulk-modal-overlay');
            if (overlay) overlay.style.display = 'none';
            document.body.style.overflow = 'auto';

            if (textEl) textEl.value = '';

            const list = document.getElementById('bulk-preview-list');
            if (list) list.innerHTML = '';

            // 구분자 선택과 직접 입력 값은 남긴다 — 같은 소스를 이어 넣을 때 유용하다 (설계 §10.3)
            refreshBulkCounts();
        }

        // 초기화. main.js 에서 한 번 호출한다.
        function setupBulkPaste() {
            const openBtn = document.getElementById('bulk-paste-btn');
            const overlay = document.getElementById('bulk-modal-overlay');
            const modal = document.getElementById('bulk-modal');
            if (!openBtn || !overlay || !modal) return;

            openBtn.addEventListener('click', openBulkModal);

            const closeBtn = document.getElementById('close-bulk-modal');
            if (closeBtn) closeBtn.addEventListener('click', closeBulkModal);

            const cancelBtn = document.getElementById('bulk-cancel-btn');
            if (cancelBtn) cancelBtn.addEventListener('click', closeBulkModal);

            // 배경 클릭 (기존 모달과 동일 — closeBulkModal 이 확인을 담당한다)
            overlay.addEventListener('click', function (event) {
                if (event.target === overlay) closeBulkModal();
            });

            // ★ 개수 계산을 한 틱 미뤄 합친다.
            //   같은 입력에 input 과 change 가 함께 오는 경우가 있어 두 번 도는 것을 막는다.
            //   (1000개·811KB 에 2ms 라 성능 자체는 여유가 있다)
            let pending = 0;
            function scheduleRefresh() {
                if (pending) return;
                pending = setTimeout(function () {
                    pending = 0;
                    refreshBulkCounts();
                }, 0);
            }

            modal.addEventListener('input', function (event) {
                // 직접 입력 칸에 쓰면 그 라디오를 자동으로 고른다 —
                // 입력했는데 아무 일도 일어나지 않는 상태를 만들지 않는다.
                if (event.target && event.target.id === 'bulk-custom-delimiter') {
                    const customRadio = modal.querySelector('input[name="bulk-delimiter"][value="custom"]');
                    if (customRadio) customRadio.checked = true;
                }
                scheduleRefresh();
            });

            modal.addEventListener('change', scheduleRefresh);
        }
