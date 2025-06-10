const { hooks } = require('@adonisjs/ignitor')

hooks.before.providersBooted(() => {
    global.Logger = use('Logger')
    global.LogTime = (diff, label = '') => console.log(`${label} Took ${diff[0] * 1e9 + diff[1]} nanoseconds`)

    // eslint-disable-next-line no-extend-native
    String.prototype.hashCode = function() {
        let hash = 0
        let i
        let
            chr
        if (this.length === 0) return hash
        for (i = 0; i < this.length; i++) {
            chr = this.charCodeAt(i)
            hash = ((hash << 5) - hash) + chr
            hash |= 0 // Convert to 32bit integer
        }
        return hash
    }
    const _ = require('lodash')
    _.mixin({
        memoizeDebounce (func, wait = 0, options = {}) {
            const mem = _.memoize(() => _.debounce(func, wait, options), options.resolver)
            return function() {
                mem.apply(this, arguments)
                    .apply(this, arguments)
            }
        },
        memoizeThrottle (func, wait = 0, options = {}) {
            const mem = _.memoize(() => _.throttle(func, wait, options), options.resolver)
            return function() {
                mem.apply(this, arguments)
                    .apply(this, arguments)
            }
        }
    })
})

hooks.after.providersBooted(() => {
    use('App/Library/Redis').initRedisCommand()
    initRedis()
    use('App/Services/CacheService').subscribeChange()
})

hooks.after.httpServer(async () => {
    //  Future socket
    use('App/Models/VndcFuture/VndcFutureOrder')
    // use('App/Services/CopyTradeService').initCopyTradeQueue()
    // const socket = use('App/Library/Socket/SocketClientToMainServer')
    // socket.init()
})

const fs = require('fs').promises

async function initRedis () {
    const RedisPrimary = use('Redis').connection('futures_order_master')
    const RedisSecondary = use('Redis').connection('futures_order_slave')
    const files = await fs.readdir('./lua')
    for (let i = 0; i < files.length; i++) {
        const fileName = files[i]
        const functionName = fileName.replace('.lua', '')
        console.log('functionName', functionName)

        const lua = await fs.readFile(`./lua/${fileName}`, 'utf8')
        const EXCHANGE_LUA_HASH_1 = await RedisPrimary.script('load', lua)
        const EXCHANGE_LUA_HASH_2 = await RedisSecondary.script('load', lua)
        console.log('EXCHANGE_LUA_HASH', EXCHANGE_LUA_HASH_1)
        const redisFunctions = [
            {
                type: 'write',
                name: 'upsert_single_order',
                numberOfArgs: 4
            },
            {
                type: 'write',
                name: 'sync_single_order',
                numberOfArgs: 4
            },
            {
                type: 'read',
                name: 'get_single_order',
                numberOfArgs: 1
            },
            {
                type: 'write',
                name: 'get_new_order_id',
                numberOfArgs: 0
            },
            {
                type: 'read',
                name: 'get_open_order',
                numberOfArgs: 1
            },
            {
                type: 'write',
                name: 'remove_single_order',
                numberOfArgs: 3
            },
            {
                type: 'read',
                name: 'get_orders_by_user',
                numberOfArgs: 2
            },
            {
                type: 'read',
                name: 'get_all_order_of_user',
                numberOfArgs: 1
            }
        ]
        for (let j = 0; j < redisFunctions.length; j++) {
            const redisFunction = redisFunctions[j]
            await RedisPrimary.defineCommand(redisFunction.name, {
                numberOfKeys: 0,
                lua: `local e = f_${EXCHANGE_LUA_HASH_1}();return e.${redisFunction.name}(${buildArgvs(redisFunction.numberOfArgs)});`
            })
            await RedisSecondary.defineCommand(redisFunction.name, {
                numberOfKeys: 0,
                lua: `local e = f_${EXCHANGE_LUA_HASH_2}();return e.${redisFunction.name}(${buildArgvs(redisFunction.numberOfArgs)});`
            })
        }
    }
}

function buildArgvs (num) {
    let argvs = ''
    if (num < 1) return argvs
    for (let i = 1; i <= num; i++) {
        argvs += `${i === 1 ? '' : ','}ARGV[${i}]`
    }
    return argvs
}
