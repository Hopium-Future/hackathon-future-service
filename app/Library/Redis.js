const FuturesLocker = use('Redis').connection('futures_locker')
const RedisWallet = use('Redis').connection('wallet')

exports.initRedisCommand = async function() {
    await RedisWallet.defineCommand('wallet_transfer', {
        numberOfKeys: 0,
        lua: 'local wallet_key, amount, allow_negative, wallet_hash\n'
            + '\n'
            + '    wallet_hash = ARGV[1]\n'
            + '    wallet_key = ARGV[2]\n'
            + '    amount = tonumber(ARGV[3])\n'
            + '    allow_negative = tonumber(ARGV[4])\n'
            + '    local wallet_before, wallet_after, error_code\n'
            + '    wallet_after = 0\n'
            + '    error_code = 0\n'
            + '    wallet_before = tonumber(redis.call("hget", wallet_hash, wallet_key))\n'
            + '    wallet_after = wallet_before\n'
            + '    if (wallet_before == nil) then error_code = 1\n'
            + '    end\n'
            + '    if (allow_negative ~= 1 and (amount < 0 and wallet_before < -0.00001)) then\n'
            + '        error_code = 2\n'
            + '    end\n'
            + '    if (allow_negative ~= 1 and (amount < 0 and wallet_before < -(amount+0.00001))) then\n'
            + '        error_code = 3\n'
            + '    end\n'
            + '    if (error_code == 0) then\n'
            + '        wallet_after = wallet_before + amount\n'
            + '        redis.call("hset", wallet_hash, wallet_key, wallet_after)\n'
            + '    end\n'
            + '    return { tostring(wallet_before), tostring(wallet_after), tostring(amount), error_code }'
    })
    await FuturesLocker.defineCommand('claim_futures_lock', {
        numberOfKeys: 0,
        lua: 'local key, displaying_id, reason, exp\n'
            + '    key = ARGV[1]\n'
            + '    displaying_id = ARGV[2]\n'
            + '    reason = ARGV[3]\n'
            + '    exp = tonumber(ARGV[4])\n'
            + '    local status_before, error_code, redis_key, result\n'
            + '    error_code = 0\n'
            + '    redis_key = key .. ":".. displaying_id\n'
            + '    result = nil\n'
            + '    status_before = redis.call("get", redis_key)\n'
            + '    if (status_before == nil or status_before == false) then\n'
            + '        result = reason\n'
            + '        redis.call("setex", redis_key, exp, reason)\n'
            + '    else\n'
            + '        result = status_before \n'
            + '        error_code = 1\n'
            + '    end\n'
            + 'return { tostring(result), error_code }\n'
    })
}
