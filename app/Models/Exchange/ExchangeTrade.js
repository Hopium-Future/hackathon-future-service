'use strict'

const Redis = use('Redis')
const _ = require('lodash')

const RECENT_TRADE_QUEUE_PREFIX = 'RECENT_TRADE_QUEUE_PREFIX:'

class ExchangeTrade {
    static async getRecentTrade (baseAssetId, quoteAssetId, limit = 100) {
        let histories = await Redis.lrange(`${RECENT_TRADE_QUEUE_PREFIX}${baseAssetId}_${quoteAssetId}`, 0, limit)
        if (histories && histories.length) {
            histories = histories.map(item => JSON.parse(item))
        }
        return histories
    }
}

module.exports = ExchangeTrade
ExchangeTrade.DataKey = {
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
