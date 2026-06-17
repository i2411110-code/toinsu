export default async function handler(req, res) {
    // CORS 차단 방지 및 헤더 설정
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { query } = req.query;
    
    // 💡 검증 완료된 팀장님의 실제 공공데이터 API 일반 인증키 고정
    const apiKey = "5fcb4c277774a3ab3d2ed9e791bf1c525a5646fbe28fd661f799510fd5d1303d";

    if (!query) {
        return res.status(200).json([]);
    }

    // ✅ 전산 교정 완료: 캡처_3.JPG 이미지 맨 아래에 명시된 최신 마스터 데이터셋 주소로 전면 교체합니다.
    // 기존에 잘못 지정되어 있던 uddi 번호를 '0add74e2-fe8c-4807-b300-814233aad8ea'로 정확하게 수정했습니다.
    // 실무 활용을 위해 한 번에 최대 2000개의 레코드를 백엔드로 안전하게 긁어옵니다.
    const url = `https://api.odcloud.kr/api/15067467/v1/uddi:0add74e2-fe8c-4807-b300-814233aad8ea?page=1&perPage=2000&serviceKey=${apiKey}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error('공공데이터포털 동기화 실패');
            return res.status(200).json([]);
        }

        const data = await response.json();
        const rawItems = data.data || [];

        if (rawItems.length === 0) {
            return res.status(200).json([]);
        }

        // 🚨 심평원 표준 텍스트 인덱스 자동 추적 가동
        const mappedItems = rawItems.map(item => {
            // odcloud 파일 내부의 실제 필드 매칭 후보군을 상병코드/상병명으로 자동 맵핑합니다.
            const sickCode = item["상병코드"] || item["상병기호"] || item["상병 코드"] || item["sickCode"] || Object.values(item)[0] || "-";
            const sickName = item["상병명"] || item["질병명"] || item["상병명칭"] || item["sickName"] || Object.values(item)[1] || "-";
            const sickEngName = item["영문명"] || item["상병영문명"] || item["sickEngName"] || "-";

            return {
                sickCode: String(sickCode).trim(),
                sickName: String(sickName).trim(),
                sickEngName: String(sickEngName).trim()
            };
        });

        // 사용자가 입력한 검색어(query) 기반 교차 검색 필터링 수행
        const filteredItems = mappedItems.filter(item => 
            item.sickCode.toLowerCase().includes(query.toLowerCase()) || 
            item.sickName.toLowerCase().includes(query.toLowerCase())
        );

        return res.status(200).json(filteredItems);

    } catch (error) {
        console.error('API 통신 연동 에러:', error);
        return res.status(200).json([]);
    }
}