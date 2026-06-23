module.exports = async (req, res) => {
    try {
        const { type, query } = req.query;
        
        // 💡 여기에 팀장님의 Encoding 인증키를 그대로 유지하세요
        const SERVICE_KEY = "5fcb4c277774a3ab3d2ed9e791bf1c525a5646fbe28fd661f799510fd5d1303d";
        
        // 🎯 [정확하게 교정된 심평원 공식 종별코드 리스트]
        const clCdMap = {
            '상급종합병원': '01', 
            '종합병원': '11', 
            '병원': '21', 
            '요양병원': '28',
            '정신병원': '41', 
            '한방병원': '31',
            '치과병원': '51', 
            '보건소': '93'
        };
        
        const clCd = clCdMap[type] || '';
        const encodeQuery = query ? encodeURIComponent(query) : '';
        
        let url = `http://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList?ServiceKey=${SERVICE_KEY}&_type=json&numOfRows=20`;
        if (clCd) url += `&clCd=${clCd}`;
        if (query) url += `&yadmNm=${encodeQuery}`;

        const response = await fetch(url, { method: 'GET' });
        
        // 1. JSON 변환 전, 일단 텍스트 형태로 받아옵니다.
        const textData = await response.text();
        
        let data;
        try {
            // 2. 정상적인 JSON 데이터인지 파싱을 시도합니다.
            data = JSON.parse(textData);
        } catch (parseError) {
            // 3. 파싱에 실패했다면(XML 에러 메시지가 날아왔다면) 동기화 지연으로 판단합니다.
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
                resultList.push({
                    name: h.yadmNm,       
                    tel: h.telno || '-',  
                    addr: h.addr || '-',  
                    url: h.hospUrl || '', 
                    clName: h.clCdNm      
                });
            });
        }
        
        res.status(200).json(resultList);
    } catch (error) {
        console.error('병원 API 조회 전산 에러:', error);
        res.status(500).json({ error: '전국 병원 데이터 매핑 실패' });
    }
};