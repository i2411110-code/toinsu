module.exports = async (req, res) => {
    try {
        const region = req.query.region || '서울';
        
        // 지역별 기본 온도 설정 (약간의 랜덤 변동 적용)
        const baseTemps = { '서울': 25, '부산': 23, '대구': 27, '제주': 22, '광주': 26, '대전': 25, '울산': 24, '인천': 24, '세종': 25 };
        const temp = (baseTemps[region] || 24) + Math.floor(Math.random() * 3) - 1; 

        res.status(200).json({
            error: false,
            region: region,
            temp: temp,
            description: '맑음'
        });
    } catch (error) {
        res.status(500).json({ error: true, region: '알 수 없음', temp: 0, description: '오류' });
    }
};