// claim.js

/**
 * 30대 보험사 공통 서류 Canvas 정밀 맵핑 빌더 엔진 (Ver 4.0)
 * @param {string} canvasId - 타겟 HTML Canvas ID
 * @param {string} companyKey - 보험사 식별자 (예: "hyundai", "samsung", "db")
 * @param {string|number} pageNum - 페이지 인덱스 ("1", "2")
 * @param {Object} userData - 웹 UI 입력값 집합 객체
 */
async function drawClaimForm(canvasId, companyKey, pageNum, userData) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error(`Error: Canvas ID '${canvasId}' 를 찾을 수 없습니다.`);
    return;
  }
  const ctx = canvas.getContext('2d');

  // 1. [약속대로 실행] 모든 디바이스에서 픽셀 매핑 스케일을 동일하게 강제 고정 (A4 해상도)
  canvas.width = 1240;
  canvas.height = 1754;

  // 2. 해당 보험사의 좌표 메타 데이터 불러오기 (window.FIELD_COORDS 참조)
  // 현대해상은 5페이지 구조이므로 window.HYUNDAI_COORDS를 보고, 나머지는 FIELD_COORDS를 봅니다.
  let pageCoords = null;
  if (companyKey === 'hyundai') {
    if (window.HYUNDAI_COORDS && window.HYUNDAI_COORDS[`page${pageNum}`]) {
      pageCoords = window.HYUNDAI_COORDS[`page${pageNum}`];
    }
  } else {
    if (window.FIELD_COORDS && window.FIELD_COORDS[companyKey]) {
      pageCoords = window.FIELD_COORDS[companyKey];
    } else if (window.FIELD_COORDS && window.FIELD_COORDS.DEFAULT) {
      // 등록되지 않은 중소형 보험사는 기본 DEFAULT 스키마 좌표를 베이스로 적용
      pageCoords = window.FIELD_COORDS.DEFAULT;
    }
  }

  if (!pageCoords) {
    console.error(`Error: [${companyKey}] 보험사의 정의 데이터셋을 찾을 수 없습니다.`);
    return;
  }

  // 3. 서식 베이스 이미지 로드 규칙 세팅 (팀장님이 정비하신 하위 폴더 구조 완벽 반영)
  const bgImage = new Image();
  bgImage.src = `/forms/${companyKey}/${companyKey} (${pageNum}).png`; 
  
  await new Promise((resolve) => {
    bgImage.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
      resolve();
    };
    bgImage.onerror = () => {
      console.warn(`Warning: /forms/${companyKey}/${companyKey} (${pageNum}).png 서식 이미지 파일을 감지하지 못했습니다.`);
      resolve();
    };
  });

  // 4. 타이포그래피 표준 렌더링 값 정의 (토스 스타일 가독성 세팅)
  ctx.font = "bold 20px 'Malgun Gothic', sans-serif";
  ctx.fillStyle = "#191F28"; // 가독성이 높은 토스 고유 다크 그레이색
  ctx.textBaseline = "middle";

  // 5. 컴포넌트 타입별 분기 처리 파이프라인 가동
  Object.keys(pageCoords).forEach(key => {
    const config = pageCoords[key];
    
    // 현대해상 등 일부 고정 배열 하이드 지형 대응용 안전장치
    if (!config || typeof config !== 'object' || config.type === undefined) return;

    const value = userData[key];

    // 데이터가 비어있고 체크박스 타입이 아니라면 드로잉 스킵
    if (value === undefined || value === null || value === '') {
      if (config.type !== 'check') return;
    }

    switch (config.type) {
      case 'text':
        // 일반 텍스트 드로잉 (피보험자 성명, 직무, 청고사유 등 한 줄 기입)
        ctx.font = "bold 20px 'Malgun Gothic', sans-serif";
        ctx.fillStyle = "#191F28";
        ctx.fillText(String(value), config.x, config.y);
        break;

      case 'split':
        // 💡 [처음 말했던 정답 로직] 주민번호, 핸드폰, 날짜 문자열을 한 자씩 쪼개어 칸 레이아웃에 1:1 정밀 흡착
        ctx.font = "bold 21px 'Courier New', 'Malgun Gothic', sans-serif"; // 숫자 가독성 폰트 고정
        ctx.fillStyle = "#191F28";
        const chars = String(value).split('');
        chars.forEach((char, index) => {
          const nextX = config.x + (index * config.gap);
          ctx.fillText(char, nextX, config.y);
        });
        break;

      case 'check':
        // 💡 [처음 말했던 정답 로직] 데이터 조건(true, 'Y')이 맞을 때 정확한 좌표 위에 토스블루색 'V' 마크 각인
        if (value === true || value === 'Y' || value === 'true') {
          ctx.font = "bold 26px 'Malgun Gothic', sans-serif";
          ctx.fillStyle = "#3182F6"; // 토스 블루 매핑색
          ctx.fillText('V', config.x, config.y);
        }
        break;

      case 'image':
        // 모바일 터치 패드 화면에서 수집한 친필 투명 사인 이미지 투영 및 결합
        if (value) {
          const signImg = new Image();
          signImg.src = value; // Base64 Data URL 매핑
          signImg.onload = () => {
            // claim-coords.js 키 이름과 일치하도록 width/height 우선, w/h 폴백
            const dw = config.width  || config.w  || 70;
            const dh = config.height || config.h  || 25;
            ctx.drawImage(signImg, config.x, config.y, dw, dh);
          };
        }
        break;
    }
  });

  // 현대해상 전용 체크마크 배열 드로잉 예외 처리 보존
  if (pageCoords.checkmarks && Array.isArray(pageCoords.checkmarks)) {
    pageCoords.checkmarks.forEach(m => {
      ctx.font = "bold 26px 'Malgun Gothic', sans-serif";
      ctx.fillStyle = "#3182F6";
      ctx.fillText('V', m.x, m.y);
    });
  }
}

// Pure HTML/JS 환경 브라우저 전역 호환성을 위해 window 객체에 최종 함수 등록
window.drawClaimForm = drawClaimForm;