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
