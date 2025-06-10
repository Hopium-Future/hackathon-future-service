'use strict'

const Model = use('Model')
const FuturesLeverage = use('App/Models/Futures/FuturesLeverage')
const FutureOrderMongo = use('App/Models/Futures/FuturesOrder')
const FutureContractConfig = use('Config').get('futureContract')
const socket = use('App/Library/Socket/SocketClientToMainServer')
const bb = require('bluebird')

const FuturePrice = use('App/Models/Future/FuturePrice')
const SysNoti = use('App/Library/SysNoti')
const Big = require('big.js')

const Redis = use('Redis')
const CopyTradeService = use('App/Services/CopyTrade')
const _ = require('lodash')

const Logger = use('Logger')
const NAC_PROMOTE_FUTURE_FEE_START = use('Env').get('NAC_PROMOTE_FUTURE_FEE_START', null)
const ACTIVE_PRICE_THRESHOLD_UPDATE = 4
const Currencies = use('Config').get('walletCurrencies')
const ExchangePrice = use('App/Models/Exchange/ExchangePrice')
const Promise = require('bluebird')
const numeral = require('numeral')
const REQUEST_CLOSING_REDIS_KEY = 'futures::queue:request_closing:'

class FutureOrder extends Model {
    static async boot () {
        super.boot()
        this.processingOrders = []
    }


    static checkValidTickSize (price, tickSize) {
        return +Big(price).div(tickSize).round().times(tickSize) !== price
    }

    static getPromoteProgram (order) {
        // try {
        //     const promoteRequireQuantity = BitmexUtils.getPromoteRequireQuantity(order.symbol);
        //     if (order.type === this.Type.LIMIT && order.quantity >= promoteRequireQuantity) {
        //         return this.PromoteProgram.LUCKY_MONEY_2020;
        //     }
        // } catch (e) {
        //     console.error('getPromoteProgram', e);
        // }
        return this.PromoteProgram.NORMAL
    }

    static async countOpeningOrder (user, symbol = null) {
        if (!user) return null
        const query = {
            user_id: user.id,
            status: { $in: [this.Status.PENDING, this.Status.ACTIVE] }
        }
        if (symbol) query.symbol = symbol
        return await FutureOrderMongo.countDocuments(query).read('s')
    }

    static async countOrderInPromote (user) {
        if (NAC_PROMOTE_FUTURE_FEE_START) {
            return await FutureOrderMongo.find({
                $and: [
                    { user_id: user.id },
                    { created_at: { $gt: new Date(NAC_PROMOTE_FUTURE_FEE_START) } },
                    {
                        $or: [
                            { type: "Limit" },
                            { open_mode: 1 }
                        ]
                    },
                    {
                        $or: [
                            { status: 0 },
                            { status: 1 },
                            {
                                $and: [
                                    { status: 2 },
                                    { open_price: { $gt: 0 } }
                                ]
                            }
                        ]
                    }
                ]
            }).count()
        }
        return -1
    }

