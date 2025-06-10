'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const CacheMarketMaker = use('Redis').connection('cache_market_maker')
const MemoryCache = use('App/Models/MemoryCache')
const cache = new MemoryCache(30) // Create a new cache service instance
const Error = use('Config').get('error')
const _ = require('lodash')

const FuturesPrice = use('App/Models/Futures/FuturesPrice')

const Utils = use('App/Library/Utils')
const {
    FuturesOrder: FuturesOrderEnum,
    FuturesConfig: FuturesConfigEnum
} = use("App/Library/Enum")

const FuturesConfig = use("App/Models/Config/FuturesConfig")
const UserPreferences = use('App/Models/Mongo/UserPreferences')
const FuturesLeverage = use("App/Models/Futures/FuturesLeverage")
const BinanceClientService = use('App/Services/BinanceClientService')

class BinanceFuturesService {
    static async setFuturesMarginType (options = {}) {
        const { userId, symbol, marginType } = _.defaults(options, {
            userId: null,
            symbol: null,
            marginType: null
        })
        // upsert data
        return UserPreferences.findOneAndUpdate(
            {
                user_id: userId,
                key: UserPreferences.Keys.FuturesConfig
            },
            {
                $set: {
                    user_id: userId,
                    key: UserPreferences.Keys.FuturesConfig,
                    [`value.marginType.${symbol}`]: marginType
                }
            }, { upsert: true, new: true }
        )
    }

    static async getFuturesUserSetting (options = {}) {
        const { userId } = _.defaults(options, {
            userId: null,
            dualSidePosition: null
        })
        return UserPreferences.findOne(
            {
                user_id: userId,
                key: UserPreferences.Keys.FuturesConfig
            }
        )
    }

    static async setFuturesPositionSide (options = {}) {
        const { userId, dualSidePosition } = _.defaults(options, {
            userId: null,
            dualSidePosition: null
        })
        return UserPreferences.findOneAndUpdate(
            {
                user_id: userId,
                key: UserPreferences.Keys.FuturesConfig
            },
            {
                $set: {
                    user_id: userId,
                    key: UserPreferences.Keys.FuturesConfig,
                    [`value.dualSidePosition`]: dualSidePosition
                }
            }, { upsert: true, new: true }
        )
    }



    // validate input

