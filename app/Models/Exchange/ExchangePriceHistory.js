'use strict'

const BaseModel = use('MongooseModel')

/**
 * @class ExchangePriceHistory
 */
class ExchangePriceHistory extends BaseModel {
    /**
     * ExchangePriceHistory's schema
     */

    static get schema () {
        return {
            exchangeCurrency: Number,
            baseCurrency: Number,
            lastPrice: Number,
            totalExchangeVolume: Number,
            totalBaseVolume: Number,
            timeFrame: Number,
            historyTime: Date,
            high: Number,
            low: Number,
            high1H: Number,
            low1H: Number
        }
    }

    static boot ({ schema }) {
        // Hooks:
        // this.addHook('preSave', () => {})
        // Indexes:
        // this.index({}, {background: true})
        // Virtuals, etc:
        // schema.virtual('something').get(.......)
    }
}

module.exports = ExchangePriceHistory.buildModel('ExchangePriceHistory')
