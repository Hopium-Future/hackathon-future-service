const _ = require('lodash')
const Promise = require('bluebird')

const Error = use("Config").get("error")
const FuturesPrice = use('App/Models/Futures/FuturesPrice')
const FundingHistoryModel = use('App/Models/Futures/FundingHistory')
const RedisCache = use('Redis').connection('cache')
const { RateLimiter } = require('limiter')
const LRU = require('lru-cache')

const FundingRateThrottler = new LRU({ maxAge: 5 * 1000, updateAgeOnGet: true })

async function getFundingRateHistory (symbol, skip = 0, limit = 20) {
    const filter = { symbol }
    const cacheData = await RedisCache.get(`getFundingRateHistory:${symbol}:${limit}:${skip}`)
    if (cacheData) {
        return JSON.parse(cacheData)
    }
    if (limit === 21 || limit === 90) {
        const time = Date.now() - 1000 * 60 * 60 * 24 * (limit / 3)
        filter.calcTime = { $gte: time }
    }
    const data = await Promise.all([
        FundingHistoryModel.find(filter, {
            _id: 0,
            symbol: 1,
            fundingIntervalHours: 1,
            lastFundingRate: 1,
            lastBuyFundingRate: 1,
            lastSellFundingRate: 1,
            calcTime: 1
        }, { skip, sort: { calcTime: -1 } }).limit(limit === 21 || limit === 90 ? null : limit).read('s'),
        FundingHistoryModel.countDocuments({ symbol }).read('s')
    ])
    data[0].map(e => {
        if (!e?.lastBuyFundingRate) e.lastBuyFundingRate = e.lastFundingRate || 0
        if (!e?.lastSellFundingRate) e.lastSellFundingRate = e.lastFundingRate || 0
        return e
    })
    const result = { fundingHistories: data[0], total: data[1] }
    await RedisCache.setex(`getFundingRateHistory:${symbol}:${limit}:${skip}`, 5 * 60, JSON.stringify(result))
    return result
}

async function checkRejectByFundingRate (user, input) {
    // Check time
    const result = { delay: 0, reject: false, error: null }
    if (input.type !== 'Market') {
        return result
    }
    const { quantity, quoteQty, useQuoteQty, symbol } = input
    const now = new Date()
    const hour = now.getHours()
    const min = now.getMinutes()
    const second = now.getSeconds()
    let inFundingTime = min === 0 && hour % 8 === 0
    if (symbol.includes('MTL')) {
        inFundingTime = min === 0 && hour % 2 === 0
    }
    if (!inFundingTime) return result
    const ticker = await FuturesPrice.getTicker(input.symbol)
    const highFundingRate = ticker && Math.abs(ticker?.r) * 100 > 0.1
    if (!highFundingRate) return result

    if (highFundingRate && second < 8) {
        // Check volume
        let orderValue
        const lastPrice = ticker?.p

        if (useQuoteQty) {
            orderValue = quoteQty
        } else {
            orderValue = quantity * lastPrice
        }

        if (symbol.includes('USDT')) {
            orderValue *= 23500
        }
        const random = Math.random() * 10
        if (orderValue == null || orderValue > 20e6) {
            // Random reject order
            if (random > 2) {
                result.delay = 6000
                result.error = Error.SYSTEM_BUSY
                result.reject = true
            }
            if (random > 1 && orderValue > 400e6) {
                result.delay = 6000
                result.error = Error.SYSTEM_BUSY
                result.reject = true
            }
        }
    }

    // Check throttle
    let limiter = FundingRateThrottler.get(`${input.symbol}`)
    if (!limiter) {
        limiter = new RateLimiter(15, "second", true)
        FundingRateThrottler.set(`${input.symbol}`, limiter)
    }
    if (limiter) {
        try {
            await new Promise((resolve, reject) => {
                limiter.removeTokens(1, (err, remainingRequests) => {
                    Logger.info(`Request ${input?.requestId} remainingRequests`, remainingRequests)
                    console.log(`Request ${input?.requestId} remainingRequests`, remainingRequests)
                    if (err || remainingRequests === -1) {
                        reject(Error.SYSTEM_BUSY)
                    } else {
                        resolve()
                    }
                })
            })
        } catch (e) {
            console.error('Check throttle', e)
            result.delay = 6000
            result.reject = true
            result.error = Error.SYSTEM_BUSY
            return result
        }
    }

    return result
}

module.exports = { getFundingRateHistory, checkRejectByFundingRate }
