'use strict'

const {Command} = require('@adonisjs/ace')
const RedisFuturesOrderMaster = use('Redis').connection('futures_order_master')
const FutureOrderMongo = use('App/Models/Futures/FuturesOrder')
const bb = require('bluebird')

class SyncRedis extends Command {
    static get signature() {
        return 'sync:redis'
    }

    static get description() {
        return 'Tell something helpful about this command'
    }

    async handle(args, options) {
        this.info('Dummy implementation for sync:redis command')
        const orders = await FutureOrderMongo.find({status: {$in: [0, 1]}})
        const count = orders.length
        await bb.map(orders, async (order, index) => {
            console.log('Sync new core', order.displaying_id, index, count)
            return await RedisFuturesOrderMaster.sync_single_order(order.user_id, order.symbol, order.displaying_id, JSON.stringify(order))
        })

    }
}

module.exports = SyncRedis
