'use strict'

const Counter = use('App/Models/Counter')
const _ = require('lodash')

class MongoCounter {
    static async getCount (name) {
        const seq = await Counter.getCount(name)
        return seq.count
    }

    static async getExchangeOrderId (name) {
        const newId = await Counter.getCount(name)
        return +newId
    }
}

MongoCounter.Name = {
    EXCHANGE_ORDER_COUNTER: 'EXCHANGE_ORDER_COUNTER',
    EXCHANGE_ORDER_HISTORY_COUNTER: 'EXCHANGE_ORDER_HISTORY_COUNTER',
    STAKE_COUNTER: 'STAKE_COUNTER',
    FUTURE_ORDER_COUNTER: 'FUTURE_ORDER_COUNTER'
}

module.exports = MongoCounter

MongoCounter.syncExchangeOrderId = _.memoizeThrottle(async name => {
    try {
        const count = await Counter.getExchangeOrderId(name)
        await Counter.findByIdAndUpdate(name, { $set: { count: count + 100 } })
    } catch (e) {
        Logger.error('syncExchangeOrderId error', e)
    }
}, 500, {
    leading: false,
    trailing: true,
    resolver: name => name
})