    static async filterOrderInputApi (input = {}) {
        let {
            symbol,
            side,
            positionSide,
            type,
            quantity,
            reduceOnly,
            price,
            newClientOrderId,
            stopPrice,
            closePosition,
            activationPrice,
            callbackRate,
            workingType,
            priceProtect,
            newOrderRespType
        } = _.defaults(input, {
            symbol: null,
            side: null,
            positionSide: 'BOTH',
            type: null,
            quantity: null,
            reduceOnly: null,
            price: null,
            newClientOrderId: null,
            stopPrice: null,
            closePosition: null,
            activationPrice: null,
            callbackRate: null,
            workingType: null,
            priceProtect: null,
            newOrderRespType: null
        })
        quantity = +quantity
        price = +price
        stopPrice = +stopPrice
        // Check side type
        if (!Object.values(FuturesOrderEnum.Side)
            .includes(side)) {
            return Error.INVALID_SIDE
        }
        if (!Object.values(FuturesOrderEnum.Type)
            .includes(type)) {
            return Error.INVALID_ORDER_TYPE
        }
        const config = await FuturesConfig.getOneCached({ symbol })
        if (!(config && config.status === "TRADING")) return Error.TRADE_NOT_ALLOWED
        if (config.filters && config.filters.length) {
            for (let i = 0; i < config.filters.length; i++) {
                const filter = config.filters[i]
                switch (filter.filterType) {
                case FuturesConfigEnum.FilterType.PRICE_FILTER: {
                    const {
                        minPrice,
                        maxPrice,
                        tickSize
                    } = filter

                    let priceFilterError = false
                    if ([FuturesOrderEnum.Type.LIMIT].includes(type)) {
                        if (price < +minPrice || price > +maxPrice) {
                            priceFilterError = true
                        }
                        if (Utils.isInvalidPrecision(+price, +tickSize)) {
                            priceFilterError = true
                        }
                    }

                    if (
                        [FuturesOrderEnum.Type.STOP].includes(type)
                    ) {
                        if (stopPrice < minPrice || stopPrice > maxPrice) {
                            priceFilterError = true
                        }
                        if (Utils.isInvalidPrecision(stopPrice, tickSize)) {
                            priceFilterError = true
                        }
                    }
                    if (priceFilterError) return Error.PRICE_FILTER

                    break
                }

                case FuturesConfigEnum.FilterType.LOT_SIZE: {
                    const {
                        minQty,
                        maxQty,
                        stepSize
                    } = filter

                    if (quantity < +minQty || quantity > +maxQty) {
                        return Error.LOT_SIZE
                    }
                    if (Utils.isInvalidPrecision(+quantity, +stepSize)) {
                        return Error.LOT_SIZE
                    }
                    break
                }

                case FuturesConfigEnum.FilterType.MARKET_LOT_SIZE: {
                    if (type !== FuturesOrderEnum.Type.MARKET) break
                    const { maxQty } = filter
                    const ticker = await FuturesPrice.getTicker(config.symbol)
                    const lastPrice = +ticker?.c || 0
                    if (lastPrice > 0) {
                        let marketSize = 0
                        marketSize = quantity
                        if (marketSize > +maxQty) return Error.MARKET_LOT_SIZE
                    }
                    break
                }
                case FuturesConfigEnum.FilterType.PERCENT_PRICE: {
                    if (type === FuturesOrderEnum.Type.MARKET) break
                    const {
                        multiplierUp,
                        multiplierDown
                    } = filter
                    const ticker = await FuturesPrice.getTicker(config.symbol)
                    const lastPrice = +ticker?.c || 0
                    if (price > 0 && lastPrice > 0) {
                        if (price / lastPrice > multiplierUp || price / lastPrice < multiplierDown) {
                            return Error.PERCENT_PRICE
                        }
                    }
                    break
                }
                // Check min notional
                case FuturesConfigEnum.FilterType.MIN_NOTIONAL: {
                    const { minNotional } = filter
                    let orderValue = 0
                    orderValue = quantity * price
                    if (orderValue < +minNotional * (1 - 0.12 / 100)) {
                        return Error.MIN_NOTIONAL
                    }
                    break
                }
                default:
                    break
                }
            }
        }
        return null
    }

    static async newOrder (input = {}) {
        let {
            userId,
            symbol,
            side,
            positionSide,
            type,
            quantity,
            reduceOnly,
            price,
            newClientOrderId,
            stopPrice,
            closePosition,
            timeInForce,
            activationPrice,
            callbackRate,
            workingType,
            priceProtect,
            newOrderRespType
        } = _.defaults(input, {
            userId: undefined,
            symbol: undefined,
            side: undefined,
            positionSide: 'BOTH',
            type: undefined,
            quantity: undefined,
            reduceOnly: undefined,
            price: undefined,
            newClientOrderId: undefined,
            timeInForce: undefined,
            stopPrice: undefined,
            closePosition: undefined,
            activationPrice: undefined,
            callbackRate: undefined,
            workingType: undefined,
            priceProtect: undefined,
            newOrderRespType: 'RESULT'
        })

        quantity = +quantity
        price = +price
        stopPrice = +stopPrice
        // Send order to binance and save to database
        const config = await FuturesConfig.getOneCached({ symbol })
        const { [symbol]: leverage } = await FuturesLeverage.getFutureLeverageCached(userId, symbol)
        // Calculate leverage
        console.log('__ check leverage', leverage)

        // Bo qua het, dat lenh qua binance rồi lưu vào db

        // Position -> lưu vào redis

        // Order -> lưu vào db. Lưu lại lịch sử khớp lệnh
        // const result = await BinanceFuturesService.newOrder()

        const data = await BinanceClientService.postOrder({ id: userId }, {
            symbol,
            side,
            positionSide,
            type,
            quantity,
            reduceOnly,
            price,
            timeInForce,
            newClientOrderId,
            stopPrice,
            closePosition,
            activationPrice,
            callbackRate,
            workingType,
            priceProtect,
            newOrderRespType
        })
        console.log('__ chekc data', JSON.stringify(data))
        const { code } = data
        if (code < 0) {
            throw data
        } else {
            return data
        }
    }

