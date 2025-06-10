'use strict'

const Model = use('Model')
const RedisStreamCache = use('Redis').connection('stream_cache')

// const REDIS_FUTURES_TICKER_HASH = 'futures:ticker'
const REDIS_FUTURES_TICKER_HASH = 'future_market_watch'
const REDIS_FUTURES_MARK_PRICE_HASH = 'futures:mark_price'
const REDIS_ORDER_BOOK_HASH = 'futures:book'

class FuturesPrice extends Model {
    static async getMarketWatch () {
        const key = `future_market_watch`

        const prices = await RedisStreamCache.hgetall(key)
        const results = {}
        if (prices && Object.keys(prices).length) {
            for (const key in prices) {
                const price = JSON.parse(prices[key])
                results[key] = price
            }
        }
        return results
    }

    static async getAllMarkPrice () {
        const prices = await RedisStreamCache.hgetall(REDIS_FUTURES_MARK_PRICE_HASH)
        const results = []
        if (prices && Object.keys(prices).length) {
            for (const key in prices) {
                const price = JSON.parse(prices[key])
                results.push(price)
            }
        }
        return results
    }

    static async getMarkPrice (_symbol) {
        const symbol = _symbol.replace('VNST', 'VNDC')
        let data = await RedisStreamCache.hget(REDIS_FUTURES_MARK_PRICE_HASH, symbol)
        try {
            if (data && typeof data === 'string') {
                data = JSON.parse(data)
            }
        } catch (e) {
            console.error('getMarkPrice error', e)
        }
        return data
    }

    static async getAllTicker () {
        const prices = await RedisStreamCache.hgetall(REDIS_FUTURES_TICKER_HASH)
        const results = []
        if (prices && Object.keys(prices).length) {
            for (const key in prices) {
                const price = JSON.parse(prices[key])
                results.push(price)
            }
        }
        return results
    }

    static async getTicker (_symbol) {
        const symbol = _symbol.replace('VNST', 'VNDC')
        let data = await RedisStreamCache.hget(REDIS_FUTURES_TICKER_HASH, symbol)
        try {
            if (data && typeof data === 'string') {
                data = JSON.parse(data)
            }
        } catch (e) {
            console.error('getTicker error', e)
        }
        return data
    }

    static async saveBookTicker (_symbol, data) {
        const symbol = _symbol.replace('VNST', 'VNDC')
        this.bookTickers[symbol] = data
        await RedisStreamCache.hset(REDIS_ORDER_BOOK_HASH, symbol, JSON.stringify(data))
    }

    static async getUsdtVndcCenterRate () {
        return {
            usdtVndcBid: 23407,
            usdtVndcAsk: 23423
        }
    }

    static async getBookTicker (_symbol) {
        const symbol = _symbol.replace('VNST', 'VNDC')
        try {
            let data = await RedisStreamCache.hget(REDIS_ORDER_BOOK_HASH, symbol)
            if (data && typeof data === 'string') {
                data = JSON.parse(data)
            }
            const now = Date.now()
            if (data && data.timestamp && (now - data.timestamp > 10 * 1000)) {
                return null
            }
            return data
        } catch (e) {
            return null
        }
    }

    static async increaseViews (symbol) {
        const now = new Date()
        now.setMinutes(0, 0, 0)
        await RedisStreamCache.hincrby(`futures:market:views:${now.getTime()}`, symbol, 1)
    }
}

module.exports = FuturesPrice

FuturesPrice.PriceKey = {
    event: 'e',
    ask: 'ap',
    bid: 'bp',
    lastPrice: 'p',
    lastPrice24h: 'ld',
    markPrice: 'mp',
    high: 'h',
    low: 'l',
    open: 'o',
    close: 'c',
    high1h: 'hh',
    low1h: 'lh',
    lastChangePercentage: 'lcp',
    totalBaseVolume: 'vb',
    totalQuoteVolume: 'vq',
    lastQuantity: 'lq',
    lastQuoteQty: 'lQ',
    symbol: 's',
    positionAsset: 'pa',
    quoteAssetId: 'qi',
    baseAssetId: 'bi',
    baseAsset: 'b',
    quoteAsset: 'q',
    up: 'u',
    lastHistoryId: 'li',
    timestamp: 't',
    avgVolume: 'av',

    price1h: 'ph',
    price24h: 'ld',
    price1w: 'pw',
    price1m: 'p1m',
    price3m: 'p3m',
    priceY: 'py',
    lowY: 'ly',
    highY: 'hy',
    ath: 'ath',
    cmcId: 'cid',
    views: 'vc',
    marketCap: 'mc',
    supply: 'sp',
    label: 'lbl'
}
