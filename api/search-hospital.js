module.exports = async (req, res) => {
    try {
        const { type, query } = req.query;
        
        // 💡 팀장님의 Encoding 인증키 유지
        const SERVICE_KEY = "5fcb4c277774a3ab3d2ed9e791bf1c525a5646fbe28fd661f799510fd5d1303d";
        
        const clCdMap = {
            '상급종합병원': '01',
            '종합병원': '11',
            '병원': '21',
            '요양병원': '28',
            '정신병원': '41',  
            '치과병원': '51',  
            '한방병원': '92',  
            '보건소': '71'     
        };
        
        const clCd = clCdMap[type] || '';
        const encodeQuery = query ? encodeURIComponent(query) : '';
        
        let url = `http://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList?ServiceKey=${SERVICE_KEY}&_type=json&numOfRows=20`;
        if (clCd) url += `&clCd=${clCd}`;
        if (query) url += `&yadmNm=${encodeQuery}`;

        const response = await fetch(url, { method: 'GET' });
        const textData = await response.text();
        
        let data;
        try {
            data = JSON.parse(textData);
        } catch (parseError) {
            console.warn("심평원 API 동기화 대기 중 또는 XML 에러 반환:", textData);
            return res.status(200).json([{
                name: "📡 시스템 연동 중입니다",
                tel: "안내",
                addr: "방금 발급된 공공 API 인증키가 정부 서버에 동기화되고 있습니다. (최대 1~2시간 소요)",
                url: "",
                clName: "안내"
            }]);
        }
        
        const items = data.response?.body?.items?.item;
        const resultList = [];
        
        if (items) {
            const arr = Array.isArray(items) ? items : [items];
            arr.forEach(h => {
                const clName = h.clCdNm || '';
                
                // 🎯 [정신병원 카테고리 전용 필터링 안전장치]
                // 정신병원 검색인데 기관 분류명(clName)에 '치과'가 포함되어 있다면 리스트에 넣지 않고 건너뜁니다.
                if (type === '정신병원' && clName.includes('치과')) {
                    return; 
                }

                resultList.push({
                    name: h.yadmNm,       
                    tel: h.telno || '-',  
                    addr: h.addr || '-',  
                    url: h.hospUrl || '', 
                    clName: clName      
                });
            });
        }
        
        res.status(200).json(resultList);
    } catch (error) {
        console.error('병원 API 조회 전산 에러:', error);
        res.status(500).json({ error: '전국 병원 데이터 매핑 실패' });
    }
};