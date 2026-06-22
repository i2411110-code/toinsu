module.exports = async (req, res) => {
    try {
        const fetchExchange = (code) =>
            fetch(`https://api.stock.naver.com/marketindex/exchange/${code}/prices?page=1&pageSize=1`)
                .then(r => r.json())
                .catch(() => []);

        const [resKospi, resKosdaq, dataUsd, dataJpy] = await Promise.all([
            fetch('https://m.stock.naver.com/api/index/KOSPI/basic'),
            fetch('https://m.stock.naver.com/api/index/KOSDAQ/basic'),
            fetchExchange('FX_USDKRW'),
            fetchExchange('FX_JPYKRW')
        ]);

        const dataKospi = await resKospi.json();
        const dataKosdaq = await resKosdaq.json();

        const items = [];
        const safeParse = (str) => parseFloat((str || '0').toString().replace(/,/g, ''));

        // 코스피/코스닥용 (기존 구조 그대로)
        const getDirectionIndex = (obj) => {
            if (!obj || !obj.compareToPreviousPrice) return 'up';
            return obj.compareToPreviousPrice.code === '5' ? 'down' : 'up';
        };

        // 환율용 (fluctuationsType.code: '2' = 상승, 그 외 = 하락)
        const getDirectionFx = (obj) => {
            if (!obj || !obj.fluctuationsType) return 'up';
            return obj.fluctuationsType.code === '2' ? 'up' : 'down';
        };

        if (dataKospi && dataKospi.closePrice) {
            items.push({ label: '코스피', value: safeParse(dataKospi.closePrice), change: safeParse(dataKospi.compareToPreviousClosePrice), direction: getDirectionIndex(dataKospi) });
        }
        if (dataKosdaq && dataKosdaq.closePrice) {
            items.push({ label: '코스닥', value: safeParse(dataKosdaq.closePrice), change: safeParse(dataKosdaq.compareToPreviousClosePrice), direction: getDirectionIndex(dataKosdaq) });
        }

        const usdItem = Array.isArray(dataUsd) ? dataUsd[0] : null;
        const jpyItem = Array.isArray(dataJpy) ? dataJpy[0] : null;

        if (usdItem) items.push({ label: 'USD', value: safeParse(usdItem.closePrice), change: safeParse(usdItem.fluctuations), direction: getDirectionFx(usdItem) });
        if (jpyItem) items.push({ label: 'JPY', value: safeParse(jpyItem.closePrice), change: safeParse(jpyItem.fluctuations), direction: getDirectionFx(jpyItem) });

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
    { label: 'USD', value: 1350.00, change: 0, direction: 'up' },
    { label: 'JPY', value: 900.00, change: 0, direction: 'up' }
];