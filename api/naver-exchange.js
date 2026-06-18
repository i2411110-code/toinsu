module.exports = async (req, res) => {
    try {
        // 한국 시간 기준 현재 날짜/시간 생성
        const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

        res.status(200).json({
            date: now,
            items: [
                { label: 'USD', value: 1385.50, change: 2.10, direction: 'up' },
                { label: 'JPY', value: 890.30, change: 1.50, direction: 'down' },
                { label: 'EUR', value: 1485.20, change: 3.00, direction: 'up' },
                { label: 'CNY', value: 190.50, change: 0.20, direction: 'down' }
            ]
        });
    } catch (error) {
        res.status(500).json({ error: '환율 데이터 연동 실패' });
    }
};