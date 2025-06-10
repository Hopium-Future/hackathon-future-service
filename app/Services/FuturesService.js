'use strict'

const RedisCache = use('Redis').connection('cache')
const RedisSocket = use('Redis').connection('socket')
const Error = use("Config").get("error")
const { Channel, Event, RedisPubKey } = use('App/Library/Enum').Socket
const WalletCurrency = use('Config').get('walletCurrencies')
const FundingOrderHistory = use('App/Models/Mongo/FundingOrderHistory')
const LoanHistory = use('App/Models/Mongo/LoanHistory')
const _ = require('lodash')
const Big = require('big.js')

const FUTURES_RECENT_TRADE_KEY = 'FUTURES_RECENT_TRADE_KEY'
const FUTURES_RECENT_TRADE_TRIM_KEY = 'FUTURES_RECENT_TRADE_TRIM_KEY'
const FUTURES_FUNDING_HISTORIES_KEY = 'FUTURES_FUNDING_HISTORIES'
const FUTURES_FUNDING_LOAN_HISTORIES_KEY = 'FUTURES_FUNDING_LOAN_HISTORIES'
const TOTAL_RECENT_TRADE = 10
const LUSDT_ASSET_ID = WalletCurrency.LUSDT

class FuturesService {
    static async getRecentTrade (numOfTrade = 6) {
        try {
            const total = Math.min(numOfTrade, TOTAL_RECENT_TRADE) - 1
            if (total <= 0) {
                return []
            }
            const cacheData = await RedisCache.lrange(FUTURES_RECENT_TRADE_KEY, 0, numOfTrade)
            if (!cacheData?.length) {
                return []
            }
            return cacheData.map(item => JSON.parse(item))
        } catch (e) {
            console.error(`getRecentTradeError`, e)
            Logger.error(`getRecentTradeError`, e?.message)
            return []
        }
    }

    static async setRecentTrade (order) {
        try {
            const data = {
                displaying_id: order.displaying_id,
                username: order.username,
                photo_url: order.photo_url,
                base_asset: order?.symbol?.slice(0, -4)?.toUpperCase(),
                side: order.side,
                order_value: order.order_value
            }
            await this.updateRecentTrade(data)
            const total = await RedisCache.lpush(FUTURES_RECENT_TRADE_KEY, JSON.stringify(data))
            if (total > 15) {
                await RedisCache.set(FUTURES_RECENT_TRADE_TRIM_KEY, total)
            }
        } catch (e) {
            console.error(`setRecentTradeError`, e)
            Logger.error(`setRecentTradeError`, e?.message)
        }
    }

    static async trimRecentTrade () {
        try {
            const total = await RedisCache.get(FUTURES_RECENT_TRADE_TRIM_KEY)
            if (total) {
                console.info('Schedule: trimRecentTrade', total)
                await RedisCache.ltrim(FUTURES_RECENT_TRADE_KEY, 0, TOTAL_RECENT_TRADE - 1)
            }
        } catch (e) {
            console.error(`trimRecentTradeError`, e)
            Logger.error(`trimRecentTradeError`, e?.message)
        }
    }

    static calculateSharingProfitToCaller ({ displaying_id, profit, fee_data }) {
        try {
            if (profit <= 0) return 0
            const { place_order, close_order } = fee_data
            const tokenNeedCalculate = [LUSDT_ASSET_ID]
            const priceFee = { [LUSDT_ASSET_ID]: 1 }
            const totalFee = { [LUSDT_ASSET_ID]: 0 }
            for (let i = 0; i < tokenNeedCalculate.length; i++) {
                const feeToken = tokenNeedCalculate[i]
                totalFee[feeToken] = +Big(place_order[feeToken] || 0).plus(close_order[feeToken] || 0).times(priceFee[feeToken])
            }
            const totalProfit = Object.values(totalFee).reduce((total, fee) => +Big(total).minus(fee), profit)
            if (totalProfit <= 0) return 0
            return +Big(totalProfit).times(this.SharePercent.CALLER).toFixed(4)
        } catch (e) {
            Logger.error(`calculateSharingProfitToCallerError ${displaying_id}`, e)
            throw e
        }
    }

