'use strict'

const BaseModel = use('App/Models/BaseModelMongo')
const MemoryCache = use('App/Models/MemoryCache')
const cache = new MemoryCache(24 * 60 * 60) // Create a new cache service instance
/**
 * @class ExchangeConfig
 */
class ExchangeConfig extends BaseModel {
    static get schema () {
        return {
            symbol: String,
            status: String,

            baseAsset: String,
            baseAssetId: Number,
            baseAssetPrecision: Number,

            baseCommissionPrecision: Number,
            quoteAsset: String,
            quoteAssetId: Number,
            quoteAssetPrecision: Number,
            quoteCommissionPrecision: Number,

            // Filter input
            filters: Object,
            // Permission
            icebergAllowed: Boolean,
            isMarginTradingAllowed: Boolean,
            isSpotTradingAllowed: Boolean,
            ocoAllowed: Boolean,
            orderTypes: Object,
            permissions: Object,

            quoteOrderQtyMarketAllowed: Boolean,
            quotePrecision: Number,

            // For another campaign
            liquidityBroker: String, // NAMI SPOT
            startedAt: Date,
            feeMode: String // 0: normal, 1: market_maker_promotion
        }
    }

    /**
     * ExchangeConfig's schema
     */

    static boot ({ schema }) {
        // Hooks:
        // this.addHook('preSave', () => {})
        // Indexes:
        this.index({
            baseAsset: 1,
            quoteAsset: 1
        }, {
            unique: 1,
            sparse: true,
            background: true
        })
        this.index({
            baseAssetId: 1,
            quoteAssetId: 1
        }, {
            unique: 1,
            sparse: true,
            background: true
        })
        this.index({ symbol: 1 }, {
            unique: 1,
            sparse: true,
            background: true
        })
        // Virtuals, etc:
        // schema.virtual('something').get(.......)
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

module.exports = ExchangeConfig.buildModel('ExchangeConfig')
