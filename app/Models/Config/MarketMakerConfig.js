'use strict'

const BaseModel = use('MongooseModel')

/**
 * @class MarketMakerConfig
 */
class MarketMakerConfig extends BaseModel {
    /**
     * MarketMakerConfig's schema
     */

    static get schema () {
        return {
            adminUsers: {
                type: Object,
                default: {}
            },
            assetUserId: Number,
            exchangeCurrency: Number,
            baseCurrency: Number,
            status: Number,
            allowPlaceOrder: {
                type: Boolean,
                default: false
            },
            allowCloseOrder: {
                type: Boolean,
                default: false
            },
            orderBookConfig: {
                type: Object,
                default: {}
            }
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

module.exports = MarketMakerConfig.buildModel('MarketMakerConfig')