    static async filterModifyOrderInput (input = {}) {
        const DEFAULT_INPUT = {
            order: null,
            sl: 0,
            tp: 0,
            user_id: null
        }
        const _input = _.defaults(input, DEFAULT_INPUT)
        let { order, sl, tp, user_id, price: newActivePrice } = _input
        const { side, type, status, symbol, quantity, price, leverage } = order
        if (status === this.Status.CLOSED) return FutureContractConfig.errorCode.NOT_FOUND_ORDER_TO_MODIFY
        const futureContractConfig = FutureContractConfig.symbols[symbol]
        const { step_size, tick_size, min_active_price_tick } = futureContractConfig
        const currentPrice = await FuturePrice.getLastPrice(symbol)
        if (!currentPrice) throw Error.PRICE_CHANGED
        const { bid, ask, last_price } = currentPrice
        if (this.checkValidTickSize(sl, tick_size)) return FutureContractConfig.errorCode.INVALID_SL_TICKSIZE
        if (this.checkValidTickSize(tp, tick_size)) return FutureContractConfig.errorCode.INVALID_SL_TICKSIZE
        if (type === this.Type.LIMIT || type === this.Type.STOP) {
            if (!newActivePrice) {
                newActivePrice = order.price
            }
            if (this.checkValidTickSize(newActivePrice,
                tick_size)) return FutureContractConfig.errorCode.INVALID_SL_TICKSIZE
        }
        const minSpaceStopPrice = +Big(min_active_price_tick).times(tick_size)
        let liquidatePrice = 0
        let distanceSl = 0
        let distanceTp = 0
        if (type === this.Type.MARKET
            || (type === this.Type.LIMIT && status === this.Status.ACTIVE)
            || type === this.Type.STOP && status === this.Status.ACTIVE) {
            if (sl && (
                (side === this.Side.BUY && sl >= bid)
                || (side === this.Side.SELL && sl <= ask)
            )) return FutureContractConfig.errorCode.INVALID_SL_FOR_ORDTYPE
            if (tp && (
                (side === this.Side.BUY && tp <= ask)
                || (side === this.Side.SELL && tp >= bid)
            )) return FutureContractConfig.errorCode.INVALID_TP_FOR_ORDTYPE
            liquidatePrice = side === this.Side.BUY ? +last_price * (1 - 1 / leverage) : +last_price
                * (1 + 1 / leverage)
            distanceSl = Math.abs(sl - last_price)
            distanceTp = Math.abs(tp - last_price)
        } else if (type === this.Type.LIMIT && status === this.Status.PENDING) {
            if (!newActivePrice || (side === this.Side.BUY && newActivePrice >= ask)
                || (side === this.Side.SELL && newActivePrice
                    <= bid)) return FutureContractConfig.errorCode.INVALID_ACTIVE_PRICE_FOR_ORDTYPE
            if (sl && (
                (side === this.Side.BUY && sl >= newActivePrice)
                || (side === this.Side.SELL && sl <= newActivePrice)
            )) return FutureContractConfig.errorCode.INVALID_SL_FOR_ORDTYPE
            if (tp && (
                (side === this.Side.BUY && tp <= newActivePrice)
                || (side === this.Side.SELL && tp >= newActivePrice)
            )) return FutureContractConfig.errorCode.INVALID_TP_FOR_ORDTYPE
            liquidatePrice = side === this.Side.BUY ? +newActivePrice * (1 - 1 / leverage) : +newActivePrice
                * (1 + 1 / leverage)
            distanceSl = Math.abs(sl - newActivePrice)
            distanceTp = Math.abs(tp - newActivePrice)
        } else if (type === this.Type.STOP && status === this.Status.PENDING) {
            if (!newActivePrice || (side === this.Side.BUY && newActivePrice <= ask)
                || (side === this.Side.SELL && newActivePrice
                    >= bid)) return FutureContractConfig.errorCode.INVALID_ACTIVE_PRICE_FOR_ORDTYPE
            if (sl && ((side === this.Side.BUY && sl >= newActivePrice) || (side === this.Side.SELL && sl
                <= newActivePrice))) return FutureContractConfig.errorCode.INVALID_SL_FOR_ORDTYPE
            if (tp && ((side === this.Side.BUY && tp <= newActivePrice) || (side === this.Side.SELL && tp
                >= newActivePrice))) return FutureContractConfig.errorCode.INVALID_TP_FOR_ORDTYPE
            liquidatePrice = side === this.Side.BUY ? +newActivePrice * (1 - 1 / leverage) : +newActivePrice
                * (1 + 1 / leverage)
            distanceSl = Math.abs(sl - newActivePrice)
            distanceTp = Math.abs(tp - newActivePrice)
        }
        if (sl && distanceSl
            < minSpaceStopPrice) return FutureContractConfig.errorCode.INVALID_MIN_SL_PRICE_FOR_ORDTYPE
        if (tp && distanceTp
            < minSpaceStopPrice) return FutureContractConfig.errorCode.INVALID_MIN_TP_PRICE_FOR_ORDTYPE
        return null
    }

