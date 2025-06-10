'use strict'

const {Command} = require('@adonisjs/ace')
const bb = require("bluebird");

class Benchmark extends Command {
    static get signature() {
        return 'benchmark'
    }

    static get description() {
        return 'Tell something helpful about this command'
    }

    async testPlace(args, options) {
        this.info('Dummy implementation for benchmark command')
        const VndcFutureOrder = use('App/Models/VndcFuture/VndcFutureOrder')
        const bb = require('bluebird')

        const orderRequest = []
        for (let i = 0; i < 1; i++) {
            orderRequest.push({
                "symbol": "BTCVNDC",
                "type": "Market",
                "side": "Buy",
                "quantity": 0.00024053957838222702,
                "price": 20734.8,
                "leverage": 50,
                "sl": null,
                "tp": null,
                "quoteQty": Math.random()*50e6,
                "useQuoteQty": true,
                "requestId": i
            })
        }

        await bb.map(orderRequest, async request => {
            const data = await VndcFutureOrder.addToQueue({id: 18}, 'place', request)
            // console.log('__ check data', request?.requestId, data)
        })


    }

    async testClose(args, options) {
        this.info('Dummy implementation for benchmark command')
        const VndcFutureOrder = use('App/Models/VndcFuture/VndcFutureOrder')
        const bb = require('bluebird')
        const FutureOrderMongo = use('App/Models/Futures/FuturesOrder')
        const openOrders = await FutureOrderMongo.find({status: {$in: [0,1]}, user_id: 18})

        await bb.map(openOrders, async order => {
            const data = await VndcFutureOrder.addToQueue({id: 18}, 'close', { displaying_id: order.displaying_id, special_mode : false})
            // console.log('__ check data', order?.displaying_id, data)
        })


    }
    async handle(args, options) {
        // await this.testClose()
        await this.testPlace()


    }
}

module.exports = Benchmark
