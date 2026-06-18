module.exports = async (req, res) => {
    try {
        const region = req.query.region || '서울';

        // 한국어 지역명을 오픈웨더용 영문 도시명으로 자동 변환
        const cityMap = {
            '서울': 'Seoul', '부산': 'Busan', '대구': 'Daegu',
            '인천': 'Incheon', '광주': 'Gwangju', '대전': 'Daejeon',
            '울산': 'Ulsan', '세종': 'Sejong', '제주': 'Jeju'
        };

        const cityName = cityMap[region] || 'Seoul';
        
        // ★여기에 복사해둔 오픈웨더 API 키를 넣어주세요★
        const apiKey = 'd8736cde412cba2bfee0445b26f2cad3'; 

        // 오픈웨더 서버로 실제 기상 데이터 요청 (단위: 섭씨 온도, 언어: 한국어)
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${apiKey}&units=metric&lang=kr`);

        if (!response.ok) {
            throw new Error(`날씨 API 응답 오류: ${response.status}`);
        }

        const data = await response.json();

        // 프론트엔드(news.js)가 이해할 수 있는 규격으로 포장해서 전달
        res.status(200).json({
            error: false,
            region: region,
            temp: Math.round(data.main.temp), // 소수점 반올림하여 깔끔한 온도로 전달
            description: data.weather[0].description // 예: '맑음', '튼구름', '비' 등
        });

    } catch (error) {
        console.error('실시간 날씨 연동 실패:', error);
        // 에러가 나더라도 포탈 화면이 깨지지 않도록 비상용 임시 데이터 반환
        res.status(200).json({ error: true, region: req.query.region, temp: 24, description: '맑음' });
    }
};