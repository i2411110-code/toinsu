// claim.js

/**
 * 30대 보험사 공통 서류 정밀 맵핑 빌더 엔진
 * @param {string} canvasId - 타겟 HTML Canvas ID
 * @param {string} companyKey - 보험사 식별 식별자 (예: "hyundai", "samsung", "db")
 * @param {string|number} pageNum - 페이지 인덱스 ("1", "2")
 * @param {Object} userData - 입력값 집합 객체
 */
async function drawClaimForm(canvasId, companyKey, pageNum, userData) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // 1. 모든 디바이스에서 픽셀 매핑 스케일을 동일하게 강제 고정 (A4 해상도)
  canvas.width = 1240;
  canvas.height = 1754;

  // 2. 해당 보험사의 좌표 메타 데이터 불러오기 (claim-coords.js 전역 변수 참조)
  const companyData = claimCoords[companyKey];
  if (!companyData || !companyData[String(pageNum)]) {
    console.error(`Error: [${companyKey}] 보험사의 [${pageNum}]페이지 정의 데이터셋이 손실되었습니다.`);
    return;
  }
  const pageCoords = companyData[String(pageNum)];

  // 3. 서식 베이스 이미지 로드 (forms/보험사명/보험사명 (숫자).png 매칭)
  const bgImage = new Image();
  bgImage.src = `/forms/${companyKey}/${companyKey} (${pageNum}).png`; 
  
  await new Promise((resolve) => {
    bgImage.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
      resolve();
    };
    bgImage.onerror = () => {
      console.warn(`Warning: /forms/${companyKey}/${companyKey} (${pageNum}).png 이미지 파일을 감지하지 못했습니다.`);
      resolve();
    };
  });

  // 4. 타이포그래피 표준 렌더링 값 정의 (토스 감성 다크 그레이)
  ctx.font = "bold 20px 'Malgun Gothic', sans-serif";
  ctx.fillStyle = "#191F28";
  ctx.textBaseline = "middle";

  // 5. 컴포넌트 타입별 분기 처리 파이프라인 가동
  Object.keys(pageCoords).forEach(key => {
    const config = pageCoords[key];
    const value = userData[key];

    if (value === undefined || value === null || value === '') {
      if (config.type !== 'check') return;
    }

    switch (config.type) {
      case 'text':
        ctx.font = "bold 20px 'Malgun Gothic', sans-serif";
        ctx.fillStyle = "#191F28";
        ctx.fillText(String(value), config.x, config.y);
        break;

      case 'split':
        ctx.font = "bold 21px 'Courier New', 'Malgun Gothic', sans-serif";
        ctx.fillStyle = "#191F28";
        const chars = String(value).split('');
        chars.forEach((char, index) => {
          const nextX = config.x + (index * config.gap);
          ctx.fillText(char, nextX, config.y);
        });
        break;

      case 'check':
        if (value === true || value === 'Y' || value === 'true') {
          ctx.font = "bold 26px 'Malgun Gothic', sans-serif";
          ctx.fillStyle = "#3182F6"; 
          ctx.fillText('V', config.x, config.y);
        }
        break;

      case 'image':
        if (value) {
          const signImg = new Image();
          signImg.src = value;
          signImg.onload = () => {
            ctx.drawImage(signImg, config.x, config.y, config.w, config.h);
          };
        }
        break;
    }
  });
}

// 브라우저 어디서나 접근할 수 있도록 전역 window 객체에 등록
window.drawClaimForm = drawClaimForm;