    static async copyTradeWhenCloseOrder (order, options, copyTradeData) {
        // Copy trade
        if (order.is_copy_trade_master === true) {
            CopyTradeService.onCloseOrder(order, options)
        } else if (copyTradeData != null) {
            // Copy trade: Notify to follower
			// TODO send notification
            //const OneSignal = use('App/Library/OneSignal')
            // await OneSignal.pushMobileNotification(
            //     order.user_id,
            //     {
            //         en: `Copy trade: close order by ${copyTradeData.masterName}`,
            //         vi: `Copy trade: đóng lệnh bởi ${copyTradeData.masterName}`
            //     },
            //     `${order.side} ${order.symbol}`,
            //     {
            //         data: {
            //             type: 'open_futures_order_details',
            //             orderId: order.displaying_id
            //         }
            //     }
            // )
        }
    }

    static async getHistoryOrder (user, options = {}, showQueueingOrders = true, appendOrder) {
        const _options = _.defaults(options, {
            page: 0,
            pageSize: 20
        })
        if (!user) throw Error.UNKNOWN
        const { page, pageSize, sorted } = _options
        const [ordersInDb, orderClosing] = await Promise.all([
            FutureOrderMongo.where({
                user_id: user.id,
                status: this.Status.CLOSED
            }).select('-_id -bitmex_main_order_id -bitmex_sl_order_id -bitmex_tp_order_id -__v').sort('-closed_at -created_at').skip((page) * pageSize)
                .limit(pageSize)
                .lean(),
            (showQueueingOrders && page === 0) ? Redis.hgetall(REQUEST_CLOSING_REDIS_KEY + user.id)
                .then(data => Object.values(data).map(line => JSON.parse(line)))
                : Promise.resolve([])
        ])

        const result = [...orderClosing, ...ordersInDb]
        let orderToAppend = []
        if (appendOrder && appendOrder.length) {
            const idsAlreadyFetched = {}; result.forEach(e => idsAlreadyFetched[e.displaying_id] = 1)
            orderToAppend = appendOrder.filter(order => !idsAlreadyFetched[order.displaying_id])
        }
        return [...orderToAppend, ...result]
    }

    // Liquidation price

    static notifyFutureError (message) {
        try {
            console.log(`[FUTURE] ${message}`)
            SysNoti.notify(`[FUTURE] ${message}`, {
                toSlackFuture: true,
                toSlackMention: [
                    SysNoti.SlackUserID.DEV_TRUNGND
                ]
            })
        } catch (e) {
            Logger.error('notifyFutureError', e)
        }
    }

    static getOrderStatusName (status) {
        switch (status) {
        case this.Status.PENDING:
            return 'PENDING'
        case this.Status.ACTIVE:
            return 'ACTIVE'
        case this.Status.CLOSED:
            return 'CLOSED'
        default:
            return 'UNDEFINED'
        }
    }

    static checkIsProcessing (displaying_id) {
        return _.findIndex(this.processingOrders, { displaying_id }) >= 0
    }

    static setIsProcessing (order) {
        return this.processingOrders.push(order)
    }

    static removeProcessing (displaying_id) {
        _.remove(this.processingOrders, o => o.displaying_id === displaying_id)
    }


    static async getOrderValue (symbol, quantity) {
        const symbolConfig = FutureContractConfig.symbols[symbol]
        const { position_currency: positionCurrency, contract_size: contractSize } = symbolConfig
        const currentPrice = await FuturePrice.getLastPrice(symbol)
        const { bid, ask, last_price: lastPrice } = currentPrice
        if (symbol === 'ETHUSD') {
            const { last_price: lastETHUSDPrice } = await FuturePrice.getLastPrice('ETHUSD')
            return quantity * contractSize * lastETHUSDPrice
        } if (positionCurrency === 'XBT') {
            return quantity
        }
        if (positionCurrency === 'USD' && symbol === 'XBTUSD') {
            return lastPrice > 0 ? quantity / lastPrice : 0
        }
        return quantity * lastPrice

        return 0
    }

