module.exports = async (req, res) => {
    try {
        const fetchExchange = (code) =>
            fetch(`https://m.stock.naver.com/front-api/v1/marketIndex/prices?category=exchange&reutersCode=${code}&page=1&pageSize=1`)
                .then(r => r.json())
                .catch(() => null);

        const fetchMetal = (code) =>
            fetch(`https://m.stock.naver.com/front-api/v1/marketIndex/prices?category=metals&reutersCode=${code}&page=1&pageSize=1`)
                .then(r => r.json())
                .catch(() => null);

        const [resKospi, resKosdaq, dataGold, dataUsd, dataJpy] = await Promise.all([
            fetch('https://m.stock.naver.com/api/index/KOSPI/basic'),
            fetch('https://m.stock.naver.com/api/index/KOSDAQ/basic'),
            fetchMetal('KRDXGO_SC_KRX'),
            fetchExchange('FX_USDKRW'),
            fetchExchange('FX_JPYKRW')
        ]);

        const dataKospi = await resKospi.json();
        const dataKosdaq = await resKosdaq.json();

        console.log('dataGold:', JSON.stringify(dataGold).slice(0, 300));
        console.log('dataUsd:', JSON.stringify(dataUsd).slice(0, 300));
        console.log('dataJpy:', JSON.stringify(dataJpy).slice(0, 300));

        const items = [];
        const safeParse = (str) => parseFloat((str || '0').toString().replace(/,/g, ''));
        const getDirection = (obj) => {
            if (!obj || !obj.compareToPreviousPrice) return 'up';
            return obj.compareToPreviousPrice.code === '5' ? 'down' : 'up';
        };

        if (dataKospi && dataKospi.closePrice) {
            items.push({ label: '코스피', value: safeParse(dataKospi.closePrice), change: safeParse(dataKospi.compareToPreviousClosePrice), direction: getDirection(dataKospi) });
        }
        if (dataKosdaq && dataKosdaq.closePrice) {
            items.push({ label: '코스닥', value: safeParse(dataKosdaq.closePrice), change: safeParse(dataKosdaq.compareToPreviousClosePrice), direction: getDirection(dataKosdaq) });
        }

        const goldItem = dataGold && dataGold.result && dataGold.result[0];
        if (goldItem) items.push({ label: '국내 금 (원/g)', value: safeParse(goldItem.closePrice), change: safeParse(goldItem.compareToPreviousClosePrice), direction: getDirection(goldItem) });

        const usdItem = dataUsd && dataUsd.result && dataUsd.result[0];
        if (usdItem) items.push({ label: 'USD', value: safeParse(usdItem.closePrice), change: safeParse(usdItem.compareToPreviousClosePrice), direction: getDirection(usdItem) });

        const jpyItem = dataJpy && dataJpy.result && dataJpy.result[0];
        if (jpyItem) items.push({ label: 'JPY', value: safeParse(jpyItem.closePrice), change: safeParse(jpyItem.compareToPreviousClosePrice), direction: getDirection(jpyItem) });

        res.setHeader('Cache-Control', 'no-store');
        res.status(200).json({ items: items.length > 0 ? items : fallbackData });

    } catch (error) {
        console.error('증권 API 연동 중 문제 발생:', error);
        res.setHeader('Cache-Control', 'no-store');
        res.status(200).json({ items: fallbackData });
    }
};

const fallbackData = [
    { label: '코스피', value: 2750.45, change: 0, direction: 'up' },
    { label: '코스닥', value: 870.12, change: 0, direction: 'down' },
    { label: '국내 금 (원/g)', value: 105400, change: 0, direction: 'up' },
    { label: 'USD', value: 1350.00, change: 0, direction: 'up' },
    { label: 'JPY', value: 900.00, change: 0, direction: 'up' }
];