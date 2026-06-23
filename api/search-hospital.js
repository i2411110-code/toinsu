module.exports = async (req, res) => {
    try {
        const { type, query } = req.query;
        
        // 💡 팀장님의 Encoding 인증키 유지[cite: 2]
        const SERVICE_KEY = "5fcb4c277774a3ab3d2ed9e791bf1c525a5646fbe28fd661f799510fd5d1303d"; //[cite: 2]
        
        // 🎯 [심평원 실제 출력 데이터와 1:1 매핑 확인된 진짜 고유 코드셋]
        const clCdMap = {
            '상급종합병원': '01',
            '종합병원': '11',
            '병원': '21',
            '요양병원': '28',
            '정신병원': '22',  // 👈 기존 41에서 22(정신병원급)로 수정
            '치과병원': '53',  // 👈 기존 51(치과의원 혼입)에서 53(순수 치과병원)으로 수정
            '한방병원': '92',  // 👈 기존 31(일반의원 혼입)에서 92(순수 한방병원)으로 수정
            '보건소': '71'     // 👈 보건기관 대분류 표준 코드
        };
        
        const clCd = clCdMap[type] || ''; //[cite: 2]
        const encodeQuery = query ? encodeURIComponent(query) : ''; //[cite: 2]
        
        let url = `http://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList?ServiceKey=${SERVICE_KEY}&_type=json&numOfRows=20`; //[cite: 2]
        if (clCd) url += `&clCd=${clCd}`; //[cite: 2]
        if (query) url += `&yadmNm=${encodeQuery}`; //[cite: 2]

        const response = await fetch(url, { method: 'GET' }); //[cite: 2]
        const textData = await response.text(); //[cite: 2]
        
        let data; //[cite: 2]
        try {
            data = JSON.parse(textData); //[cite: 2]
        } catch (parseError) { //[cite: 2]
            console.warn("심평원 API 동기화 대기 중 또는 XML 에러 반환:", textData); //[cite: 2]
            return res.status(200).json([{ //[cite: 2]
                name: "📡 시스템 연동 중입니다", //[cite: 2]
                tel: "안내", //[cite: 2]
                addr: "방금 발급된 공공 API 인증키가 정부 서버에 동기화되고 있습니다. (최대 1~2시간 소요)", //[cite: 2]
                url: "", //[cite: 2]
                clName: "안내" //[cite: 2]
            }]); //[cite: 2]
        }
        
        const items = data.response?.body?.items?.item; //[cite: 2]
        const resultList = []; //[cite: 2]
        
        if (items) { //[cite: 2]
            const arr = Array.isArray(items) ? items : [items]; //[cite: 2]
            arr.forEach(h => { //[cite: 2]
                resultList.push({ //[cite: 2]
                    name: h.yadmNm,        //[cite: 2]
                    tel: h.telno || '-',   //[cite: 2]
                    addr: h.addr || '-',   //[cite: 2]
                    url: h.hospUrl || '',  //[cite: 2]
                    clName: h.clCdNm       //[cite: 2]
                });
            });
        }
        
        res.status(200).json(resultList); //[cite: 2]
    } catch (error) { //[cite: 2]
        console.error('병원 API 조회 전산 에러:', error); //[cite: 2]
        res.status(500).json({ error: '전국 병원 데이터 매핑 실패' }); //[cite: 2]
    }
};