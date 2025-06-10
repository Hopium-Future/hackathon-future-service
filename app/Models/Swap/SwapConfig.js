'use strict'

const BaseModel = use('MongooseModel')

/**
 * @class SwapConfig
 */
class SwapConfig extends BaseModel {
    /**
     * SwapConfig's schema
     */

    static get schema () {
        return {
            fromCurrency: Number,
            toCurrency: Number,
            config: Object,
            swapFromConfig: Object,
            swapToConfig: Object,
            status: Number
        }
    }

    static boot ({ schema }) {
        // Hooks:
        // this.addHook('preSave', () => {})
        // this.addHook('preSave', 'SwapConfig.method')
        // Indexes:
        // this.index({}, {background: true})
    }
}

module.exports = SwapConfig.buildModel('SwapConfig')
