'use strict'

const BaseModel = use('MongooseModel')

/**
 * @class UserPreferences
 */
class UserPreferences extends BaseModel {
    /**
	 * UserPreferences's schema
	 */

    static get schema () {
        return {
            user_id: Number,
            key: String,
            value: { type: Object, default: {} }
        }
    }
}

module.exports = UserPreferences.buildModel('UserPreferences')

module.exports.Keys = {
    FavoriteSymbol: 'favorite_symbol',
    FuturesConfig: 'futures_config'
}