    static async getFundingHistories (userId, options) {
        const {
            page,
            pageSize,
            baseAsset,
            range
        } = _.defaults(options, {
            page: 0,
            pageSize: 20,
            baseAsset: null,
            range: null
        })
        try {
            const hash = `${FUTURES_FUNDING_HISTORIES_KEY}:${userId}`
            const checkExist = await RedisCache.exists(hash)
            const key = JSON.stringify(options)
            const cache = await RedisCache.hget(hash, key)
            if (cache) {
                return JSON.parse(cache)
            }
            if (!userId) throw Error.USERID_AND_ORDER_NOTMATCH
            const conditions = { userId: +userId }
            if (range) {
                const from = Date.now() - Number(range) * 24 * 60 * 60 * 1000
                conditions.createdAt = { $gte: new Date(from) }
            }
            if (baseAsset) {
                conditions.baseAsset = baseAsset
            }
            const histories = await FundingOrderHistory.find(conditions)
                .sort({ createdAt: -1 })
                .skip(page * pageSize)
                .limit(pageSize + 1)
                .lean()
            const result = {
                histories: histories.slice(0, pageSize),
                hasNext: histories.length > pageSize
            }
            await RedisCache.hset(hash, key, JSON.stringify(result))
            if (!checkExist) await RedisCache.expire(hash, 60 * 10)
            return result
        } catch (e) {
            Logger.error(`getFundingHistoriesError`, e)
            return {
                histories: [],
                hasNext: false
            }
        }
    }

    static async getFundingLoanHistories (userId, fohId) {
        try {
            if (!userId) throw Error.USERID_AND_ORDER_NOTMATCH
            const key = `${FUTURES_FUNDING_LOAN_HISTORIES_KEY}:${fohId}`
            const cache = await RedisCache.get(key)
            if (cache) {
                return JSON.parse(cache)
            }
            const result = {
                userId,
                fohId,
                liquidationDetail: []
            }
            if (fohId) {
                const loanHistory = await LoanHistory.findOne({ userId, 'metadata.fohId': fohId })
                    .select('liquidationDetail')
                    .lean()
                if (loanHistory) {
                    result.liquidationDetail = loanHistory?.liquidationDetail || []
                }
            }
            await RedisCache.setex(key, 60 * 30, JSON.stringify(result))
            return result
        } catch (e) {
            Logger.error(`getFundingLoanHistories`, e)
            return {
                userId,
                fohId,
                liquidationDetail: []
            }
        }
    }
}

module.exports = FuturesService

FuturesService.SharePercent = { CALLER: 0.05 }

FuturesService.processingOrderError = _.memoizeThrottle(async (user, error) => {
    try {
        const payload = {
            data: {
                data: { error },
                userId: user.id,
                channel: Channel.FUTURES_ORDER,
                event: Event.FUTURE_PROCESSING_ORDER_ERROR
            }
        }
        await RedisSocket.publish(
            RedisPubKey.SOCKET_EMIT_USER,
            JSON.stringify(payload),
            (err, count) => {
                if (err) {
                    console.error('Error publishing event:', err)
                    throw err
                }
            }
        )
    } catch (e) {
        Logger.error('processingOrderError error', e)
    }
}, 500, { leading: false, trailing: true, resolver: user => user.id })

FuturesService.updateOpeningOrder = _.memoizeThrottle(async user => {
    try {
        const payload = {
            data: {
                data: { update: true },
                userId: user.id,
                channel: Channel.FUTURES_ORDER,
                event: Event.FUTURE_UPDATE_OPENING_ORDER
            }
        }
        await RedisSocket.publish(
            RedisPubKey.SOCKET_EMIT_USER,
            JSON.stringify(payload),
            (err, count) => {
                if (err) {
                    console.error('Error publishing event:', err)
                    throw err
                }
            }
        )
    } catch (e) {
        Logger.error('updateOpeningOrder error', e)
    }
}, 500, { leading: false, trailing: true, resolver: user => user.id })

FuturesService.updateRecentTrade = _.memoizeThrottle(async trade => {
    try {
        const payload = {
            data: {
                data: trade,
                channel: Channel.FUTURES_RECENT_TRADE,
                event: Event.FUTURE_UPDATE_RECENT_TRADE
            }
        }
        await RedisSocket.publish(
            RedisPubKey.SOCKET_EMIT,
            JSON.stringify(payload),
            (err, count) => {
                if (err) {
                    console.error('Error publishing event:', err)
                    throw err
                }
            }
        )
    } catch (e) {
        Logger.error('updateOpeningOrder error', e)
    }
}, 500, { leading: false, trailing: true })
