'use strict'

// cache in 5p

const ExchangePrice = use('App/Models/Exchange/ExchangePrice')
const MemoryCache = use('App/Models/MemoryCache')
const cache = new MemoryCache(5) // Create a new cache service instance
const WalletCurrencies = use('Config').get('walletCurrencies')

/**
 * @class AssetValue
 */
class AssetValue {
    static async getAllAssetValueCached () {
        const _key = `cache:getAllAssetValueCached`
        return cache.get(_key, async () => this.getAllAssetValue())
    }

    static async getAssetValueByIdCached (assetId) {
        const _key = `cache:getAssetValueByIdCached:${assetId}`
        return cache.get(_key, async () => this.getAssetValueById(assetId))
    }

    static async getAllAssetValueByIdCached () {
        const _key = `cache:getAllAssetValueByIdCached`
        return cache.get(_key, async () => this.getAllAssetValueById())
    }

    static async getAllAssetValue () {
        const usdtConfig = { id: WalletCurrencies.USDT }
        const vndcConfig = { id: WalletCurrencies.VNDC }
        const vnstConfig = { id: WalletCurrencies.VNST }
        const usdtVnst = await ExchangePrice.getExchangePrice(usdtConfig.id, vnstConfig.id)
        const result = {}
        const usdtVnstRate = usdtVnst && usdtVnst.p > 0 ? usdtVnst.p : 24000
        result.USDT = 1
        result.VNDC = 1 / usdtVnstRate
        result.VNST = 1 / usdtVnstRate
        const exchangePrices = [
            ...await ExchangePrice.getAllExchangePrice(usdtConfig.id),
            ...await ExchangePrice.getAllExchangePrice(vndcConfig.id),
            ...await ExchangePrice.getAllExchangePrice(vnstConfig.id),
        ]
        // Tra ve theo cap usdt

        exchangePrices.forEach(item => {
            if (!result.hasOwnProperty(item.b)) {
                if (item.q === 'USDT') {
                    result[item.b] = +item.p
                } else if (item.q === 'VNDC' || item.q === 'VNST') {
                    result[item.b] = +item.p / usdtVnstRate
                }
            }
        })
        return result
    }

    static async getAssetValueById (assetId) {
        const usdtConfig = { id: WalletCurrencies.USDT }
        const vndcConfig = { id: WalletCurrencies.VNDC }
        const vnstConfig = { id: WalletCurrencies.VNST }
        if (assetId === usdtConfig.id) {
            return 1
        }
        const usdtVnst = await ExchangePrice.getExchangePrice(usdtConfig.id, vnstConfig.id)
        const usdtVnstRate = usdtVnst && usdtVnst.p > 0 ? usdtVnst.p : 24000
        if (assetId === vndcConfig.id || assetId === vnstConfig.id) {
            return 1 / usdtVnstRate
        }
        const usdtPrice = await ExchangePrice.getExchangePrice(assetId, usdtConfig.id)
        const vndcPrice = await ExchangePrice.getExchangePrice(assetId, vndcConfig.id)
        const vnstPrice = await ExchangePrice.getExchangePrice(assetId, vnstConfig.id)
        if (usdtPrice?.p > 0) {
            return usdtPrice?.p
        }
        if (vndcPrice?.p > 0) {
            return vndcPrice?.p / usdtVnstRate
        }
        if (vnstPrice?.p > 0) {
            return vnstPrice?.p / usdtVnstRate
        }

        return 0
    }

    static async getAllAssetValueById () {
        const usdtConfig = { id: WalletCurrencies.USDT }
        const vndcConfig = { id: WalletCurrencies.VNDC }
        const vnstConfig = { id: WalletCurrencies.VNST }
        const usdtVnst = await ExchangePrice.getExchangePrice(usdtConfig.id, vnstConfig.id)
        const result = {}
        const usdtVnstRate = usdtVnst && usdtVnst.p > 0 ? usdtVnst.p : 24000
        result[vndcConfig.id] = 1 / usdtVnstRate
        result[vnstConfig.id] = 1 / usdtVnstRate
        result[usdtConfig.id] = 1
        const exchangePrices = [
            ...await ExchangePrice.getAllExchangePrice(usdtConfig.id),
            ...await ExchangePrice.getAllExchangePrice(vndcConfig.id),
            ...await ExchangePrice.getAllExchangePrice(vnstConfig.id),
        ]
        // Tra ve theo cap usdt

        exchangePrices.forEach(item => {
            if (!result.hasOwnProperty(item.bi)) {
                if (item.q === 'USDT') {
                    result[item.bi] = +item.p
                } else if (item.q === 'VNDC' || item.q === 'VNST') {
                    result[item.bi] = +item.p / usdtVnstRate
                }
            }
        })
        return result
    }
}

module.exports = AssetValue
