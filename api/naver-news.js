const express = require('express');
const axios = require('axios');
const app = express();

// 가온포탈 뉴스 전산 라우터
app.get('/api/naver-news', async (req, res) => {
    try {
        const query = req.query.query;
        // 네이버 서버로 요청
        const response = await axios.get(`https://openapi.naver.com/v1/search/news.json?query=${encodeURI(query)}&display=10`, {
            headers: {
                'X-Naver-Client-Id': 'ZHr89YgWwiIoIXvUfbjp', // 알려주신 Client ID 입력
                'X-Naver-Client-Secret': '5apD7gyt9p' // 발급받으신 시크릿 키 입력
            }
        });
        res.json(response.data); // 결과를 news.js로 반환
    } catch (error) {
        res.status(500).json({ error: '뉴스 데이터 연동 실패' });
    }
});

app.listen(3000, () => console.log('가온사업단 API 서버 가동 완료'));