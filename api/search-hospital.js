module.exports = async (req, res) => {
    try {
        const { type, query } = req.query;
        
        // 💡 공공데이터포털 - 건강보험심사평가원 병원정보서비스 일반인증키 (디코딩된 키 입력 권장)
        const SERVICE_KEY = "5fcb4c277774a3ab3d2ed9e791bf1c525a5646fbe28fd661f799510fd5d1303d";
        
        // 심평원 요양기관 종별코드 매핑 (01:상급종합, 11:종합병원, 21:병원, 28:요양병원, 41:정신병원, 51:치과병원, 93:보건소, 31:한방병원)
        const clCdMap = {
            '상급종합병원': '01', '종합병원': '11', '병원': '21', '요양병원': '28',
            '정신병원': '41', '치과병원': '51', '보건소': '93', '한방병원': '31'
        };
        
        const clCd = clCdMap[type] || '';
        const encodeQuery = query ? encodeURIComponent(query) : '';
        
        // 심평원 병원기본정보조회 엔드포인트 가동 (JSON 규격 요청)
        let url = `http://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList?ServiceKey=${SERVICE_KEY}&_type=json&numOfRows=20`;
        if (clCd) url += `&clCd=${clCd}`;
        if (query) url += `&yadmNm=${encodeQuery}`;

        const response = await fetch(url, { method: 'GET' });
        if (!response.ok) throw new Error(`심평원 API 통신 실패: ${response.status}`);
        
        const data = await response.json();
        
        // 데이터 파싱 및 안전 가드 수립
        const items = data.response?.body?.items?.item;
        const resultList = [];
        
        if (items) {
            const arr = Array.isArray(items) ? items : [items];
            arr.forEach(h => {
                resultList.push({
                    name: h.yadmNm,       // 요양기관명
                    tel: h.telno || '-',  // 전화번호
                    addr: h.addr || '-',  // 주소
                    url: h.hospUrl || '', // 홈페이지 주소
                    clName: h.clCdNm      // 종별구분명
                });
            });
        }
        
        res.status(200).json(resultList);
    } catch (error) {
        console.error('병원 API 조회 전산 에러:', error);
        res.status(500).json({ error: '전국 병원 데이터 매핑 실패' });
    }
};