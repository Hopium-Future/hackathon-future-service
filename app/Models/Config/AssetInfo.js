'use strict'

const BaseModel = use('App/Models/BaseModelMongo')
const MemoryCache = use('App/Models/MemoryCache')
const cache = new MemoryCache(24 * 60 * 60) // Create a new cache service instance
/**
 * @class AssetInfo
 */
class AssetInfo extends BaseModel {
    /**
     * Asset's schema
     */
    static get schema () {
        return {
            asset_id: Number,
            coingecko_id: String,
            cmc_id: String,
            symbol: String,
            name: String,
            platforms: Object,
            date_added: Date,
            tags: Object,
            max_supply: Number,
            circulating_supply: Number,
            total_supply: Number,
            cmc_rank: Number,

            category: String,
            description: Object,
            slug: String,
            subreddit: String,
            tag_names: Object,
            tag_groups: Object,
            urls: Object,
            twitter_username: String

        }
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

module.exports = AssetInfo.buildModel('AssetInfo')
