export default async function handler(req, res) {
    // CORS 방지 헤더 설정
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { query } = req.query;
    
    // 💡 캡처_2.JPG에 적힌 실제 인증키를 코드에 직접 고정하여 환경변수 매칭 오류 가능성을 원천 차단합니다.
    const apiKey = "5fcb4c277774a3ab3d2ed9e791bf1c525a5646fbe28fd661f799510fd5d1303d";

    if (!query) {
        return res.status(200).json([]);
    }

    // ✅ 주소 전면 수정: 이미지에 표기된 odcloud.kr 표준 API 규격으로 교정합니다.
    // 해당 시스템은 인증키를 주소 뒤가 아니라 헤더(Authorization)에 실어 보내거나 URL 파라미터 규격을 맞춰야 합니다.
    const url = `https://api.odcloud.kr/api/15067467/v1/uddi:14da17e0-28b3-44f3-8f08-01119b48b9f1?page=1&perPage=100&serviceKey=${apiKey}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error('공공데이터포털 서버 연결 실패');
            return res.status(200).json([]);
        }

        const data = await response.json();
        
        // odcloud 표준 규격은 결과 리스트가 data 배열 안에 담겨서 내려옵니다.
        const rawItems = data.data || [];
        if (rawItems.length === 0) {
            return res.status(200).json([]);
        }

        // ✅ 데이터 파싱 방어선 구축:
        // odcloud에 등록된 상병 정보 파일의 실제 열 이름(Key)을 실시간 매핑합니다.
        // 공공데이터포털 표준 한글 필드명("상병코드", "상병명") 또는 영문 매칭을 모두 포괄하도록 설계했습니다.
        const mappedItems = rawItems.map(item => {
            // 오브젝트 내에서 상병코드와 상병명에 유사한 단어가 있는지 자동 판별
            const sickCode = item["상병코드"] || item["상병 기호"] || item["sickCode"] || item["sick_code"] || Object.values(item)[0] || "-";
            const sickName = item["상병명"] || item["상병 명칭"] || item["sickName"] || item["sick_name"] || Object.values(item)[1] || "-";
            const sickEngName = item["영문명"] || item["상병영문명"] || item["sickEngName"] || "-";

            return {
                sickCode: String(sickCode).trim(),
                sickName: String(sickName).trim(),
                sickEngName: String(sickEngName).trim()
            };
        });

        // 사용자가 입력한 검색어(query)가 포함된 항목만 클라이언트 규격에 맞춰 최종 필터링하여 반환
        const filteredItems = mappedItems.filter(item => 
            item.sickCode.toLowerCase().includes(query.toLowerCase()) || 
            item.sickName.toLowerCase().includes(query.toLowerCase())
        );

        return res.status(200).json(filteredItems);

    } catch (error) {
        console.error('API 통신 장애 디버깅:', error);
        return res.status(200).json([]);
    }
}