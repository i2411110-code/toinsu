module.exports = async (req, res) => {
    try {
        const query = req.query.query || '보험';

        // axios 대신 Node.js 자체 내장 통신 기능(fetch) 사용 - 별도 설치 불필요
        const response = await fetch(`https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=10`, {
            method: 'GET',
            headers: {
                'X-Naver-Client-Id': 'ZHr89YgWwiIoIXvUfbjp', // 알려주신 팀장님의 Client ID
                'X-Naver-Client-Secret': '5apD7gyt9p' // ★반드시 실제 발급받은 영문/숫자 키로 바꿔주세요★
            }
        });

        // 네이버 서버에서 에러를 반환했을 경우 방어
        if (!response.ok) {
            throw new Error(`네이버 API 응답 오류: ${response.status}`);
        }

        const data = await response.json();
        res.status(200).json(data);

    } catch (error) {
        console.error('뉴스 API 연동 중 에러 발생:', error);
        res.status(500).json({ error: '뉴스 데이터 연동 실패' });
    }
};

