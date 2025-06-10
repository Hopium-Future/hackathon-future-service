'use strict'

const BaseModel = use('MongooseModel')

/**
 * @class CopyTradeFollower
 */
class CopyTradeFollower extends BaseModel {
    static get schemaOptions () {
        return { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
    }

    static get timestamps () {
        return false
    }

    static get schema () {
        return {
            user_id: { type: Number },
            following: { type: Number },
            name: { type: String },
            user_code: { type: String },
            avatar: { type: String },
            setting_type: { type: String },

            total_orders: { type: Number },
            total_margin: { type: Number },
            total_profit: { type: Number },
            balance: { type: Number },

            setting_value: { type: Object },
            setting_symbols: { type: Array },
            status: { type: Number },
            yield: Number,

            total_margin_v2: { type: Object }
        }
    }
}

module.exports = CopyTradeFollower.buildModel('CopyTradeFollower')

module.exports.Status = {
    NORMAL: 0,
    DISABLED: 1,
    REMOVED: 2,
    UNFOLLOWED: 3
}

module.exports.SettingType = {
    ByQuantity: 'quantity',
    ByPercentage: 'percentage'
}
