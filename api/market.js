module.exports = async (req, res) => {
    try {
        res.status(200).json([
            { label: '코스피', value: 2750.45, change: 15.30, direction: 'up' },
            { label: '코스닥', value: 870.12, change: 5.40, direction: 'down' },
            { label: '국내 금 (원/g)', value: 105400, change: 300, direction: 'up' },
            { label: '은 (USD/OZS)', value: 30.25, change: 0.15, direction: 'up' }
        ]);
    } catch (error) {
        res.status(500).json({ error: '시장 지표 연동 실패' });
    }
};