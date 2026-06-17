export default async function handler(req, res) {
    // CORS 차단 방지 및 전산 헤더 설정
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { query } = req.query;
    // 검증 완료된 팀장님의 실제 일반 인증키
    const apiKey = "5fcb4c277774a3ab3d2ed9e791bf1c525a5646fbe28fd661f799510fd5d1303d";

    if (!query) {
        return res.status(200).json([]);
    }

    // 20250930 최신 상병마스터 전용 데이터셋 주소
    const url = `https://api.odcloud.kr/api/15067467/v1/uddi:0add74e2-fe8c-4807-b300-814233aad8ea?page=1&perPage=2000&serviceKey=${apiKey}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            return res.status(200).json([]);
        }

        const data = await response.json();
        const rawItems = data.data || [];

        if (rawItems.length === 0) {
            return res.status(200).json([]);
        }

        // ✅ 전산 교정 완료: 실제 데이터셋 내부에 들어있는 "상병코드", "상병한글명", "상병영문명" 컬럼을 1:1로 매핑합니다.
        const mappedItems = rawItems.map(item => {
            const sickCode = item["상병코드"] || item["상병 코드"] || item["상병기호"] || "";
            const sickName = item["상병한글명"] || item["한글명"] || item["상병명"] || item["상병 명"] || "";
            const sickEngName = item["상병영문명"] || item["영문명"] || item["상병 영문명"] || "";

            return {
                sickCode: String(sickCode).trim(),
                sickName: String(sickName).trim(),
                sickEngName: String(sickEngName).trim()
            };
        });

        // 설계사분이 입력한 검색어(query) 기반 최종 필터링
        const filteredItems = mappedItems.filter(item => 
            item.sickCode.toLowerCase().includes(query.toLowerCase()) || 
            item.sickName.toLowerCase().includes(query.toLowerCase())
        );

        return res.status(200).json(filteredItems);

    } catch (error) {
        console.error('API 연동 최종 예외 발생:', error);
        return res.status(200).json([]);
    }
}