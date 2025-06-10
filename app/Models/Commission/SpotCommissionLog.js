'use strict'

const BaseModel = use('MongooseModel')

/**
 * @class SpotCommissionLog
 */
class SpotCommissionLog extends BaseModel {
    static boot ({ schema }) {
        // Hooks:
        // this.addHook('preSave', () => {})
        // this.addHook('preSave', 'BitmexOrder.method')
        // Indexes:
        this.index({ user_id: 1, referral_user_id: 1 }, { background: true })
    }

    /**
     * BitmexOrder's schema
     */

    static get schema () {
        return {
            user_id: Number,
            referral_user_id: Number,
            metadata: Object,
            estimate_value: Number,
            estimate_currency: Number,
            time: Date
        }
    }
}

module.exports = SpotCommissionLog.buildModel('SpotCommissionLog')
