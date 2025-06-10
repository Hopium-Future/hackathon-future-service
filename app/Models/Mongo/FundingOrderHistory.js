'use strict'

const BaseModel = use('MongooseModel')

/**
 * @class FundingOrderHistory
 */
class FundingOrderHistory extends BaseModel {
    static get schema () {
        return {
            userId: Number,
            displayingId: Number,
            symbol: String,
            baseAsset: String,
            type: String,
            leverage: Number,
            useLoan: Boolean,
            fohId: String,
            fundingCurrency: Number,
            funding: {
                total: Number,
                balance: Number,
                margin: Number,
                origin: Number,
                loan: Number
            },
            timeFunding: Number,

            createdAt: {
                type: Date,
                alias: 'created_at'
            },
            updatedAt: {
                type: Date,
                alias: 'updated_at'
            }
        }
    }
}

module.exports = FundingOrderHistory.buildModel('FundingOrderHistory')
