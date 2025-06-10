const BaseModel = use('MongooseModel')
const RedisOrderBook = use('Redis').connection('cache_market_maker')
const _ = require('lodash')

/**
 * @class Counter
 */
class Counter extends BaseModel {
    /**
     * Counter's schema
     */

    static get schema () {
        return {
            _id: String,
            name: String,
            count: {
                type: Number,
                default: 1
            }
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

    static async init () {
        Object.values(this.Name)
            .map(async name => {
                const initCounter = await this.findOrCreate(name)
                if (name === this.Name.EXCHANGE_ORDER_COUNTER) {
                    await RedisOrderBook.set(name, +initCounter.count + 100)
                }
            })
    }

    static async findOrCreate (name) {
        let exist = await this.findOne({ _id: name })
            .lean()
        if (!exist) {
            exist = await this.create({
                _id: name,
                name
            })
        }
        return exist
    }

    static async getCount (name) {
        const seq = await this.findByIdAndUpdate(name, { $inc: { count: 1 } })
        return seq.count
    }

    static async getExchangeOrderId (name) {
        const newId = await RedisOrderBook.incr(name)
        return +newId
    }
}

module.exports = Counter.buildModel('Counter')

module.exports.Name = {
    USER_ID: 'USER_ID',
    ASSET_ID: 'ASSET_ID',
    EXCHANGE_CONFIG_ID: 'EXCHANGE_CONFIG_ID',
    EXCHANGE_ORDER_COUNTER: 'EXCHANGE_ORDER_COUNTER',
    EXCHANGE_ORDER_HISTORY_COUNTER: 'EXCHANGE_ORDER_HISTORY_COUNTER',
    STAKE_COUNTER: 'STAKE_COUNTER',
    FUTURE_ORDER_COUNTER: 'FUTURE_ORDER_COUNTER',
    LUCKY_MONEY_2020_COUNTER: 'LUCKY_MONEY_2020_COUNTER',
    SWAP_HISTORY: 'SWAP_HISTORY',
    FUTURE_CONTEST_TICKET: 'FUTURE_CONTEST_TICKET'
}
