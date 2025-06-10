/* eslint-disable no-param-reassign */

'use strict'

const amqp = require('amqplib')

const Env = use('Env')
const Promise = require('bluebird')
const _ = require('lodash')

const QUEUE_CONNECTION_URL = Env.get('QUEUE_CONNECTION_URL')

class BaseQueue {
    static async initConnection () {
        const [publishConn, consumeConn] = await Promise.all([amqp.connect(QUEUE_CONNECTION_URL), amqp.connect(QUEUE_CONNECTION_URL)])
        const [publishCh, consumeCh] = await Promise.all([publishConn.createChannel(), consumeConn.createChannel()])

        this.publishConnection = publishConn
        this.consumeConnection = consumeConn

        this.publishChannel = publishCh
        this.consumeChannel = consumeCh
    }

    static async getConnection (type) {
        switch (type) {
        case BaseQueue.Type.PUBLISH: {
            if (!this.publishConnection) this.publishConnection = await amqp.connect(QUEUE_CONNECTION_URL)
            if (!this.publishChannel) this.publishChannel = await this.publishConnection.createChannel()
            return this.publishChannel
        }
        case BaseQueue.Type.CONSUME: {
            if (!this.consumeConnection) this.consumeConnection = await amqp.connect(QUEUE_CONNECTION_URL)
            if (!this.consumeChannel) this.consumeChannel = await this.consumeConnection.createChannel()
            return this.consumeChannel
        }
        default:
            return null
        }
    }

    static async addTask (queue, msg) {
        msg = Array.prototype.slice.call(msg)
        if (typeof msg === 'object') msg = JSON.stringify(msg)
        const ch = await this.getConnection(BaseQueue.Type.PUBLISH)
        await ch.assertQueue(queue, { durable: true })
        return ch.sendToQueue(queue, new Buffer(msg), { persistent: true })
    }

    static async addTaskRaw (queue, msg, options) {
        const { durable } = _.defaults(options, { durable: true })
        if (typeof msg === 'object') msg = JSON.stringify(msg)
        const ch = await this.getConnection(BaseQueue.Type.PUBLISH)
        await ch.assertQueue(queue, { durable })
        // eslint-disable-next-line no-buffer-constructor
        return ch.sendToQueue(queue, new Buffer(msg), { persistent: true })
    }

    static async handleTask (queue, prefetch) {
        try {
            const ch = await this.getConnection(BaseQueue.Type.CONSUME)
            await ch.assertQueue(queue, { durable: true })
            if (prefetch > 0) await ch.prefetch(prefetch)
            return await ch.consume(queue, async msg => {
                if (msg === null) {
                    return
                }
                let obj
                const msgContent = msg.content.toString()
                const {
                    properties: {
                        correlationId,
                        replyTo
                    }
                } = msg
                try {
                    obj = JSON.parse(msgContent)
                } catch (err) {
                    obj = msgContent
                }
                const result = await this.doTask(obj)
                await ch.sendToQueue(replyTo, Buffer.from(JSON.stringify(result)), { correlationId })
                ch.ack(msg)
            }, { noAck: false })
        } catch (err) {
            Logger.error('HANDLE TASK NAMI TRADE BACKEND ERROR ', err)
            throw err
        }
    }
}

module.exports = BaseQueue

BaseQueue.Type = {
    PUBLISH: 'publish',
    CONSUME: 'consume'
}
