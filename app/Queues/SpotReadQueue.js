'use strict'

/* eslint-disable no-param-reassign */
const amqp = require('amqplib')

const Error = use('Config')
    .get('error')
const Env = use('Env')
const QUEUE_CONNECTION_URL = Env.get('QUEUE_CONNECTION_URL')
const { v4: uuidv4 } = require('uuid')

const callbacks = {}

class SpotReadQueue {
    static deleteCallback (correlationId) {
        delete callbacks[correlationId]
    }

    static async initConnection () {
        this.publishQueues = {}
        this.connection = await amqp.connect(QUEUE_CONNECTION_URL)
        this.channel = await this.connection.createChannel()
        const { queue: consumerQueue } = await this.channel.assertQueue('', { exclusive: true })
        this.consumerQueue = consumerQueue
        this.channel.consume(this.consumerQueue, this.handleConsume.bind(this))
    }

    static async getQueue (symbol) {
        if (!this.publishQueues.hasOwnProperty(symbol)) {
            const { queue: publishQueue } = await this.channel.assertQueue(`${symbol}:redis_order_matching:read`, { durable: true })
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
            replyTo: this.consumerQueue
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

    static async readFromQueue (symbol, options) {
        return new Promise((resolve, reject) => {
            this.addTask(symbol, {
                ...options,
                _type: 'read',
                _platform: '_read'
            }, { correlationId: uuidv4() }, data => {
                resolve(data?.data)
            })
                .catch(e => {
                    reject(e)
                })
        })
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

module.exports = SpotReadQueue