    static async getOrder (input = {}) {
        const {
            userId,
            symbol,
            orderId,
            origClientOrderId
        } = _.defaults(input, {
            userId: undefined,
            orderId: undefined,
            origClientOrderId: undefined

        })

		let data = null
		// if(orderId || origClientOrderId){
		// 	data = await BinanceClientService.futuresAllOrder({ id: userId }, symbol, { orderId, origClientOrderId })
		// }else{
		// 	data = await BinanceClientService.futuresAllOrder({ id: userId }, symbol, { orderId, origClientOrderId })
		// }
		data = await BinanceClientService.futuresAllOrder({ id: userId }, symbol, { orderId, origClientOrderId })
        const { code } = data
        if (code < 0) {
            throw data
        } else {
            return data
        }
    }

    static async getOpenOrder (input = {}) {
        const {
            userId,
            symbol
        } = _.defaults(input, { userId: undefined })
        const data = await BinanceClientService.futuresOpenOrders({ id: userId }, symbol)
        const { code } = data
        if (code < 0) {
            throw data
        } else {
            return data
        }
    }

    static async deleteOrder (input = {}) {
        const {
            userId,
            symbol,
            orderId,
            origClientOrderId
        } = _.defaults(input, {
            userId: undefined,
            orderId: undefined,
            origClientOrderId: undefined

        })
        const data = await BinanceClientService.deleteOrder({ id: userId }, symbol, { orderId, origClientOrderId })
        const { code } = data
        if (code < 0) {
            throw data
        } else {
            return data
        }
    }

    static async deleteOpenOrders (input = {}) {
        const {
            userId,
            symbol,
            orderId,
            origClientOrderId
        } = _.defaults(input, { userId: undefined })
        const data = await BinanceClientService.deleteAllOpenOrders({ id: userId }, symbol, { orderId, origClientOrderId })
        const { code } = data
        if (code < 0) {
            throw data
        } else {
            return data
        }
    }

    static async getUserTrade (input = {}) {
        const {
            userId,
            symbol,
            startTime,
            endTime,
            fromId,
            limit
        } = _.defaults(input, {
            userId: undefined,
            symbol: undefined,
            startTime: undefined,
            endTime: undefined,
            fromId: undefined,
            limit: 500
        })
        const data = await BinanceClientService.getUserTrades({ id: userId }, symbol, {
            startTime,
            endTime,
            fromId,
            limit
        })
        const { code } = data
        if (code < 0) {
            throw data
        } else {
            return data
        }
    }

    static async getFuturesBalance (input = {}) {
        const { userId } = _.defaults(input, { userId: undefined })
        const data = await BinanceClientService.getFuturesBalance({ id: userId })
        const { code } = data
        if (code < 0) {
            throw data
        } else {
            return data
        }
    }

    static async getPosition (input = {}) {
        const { userId, symbol } = _.defaults(input, { userId: undefined, symbol: undefined })
        const data = await BinanceClientService.getPosition({ id: userId }, { symbol })
        const { code } = data
        if (code < 0) {
            throw data
        } else {
            return data
        }
    }

    static async putPositionMargin (input = {}) {
        const {
            userId,
            symbol,
            positionSide,
            amount,
            type
        } = _.defaults(input, {
            userId: undefined,
            symbol: undefined,
            positionSide: undefined,
            amount: undefined,
            type: undefined
        })
        const data = await BinanceClientService.putFuturesPositionMargin({ id: userId }, {
            positionSide,
            symbol,
            amount,
            type
        })
        const { code } = data
        if (code < 0) {
            throw data
        } else {
            return data
        }
    }

    static async getIncomeHistory (input = {}) {
        const {
            userId,
            symbol,
            incomeType,
            startTime,
            endTime,
            limit

        } = _.defaults(input, {
            userId: undefined,
            symbol: undefined,
            incomeType: undefined,
            startTime: undefined,
            endTime: undefined,
            limit: 100
        })
        const data = await BinanceClientService.getUserIncome({ id: userId }, {
            symbol,
            incomeType,
            startTime,
            endTime,
            limit
        })
        const { code } = data
        if (code < 0) {
            throw data
        } else {
            return data
        }
    }

    // deleteAllOpenOrders

    static async calculateInitialMargin (input = {}) {
        // Calculate order value

    }

    static async calculateCost (input = {}) {
        return 0
    }
}

module.exports = BinanceFuturesService
