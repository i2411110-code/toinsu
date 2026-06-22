module.exports = async (req, res) => {
    try {
        const fetchExchange = (code) =>
            fetch(`https://api.stock.naver.com/marketindex/exchange/${code}/prices?page=1&pageSize=1`)
                .then(r => r.json())
                .catch(() => null);

        const [resKospi, resKosdaq, dataUsd, dataJpy] = await Promise.all([
            fetch('https://m.stock.naver.com/api/index/KOSPI/basic'),
            fetch('https://m.stock.naver.com/api/index/KOSDAQ/basic'),
            fetchExchange('FX_USDKRW'),
            fetchExchange('FX_JPYKRW')
        ]);

        const dataKospi = await resKospi.json();
        const dataKosdaq = await resKosdaq.json();

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

        // dataUsd, dataJpy 구조는 로그 확인 후 맞춰서 파싱 (배열일 수도, {result:[...]}일 수도 있음)
        const usdArr = Array.isArray(dataUsd) ? dataUsd : (dataUsd && dataUsd.result) || [];
        const jpyArr = Array.isArray(dataJpy) ? dataJpy : (dataJpy && dataJpy.result) || [];

        if (usdArr[0]) items.push({ label: 'USD', value: safeParse(usdArr[0].closePrice), change: safeParse(usdArr[0].compareToPreviousClosePrice), direction: getDirection(usdArr[0]) });
        if (jpyArr[0]) items.push({ label: 'JPY', value: safeParse(jpyArr[0].closePrice), change: safeParse(jpyArr[0].compareToPreviousClosePrice), direction: getDirection(jpyArr[0]) });

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