'use strict'

const BaseModel = use('App/Models/BaseModel')

const MemoryCache = use('App/Models/MemoryCache')
const cache = new MemoryCache(60 * 60) // Create a new cache service instance
/**
 * @class TransactionCategory
 */
class TransactionCategory extends BaseModel {
    /**
     * Asset's schema
     */
    static get schema () {
        return {
            id: Number,
            name: String,
            description: String
        }
    }

    static boot ({ schema }) {
        // Hooks:
        // this.addHook('preSave', () => {
        // })
        // Indexes:
        this.index({ id: 1 }, {
            unique: true,
            background: true
        })
        this.index({ name: 1 }, { background: true })
        // Virtuals, etc:
        // schema.virtual('something').get(.......)
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
        await this.setCacheData(_key, result)
        return result
    }
}

module.exports = TransactionCategory.buildModel('TransactionCategory')
