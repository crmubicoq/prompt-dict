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
        // 프롬프트 객체 구조
        // (index.html 인라인 <script> 에 있던 것을 데이터가 사는 곳으로 옮겼다)
        /*
         * 각 프롬프트의 구조:
         * {
         *   id: 고유 ID (UUID v4 문자열 — T-116)
         *   title: 제목 (문자열),
         *   content: 본문 (문자열),
         *   category: 카테고리 (문자열),
         *   tags: 태그 배열 (배열),
         *   description: 설명 (문자열),
         *   createdAt: 작성일 (ISO 문자열),
         *   updatedAt: 마지막 수정일 (ISO 문자열, 수정된 적 없으면 없음 — T-117)
         *   ※ 즐겨찾기는 이 객체가 아니라 favoriteIds 하나가 들고 있다 (T-118)
         * }
         */
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
