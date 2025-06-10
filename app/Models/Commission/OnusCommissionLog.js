'use strict'

const BaseModel = use('MongooseModel')

/**
 * @class OnusCommissionLog
 */
class OnusCommissionLog extends BaseModel {
    static boot ({ schema }) {
        // Hooks:
        // this.addHook('preSave', () => {})
        // this.addHook('preSave', 'BitmexOrder.method')
        // Indexes:
        this.index({ user_id: 1, time: 1 }, { unique: true, background: true })
    }

    /**
     * BitmexOrder's schema
     */
    static get schema () {
        return {
			time: Date,
			user_id: Number,
			onus_user_id: String,
			metadata: Object,
        }
    }
}

module.exports = OnusCommissionLog.buildModel('OnusCommissionLog')
