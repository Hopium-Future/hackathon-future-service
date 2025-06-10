'use strict'

const BaseModel = use('MongooseModel')

/**
 * @class CopyTradeTraderHistory
 */
class CopyTradeTraderHistory extends BaseModel {
    static boot ({ schema }) {
        schema.pre('save', function(next) {
            if (this.balance) {
                this.percentage = this.profit / this.balance * 100
            } else {
                this.percentage = 0
            }
            next()
        })
    }

    static get timestamps () {
        return false
    }

    static get schemaOptions () {
        return { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
    }

    static get schema () {
        return {
            user_id: { type: Number },
            profit: Number,
            balance: Number,
            percentage: Number,
            yield: Number,

            type: {
                type: String,
                enum: ['account', 'order_profit']
            }
        }
    }
}

module.exports = CopyTradeTraderHistory.buildModel('CopyTradeTraderHistory')

module.exports.Status = {
    NORMAL: 0,
    DISABLED: 1,
    BANNED: 2
}
