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
    
    // 검증 완료된 팀장님의 실제 일반 인증키
    const apiKey = "5fcb4c277774a3ab3d2ed9e791bf1c525a5646fbe28fd661f799510fd5d1303d";

    if (!query) {
        return res.status(200).json([]);
    }

    // 캡처_3.JPG 검증 기반 최신 상병마스터 20250930 주소 고정
    const url = `https://api.odcloud.kr/api/15067467/v1/uddi:0add74e2-fe8c-4807-b300-814233aad8ea?page=1&perPage=2000&serviceKey=${apiKey}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error('공공데이터포털 데이터 호출 실패');
            return res.status(200).json([]);
        }

        const data = await response.json();
        const rawItems = data.data || [];

        if (rawItems.length === 0) {
            return res.status(200).json([]);
        }

        // 🚨 [치명적 전산 교정] 질병명이 빈칸으로 나오는 현상을 해결하기 위해 
        // 심평원 마스터 파일의 가능한 모든 한글명 필드 키값을 동적 추적합니다.
        const mappedItems = rawItems.map(item => {
            // 1. 상병코드 추적
            const sickCode = item["상병코드"] || item["상병기호"] || item["상병 코드"] || item["SICK_CD"] || item["sickCode"] || Object.values(item)[0] || "-";
            
            // 2. 질병명(한글) 추적 변수 집중 보강 ★
            const sickName = item["상병한글명"] || item["상병명"] || item["질병명"] || item["상병명칭"] || item["질병명칭"] || item["상병 명"] || item["SICK_NM"] || item["sickName"] || Object.values(item)[1] || "-";
            
            // 3. 영문명 추적
            const sickEngName = item["상병영문명"] || item["영문명"] || item["상병 영문명"] || item["SICK_ENG_NM"] || item["sickEngName"] || "-";

            return {
                sickCode: String(sickCode).trim(),
                sickName: String(sickName).trim(),
                sickEngName: String(sickEngName).trim()
            };
        });

        // 입력한 검색어와 교차 필터링
        const filteredItems = mappedItems.filter(item => 
            item.sickCode.toLowerCase().includes(query.toLowerCase()) || 
            item.sickName.toLowerCase().includes(query.toLowerCase())
        );

        return res.status(200).json(filteredItems);

    } catch (error) {
        console.error('API 파싱 장애 디버깅:', error);
        return res.status(200).json([]);
    }
}