'use strict'

const RedisStreamCache = use('Redis').connection('stream_cache')
const _ = require('lodash')

const REDIS_FUTURES_TRADES_HASH = 'futures:trades'

class FuturesTrade {
    static async getRecentTrade (symbol, limit = 100) {
        const key = `${REDIS_FUTURES_TRADES_HASH}:${symbol}`
        let histories = await RedisStreamCache.lrange(key, 0, limit)
        if (histories && histories.length) {
            histories = histories.map(item => JSON.parse(item))
        }
        return histories
    }
}

module.exports = FuturesTrade
FuturesTrade.DataKey = {
    event: 'e',
    price: 'p',
    symbol: 's',
    side: 'S',
    quoteAssetId: 'qi',
    baseAssetId: 'bi',
    baseAsset: 'b',
    quoteAsset: 'q',
    quantity: 'q',
    quoteQuantity: 'Q',
    timestamp: 't'
}
