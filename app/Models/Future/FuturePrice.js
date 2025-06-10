'use strict'

const Model = use('Model')
const Redis = use('Redis')
const FUTURE_RECENT_TRADE_QUEUE_PREFIX = 'future:recent_trade'

class FuturePrice extends Model {
    static getOrderBook (symbol) {
        return this.orderBook[symbol] ? this.orderBook[symbol] : []
    }

    static async getRecentTrade (symbol) {
        const key = `${FUTURE_RECENT_TRADE_QUEUE_PREFIX}:${symbol}`
        const newRecentTradeData = await Redis.lrange(key, 0, -1)
        let newRecentTrade = []
        if (newRecentTradeData && newRecentTradeData.length) {
            newRecentTrade = newRecentTradeData.map(item => JSON.parse(item))
        }
        return newRecentTrade
    }

    static async getLastPrice (symbol) {
        try {
            let price = await Redis.hget(`future_market_watch`, symbol)
            if (price && typeof price === 'string') {
                price = JSON.parse(price)
            }
            return price
        } catch (e) {
            console.error('__ getLastPrice error ', e)
            return null
        }
    }

    static async getMarketWatch () {
        const key = `future_market_watch`
        const prices = await Redis.hgetall(key)

        const UnsupportedSymbols = ['XRPUSDT', 'XRPVNDC']

        const results = {}
        if (prices && Object.keys(prices).length) {
            for (const key in prices) {
                const price = JSON.parse(prices[key])
                const { symbol } = price
                if (!UnsupportedSymbols.includes(symbol)) {
                    results[symbol] = price
                }
            }
        }
        return results
    }
}

module.exports = FuturePrice
