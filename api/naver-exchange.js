module.exports = async (req, res) => {
    try {
        // 지수, 금, 환율 데이터를 동시에 호출합니다.
        const [resKospi, resKosdaq, resMetals, resExchange] = await Promise.all([
            fetch('https://m.stock.naver.com/api/index/KOSPI/basic'),
            fetch('https://m.stock.naver.com/api/index/KOSDAQ/basic'),
            fetch('https://m.stock.naver.com/front-api/v1/marketIndex/prices?category=metals'),
            fetch('https://m.stock.naver.com/front-api/v1/marketIndex/prices?category=exchange') // 환율 API 추가
        ]);

        const dataKospi = await resKospi.json();
        const dataKosdaq = await resKosdaq.json();
        const dataMetals = await resMetals.json();
        const dataExchange = await resExchange.json();
        
        const items = [];
        
        const safeParse = (str) => parseFloat((str || '0').toString().replace(/,/g, ''));
        const getDirection = (obj) => {
            if (!obj || !obj.compareToPreviousPrice) return 'up';
            return obj.compareToPreviousPrice.code === '5' ? 'down' : 'up';
        };

        // 1. 코스피 / 코스닥
        if (dataKospi && dataKospi.closePrice) {
            items.push({ label: '코스피', value: safeParse(dataKospi.closePrice), change: safeParse(dataKospi.compareToPreviousClosePrice), direction: getDirection(dataKospi) });
        }
        if (dataKosdaq && dataKosdaq.closePrice) {
            items.push({ label: '코스닥', value: safeParse(dataKosdaq.closePrice), change: safeParse(dataKosdaq.compareToPreviousClosePrice), direction: getDirection(dataKosdaq) });
        }

        // 2. 국내 금
        if (dataMetals && dataMetals.result) {
            const gold = dataMetals.result.find(item => item.reutersCode === 'KRDXGO_SC_KRX');
            if (gold) items.push({ label: '국내 금 (원/g)', value: safeParse(gold.closePrice), change: safeParse(gold.compareToPreviousClosePrice), direction: getDirection(gold) });
        }

        // 3. 환율 (USD, JPY) 추가
        if (dataExchange && dataExchange.result) {
            const usd = dataExchange.result.find(item => item.reutersCode === 'FX_USDKRW');
            const jpy = dataExchange.result.find(item => item.reutersCode === 'FX_JPYKRW');
            if (usd) items.push({ label: 'USD', value: safeParse(usd.closePrice), change: safeParse(usd.compareToPreviousClosePrice), direction: getDirection(usd) });
            if (jpy) items.push({ label: 'JPY', value: safeParse(jpy.closePrice), change: safeParse(jpy.compareToPreviousClosePrice), direction: getDirection(jpy) });
        }

        res.setHeader('Cache-Control', 'no-store');
        res.status(200).json({ items: items.length > 0 ? items : fallbackData });

    } catch (error) {
        console.error('증권 API 연동 중 문제 발생:', error);
        res.setHeader('Cache-Control', 'no-store');
        res.status(200).json({ items: fallbackData });
    }
};



// 비상시 표시할 안전 데이터 (환율 추가)
const fallbackData = [
    { label: '코스피', value: 2750.45, change: 0, direction: 'up' },
    { label: '코스닥', value: 870.12, change: 0, direction: 'down' },
    { label: '국내 금 (원/g)', value: 105400, change: 0, direction: 'up' },
    { label: 'USD', value: 1350.00, change: 0, direction: 'up' },
    { label: 'JPY', value: 900.00, change: 0, direction: 'up' }
];