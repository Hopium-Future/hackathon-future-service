'use strict'

const BaseModel = use('MongooseModel')

/**
 * @class UserVip
 */
class UserVip extends BaseModel {
    /**
     * UserVip's schema
     */

    static get schema () {
        return {
            user_id: Number,
            level: { type: Number, default: 0 },
            metadata: Object
        }
    }
}

module.exports = UserVip.buildModel('UserVip')
