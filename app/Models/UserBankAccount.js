'use strict'

const BaseModel = use('App/Models/BaseModelMongo')
const MemoryCache = use('App/Models/MemoryCache')
const cache = new MemoryCache(24 * 60 * 60) // Create a new cache service instance

class UserBankAccount extends BaseModel {
    static get schema () {
        return {
            type: String,
            userId: {
                type: Number,
                index: true
            },
            accountNumber: {
                type: String,
                index: true
            },
            accountName: { type: String },
            bankCode: {
                type: String,
                index: true
            },
            bankKey: { type: String },
            bankName: { type: String },
            bankLogo: { type: String },
            branchName: { type: String },
            status: {
                type: Number,
                default: 0
            },
            isDefault: {
                type: Boolean,
                default: false
            },
            metadata: Object
        }
    }

    static boot ({ schema }) {
        // Hooks:
        schema.pre('save', async function(next) {
            if (!this.metadata) {
                this.metadata = {}
            }
        })
        // Indexes:
        // this.index({ user_id: 1 }, { background: true })
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

module.exports = UserBankAccount.buildModel('UserBankAccount')

module.exports.Status = {
    Normal: 0,
    Disabled: 1
}
module.exports.Type = { Normal: 0 }
