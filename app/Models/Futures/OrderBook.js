/* eslint-disable array-callback-return */

'use strict'

const Model = use('Model')
const _ = require('lodash')
const Big = require('big.js')

const { ExchangeOrder: ExchangeOrderEnum } = use('App/Library/Enum')
const SpotReadQueue = use('App/Queues/SpotReadQueue')
const Error = use('Config')
    .get('error')
const { v4: uuidv4 } = require('uuid')

const RedisStreamCache = use('Redis').connection('stream_cache')

const REDIS_FUTURES_TICKER_HASH = 'futures:ticker'
const REDIS_FUTURES_MINI_TICKER_HASH = 'futures:mini_ticker'
const REDIS_FUTURES_DEPTH_HASH = 'futures:depth'
const REDIS_FUTURES_TRADES_HASH = 'futures:trades'
const REDIS_FUTURES_MARK_PRICE_HASH = 'futures:mark_price'
class ExchangeOrderBook extends Model {
    static async getBinanceOrderBook (symbol) {
        try {
            let depth = await RedisStreamCache.hget(REDIS_FUTURES_DEPTH_HASH, symbol)
            if (depth && typeof depth === "string") {
                depth = JSON.parse(depth)
            }
            return depth
        } catch (e) {
            Logger.error('getBinanceOrderBook error', e)
            return null
        }
    }

    static getPairKey (exchange_currency, base_currency) {
        return `${exchange_currency}_${base_currency}`
    }

    static async getAttlasOrderBookCached (symbol, baseAssetId, quoteAssetId, limit = 200) {
        const depth = await this.getRedisOrderBook(symbol, baseAssetId, quoteAssetId, limit)
        //
        // let depth = await RedisStreamCache.get(`${ATTLAS_ORDER_BOOK_KEY}:${symbol}`)
        // if (depth && typeof depth === "string") {
        //     depth = JSON.parse(depth)
        // } else {
        //     depth = await this.getRedisOrderBook(symbol, baseAssetId, quoteAssetId, limit)
        //     await RedisStreamCache.setex(`${ATTLAS_ORDER_BOOK_KEY}:${symbol}`, 60, JSON.stringify(depth))
        // }
        return depth
    }

    static async getRedisOrderBook (symbol, baseAssetId, quoteAssetId, limit = 50) {
        const orderBook = await this.readFromQueue(symbol, {
            action: 'get_depth_json',
            baseAssetId,
            quoteAssetId,
            limit

        })
        const bids = {}
        const asks = {}

        if (orderBook.bids) {
            orderBook.bids.map(order => {
                const [price, quantity] = order
                if (bids.hasOwnProperty(price)) {
                    bids[price] += +quantity
                } else {
                    bids[price] = +quantity
                }
            })
        }

        if (orderBook.asks) {
            orderBook.asks.map(order => {
                const [price, quantity] = order
                if (asks.hasOwnProperty(price)) {
                    asks[price] += +quantity
                } else {
                    asks[price] = +quantity
                }
            })
        }

        const result = {
            bids: [],
            asks: []
        }

        for (const price in asks) {
            if (asks.hasOwnProperty(price) && price > 0) {
                result.asks.push([+price, +asks[price]])
            }
        }

        for (const price in bids) {
            if (bids.hasOwnProperty(price) && price > 0) {
                result.bids.push([+price, +bids[price]])
            }
        }

        result.bids = _.sortBy(result.bids, [function(o) {
            return -o[0]
        }])
        result.asks = _.sortBy(result.asks, [function(o) {
            return o[0]
        }])

        return result
    }
}

module.exports = ExchangeOrderBook

ExchangeOrderBook.Broker = {
    NAMI: 1,
    BINANCE: 2
}
