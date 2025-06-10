'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const CacheMarketMaker = use('Redis')
    .connection('cache_market_maker')
const MemoryCache = use('App/Models/MemoryCache')
const cache = new MemoryCache(30) // Create a new cache service instance
const Error = use('Config')
    .get('error')
const _ = require('lodash')
const Promise = require("bluebird")
const { option } = require('commander')

const { ObjectId } = require('mongoose').Types

const FutureOrderMongo = use('App/Models/Futures/FuturesOrder')
const FuturesPrice = use('App/Models/Futures/FuturesPrice')

const RedisCache = use('Redis')
    .connection('cache')
const Utils = use('App/Library/Utils')
const {
    FuturesOrder: FuturesOrderEnum,
    FuturesConfig: FuturesConfigEnum,
    NamiFuturesOrder: NamiFuturesOrderEnum
} = use("App/Library/Enum")

const socket = use('App/Library/Socket/SocketClientToMainServer')
const FuturesConfig = use("App/Models/Config/FuturesConfig")
const UserPreferences = use('App/Models/Mongo/UserPreferences')
const FuturesLeverage = use("App/Models/Futures/FuturesLeverage")

const REQUEST_OPENING_REDIS_KEY = 'futures::queue:request_opening:'
const REQUEST_CLOSING_REDIS_KEY = 'futures::queue:request_closing:'
const FuturesOrderCacheRedis = use('App/Models/VndcFuture/CacheRedis')
const RedisSocket = use('Redis')
    .connection('socket')

class NamiFuturesService {
    static async setFuturesMarginType(options = {}) {
        const {
            userId,
            symbol,
            marginType
        } = _.defaults(options, {
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
            }, {
                upsert: true,
                new: true
            }
        )
    }

    static async getFuturesUserSetting(options = {}) {
        const { userId } = _.defaults(options, {
            userId: null,
            dualSidePosition: null
        })
        return UserPreferences.findOne(
            {
                user_id: userId,
                key: UserPreferences.Keys.FuturesConfig
            }
        ).read('s')
    }

    static async setFuturesPositionSide(options = {}) {
        const {
            userId,
            dualSidePosition
        } = _.defaults(options, {
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
            }, {
                upsert: true,
                new: true
            }
        )
    }

    // validate input

