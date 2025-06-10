'use strict'

const Task = use('Task')
const RedisPrimary = use('Redis').connection('futures_order_master') // Write - set
const RedisSecondary = use('Redis').connection('futures_order_slave') // Read - get
const RedisCache = use('Redis').connection('cache')
const FutureOrderMongo = use('App/Models/Futures/FuturesOrder')

const limit = 500
const queue_name = 'queue:upsert_order'

class SyncFutureOrderRedisMongo extends Task {
    static get schedule () { // Schedule every 5s
        return '*/5 * * * * *'
    }

    async handle () {
        console.info("Schedule: Task sync futures order from Redis to Mongodb")
        await this.syncUpsertOrder()
    }

    async syncUpsertOrder () {
        const [historiesData, delStatus] = await RedisPrimary.multi().lrange(queue_name, 0, limit).ltrim(queue_name, limit, -1).exec()
        const [historyStatus, listUpsertOrder] = historiesData
        const order_ids = []
        const bulk = []
        const userIds = []

        // Loop from tail to head => get update lastest of each order
        for (let i = listUpsertOrder.length - 1; i >= 0; i--) {
            const upsertOrder = JSON.parse(listUpsertOrder[i])

            if (!order_ids.includes(upsertOrder.displaying_id)) {
                console.log('Update order redis -> mongo ', new Date(), upsertOrder.displaying_id)
                if (upsertOrder.status === 2) {
                    await RedisPrimary.remove_single_order(upsertOrder.user_id, upsertOrder.symbol, upsertOrder.displaying_id)
                }

                if (upsertOrder?.created_at) {
                    upsertOrder.created_at = new Date(upsertOrder.created_at).toISOString()
                } else {
                    upsertOrder.created_at = upsertOrder?.opened_at || new Date().toISOString()
                }
                bulk.push({
                    updateOne: {
                        filter: { displaying_id: upsertOrder.displaying_id },
                        update: upsertOrder,
                        upsert: true
                    }
                })
                order_ids.push(upsertOrder.displaying_id)
                if (!userIds.includes(upsertOrder.user_id)) {
                    userIds.push(upsertOrder.user_id)
                }
            }
        }

        await FutureOrderMongo.bulkWrite(bulk)
        for (const userId of userIds) {
            await RedisCache.del(`getHistoryOrderMobile:${userId}`)
        }
    }
}

module.exports = SyncFutureOrderRedisMongo