    static async sumTotalVolume (userId) {
        // TODO cache
        // TODO Disabled BITMEX -> return 0
        return 0

        const total = await FutureOrderMongo.aggregate([
            {
                $match: {
                    user_id: userId,
                    status: FutureOrder.Status.CLOSED,
                    liquidity_broker: 'BITMEX',
                    profit: { $ne: null }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: { $multiply: ['$margin', '$leverage'] } }
                }
            }
        ]).read('s')
        if (total && total.length) {
            return total[0].total
        }
        return 0
    }

    static async sumTotalVolumeV2 (userId, symbol) {
        const CACHE_KEY = `cache:FutureOrder:sumTotalVolumeV2:${userId}:${symbol}`
        const CACHED = await Redis.get(CACHE_KEY)
        if (CACHED) {
            return JSON.parse(CACHED)
        }

        const total = await FutureOrderMongo.aggregate([
            {
                $match: {
                    user_id: userId,
                    status: FutureOrder.Status.CLOSED,
                    profit: { $ne: null },
                    symbol
                }
            },
            {
                $group: {
                    _id: '$margin_currency',
                    value: { $sum: { $multiply: ['$margin', '$leverage'] } }
                }
            }
        ]).read('s')
        if (total && total.length) {
            let totalUsdt = 0
            await Promise.map(total, async line => {
                if (line._id === Currencies.USD || line._id === Currencies.USDT || line._id === Currencies.USDT) {
                    totalUsdt += line.value
                } else {
                    const exchangeRate = await ExchangePrice.getExchangePrice(Currencies.USDT, line._id)
                    if (exchangeRate && !isNaN(exchangeRate.last_price)) {
                        totalUsdt += (line.value / exchangeRate.last_price)
                    }
                }
            }, { concurrency: 3 })
            const result = {
                value: totalUsdt,
                currency: Currencies.USDT
            }
            await Redis.set(CACHE_KEY, JSON.stringify(result), 'ex', 30 * 60 * 1000)
            return result
        }
        const result = {
            value: 0,
            currency: Currencies.USDT
        }
        await Redis.set(CACHE_KEY, JSON.stringify(result), 'ex', 30 * 60 * 1000)
        return result
    }

    static async sumTotalProfit (userId, symbol) {
        // TODO cache
        // TODO Disabled BITMEX -> return 0
        return 0
        const total = await FutureOrderMongo.aggregate([
            {
                $match: {
                    user_id: userId,
                    symbol,
                    status: FutureOrder.Status.CLOSED,
                    liquidity_broker: 'BITMEX',
                    profit: { $ne: null }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$profit' }
                }
            }
        ]).read('s')
        if (total && total.length) {
            return total[0].total
        }
        return 0
    }

    static async sumTotalProfitV2 (userId, symbol) {
        const CACHE_KEY = `cache:FutureOrder:sumTotalProfitV2:${userId}:${symbol}`
        const CACHED = await Redis.get(CACHE_KEY)
        if (CACHED) {
            return JSON.parse(CACHED)
        }

        const total = await FutureOrderMongo.aggregate([
            {
                $match: {
                    user_id: userId,
                    symbol,
                    status: FutureOrder.Status.CLOSED,
                    profit: { $ne: null }
                }
            },
            {
                $group: {
                    _id: '$margin_currency',
                    value: { $sum: '$profit' }
                }
            }
        ]).read('s')
        if (total && total.length) {
            let totalUsdt = 0
            await Promise.map(total, async line => {
                if (line._id === Currencies.USD || line._id === Currencies.USDT || line._id === Currencies.USDT) {
                    totalUsdt += line.value
                } else {
                    const exchangeRate = await ExchangePrice.getExchangePrice(line._id, Currencies.USDT)
                    if (exchangeRate && !isNaN(exchangeRate.last_price)) {
                        totalUsdt += (exchangeRate.last_price * line.value)
                    }
                }
            }, { concurrency: 3 })

            let result
            const symbolConfig = FutureContractConfig.symbols[symbol]
            if (symbolConfig.balance_currency === 'VNDC') {
                const exchangeRateUsdtVndc = await ExchangePrice.getExchangePrice(Currencies.USDT, Currencies.VNDC)
                if (exchangeRateUsdtVndc && !isNaN(exchangeRateUsdtVndc.last_price)) {
                    result = {
                        value: totalUsdt * exchangeRateUsdtVndc.last_price,
                        currency: Currencies.VNDC
                    }
                } else {
                    result = {
                        value: totalUsdt,
                        currency: Currencies.USDT
                    }
                }
            } else {
                result = {
                    value: totalUsdt,
                    currency: Currencies.USDT
                }
            }

            await Redis.set(CACHE_KEY, JSON.stringify(result), 'ex', 30 * 60 * 1000)
            return result
        }
        const result = {
            value: 0,
            currency: Currencies.USDT
        }
        await Redis.set(CACHE_KEY, JSON.stringify(result), 'ex', 30 * 60 * 1000)
        return result
    }

    static calculateProfitTick (symbol, side, openPrice, closePrice) {
        const buyProfit = closePrice - openPrice
        const futureContractConfig = FutureContractConfig.symbols[symbol]
        const { step_size, tick_size, min_active_price_tick, close_limit_tick_offset } = futureContractConfig
        const stepSize = symbol === 'XBTUSD' ? 1 : step_size
        const profitPrice = side === this.Side.BUY ? buyProfit : -buyProfit
        return stepSize > 0 ? profitPrice / stepSize : 0
    }

    static getNewActivePrice (side, activePrice, priceData) {
        const { bid, ask, symbol } = priceData
        const futureContractConfig = FutureContractConfig.symbols[symbol]
        const { step_size, tick_size, min_active_price_tick, close_limit_tick_offset } = futureContractConfig
        if (side === this.Side.BUY
            && (bid > (activePrice + ACTIVE_PRICE_THRESHOLD_UPDATE * tick_size) || !activePrice)) {
            return bid - close_limit_tick_offset * tick_size
        } if (side === this.Side.SELL
            && (ask < (activePrice - ACTIVE_PRICE_THRESHOLD_UPDATE * tick_size) || !activePrice)) {
            return ask + close_limit_tick_offset * tick_size
        }
        return 0
    }

    static async scanNamiProfit () {
        const orders = await FutureOrderMongo.find({
            status: 2,
            close_price: { $gt: 0 },
            hold_quantity: { $gt: 0 }
        })
        console.log('==== scanFutureOrderHistory', orders.length)
        await bb.map(orders, async (order, index) => {
            if (index % 50 === 0) {
                console.log(`_ scan future point ${index} of ${orders.length}`)
            }
            const namiProfit = this.calculateNamiProfit(order)
            const holdProfit = this.calculateHoldProfit(order)
            await FutureOrderMongo.update({ displaying_id: order.displaying_id }, {
                nami_profit: namiProfit,
                hold_profit: holdProfit
            })
        }, { concurrency: 50 })
    }

    static getOrderValueWithPrice (symbol, quantity, price) {
        const symbolConfig = FutureContractConfig.symbols[symbol]
        const { position_currency: positionCurrency, contract_size: contractSize } = symbolConfig
        const lastPrice = price
        if (symbol === 'ETHUSD') {
            return quantity * contractSize * lastPrice
        } if (positionCurrency === 'XBT') {
            return quantity
        }
        if (positionCurrency === 'USD' && symbol === 'XBTUSD') {
            return lastPrice > 0 ? quantity / lastPrice : 0
        }
        return quantity * lastPrice

        return 0
    }


    static getNumberBaseDecimalScale (value, decimalScale = 8, formatNumberFunction = Math.floor) {
        const defaultValue = `0`
        if (_.isNil(value)) return defaultValue
        if (Math.abs(+value) < 1e-8) return defaultValue
        return +numeral(+value).format(`0.[${'0'.repeat(decimalScale)}]`, formatNumberFunction)
    }

    static getDecimalScale (value = 0.00000001) {
        let decimalScale = 8
        if (value && value > 0 && value <= 1) {
            decimalScale = +(-Math.floor(Math.log(value) / Math.log(10))).toFixed(0)
        }
        return decimalScale
    }
}