    static async filterOrderInputApi(input = {}) {
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

    static async getOpeningOrder(user, options = {}, showQueueingOrders = true, appendOrders, removeOrders) {
        const _options = _.defaults(options, {
            page: 0,
            pageSize: 50
        })
        if (!user) throw Error.UNKNOWN
        const {
            page,
            pageSize,
            sorted
        } = _options
        const [ordersInDb, orderRequesting, orderClosing] = await Promise.all([
            FutureOrderMongo.where({
                user_id: user.id,
                liquidity_broker: 'NAMI',
                status: { $in: [NamiFuturesOrderEnum.Status.PENDING, NamiFuturesOrderEnum.Status.ACTIVE] }
            })
                .select('-_id -bitmex_main_order_id -bitmex_sl_order_id -bitmex_tp_order_id -__v')
                .sort('-created_at')
                .skip((page) * pageSize)
                .limit(pageSize)
                .lean(),
            (showQueueingOrders && page === 0) ? RedisCache.hgetall(REQUEST_OPENING_REDIS_KEY + user.id)
                    .then(data => Object.values(data)
                        .map(line => JSON.parse(line)))
                : Promise.resolve([]),
            (showQueueingOrders && page === 0) ? RedisCache.hkeys(REQUEST_CLOSING_REDIS_KEY + user.id)
                    .then(ids => ids.map(id => +id))
                : Promise.resolve([])
        ])

        // Hise all orders closing
        let ordersToShow
        if (orderClosing.length) {
            ordersToShow = ordersInDb.filter(order => !orderClosing.includes(order.displaying_id))
        } else {
            ordersToShow = ordersInDb
        }
        if (removeOrders && removeOrders.length) {
            const removeIdsHash = {}
            removeOrders.forEach(e => removeIdsHash[e.displaying_id] = 1)
            ordersToShow = ordersToShow.filter(order => !removeIdsHash[order.displaying_id])
        }
        const result = [...orderRequesting, ...ordersToShow]

        let orderToAppend = []
        if (appendOrders && appendOrders.length) {
            const idsAlreadyFetched = {}
            result.forEach(e => idsAlreadyFetched[e.displaying_id] = 1)
            orderToAppend = appendOrders.filter(order => !idsAlreadyFetched[order.displaying_id])
        }
        return [...orderToAppend, ...result]
    }

    static async findOpeningOrders(user, criteria = {}, limit = 50) {
        return FutureOrderMongo.where({
            ...criteria,
            user_id: user.id,
            status: { $in: [NamiFuturesOrderEnum.Status.PENDING, NamiFuturesOrderEnum.Status.ACTIVE] }
        })
            .select('-_id -bitmex_main_order_id -bitmex_sl_order_id -bitmex_tp_order_id -__v')
            .sort('-created_at')
            .limit(limit)
    }

    static async getHistoryOrder(user, options = {}, showQueueingOrders = true, appendOrder) {
        const _options = _.defaults(options, {
            page: 0,
            pageSize: 20
        })
        if (!user) throw Error.UNKNOWN
        const {
            page,
            pageSize,
            side,
            symbol,
            timeFrom = 0,
            timeTo = 0,
            sortField = '',
            sortDirection = '',
            marginCurrency
        } = _options

        const conditions = {
            user_id: user.id,
            // liquidity_broker: 'NAMI',
            status: NamiFuturesOrderEnum.Status.CLOSED,
            displaying_id: { $gte: 0 }
        }

        if (marginCurrency) conditions.margin_currency = marginCurrency

        const sort = {
            closed_at: 'desc',
            created_at: 'desc'
        }

        const [ordersInDb, orderClosing] = await Promise.all([
            FutureOrderMongo.where(conditions)
                .select('-_id -bitmex_main_order_id -bitmex_sl_order_id -bitmex_tp_order_id -__v')
                .sort(sort)
                .skip((page) * pageSize)
                .limit(pageSize)
                .lean()
                .read('s'),
            (showQueueingOrders && page === 0) ? RedisCache.hgetall(REQUEST_CLOSING_REDIS_KEY + user.id)
                    .then(data => Object.values(data)
                        .map(line => JSON.parse(line)))
                : Promise.resolve([])
        ])
        const result = [...orderClosing, ...ordersInDb]
        let orderToAppend = []
        if (appendOrder && appendOrder.length) {
            const idsAlreadyFetched = {}
            result.forEach(e => idsAlreadyFetched[e.displaying_id] = 1)
            orderToAppend = appendOrder.filter(order => !idsAlreadyFetched[order.displaying_id])
        }
        const orders = [...orderToAppend, ...result]
        // const total = await FutureOrderMongo.countDocuments(conditions)
        const total = 100
        return { orders, pageCount: _.ceil(total / pageSize), total }
    }

    static async getHistoryOrderMobile(user, options = {}) {
        const _options = _.defaults(options, {
            page: 0,
            pageSize: 20
        })
        if (!user) throw Error.UNKNOWN
        const {
            page,
            pageSize,
            side,
            marginCurrency,
            reasonCloseCode,
            range
        } = _options

        const conditions = {
            user_id: user.id,
            // liquidity_broker: 'NAMI',
            status: NamiFuturesOrderEnum.Status.CLOSED,
            displaying_id: { $gte: 0 }
        }

        if (marginCurrency) conditions.margin_currency = +marginCurrency
        if (reasonCloseCode) {
            conditions.reason_close_code = +reasonCloseCode
        } else {
            conditions.reason_close_code = { $ne: 5 } // DCA
        }
        if (side) conditions.side = side
        if (range) {
            const from = Date.now() - Number(range) * 24 * 60 * 60 * 1000
            conditions.closed_at = { $gte: new Date(from) }
        }

        const sort = {
            closed_at: 'desc',
            created_at: 'desc'
        }

        const hash = `getHistoryOrderMobile:${user.id}`
        const key = JSON.stringify(options)
        const cacheData = await RedisCache.hget(hash, key)
        let orders = []
        if (cacheData) {
            orders = JSON.parse(cacheData)
        } else {
            const [listOrdersMongo] = await Promise.all([
                FutureOrderMongo.where(conditions)
                    .select('-_id -bitmex_main_order_id -bitmex_sl_order_id -bitmex_tp_order_id -__v')
                    .sort(sort)
                    .skip((page) * pageSize)
                    .limit(pageSize + 1)
                    .lean()
            ])
            orders = listOrdersMongo
            await RedisCache.hset(hash, key, JSON.stringify(orders))
            await RedisCache.expire(hash, 60 * 10)
        }

        let mergeOrderMongoRedis = []

        const listOrderRedis = await FuturesOrderCacheRedis.listOrderByUserId({ user_id: user.id })
        const redis_order_ids = []

        // merge with order close in redis
        // loop orders redis first
        listOrderRedis.forEach(redisOrder => {
            if (
                redisOrder.displaying_id
                && redisOrder.status === NamiFuturesOrderEnum.Status.CLOSED
                && (marginCurrency ? redisOrder.margin_currency === Number(marginCurrency) : true)
            ) {
                redis_order_ids.push(redisOrder.displaying_id)
                mergeOrderMongoRedis.push(redisOrder)
            }
        })
        if (redis_order_ids.length === 0) {
            mergeOrderMongoRedis = orders
        } else {
            orders.forEach(eachOrder => {
                if (!redis_order_ids.includes(eachOrder?.displaying_id)) mergeOrderMongoRedis.push(eachOrder)
            })

            mergeOrderMongoRedis = mergeOrderMongoRedis.sort((a, b) =>
                new Date(b?.closed_at || b?.created_at) - new Date(a?.closed_at || a?.created_at)
            )
        }

        return { orders: mergeOrderMongoRedis.slice(0, pageSize), hasNext: mergeOrderMongoRedis.length > pageSize }
    }

    static async countOpeningOrder(user, symbol = null) {
        if (!user) return null
        const query = {
            user_id: user.id,
            status: { $in: [NamiFuturesOrderEnum.Status.PENDING, NamiFuturesOrderEnum.Status.ACTIVE] }
        }
        if (symbol) query.symbol = symbol
        return await FutureOrderMongo.countDocuments(query).read('s')
    }
}

module.exports = NamiFuturesService

NamiFuturesService.updateHistoryOrder = _.memoizeThrottle(async (user, appendOrder) => {
    try {
        // if (!socket.checkUserOnline({ id: user.id })) {
        //     return
        // }

        const { orders } = await NamiFuturesService.getHistoryOrder(user, undefined, undefined, appendOrder)
        socket.emitToUser(user.id, socket.Event.FUTURE_UDPATE_HISTORY_ORDER, orders)
    } catch (e) {
        Logger.error('updateHistoryOrder error', e)
    }
}, 500, {
    leading: false,
    trailing: true,
    resolver: user => user.id
})

NamiFuturesService.processingOrderError = _.memoizeThrottle(async (user, error) => {
    try {
        const payload = {
            data: {
                data: { error },
                userId: user.id,
                channel: socket.Channel.FUTURES_ORDER,
                event: socket.Event.FUTURE_PROCESSING_ORDER_ERROR
            }
        }
        await RedisSocket.publish(
            'socket:emit:user',
            JSON.stringify(payload),
            (err, count) => {
                if (err) {
                    console.error('Error publishing event:', err)
                    throw err
                } else {
                    console.log(`Event published to ${count} subscribers.`)
                }
            }
        )
    } catch (e) {
        Logger.error('processingOrderError error', e)
    }
}, 500, {
    leading: false,
    trailing: true,
    resolver: user => user.id
})

NamiFuturesService.updateOpeningOrder = _.memoizeThrottle(async (user, appendOrder, removeOrders) => {
    try {
        const payload = {
            data: {
                data: { update: true },
                userId: user.id,
                channel: socket.Channel.FUTURES_ORDER,
                event: socket.Event.FUTURE_UPDATE_OPENING_ORDER
            }
        }
        await RedisSocket.publish(
            'socket:emit:user',
            JSON.stringify(payload),
            (err, count) => {
                if (err) {
                    console.error('Error publishing event:', err)
                    throw err
                } else {
                    console.log(`Event published to ${count} subscribers.`)
                }
            }
        )
    } catch (e) {
        Logger.error('updateOpeningOrder error', e)
    }
}, 500, {
    leading: false,
    trailing: true,
    resolver: user => user.id
})

NamiFuturesService.doneClosingAllOrder = _.memoizeThrottle(async (user, appendOrder, removeOrders) => {
    try {
        // if (!socket.checkUserOnline({ id: user.id })) {
        //     return
        // }

        // const [orders, count] = await Promise.all([
        //     NamiFuturesService.getOpeningOrder(user, undefined, undefined, appendOrder, removeOrders),
        //     NamiFuturesService.countOpeningOrder(user)
        // ])
        socket.emitToUser(user.id, socket.Event.FUTURE_DONE_CLOSING_ALL_ORDERS, 'done')
        // socket.emitToUser(user.id, socket.Event.FUTURE_UPDATE_COUNT_OPENING_ORDER, count)
    } catch (e) {
        Logger.error('updateOpeningOrder error', e)
    }
}, 500, {
    leading: false,
    trailing: true,
    resolver: user => user.id
})
