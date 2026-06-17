export default async function handler(req, res) {
    const { query } = req.query; // 사용자가 입력한 검색어
    const apiKey = process.env.HIRA_API_KEY; // 2단계에서 설정한 인증키
    
    // 심평원 보건의료빅데이터 상병정보조회 서비스 실제 URL
    const url = `http://apis.data.go.kr/B551182/diseaseInfoService/getDissNameCodeList?ServiceKey=${apiKey}&sickName=${encodeURIComponent(query)}&numOfRows=100&_type=json`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        
        // 심평원 결과를 우리 포탈 규격에 맞게 정제하여 반환
        const items = data.response?.body?.items?.item || [];
        res.status(200).json(items);
    } catch (error) {
        res.status(500).json({ error: '심평원 API 연동 실패' });
    }
}