module.exports = FutureOrder
FutureOrder.GroupStatus = {
    OPENING: 0,
    HISTORY: 1
}
FutureOrder.Status = {
    PENDING: 0,
    ACTIVE: 1,
    CLOSED: 2,
    OPENING: 3,
    CLOSING: 4
}
FutureOrder.Side = {
    BUY: 'Buy',
    SELL: 'Sell'
}
FutureOrder.Type = {
    MARKET: 'Market',
    LIMIT: 'Limit',
    STOP: 'Stop'
}
FutureOrder.ReasonCloseCode = {
    NORMAL: 0,
    HIT_SL: 1,
    HIT_TP: 2,
    LIQUIDATE: 3,
    HIT_LIMIT_CLOSE: 4
}
FutureOrder.BitmexTransferError = {
    PROCESS_SUCCESSFULLY: 0,
    PLACE_ORDER_WITHOUT_SL_TP: 1, // Dat duoc lenh chinh nhung khong dat duoc lenh SL, TP
    ACTIVE_ORDER_ERROR: 2, // Lenh Stop hoac Limit duoc active nhung khong dat duoc SL, TP
    HIT_SL_TP_ERROR: 3 // Hit SL hoac TP nhung khong dong duoc lenh con lai
}
FutureOrder.PromoteProgram = {
    NORMAL: 0,
    LUCKY_MONEY_2020: 1,
    AIRDROP_VNDC: 2
}
// Special mode for Open mode and close mode
FutureOrder.SpecialMode = {
    NORMAL: 0,
    ONLY_LIMIT: 1
}
// 30 60 90 120 -> Step 100

