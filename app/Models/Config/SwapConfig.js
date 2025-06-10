'use strict'

const BaseModel = use('App/Models/BaseModelMongo')

const MemoryCache = use('App/Models/MemoryCache')
const cache = new MemoryCache(60) // Create a new cache service instance
/**
 * @class SwapConfig
 */
class SwapConfig extends BaseModel {
    /**
     * SwapConfig's schema
     */

    static get schemaOptions () {
        return { collection: 'swapconfigs_v2' }
    }

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

    static boot ({ schema }) {
        this.index({
            fromAsset: 1,
            toAsset: 1
        }, {
            unique: true,
            background: true
        })
        this.index({
            fromAssetId: 1,
            toAssetId: 1
        }, {
            unique: true,
            background: true
        })
    }

    static async clearMemoryCache () {
        const pattern = this.getModelName()
        cache.delKeys(pattern)
        await this.resetCache()
    }

    static async getOneCached (filter = {}) {
        const _key = this.buildCacheKey("getOneCached", arguments)// tạo key redis
        return cache.get(_key, async () => this.getOne(filter))
    }

    static async getListCached (filter = {}, options = {}) {
        const _key = this.buildCacheKey("getListCached", arguments)// tạo key redis
        return cache.get(_key, async () => this.getList(filter, options))
    }

    static async getOne (options = {}) {
        const [item] = await this.getList(options, { limit: 1 })
        return item
    }

    static async getList (filter = {}, options = {}) {
        // eslint-disable-next-line prefer-rest-params
        const _key = this.buildCacheKey("getList", arguments)// tạo key redis
        const _cData = await this.getCacheData(_key)
        if (_cData) {
            return _cData
        }

        const pipeline = []
        pipeline.push({ $match: filter })
        if (options?.sort) pipeline.push({ $sort: options?.sort })
        if (options?.limit) pipeline.push({ $limit: options?.limit })
        if (options?.project) pipeline.push({ $project: options?.project })
        const records = await this.aggregate(pipeline).read('s')
        const result = records
        await this.setCacheData(_key, result)
        return result
    }
}

module.exports = SwapConfig.buildModel('SwapConfig')
