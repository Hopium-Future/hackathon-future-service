'use strict'

const BaseModel = use('MongooseModel')

// * @class LoanConfig

class LoanConfig extends BaseModel {
    static get schemaOptions () {
        return { collection: 'loan_configs' }
    }

    static get schema () {
        return {
            baseAsset: String,
            quoteAsset: String,
            baseAssetId: Number,
            quoteAssetId: Number,
            symbol: String,
            ltv: Number,
            liquidationRate: Number,
            status: String
        }
    }

    static boot ({ schema }) {
        // Hooks:
        // this.addHook('preSave', () => {})
        // Indexes:
        // Virtuals, etc:
        // schema.virtual('something').get(.......)
    }
}

module.exports = LoanConfig.buildModel('LoanConfig')
