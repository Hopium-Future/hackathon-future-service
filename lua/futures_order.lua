local function sm_eq(a, b)
    local EPS = 0.0000000001
    return math.abs(a - b) < EPS
end

local function sm_gt(a, b)
    local EPS = 0.0000000001
    return a - b > EPS
end

local function sm_lt(a, b)
    local EPS = 0.0000000001
    return b - a > EPS
end

local function reversed_table(t)
    local reversed_table = {}
    local count = #t
    for k, v in ipairs(t) do
        reversed_table[count + 1 - k] = v
    end
    return reversed_table
end

---- Util functions

local function to_table_from_redis_hash(hash)
    local tmp = {}
    for k, v in pairs(hash) do
        if k % 2 == 0 then
            tmp[hash[k - 1]] = hash[k]
        end
    end
    return tmp
end

local function table_is_empty(t)
    return _G.next(t) == nil
end

local prefix_order = "order:"
local prefix_order_symbol = "list_by_symbol:"
local prefix_order_user = "list_by_user:"
local prefix_queue_upsert = "queue:upsert_order"

local function put_into_symbol_list(symbol, order_id)
    local key = prefix_order_symbol .. symbol
    redis.call("HSET", key, order_id, 1)
end

local function remove_from_symbol_list(symbol, order_id)
    local key = prefix_order_symbol .. symbol
    redis.call("HDEL", key, order_id)
end

local function put_into_user_list(user_id, order_id)
    local key = prefix_order_user .. user_id
    redis.call("HSET", key, order_id, 1)
end

local function remove_from_user_list(user_id, order_id)
    local key = prefix_order_user .. user_id
    redis.call("HDEL", key, order_id)
end

local function get_all_order_of_user(user_id)
    local key = "list_by_user:" .. user_id
    return redis.call("HKEYS", key)
end

local function get_single_order(order_id)
    local key = prefix_order .. order_id
    return redis.call("GET", key)
end

-- handle queue in redis (jobs to sync mongodb): First in First out
local function push_to_queue_upsert(data)
    redis.call('rpush', prefix_queue_upsert, data)
end
-- end handle queue

local function upsert_single_order(user_id, symbol, order_id, data)
    push_to_queue_upsert(data)

    local key = prefix_order .. order_id
    put_into_user_list(user_id, order_id)
    put_into_symbol_list(symbol, order_id)
    return redis.call("SET", key, data)
end

local function sync_single_order(user_id, symbol, order_id, data)
    local key = prefix_order .. order_id
    put_into_user_list(user_id, order_id)
    put_into_symbol_list(symbol, order_id)
    return redis.call("SET", key, data)
end

local function remove_single_order(user_id, symbol, order_id)
    remove_from_user_list(user_id, order_id)
    remove_from_symbol_list(symbol, order_id)
    return redis.call("DEL", prefix_order .. order_id)
end

local function get_new_order_id()
    return redis.call("INCRBY", prefix_order .. "last", 1)
end

local function get_open_order(user_id)
    local arr_ids = redis.call("hkeys", prefix_order_user .. user_id);
    if table_is_empty(arr_ids) then return {} end
    for k, v in ipairs(arr_ids) do
        arr_ids[k] = prefix_order .. v
    end
    return redis.call('MGET', unpack(arr_ids))
end


local function get_orders_by_user(user_id)
    local arr_ids = get_all_order_of_user(user_id)

    if table_is_empty(arr_ids) then return {} end
    for k, v in ipairs(arr_ids) do
        arr_ids[k] = prefix_order .. v
    end

    return redis.call('mget', unpack(arr_ids))
end

local futures = {
    get_single_order = get_single_order,
    get_all_order_of_user = get_all_order_of_user,
    upsert_single_order = upsert_single_order,
    sync_single_order = sync_single_order,
    remove_single_order = remove_single_order,
    get_new_order_id = get_new_order_id,
    get_open_order = get_open_order,
    get_orders_by_user = get_orders_by_user,
}

return futures
