"use strict"

const Model = use("Model")
const RedisPriceCurrent = use("Redis").connection("stream_cache")
const _ = require("lodash")

const REDIS_EXCHANGE_PRICE_KEY = "market_watch"

class ExchangePrice extends Model {

    static getExchangeHash (currency) {
        return `${REDIS_EXCHANGE_PRICE_KEY}:${currency}`
    }

    static getExchangeKey (currency) {
        return currency
    }

    static async getExchangePrice (exchangeCurrency, baseCurrency) {
        const hash = this.getExchangeHash(baseCurrency)
        const key = this.getExchangeKey(exchangeCurrency)
        let price = await RedisPriceCurrent.hget(hash, key)

        const DEFAULT_PRICE = {
            ask: 0,
            bid: 0,
            last_price: 0,
            change_24h: 0,
            last_price_24h: 0,
            high: 0,
            low: 0,
            high_1h: 0,
            low_1h: 0,
            total_exchange_volume: 0,
            total_base_volume: 0,
            base_currency: baseCurrency,
            exchange_currency: exchangeCurrency
        }

        if (!price) {
            return DEFAULT_PRICE
        }

        if (price && typeof price === 'string') price = JSON.parse(price)
        return price
    }

    static async getAllExchangePrice (baseCurrency) {
        const key = `${REDIS_EXCHANGE_PRICE_KEY}:${baseCurrency}`
        const prices = await RedisPriceCurrent.hgetall(key)

        const results = []
        if (prices && Object.keys(prices).length) {
            // eslint-disable-next-line no-shadow,guard-for-in
            for (const key in prices) {
                const price = JSON.parse(prices[key])
                results.push(price)
            }
        }
        return results
    }
}

module.exports = ExchangePrice
