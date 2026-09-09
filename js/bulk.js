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

            updateBulkWarning(counts[selected]);
        }

        function openBulkModal() {
            const overlay = document.getElementById('bulk-modal-overlay');
            if (!overlay) return;

            overlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';

            refreshBulkSource();

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

            // 행 상태도 버린다 — 다음에 열 때 남은 편집이 되살아나면 안 된다
            const state = bulkState();
            state.rows = [];
            state.sourceText = '';

            // 구분자 선택과 직접 입력 값은 남긴다 — 같은 소스를 이어 넣을 때 유용하다 (설계 §10.3)
            refreshBulkCounts();
            updateBulkSelectionSummary();
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
            // ★ 개수는 즉시, 미리보기 행은 입력이 멎은 뒤에 그린다.
            //   개수 계산은 1ms 수준이지만 150행 렌더는 ~190ms 다(실측).
            //   입력마다 다시 그리면 타이핑이 눈에 띄게 끊긴다.
            //   숫자는 바로 보여줘야 구분자를 고르는 판단이 끊기지 않으므로 둘을 분리한다.
            let pendingPreview = 0;
            function scheduleRefresh() {
                refreshBulkCounts();

                if (pendingPreview) clearTimeout(pendingPreview);
                pendingPreview = setTimeout(function () {
                    pendingPreview = 0;
                    refreshBulkSource();
                }, 180);
            }

            // ★ 미리보기 행에서 올라온 이벤트는 여기서 처리하지 않는다.
            //   제목을 한 글자 고칠 때마다 재분할이 돌면 편집이 그 자리에서 날아간다.
            //   행 이벤트는 setupBulkPreviewDelegation 이 따로 받는다.
            function isPreviewEvent(target) {
                return !!(target && typeof target.closest === 'function' &&
                          target.closest('#bulk-preview-list'));
            }

            modal.addEventListener('input', function (event) {
                if (isPreviewEvent(event.target)) return;

                // 직접 입력 칸에 쓰면 그 라디오를 자동으로 고른다 —
                // 입력했는데 아무 일도 일어나지 않는 상태를 만들지 않는다.
                if (event.target && event.target.id === 'bulk-custom-delimiter') {
                    const customRadio = modal.querySelector('input[name="bulk-delimiter"][value="custom"]');
                    if (customRadio) customRadio.checked = true;
                }
                scheduleRefresh();
            });

            modal.addEventListener('change', function (event) {
                if (isPreviewEvent(event.target)) return;
                scheduleRefresh();
            });

            // 전체 선택 / 전체 해제
            const selectAllBtn = document.getElementById('bulk-select-all');
            if (selectAllBtn) selectAllBtn.addEventListener('click', function () { setAllBulkChecked(true); });

            const selectNoneBtn = document.getElementById('bulk-select-none');
            if (selectNoneBtn) selectNoneBtn.addEventListener('click', function () { setAllBulkChecked(false); });

            setupBulkPreviewDelegation();
        }

        // ========================================
        // T-104c+d: 미리보기 행 · 경고 배지
        // ========================================
        //
        // ★ 인라인 onclick 없이 #bulk-preview-list 위임 하나로 처리한다 (T-113).
        // ★ 붙여넣기 텍스트는 정확히 "외부에서 들어온 문자열"이다. escapeHtml 필수.

        // 미리보기 상태.
        //
        // ★ 최상위 실행문을 만들지 않으려고 지연 초기화한다 (devlog §1.3).
        //   config.js 에 두지 않은 이유: 이 상태는 모달이 열려 있는 동안만 의미가 있고
        //   앱 전역 상태가 아니다.
        function bulkState() {
            if (!window.__bulkState) {
                window.__bulkState = {
                    rows: [],        // { chunk, title, body, checked, expanded, warnings }
                    sourceText: '',  // 마지막으로 렌더한 원본
                    delimiter: 'blank2',
                    custom: ''
                };
            }
            return window.__bulkState;
        }

        // 중복 비교용 정규화 (설계 §4) — 공백 차이만 무시하고 완전 일치만 본다.
        // 유사도는 쓰지 않는다. 오탐 비용이 크고 클라이언트 연산 제약에도 맞지 않는다.
        function normalizeForCompare(text) {
            return String(text).replace(/\s+/g, ' ').trim();
        }

        // 조각 하나의 경고를 판정한다.
        //
        // 배지와 기본 체크 상태 (설계 §3 + T-104d 판단)
        //
        //   ⚠ 짧음        20자 미만        기본 해제
        //     구분자를 잘못 고르면 짧은 조각이 대량으로 생긴다. 기본 해제면
        //     실수했을 때 쓰레기가 아니라 아무것도 등록되지 않는다.
        //
        //   ⚠ 김          5,000자 초과     기본 유지
        //     쪼개기 실패 신호일 수 있지만 정당하게 긴 프롬프트일 수도 있다.
        //     해제하면 사용자가 넣으려던 실제 내용이 조용히 빠진다.
        //     대량으로 생기지도 않으므로 배지만으로 충분하다.
        //
        //   ⚠ 기존과 중복  저장된 프롬프트와 일치   기본 해제
        //     같은 소스를 두 번 붙여넣는 것이 가장 흔한 원인이다.
        //     등록해봐야 정리할 일만 늘어난다.
        //
        //   ⚠ 조각 중복    앞선 조각과 일치         2번째부터 기본 해제
        //     ★ 둘 다 해제하면 내용이 통째로 사라진다. 첫 번째는 남긴다.
        //       한 번만 넣는 것이 사실상 항상 의도다.
        function detectChunkWarnings(chunk, existingSet, seenSet) {
            const warnings = [];
            const normalized = normalizeForCompare(chunk);

            if (chunk.length < 20) warnings.push('short');
            if (chunk.length > 5000) warnings.push('long');
            if (existingSet.has(normalized)) warnings.push('dupExisting');
            if (seenSet.has(normalized)) warnings.push('dupChunk');

            return warnings;
        }

        // 경고 목록 → 기본 체크 여부
        function defaultCheckedFor(warnings) {
            if (warnings.indexOf('short') >= 0) return false;
            if (warnings.indexOf('dupExisting') >= 0) return false;
            if (warnings.indexOf('dupChunk') >= 0) return false;
            // 'long' 은 유지한다
            return true;
        }

        function badgeLabel(kind) {
            if (kind === 'short') return '⚠ 짧음';
            if (kind === 'long') return '⚠ 김';
            if (kind === 'dupExisting') return '⚠ 기존과 중복';
            if (kind === 'dupChunk') return '⚠ 조각 중복';
            return '⚠';
        }

        // 조각 배열 → 행 배열
        function buildBulkRows(chunks) {
            // 기존 프롬프트 본문 집합 (한 번만 만든다)
            const existingSet = new Set();
            if (typeof allPrompts !== 'undefined' && Array.isArray(allPrompts)) {
                allPrompts.forEach(function (p) {
                    if (p && typeof p.content === 'string') existingSet.add(normalizeForCompare(p.content));
                });
            }

            const seenSet = new Set();

            return chunks.map(function (chunk) {
                const warnings = detectChunkWarnings(chunk, existingSet, seenSet);
                seenSet.add(normalizeForCompare(chunk));

                return {
                    chunk: chunk,
                    title: suggestTitle(chunk) || '제목 없음',
                    body: chunk,
                    checked: defaultCheckedFor(warnings),
                    expanded: false,
                    warnings: warnings
                };
            });
        }

        // 접힘 상태에서 보여줄 본문 한 줄
        function bulkBodyPeek(body) {
            const lines = String(body).split('\n');
            let first = '';
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].trim().length > 0) { first = lines[i].trim(); break; }
            }
            return first.length > 90 ? first.slice(0, 90) + '…' : first;
        }

        // 편집된 행이 있는가 (제목이 제안과 다르거나, 본문이 원본과 다르면 편집)
        function bulkHasEdits() {
            return bulkState().rows.some(function (row) {
                return row.title !== (suggestTitle(row.chunk) || '제목 없음') || row.body !== row.chunk;
            });
        }

        // 미리보기 목록 렌더
        //
        // ★ 150행을 전량 렌더한다. 가상 스크롤은 P2 T-202 몫이다 (설계 §3).
        //   각 행은 제목 input 하나만 갖는다 — 본문 textarea 는 펼칠 때 만든다.
        function renderBulkPreview() {
            const list = document.getElementById('bulk-preview-list');
            if (!list) return;

            const rows = bulkState().rows;

            if (rows.length === 0) {
                list.innerHTML = '';
                return;
            }

            const html = rows.map(function (row, index) {
                const badges = row.warnings.map(function (kind) {
                    return '<span class="bulk-badge bulk-badge-' + kind + '">' +
                           escapeHtml(badgeLabel(kind)) + '</span>';
                }).join('');

                return '' +
                    '<div class="bulk-row' + (row.checked ? '' : ' unchecked') + '" data-idx="' + index + '">' +
                        '<div class="bulk-row-main">' +
                            '<input type="checkbox" class="bulk-row-check" data-action="toggle"' +
                                   (row.checked ? ' checked' : '') + '>' +
                            '<span class="bulk-row-num">' + (index + 1) + '</span>' +
                            '<input type="text" class="bulk-row-title" data-action="title" ' +
                                   'value="' + escapeHtml(row.title) + '">' +
                            '<span class="bulk-row-len">' + row.body.length + '자</span>' +
                            badges +
                            '<button type="button" class="bulk-row-expand" data-action="expand" ' +
                                    'title="본문 펼치기">' + (row.expanded ? '⌃' : '⌄') + '</button>' +
                        '</div>' +
                        '<div class="bulk-row-peek"' + (row.expanded ? ' style="display:none;"' : '') + '>' +
                            escapeHtml(bulkBodyPeek(row.body)) +
                        '</div>' +
                        '<div class="bulk-row-body"' + (row.expanded ? '' : ' style="display:none;"') + '></div>' +
                    '</div>';
            }).join('');

            list.innerHTML = html;

            // 펼쳐진 행의 textarea 를 만든다.
            // ★ DOM 으로 만들고 .value 로 넣는다 — 이스케이프가 필요 없는 경로다.
            rows.forEach(function (row, index) {
                if (!row.expanded) return;
                const holder = list.querySelector('.bulk-row[data-idx="' + index + '"] .bulk-row-body');
                if (holder) mountBulkBodyEditor(holder, row);
            });
        }

        function mountBulkBodyEditor(holder, row) {
            holder.innerHTML = '';
            const textarea = document.createElement('textarea');
            textarea.className = 'bulk-row-textarea';
            textarea.rows = 6;
            textarea.setAttribute('data-action', 'body');
            textarea.value = row.body;   // ★ .value 대입 — 이스케이프 불필요
            holder.appendChild(textarea);
        }

        // 상단 요약 · 등록 버튼 라벨
        function updateBulkSelectionSummary() {
            const rows = bulkState().rows;
            const total = rows.length;
            const selected = rows.filter(function (r) { return r.checked; }).length;

            const summary = document.getElementById('bulk-summary');
            if (summary) {
                if (total === 0) {
                    const textEl = document.getElementById('bulk-text');
                    const hasText = textEl && textEl.value.trim().length > 0;
                    const isCustomEmpty = currentBulkDelimiter() === 'custom' &&
                        !(document.getElementById('bulk-custom-delimiter') || {}).value;
                    summary.textContent = !hasText
                        ? '붙여넣은 텍스트가 없습니다'
                        : (isCustomEmpty ? '직접 입력 구분자를 입력해 주세요' : '조각이 없습니다');
                } else {
                    const warned = rows.filter(function (r) { return r.warnings.length > 0; }).length;
                    summary.textContent = total + '개 중 ' + selected + '개 선택됨' +
                        (warned > 0 ? ' · ⚠ ' + warned + '개' : '');
                }
            }

            // 등록 버튼은 T-104e 에서 연결한다. 지금은 라벨만 맞춰 둔다.
            const submitBtn = document.getElementById('bulk-submit-btn');
            if (submitBtn) submitBtn.textContent = selected > 0 ? selected + '개 등록' : '등록';
        }

        // 원본(텍스트·구분자)이 바뀌었을 때 미리보기를 다시 만든다.
        //
        // ★ 재분할하면 편집한 제목·본문은 살아남을 수 없다.
        //   구분자가 바뀌면 조각의 경계 자체가 달라져 "같은 조각"이라는 것이 성립하지 않는다.
        //   그래서 보존을 시도하지 않는다. 대신 조용히 버리지 않는다 — 먼저 묻는다.
        //   거부하면 호출부가 원래 값으로 되돌린다.
        //
        // 반환: 다시 만들었으면 true, 사용자가 거부했으면 false
        function rebuildBulkPreview() {
            const textEl = document.getElementById('bulk-text');
            if (!textEl) return true;

            const customEl = document.getElementById('bulk-custom-delimiter');
            const text = textEl.value;
            const delimiter = currentBulkDelimiter();
            const custom = customEl ? customEl.value : '';

            const state = bulkState();

            // 원본이 그대로면 다시 만들지 않는다 (편집이 날아가지 않게)
            if (state.sourceText === text && state.delimiter === delimiter && state.custom === custom) {
                return true;
            }

            if (state.rows.length > 0 && bulkHasEdits()) {
                const ok = confirm(
                    '⚠️ 수정한 제목이나 본문이 있습니다.\n' +
                    '조각을 다시 나누면 수정한 내용이 사라집니다.\n\n' +
                    '계속하시겠습니까?'
                );
                if (!ok) return false;
            }

            state.rows = buildBulkRows(splitChunks(text, delimiter, custom));
            state.sourceText = text;
            state.delimiter = delimiter;
            state.custom = custom;

            renderBulkPreview();
            return true;
        }

        // 전체 선택 / 전체 해제
        function setAllBulkChecked(checked) {
            bulkState().rows.forEach(function (row) { row.checked = checked; });
            renderBulkPreview();
            updateBulkSelectionSummary();
        }

        // 미리보기 목록 이벤트 위임
        function setupBulkPreviewDelegation() {
            const list = document.getElementById('bulk-preview-list');
            if (!list) return;

            function rowOf(target) {
                const el = target.closest ? target.closest('.bulk-row') : null;
                if (!el) return null;
                const index = parseInt(el.dataset.idx, 10);
                const row = bulkState().rows[index];
                return row ? { index: index, el: el, row: row } : null;
            }

            list.addEventListener('change', function (event) {
                const target = event.target;
                if (!target || typeof target.closest !== 'function') return;
                if (target.dataset.action !== 'toggle') return;

                const found = rowOf(target);
                if (!found) return;

                found.row.checked = target.checked;
                found.el.classList.toggle('unchecked', !target.checked);
                updateBulkSelectionSummary();
            });

            list.addEventListener('input', function (event) {
                const target = event.target;
                if (!target || typeof target.closest !== 'function') return;

                const found = rowOf(target);
                if (!found) return;

                if (target.dataset.action === 'title') {
                    found.row.title = target.value;
                } else if (target.dataset.action === 'body') {
                    found.row.body = target.value;
                    // 글자수는 즉시 반영한다 (전체 재렌더 없이 — 포커스가 날아가면 편집이 끊긴다)
                    const lenEl = found.el.querySelector('.bulk-row-len');
                    if (lenEl) lenEl.textContent = target.value.length + '자';
                }
            });

            list.addEventListener('click', function (event) {
                const target = event.target;
                if (!target || typeof target.closest !== 'function') return;

                const btn = target.closest('[data-action="expand"]');
                if (!btn) return;

                const found = rowOf(btn);
                if (!found) return;

                found.row.expanded = !found.row.expanded;

                const bodyEl = found.el.querySelector('.bulk-row-body');
                const peekEl = found.el.querySelector('.bulk-row-peek');
                if (!bodyEl || !peekEl) return;

                if (found.row.expanded) {
                    // ★ 펼칠 때 만든다. 150행 분량의 textarea 를 미리 만들지 않는다.
                    mountBulkBodyEditor(bodyEl, found.row);
                    bodyEl.style.display = '';
                    peekEl.style.display = 'none';
                    btn.textContent = '⌃';
                    const ta = bodyEl.querySelector('textarea');
                    if (ta) ta.focus();
                } else {
                    bodyEl.innerHTML = '';
                    bodyEl.style.display = 'none';
                    peekEl.textContent = bulkBodyPeek(found.row.body);
                    peekEl.style.display = '';
                    btn.textContent = '⌄';
                }
            });
        }

        // 원본이 바뀌었을 때의 진입점 — 미리보기·개수·요약을 한 번에 맞춘다.
        //
        // ★ 사용자가 재분할을 거부하면 입력값을 마지막으로 렌더한 상태로 되돌린다.
        //   그래야 화면(옛 미리보기)과 입력칸(새 값)이 어긋나지 않는다.
        function refreshBulkSource() {
            if (!rebuildBulkPreview()) {
                revertBulkSourceInputs();
            }
            refreshBulkCounts();
            updateBulkSelectionSummary();
        }

        function revertBulkSourceInputs() {
            const state = bulkState();

            const textEl = document.getElementById('bulk-text');
            if (textEl) textEl.value = state.sourceText;

            const customEl = document.getElementById('bulk-custom-delimiter');
            if (customEl) customEl.value = state.custom;

            const radio = document.querySelector(
                'input[name="bulk-delimiter"][value="' + state.delimiter + '"]');
            if (radio) radio.checked = true;
        }
