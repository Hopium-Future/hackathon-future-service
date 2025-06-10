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

class ExchangeOrderBook extends Model {
    static async estimateBaseAmountWhenBuy (options) {
        const {
            symbol,
            quantity: desiredAmount,
            checkAvailable: moneyAvailable,
            baseAssetId,
            quoteAssetId
        } = options
        let payMoney = 0
        let receiveAmount = 0
        if (desiredAmount <= 0) throw Error.NO_SUCH_ORDER
        const bids = await this.getSingleDepthRedis(symbol, baseAssetId, quoteAssetId, ExchangeOrderEnum.Side.SELL, 100)

        if (!bids.length) throw Error.NO_SUCH_ORDER
        for (let i = 0; i < bids.length; i++) {
            let [price, amount] = bids[i]
            price = +Big(price)
            amount = +Big(amount)
            if (payMoney < moneyAvailable && receiveAmount < desiredAmount) {
                const remainMoney = moneyAvailable - payMoney
                const remainAmount = desiredAmount - receiveAmount
                const checkAmount = Math.min(remainAmount, amount)
                const orderValue = +price * (+checkAmount)
                if (orderValue < remainMoney) {
                    payMoney += orderValue
                    receiveAmount += checkAmount
                } else {
                    payMoney = moneyAvailable
                    receiveAmount += moneyAvailable / price
                }
            } else {
                break
            }
        }

        return {
            payMoney,
            receiveAmount
        }
    }

    static async getSingleDepthRedis (symbol, baseAssetId, quoteAssetId, side, limit = 50) {
        return SpotReadQueue.readFromQueue(symbol, {
            action: 'get_single_depth',
            baseAssetId,
            quoteAssetId,
            side,
            limit

        })
    }

    static getPairKey (baseAsset, quoteAsset) {
        return `${baseAsset}_${quoteAsset}`
    }

    static async getRedisOrderBook (symbol, baseAssetId,
        quoteAssetId, limit = 50) {
        const orderBook = await SpotReadQueue.readFromQueue(symbol, {
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

    static async readFromQueue (symbol, options) {
        return new Promise((resolve, reject) => {
            SpotReadQueue.addTask(symbol, {
                ...options,
                _type: 'read'
            }, { correlationId: uuidv4() }, data => {
                resolve(data?.data)
            })
                .catch(e => {
                    reject(e)
                })
        })
    }

    static async getBinanceOrderBook (symbol) {
        try {
            let depth = await RedisStreamCache.get(`spot:depth:binance:${symbol}`)
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
