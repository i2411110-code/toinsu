const axios = require('axios');

module.exports = async (req, res) => {
    try {
        const query = req.query.query || '보험'; // 검색어 파라미터 받기
        
        // 네이버 서버로 요청
        const response = await axios.get(`https://openapi.naver.com/v1/search/news.json?query=${encodeURI(query)}&display=10`, {
            headers: {
                'X-Naver-Client-Id': 'ZHr89YgWwiIoIXvUfbjp', // 알려주신 Client ID
                'X-Naver-Client-Secret': '5apD7gyt9p' // 반드시 실제 시크릿 키로 변경하세요
            }
        });
        
        // Vercel 방식의 응답
        res.status(200).json(response.data);
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '뉴스 데이터 연동 실패' });
    }
};



