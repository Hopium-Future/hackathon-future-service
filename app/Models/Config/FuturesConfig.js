'use strict'

const BaseModel = use('App/Models/BaseModelMongo')
const MemoryCache = use('App/Models/MemoryCache')
const cache = new MemoryCache(60) // Create a new cache service instance
/**
 * @class FuturesConfig
 */
class FuturesConfig extends BaseModel {
	static get schemaOptions () {
		return { collection: 'futuresconfigs_2' }
	}

    static get schema () {
        return {
            symbol: String,
            pair: String,
            contractType: String,
            deliveryDate: Number,
            onboardDate: Number,
            status: String,
            maintMarginPercent: Number,
            requiredMarginPercent: Number,
            baseAsset: String,
            baseAssetId: Number,
            quoteAsset: String,
            quoteAssetId: Number,
            marginAsset: String,
            marginAssetId: Number,
            pricePrecision: Number,
            quantityPrecision: Number,
            baseAssetPrecision: Number,
            quotePrecision: Number,
            underlyingType: String,
            underlyingSubType: Object,
            settlePlan: Number,
            triggerProtect: Number,
            liquidationFee: Number,
            marketTakeBound: Number,
            filters: Object,
            orderTypes: Object,
            timeInForce: Object,
            liquidityBroker: String,
            leverageConfig: Object,
            leverageBracket: Object,
            tags: Object
        }
    }

    /**
	 * FuturesConfig's schema
	 */

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

module.exports = FuturesConfig.buildModel('FuturesConfig')
