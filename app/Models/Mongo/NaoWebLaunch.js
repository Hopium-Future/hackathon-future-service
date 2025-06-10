'use strict'

const BaseModel = use('MongooseModel')

/**
 * @class NaoWebLaunch
 */
class NaoWebLaunch extends BaseModel {
    static boot ({ schema }) {}

    static get timestamps () {
        return false
    }

    static get schemaOptions () {
        return {
            collection: 'naoweblaunchs',
            timestamps: {
                createdAt: 'created_at',
                updatedAt: 'updated_at'
            }
        }
    }

    /**
     * NaoWebLaunch's schema
     */
    static get schema () {
        return {
            user_id: Number,
            currency: Number,
            value: Number,
            status: Number,
            transaction_id: String,
            date: String
        }
    }
}

module.exports = NaoWebLaunch.buildModel('NaoWebLaunch')
