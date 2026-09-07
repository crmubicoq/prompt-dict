        // ========================================
        // M. 이미지 썸네일 기능
        // ========================================

        // 이미지 업로드 섹션 표시/숨김 (카테고리 기반)
        function toggleThumbnailSection() {
            const categorySelect = document.getElementById('prompt-category');
            const thumbnailSection = document.getElementById('thumbnail-upload-section');
            
            if (!categorySelect || !thumbnailSection) return;
            
            const selectedCategory = categorySelect.value;
            
            // "이미지 생성" 카테고리일 때만 표시
            if (selectedCategory === '이미지 생성' || selectedCategory === '이미지') {
                thumbnailSection.style.display = 'block';
            } else {
                thumbnailSection.style.display = 'none';
                clearThumbnail(); // 카테고리 변경 시 이미지 초기화
            }
        }

        // 업로드 방법 탭 전환
        function setupUploadTabs() {
            const tabs = document.querySelectorAll('.upload-tab');
            const fileMethod = document.getElementById('file-upload-method');
            const urlMethod = document.getElementById('url-upload-method');
            
            tabs.forEach(tab => {
                tab.addEventListener('click', function() {
                    // 탭 활성화
                    tabs.forEach(t => t.classList.remove('active'));
                    this.classList.add('active');
                    
                    // 컨텐츠 전환
                    const method = this.dataset.method;
                    if (method === 'file') {
                        fileMethod.style.display = 'block';
                        urlMethod.style.display = 'none';
                    } else {
                        fileMethod.style.display = 'none';
                        urlMethod.style.display = 'block';
                    }
                });
            });
        }

        // 썸네일 파일 업로드
        function setupThumbnailFileUpload() {
            const fileBtn = document.getElementById('thumbnail-file-btn');
            const fileInput = document.getElementById('thumbnail-file-input');
            
            if (fileBtn && fileInput) {
                fileBtn.addEventListener('click', () => fileInput.click());
                
                fileInput.addEventListener('change', function(e) {
                    const file = e.target.files[0];
                    if (!file) return;
                    
                    // 이미지 파일 검증
                    if (!file.type.startsWith('image/')) {
                        alert('이미지 파일만 업로드 가능합니다.');
                        return;
                    }
                    
                    // 파일 크기 검증 (5MB)
                    if (file.size > 5 * 1024 * 1024) {
                        alert('이미지 크기는 5MB 이하여야 합니다.');
                        return;
                    }
                    
                    // 파일을 base64로 변환
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        currentThumbnailData = event.target.result;
                        showThumbnailPreview(currentThumbnailData);
                    };
                    reader.readAsDataURL(file);
                });
            }
        }

        // 썸네일 URL에서 이미지 불러오기
        function setupThumbnailUrlUpload() {
            const urlBtn = document.getElementById('thumbnail-url-btn');
            const urlInput = document.getElementById('thumbnail-url-input');
            
            if (urlBtn && urlInput) {
                urlBtn.addEventListener('click', function() {
                    const url = urlInput.value.trim();
                    
                    if (!url) {
                        alert('URL을 입력해주세요.');
                        return;
                    }
                    
                    // URL 유효성 검사
                    try {
                        new URL(url);
                    } catch (e) {
                        alert('올바른 URL 형식이 아닙니다.');
                        return;
                    }
                    
                    // 이미지를 불러와서 base64로 변환
                    loadImageFromUrl(url);
                });
            }
        }

        // URL에서 이미지 로드 및 base64 변환
        function loadImageFromUrl(url) {
            const img = new Image();
            img.crossOrigin = 'Anonymous'; // CORS 처리
            
            img.onload = function() {
                // Canvas를 사용해 base64로 변환
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                try {
                    currentThumbnailData = canvas.toDataURL('image/jpeg', 0.85);
                    showThumbnailPreview(currentThumbnailData);
                } catch (e) {
                    alert('이미지를 불러올 수 없습니다. (CORS 오류)\n직접 파일을 업로드해주세요.');
                }
            };
            
            img.onerror = function() {
                alert('이미지를 불러올 수 없습니다.\nURL을 확인하거나 파일 업로드를 시도해주세요.');
            };
            
            img.src = url;
        }

        // 썸네일 미리보기 표시
        function showThumbnailPreview(imageData) {
            const preview = document.getElementById('thumbnail-preview');
            const previewImg = document.getElementById('thumbnail-preview-img');
            
            if (preview && previewImg) {
                previewImg.src = imageData;
                preview.style.display = 'block';
            }
        }

        // 썸네일 제거
        function clearThumbnail() {
            currentThumbnailData = null;
            const preview = document.getElementById('thumbnail-preview');
            const previewImg = document.getElementById('thumbnail-preview-img');
            const fileInput = document.getElementById('thumbnail-file-input');
            const urlInput = document.getElementById('thumbnail-url-input');
            
            if (preview) preview.style.display = 'none';
            if (previewImg) previewImg.src = '';
            if (fileInput) fileInput.value = '';
            if (urlInput) urlInput.value = '';
        }

        // 썸네일 제거 버튼
        function setupThumbnailRemoveButton() {
            const removeBtn = document.getElementById('thumbnail-remove-btn');
            if (removeBtn) {
                removeBtn.addEventListener('click', clearThumbnail);
            }
        }

        // 이미지 썸네일 기능 초기화
        function setupThumbnailFeature() {
            // 카테고리 변경 감지
            const categorySelect = document.getElementById('prompt-category');
            if (categorySelect) {
                categorySelect.addEventListener('change', toggleThumbnailSection);
            }
            
            // 업로드 탭
            setupUploadTabs();
            
            // 썸네일 파일 업로드
            setupThumbnailFileUpload();
            
            // 썸네일 URL 업로드
            setupThumbnailUrlUpload();
            
            // 썸네일 제거 버튼
            setupThumbnailRemoveButton();
        }
