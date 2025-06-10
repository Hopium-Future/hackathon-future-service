'use strict'

/* eslint-disable no-param-reassign */
const amqp = require('amqplib')

const Error = use('Config')
    .get('error')
const Env = use('Env')
const QUEUE_CONNECTION_URL = Env.get('QUEUE_CONNECTION_URL')

const callbacks = {}

class RedisOrderMatchingQueue {
    static deleteCallback (correlationId) {
        delete callbacks[correlationId]
    }

    static async initConnection () {
        this.connection = await amqp.connect(QUEUE_CONNECTION_URL)
        this.channel = await this.connection.createChannel()
        this.publishQueues = {}
        const { queue: consumerQueue } = await this.channel.assertQueue(`redis_order_matching:write_consumer:${process.env.SPOT_SERVICE_KEY || 0}`, { durable: true })
        this.consumerQueues = consumerQueue
        this.channel.consume(this.consumerQueues, this.handleConsume.bind(this))
    }

    static async getQueue (symbol) {
        if (!this.publishQueues.hasOwnProperty(symbol)) {
            const { queue: publishQueue } = await this.channel.assertQueue(`${symbol}:redis_order_matching:write`, { durable: true })
            this.publishQueues[symbol] = publishQueue
        }
        return this.publishQueues[symbol]
    }

    static async addTask (symbol, msg, options = {}, cb = null) {
        const queue = await this.getQueue(symbol)
        if (!queue) {
            throw Error.TRADE_NOT_ALLOWED
        }
        const taskOptions = {
            persistent: true,
            replyTo: this.consumerQueues
        }
        if (options.correlationId) {
            taskOptions.correlationId = options.correlationId
            if (cb) {
                callbacks[options.correlationId] = cb
            }
        }

        if (typeof msg === 'object') msg = JSON.stringify(msg)
        // eslint-disable-next-line no-buffer-constructor
        return this.channel.sendToQueue(this.publishQueues[symbol], new Buffer(msg), taskOptions)
    }

    static async handleConsume (msg) {
        if (msg === null) {
            return
        }
        const { properties: { correlationId } } = msg

        const msgContent = msg.content.toString()
        let obj
        try {
            obj = JSON.parse(msgContent)
        } catch (err) {
            obj = msgContent
        }
        if (callbacks[correlationId] !== undefined) {
            callbacks[correlationId](obj)
            this.deleteCallback(correlationId)
        }
        this.channel.ack(msg)
    }
}

module.exports = RedisOrderMatchingQueue

RedisOrderMatchingQueue.Task = {
    PLACE_ORDER: 'place',
    CLOSE_ORDER: 'close',
    MODIFY_ORDER: 'modify'
}

RedisOrderMatchingQueue.Event = {
    OPEN_ORDER_RESULT: 'open_result',
    CLOSE_ORDER_RESULT: 'close_result',
    MODIFY_ORDER_RESULT: 'modify_result'
}
