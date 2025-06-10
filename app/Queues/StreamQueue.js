'use strict'

const BaseQueue = use('App/Queues/BaseQueue')

class StreamQueue extends BaseQueue {
    static async push (type, data) {
        try {
            const { baseAssetId } = data
            const key = baseAssetId % (process.env.STREAM_SERVICE_HASH || 1)
            switch (type) {
            case 'trade': {
                return this.addTaskRaw(`spot:stream:price:${key}`, {
                    type,
                    data
                }, { durable: false })
            }
            case 'order_book': {
                return this.addTaskRaw(`spot:stream:order-book:${key}`, {
                    type,
                    data
                }, { durable: false })
            }
            default:
                break
            }
            return null
        } catch (e) {
            console.error('PriceQueue change ', type, data, e)
        }
    }
}

module.exports = StreamQueue
