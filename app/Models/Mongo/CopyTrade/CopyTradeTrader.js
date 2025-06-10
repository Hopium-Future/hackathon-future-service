'use strict'

const BaseModel = use('MongooseModel')

/**
 * @class CopyTradeTrader
 */
class CopyTradeTrader extends BaseModel {
    static get schemaOptions () {
        return { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
    }

    static get timestamps () {
        return false
    }

    static get schema () {
        return {
            user_id: { type: Number },
            name: { type: String },
            avatar: { type: String },
            cover_image: { type: String },
            followers_count: { type: Number },
            // profit: {type: Number},


            total_margin: { type: Number },
            total_profit: { type: Number },
            total_orders: { type: Number },
            score: { type: Number }, // For sorting
            rating: { type: Number }, // score of 5
            activated_at: Date,
            balance: { type: Number },
            yield: Number,
            first_order_at: Date,

            status: { type: Number },
            hidden: { type: Boolean }
        }
    }
}

module.exports = CopyTradeTrader.buildModel('CopyTradeTrader')

module.exports.Status = {
    NORMAL: 0,
    DISABLED: 1,
    BANNED: 2
}
