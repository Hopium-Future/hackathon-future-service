'use strict'

const BaseModel = use('MongooseModel')

/**
 * @class FundingHistory
 */
class FundingHistory extends BaseModel {
    static get timestamps () {
        return false
    }

    static get schemaOptions () {
        return {
            collection: 'fundinghistories',
            timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
        }
    }

    static get schema () {
        return {
            symbol: String,
            fundingIntervalHours: { type: Number, default: 8 },
            lastFundingRate: Number,
            lastBuyFundingRate: Number,
            lastSellFundingRate: Number,
            calcTime: Number
        }
    }
}

module.exports = FundingHistory.buildModel('FundingHistory')
