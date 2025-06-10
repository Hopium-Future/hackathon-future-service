const Model = use('Model')
const RedisPrimary = use('Redis').connection('futures_order_master') // Write - set
const RedisSecondary = use('Redis').connection('futures_order_slave') // Read - get

class CacheRedis extends Model {
    static async upsertOrderRedis (order) {
        try {
            const { symbol, user_id, displaying_id } = order
            if (!symbol || !user_id || !displaying_id) return false
            return await RedisPrimary.upsert_single_order(user_id, symbol, displaying_id, JSON.stringify(order))
        } catch (error) {
            return error
        }
    }

    static async getOpenOrders ({ user_id }) {
        try {
            user_id = user_id?.toString().trim()

            if (!user_id) return null
            const res = await RedisSecondary.get_open_order(user_id)
            let data = []
            data = res.reduce((result, eachOrder) => {
                if (!eachOrder) return result
                const formatOrder = JSON.parse(eachOrder)
                if (formatOrder.status != 2 && formatOrder.liquidity_broker === 'NAMI') result.push(formatOrder)
                return result
            }, [])
            return data.sort((a, b) => new Date(b?.opened_at || b?.created_at) - new Date(a?.opened_at || a?.created_at))
        } catch (error) {
            return error
        }
    }

    static async listOrderByUserId ({ user_id }) {
        try {
            if (!user_id) return null
            const res = await RedisSecondary.get_orders_by_user(user_id)
            const data = res.filter(item => item).map(eachOrder => JSON.parse(eachOrder))
            return data.sort((a, b) => new Date(b?.opened_at || b?.created_at) - new Date(a?.opened_at || a?.created_at))
        } catch (error) {
            return error
        }
    }
}

module.exports = CacheRedis