FutureOrder.LiquidityBroker = {
    BINANCE: 'BINANCE',
    BITMEX: 'BITMEX'
}

FutureOrder.updateHistoryOrder = _.memoizeThrottle(async (user, appendOrder) => {
    try {
        // if (!socket.checkUserOnline({ id: user.id })) {
        //     return
        // }

        // const orders = await FutureOrder.getHistoryOrder(user, undefined, undefined, appendOrder)
        socket.emitToUser(user.id, socket.Event.FUTURE_UDPATE_HISTORY_ORDER)
    } catch (e) {
        Logger.error('updateHistoryOrder error', e)
    }
}, 500, { leading: false, trailing: true, resolver: user => user.id })

FutureOrder.updateOpeningOrder = _.memoizeThrottle(async (user, appendOrder, removeOrders) => {
    try {
        // if (!socket.checkUserOnline({ id: user.id })) {
        //     return
        // }

        const [orders, count] = await Promise.all([
            FutureOrder.getOpeningOrder(user, undefined, undefined, appendOrder, removeOrders),
            FutureOrder.countOpeningOrder(user)
        ])
        socket.emitToUser(user.id, socket.Event.FUTURE_UPDATE_OPENING_ORDER, orders)
        socket.emitToUser(user.id, socket.Event.FUTURE_UPDATE_COUNT_OPENING_ORDER, count)
    } catch (e) {
        Logger.error('updateOpeningOrder error', e)
    }
}, 500, { leading: false, trailing: true, resolver: user => user.id })
