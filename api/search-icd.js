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
    const apiKey = "5fcb4c277774a3ab3d2ed9e791bf1c525a5646fbe28fd661f799510fd5d1303d";

    if (!query) {
        return res.status(200).json([]);
    }

    // 캡처 화면에서 검증된 최신 상병마스터 엔드포인트 주소
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

        // ✅ 전산 교정 완료: 팀장님이 확인하신 실제 API 열 이름인 "상병코드"와 "한글명"을 다이렉트로 매핑합니다.
        const mappedItems = rawItems.map(item => {
            const sickCode = String(item["상병코드"] || "").trim();
            const sickName = String(item["한글명"] || "").trim();
            const sickEngName = String(item["영문명"] || "").trim();

            return {
                sickCode: sickCode || "-",
                sickName: sickName || "-",
                sickEngName: sickEngName || "-"
            };
        });

        // 사용자가 입력한 검색어(query) 기반 최종 필터링
        const filteredItems = mappedItems.filter(item => 
            item.sickCode.toLowerCase().includes(query.toLowerCase()) || 
            item.sickName.toLowerCase().includes(query.toLowerCase())
        );

        return res.status(200).json(filteredItems);

    } catch (error) {
        console.error('API 동기화 장애 디버깅:', error);
        return res.status(200).json([]);
    }
}