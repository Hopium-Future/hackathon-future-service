'use strict'

const BaseModel = use('App/Models/BaseModel')

const MemoryCache = use('App/Models/MemoryCache')
const cache = new MemoryCache(60) // Create a new cache service instance
/**
 * @class SwapConfig
 */
class SwapConfig extends BaseModel {
    /**
     * SwapConfig's schema
     */

    static get schema () {
        return {
            fromAsset: String,
            fromAssetId: Number,
            fromAssetPrecision: Number,
            toAsset: String,
            toAssetId: Number,
            toAssetPrecision: Number,
            displayPriceAsset: String,
            filters: Object,
            status: String,
            steps: Object
        }
    }

    static async clearMemoryCache () {
        const pattern = this.getModelName()
        cache.delKeys(pattern)
        await this.resetCache()
    }

    static async getOneCached (options = {}) {
        const _key = this.buildCacheKey("getOneCached", arguments)// tạo key redis
        return cache.get(_key, async () => this.getOne(options))
    }

    static async getListCached (options = {}) {
        const _key = this.buildCacheKey("getListCached", arguments)// tạo key redis
        return cache.get(_key, async () => this.getList(options))
    }

    static async getOne (options = {}) {
        const [item] = await this.getList(options, 1, 1)
        return item
    }

    // eslint-disable-next-line no-unused-vars
    static async getList (options = {}, pageIndex = 1, pageSize = 10) {
        // eslint-disable-next-line prefer-rest-params
        const _key = this.buildCacheKey("getList", arguments)// tạo key redis
        const _cData = await this.getCacheData(_key)
        if (_cData) {
            return _cData
        }

        const records = await this.find(options)
        const result = []

        if (records.length > 0) {
            // eslint-disable-next-line no-restricted-syntax
            for (const item of records) {
                result.push(item)
            }
        }
        await this.setCacheData(_key, result, 10 * 60 * 1000)
        return result
    }
}

module.exports = SwapConfig.buildModel('SwapConfig')
