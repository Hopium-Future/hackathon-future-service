'use strict'

const BaseModel = use('MongooseModel')

/**
 * @class PriceConfig
 */
class PriceConfig extends BaseModel {
    /**
     * PriceConfig's schema
     */

    static get schema () {
        return {
            symbol: String,
            status: Number,
            description: String,
            product: String,
            quote: String,
            base: String,
            broker: String,
            point: Number,
            digits: Number,
            valueTick: Number,
            timeExpires: Number,
            initPrice: Number,
            tradingviewConfig: Object
        }
    }

    static async boot ({ schema }) {
        // Hooks:
        // this.addHook('preSave', async() => {
        // })
        // TODO generate displaying id
        // Indexes:
        // this.index({}, {background: true})
        // Virtuals, etc:
        // schema.virtual('something').get(.......)
    }
}

module.exports = PriceConfig.buildModel('PriceConfig')
