        // 3.3: LocalStorage 키 이름 정의
        const STORAGE_KEY = 'promptDictionary_data';
        const FAVORITES_KEY = 'promptDictionary_favorites';
        const THEME_KEY = 'promptDictionary_theme';
        const CATEGORIES_KEY = 'promptDictionary_categories';

        // T-101: 분류를 미루고 저장할 때 쓰는 특수 값.
        // ★ defaultCategories 에 넣지 않는다 — 카테고리 관리 화면에서
        //   삭제·수정되면 안 되는 값이기 때문. 사이드바에는 고정 항목으로 그린다.
        const UNCATEGORIZED = '미분류';

        // 전역 변수: 모든 프롬프트를 저장하는 배열
        let allPrompts = [];
        let favoriteIds = new Set(); // 즐겨찾기 ID 모음

        // 카테고리 관리 (동적)
        let categories = [];
        // T-113: 카테고리 id — 클릭 대상을 배열 인덱스가 아니라 id 로 찾는다.
        // ★ 이름은 editCategory 가 바꾸는 가변 값이라 키로 쓸 수 없다.
        // ★ 여기서 newId() 를 부르지 않는다 — config.js 는 ui.js 보다 먼저
        //   로드되어 아직 정의되지 않았다. 샘플 데이터와 같은 이유로 리터럴이다.
        const defaultCategories = [
            { id: '9f2b1c40-6d3a-4e18-9a7c-2b5e8f011d61', emoji: '💻', name: '개발' },
            { id: '3a7e5d92-8c14-4b6f-a013-7d92c4e5f832', emoji: '✍️', name: '콘텐츠' },
            { id: 'c81f0a35-2e69-4d7b-8f45-a6b3d907e214', emoji: '📊', name: '분석' },
            { id: '5d4c9b78-1f83-4a25-b6e9-0c7f2a84d356', emoji: '🎓', name: '교육' },
            { id: 'e26a8f14-9b57-4c30-8d1e-4f5a7b62c908', emoji: '🎨', name: '이미지 생성' },
            { id: '7b3d6e51-4a08-4f92-9c27-e81b5d40a763', emoji: '📌', name: '기타' }
        ];

        // 3.4: 샘플 데이터 3개 만들기 (테스트용)
        const sampleData = [
            {
                id: '0f8a1c62-3d54-4a11-9b7e-2c6f5d840a31', // T-116: 고정 UUID (config.js 는 newId() 보다 먼저 로드됨)
                title: 'AI PM 가이드 프롬프트',
                content: `당신은 비개발자가 AI 코딩 도구(Cursor, Lovable, v0 등)를 사용하여 웹앱을 개발할 수 있도록 돕는 전문 AI 제품 관리자(PM)이자 코딩 가이드입니다.

라이언카슨의 '3단계 규칙(PRD -> Task List -> Sequential Execution)'을 핵심 방법론으로 사용합니다.

1단계: PRD(제품 요구사항 정의서) 작성
2단계: 태스크 리스트(Task List) 생성  
3단계: 실행(Execution) 가이드`,
                category: '개발',
                tags: ['코딩', '비개발자', 'PM', '가이드'],
                description: '비개발자를 위한 AI 코딩 도구 활용 가이드. 3단계 규칙으로 체계적인 개발 진행.',
                createdAt: new Date('2026-01-19').toISOString()
            },
            {
                id: '7b2e9d40-6c18-4f73-8a5d-1e0b3c97f452', // T-116: 고정 UUID (config.js 는 newId() 보다 먼저 로드됨)
                title: '블로그 글쓰기 프롬프트',
                content: `SEO 최적화된 블로그 글을 작성해주세요.

주제: [주제 입력]
목표 독자: [독자 설명]
키워드: [주요 키워드]

다음 구조로 작성:
1. 흥미로운 도입부
2. 문제 정의
3. 해결책 제시 (3가지)
4. 실용적인 팁
5. 행동 촉구 결론

톤: 친근하고 전문적, 쉬운 언어 사용`,
                category: '콘텐츠',
                tags: ['블로그', 'SEO', '글쓰기'],
                description: 'SEO를 고려한 블로그 콘텐츠 작성 템플릿. 구조화된 형식으로 독자 친화적인 글 작성.',
                createdAt: new Date('2026-01-18').toISOString()
            },
            {
                id: 'c4d17e85-9a2b-4c60-b3f8-5d72a08e1963', // T-116: 고정 UUID (config.js 는 newId() 보다 먼저 로드됨)
                title: '데이터 분석 요청 프롬프트',
                content: `첨부된 데이터를 분석하고 다음 형식으로 리포트해주세요:

1. 데이터 개요
   - 전체 행/열 수
   - 주요 변수 설명

2. 기술 통계
   - 평균, 중앙값, 표준편차
   - 이상치 탐지

3. 시각화 제안
   - 적절한 차트 종류
   - 핵심 인사이트 강조

4. 비즈니스 인사이트
   - 주요 발견사항 3가지
   - 액션 아이템 제안

결과는 비전문가도 이해할 수 있게 설명해주세요.`,
                category: '분석',
                tags: ['데이터', '통계', '시각화', '리포트'],
                description: '데이터를 체계적으로 분석하고 비즈니스 인사이트를 도출하는 프롬프트.',
                createdAt: new Date('2026-01-17').toISOString()
            }
        ];

        let currentFilter = 'all'; // 현재 선택된 필터
        let currentSearchQuery = ''; // 현재 검색어
        let currentSortOrder = 'newest'; // 현재 정렬 방식

        let currentDetailId = null;

        const SEARCH_HISTORY_KEY = 'promptDictionary_searchHistory';
        const MAX_SEARCH_HISTORY = 5;
        let searchHistory = [];

        // T-105(A안): 마지막으로 렌더한 화면(필터+검색어). 이 값이 바뀌면 선택을 비운다.
        // ★ 정렬은 포함하지 않는다 — 순서만 바뀌고 대상 집합은 그대로다.
        let lastViewKey = null;

        let isSelectionMode = false;
        let selectedPromptIds = new Set();

        let currentThumbnailData = null; // 현재 선택된 이미지 데이터 (base64)
