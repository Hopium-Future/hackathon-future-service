'use strict'

const BaseModel = use('MongooseModel')

// * @class LoanHistory

class LoanHistory extends BaseModel {
    static get schemaOptions () {
        return { collection: 'loan_histories' }
    }

    static get schema () {
        return {
            id: Number,
            userId: Number,
            lenderId: Number,
            liquidationDetail: {
                baseAssetId: Number,
                quoteAssetId: Number,
                price: Number,
                baseQty: Number,
                quoteQty: Number,
                time: Number
            },
            liquidationRequest: Number,
            liquidationExecuted: Number,
            promotionValue: Number,
            type: String,
            metadata: {
                orderId: Number,
                isFunding: Boolean,
                fohId: String
            },
            createdAt: Date,
            updatedAt: Date
        }
    }

    static boot ({ schema }) {}
}

module.exports = LoanHistory.buildModel('LoanHistory')
