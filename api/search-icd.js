export default async function handler(req, res) {
    // CORS 차단 방지 헤더 설정
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { query } = req.query; // 사용자가 입력한 검색어
    const apiKey = process.env.HIRA_API_KEY; // Vercel 환경변수에 등록한 인증키

    if (!query) {
        return res.status(200).json([]);
    }

    // 💡 심평원 보건의료빅데이터 개방시스템 상병정보조회 표준 오퍼레이션 명세 주소
    // 대소문자 구별 및 필수 파라미터(&_type=json) 규격을 정확하게 맞춤 가동합니다.
    const url = `http://apis.data.go.kr/B551182/diseaseInfoService/getDissNameCodeList?ServiceKey=${apiKey}&sickName=${encodeURIComponent(query)}&numOfRows=200&pageNo=1&_type=json`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            return res.status(200).json([]); // 정부 서버 통신 오류 시 빈 배열 반환으로 500 에러 방어
        }

        const data = await response.json();
        
        // 🚨 [핵심 방어] 심평원 API는 데이터가 없을 때, 1개일 때, 여러개일 때 반환 구조가 매번 바뀝니다.
        const body = data.response?.body;
        if (!body || !body.items || body.items === "") {
            return res.status(200).json([]); // 검색 결과가 아예 없는 경우
        }

        const rawItems = body.items.item;
        let finalItems = [];

        // 1. 데이터가 단 1개만 존재하여 배열이 아니라 일반 객체 형식{}으로 올 때 -> 배열[]로 감싸줌
        if (rawItems && typeof rawItems === 'object' && !Array.isArray(rawItems)) {
            finalItems.push(rawItems);
        } 
        // 2. 데이터가 여러 개여서 정석대로 배열[]형태로 올 때
        else if (Array.isArray(rawItems)) {
            finalItems = rawItems;
        }

        // 프론트엔드로 깨끗하게 정제된 배열 데이터 반환
        return res.status(200).json(finalItems);

    } catch (error) {
        console.error('심평원 API 통신 에러 로그:', error);
        // 서버 에러가 나더라도 프론트엔드가 뻗지 않도록 빈 배열을 안전하게 반환합니다.
        return res.status(200).json([]);
    }
}