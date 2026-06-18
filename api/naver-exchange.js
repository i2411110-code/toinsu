module.exports = async (req, res) => {
    try {
        // 비동기로 데이터 병렬 호출 (속도 향상)
        const [resKospi, resKosdaq, resMetals] = await Promise.all([
            fetch('https://m.stock.naver.com/api/index/KOSPI/basic'),
            fetch('https://m.stock.naver.com/api/index/KOSDAQ/basic'),
            fetch('https://m.stock.naver.com/front-api/v1/marketIndex/prices?category=metals')
        ]);

        const dataKospi = await resKospi.json();
        const dataKosdaq = await resKosdaq.json();
        const dataMetals = await resMetals.json();
        
        const items = [];
        
        // 데이터 안전하게 추출하는 함수 (코드 길이를 줄이고 에러를 방지합니다)
        const safeParse = (str) => parseFloat((str || '0').toString().replace(/,/g, ''));
        const getDirection = (obj) => {
            if (!obj || !obj.compareToPreviousPrice) return 'up';
            return obj.compareToPreviousPrice.code === '5' ? 'down' : 'up';
        };

        if (dataKospi && dataKospi.closePrice) {
            items.push({
                label: '코스피',
                value: safeParse(dataKospi.closePrice),
                change: safeParse(dataKospi.compareToPreviousClosePrice),
                direction: getDirection(dataKospi)
            });
        }
        if (dataKosdaq && dataKosdaq.closePrice) {
            items.push({
                label: '코스닥',
                value: safeParse(dataKosdaq.closePrice),
                change: safeParse(dataKosdaq.compareToPreviousClosePrice),
                direction: getDirection(dataKosdaq)
            });
        }
        if (dataMetals && dataMetals.result) {
            const gold = dataMetals.result.find(item => item.reutersCode === 'KRDXGO_SC_KRX');
            if (gold) {
                items.push({
                    label: '국내 금 (원/g)',
                    value: safeParse(gold.closePrice),
                    change: safeParse(gold.compareToPreviousClosePrice),
                    direction: getDirection(gold)
                });
            }
        }

        res.status(200).json(items.length > 0 ? items : fallbackData);

    } catch (error) {
        console.error('증권 API 연동 중 문제 발생:', error);
        res.status(200).json(fallbackData);
    }
};

// 비상시 표시할 안전 데이터
const fallbackData = [
    { label: '코스피', value: 2750.45, change: 0, direction: 'up' },
    { label: '코스닥', value: 870.12, change: 0, direction: 'down' },
    { label: '국내 금 (원/g)', value: 105400, change: 0, direction: 'up' }
];