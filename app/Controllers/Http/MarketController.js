'use strict'

const Error = use('Config')
    .get('error')

const _ = require('lodash')

const AssetInfo = use('App/Models/Config/AssetInfo')
const FuturesOrderBook = use('App/Models/Futures/OrderBook')

const ExchangePrice = use('App/Models/Exchange/ExchangePrice')
const FuturesPrice = use('App/Models/Futures/FuturesPrice')
const FuturesTrade = use('App/Models/Futures/FuturesTrade')
const WalletCurrency = use('Config').get('walletCurrencies')

const RedisCache = use("Redis").connection("cache");

const REDIS_TRENDING_TOKENS_24H = "market:trending_tokens:24h";

class MarketController {
    getExchange24hPercentageChange (price) {
        let change24h
        if (price) {
            const lastPrice = +price.p
            const lastPrice24h = +price.ld
            if (lastPrice && lastPrice24h) {
                change24h = ((lastPrice - lastPrice24h) / lastPrice24h) * 100
            } else if (lastPrice && !lastPrice24h) {
                change24h = 100
            } else if (!lastPrice && lastPrice24h) {
                change24h = -100
            }
        }
        return change24h
    }


    async getTrendingTokens({ response }) {
        let trendingTokens = await RedisCache.get(REDIS_TRENDING_TOKENS_24H);
        if (trendingTokens) {
            try {
                trendingTokens = JSON.parse(trendingTokens);
                trendingTokens = trendingTokens.slice(0, 10);
            } catch (error) {
                trendingTokens = [];
            }
        } else {
            trendingTokens = [];
        }
        return response.sendSuccess(trendingTokens);
    }


    async getTrend ({ request, response, isMobileApp }) {
        try {
            let { limit } = request.all()
            if (!limit) limit = isMobileApp ? 15 : 5
            let pairs = await ExchangePrice.getAllExchangePrice(WalletCurrency.USDT)
            pairs = _.compact(pairs.map(p => {
                p.change_24 = this.getExchange24hPercentageChange(p)
                if (p?.vq > 1000) return p
                return null
            }))
            pairs = _.uniqBy(pairs, 'b')

            const topView = _.sortBy(pairs, [function(o) {
                if (o.lbl === 'NEW') {
                    return -100000000
                }
                return 0
            }])
            const topGainers = _.sortBy(pairs, [function(o) {
                return -o.change_24
            }])
            const topLosers = _.sortBy(pairs, [function(o) {
                return o.change_24
            }])
            // //console.log('__ check top gainer', JSON.stringify(topGainers))
            return response.sendSuccess([{
                name_en: 'Hot 24h',
                name_vi: 'Hot 24h',
                key: 'top_view',
                compare_key: 'vc',
                compare_key_name_en: 'View 24h',
                compare_key_name_vi: 'View 24h',
                pairs: topView.slice(0, limit)
            }, {
                name_en: 'Top gainers',
                name_vi: 'Top tăng giá',
                key: 'top_gainers',
                compare_key: 'change_24',
                compare_key_name_en: 'Change 24h',
                compare_key_name_vi: 'Biến động 24h',
                pairs: topGainers.slice(0, limit)
            }, {
                name_en: 'Top losers',
                name_vi: 'Top giảm giá',
                key: 'top_losers',
                compare_key: 'change_24',
                compare_key_name_en: 'Change 24h',
                compare_key_name_vi: 'Biến động 24h',
                pairs: topLosers.slice(0, limit)
            }])
        } catch (e) {
            console.log('Get trend error', e)
            return response.sendError()
        }
    }

    async getAssetInfo ({ request, response }) {
        try {
            const { id } = request.all()
            const data = await AssetInfo.getOneCached({ asset_id: +id })
            return response.sendSuccess(data)
        } catch (e) {
            // sentry.captureException(e)
            Logger.error('GET getAssetInfo:', e)
            return response.sendDetailedError(Error.UNKNOWN)
        }
    }

    async getMarkPrice ({ request, response }) {
        try {
            let result = []
            const { symbol } = request.all()

            if (symbol) {
                result = [await FuturesPrice.getMarkPrice(symbol)]
            } else {
                result = await FuturesPrice.getAllMarkPrice()
            }
            return response.sendSuccess(result)
        } catch (e) {
            Logger.error('getMarkPrice', e)
            return response.sendDetailedError(Error.UNKNOWN)
        }
    }

    async getTicker ({ request, response }) {
        try {
            let result = []
            const { symbol } = request.all()
            if (symbol) {
                const symbolData = await FuturesPrice.getTicker(symbol)
                if (symbolData) result.push(symbolData)
            } else {
                result = await FuturesPrice.getAllTicker()
            }
            return response.sendSuccess(result)
        } catch (e) {
            Logger.error('getMarkPrice:', e)
            return response.sendDetailedError(Error.UNKNOWN)
        }
    }

    async postView ({ request, response }) {
        try {
            const { symbol } = request.post()
            await FuturesPrice.increaseViews(symbol)
            return response.sendSuccess()
        } catch (e) {
            Logger.error('postView:', e)
            return response.sendDetailedError(Error.UNKNOWN)
        }
    }

    async getRecentTrade ({ user, request, response }) {
        try {
            const { symbol } = request.get()
            if (!symbol) return response.sendDetailedError(Error.BAD_SYMBOL)
            const trades = await FuturesTrade.getRecentTrade(symbol)
            return response.sendSuccess(trades)
        } catch (e) {
            Logger.error('getRecentTrade:', e)
            return response.sendDetailedError(Error.UNKNOWN)
        }
    }

    async getDepth ({ request, response }) {
        try {
            const { symbol } = request.get()
            if (!symbol) return response.sendDetailedError(Error.BAD_SYMBOL)
            const depth = await FuturesOrderBook.getBinanceOrderBook(symbol)
            return response.sendSuccess(depth)
        } catch (e) {
            Logger.error('getDepth:', e)
            return response.sendDetailedError(Error.UNKNOWN)
        }
    }
}

module.exports = MarketController
