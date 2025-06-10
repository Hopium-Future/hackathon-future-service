'use strict'

const BaseModel = use('MongooseModel')

// * @class AssetConfig

class TransactionHistory extends BaseModel {
    static get schema () {
        return {
            userId: Number,
            transactionId: {
                type: String,
                unique: process.env.NODE_ENV === 'production',
                index: true
            },
            rollbackTransactionId: String,
            status: Number,

            moneyUse: Number,
            moneyBefore: Number,
            moneyAfter: Number,

            note: String,
            category: String,
            walletType: String,
            mainBalance: Number,
            assetId: Number,

            metadata: Object,

            portfolio: Object,
            portfolioScanned: {
                type: Boolean,
                default: false
            },

            fromUser: Object,
            toUser: Object,
            detailSource: { type: String, default: 'metadata' }, // metadata | api

            createdAt: Date,
            updatedAt: Date
        }
    }

    static boot ({ schema }) {
        // Hooks:
        // this.addHook('preSave', () => {})
        // Indexes:
        // Virtuals, etc:
        // schema.virtual('something').get(.......)
    }

    static async setCacheGetOne (options = {}, data) {
        const args = { ...[options, 1, 1] }
        const _key = this.buildCacheKey("getList", args, 'TransactionHistory')// tạo key redis
        await this.setCacheData(_key, [data], 10 * 60 * 1000)
    }
}

module.exports = TransactionHistory.buildModel('TransactionHistory')
