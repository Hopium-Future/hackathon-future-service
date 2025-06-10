---- Util functions
-- Safe math
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
---- Util functions

local function table_is_empty(t)
    return _G.next(t) == nil
end

local function get_json_from_redis_hash(key, field, value)
    local hash_in_redis = redis.call("HGETALL", key)

    if not hash_in_redis then
        return "{}"
    end

    local table = to_table_from_redis_hash(hash_in_redis)

    table[field] = value

    return cjson.encode(table)
end

local function transfer(from_user_id, to_user_id, money_type, wallet_type, asset, value, allow_negative)
	local from_user_id = ARGV[1]
	local to_user_id = ARGV[2]
	local money_type = ARGV[3]
	local wallet_type = ARGV[4]
	local asset = ARGV[5]
	local value = tonumber(ARGV[6])
	local allow_negative = tonumber(ARGV[7])

	local from_user_hash = "wallet:" .. wallet_type .. ":" .. money_type .. ":" .. from_user_id
	local from_user_hash = "wallet:" .. wallet_type .. ":" .. money_type .. ":" .. to_user_id

	local error_code = 0

	local from_wallet_before = redis.call("HGET", from_user_hash, asset)
	local to_wallet_before = redis.call("HGET", from_user_hash, asset)

	-- validate data
	if (not from_wallet_before or not to_wallet_before) then
		error_code = 1
	end

	local wallet_before, wallet_after, error_code
	wallet_after = 0
	error_code = 0
	wallet_before = tonumber(redis.call("get", wallet_key))
	wallet_after = wallet_before
	if (wallet_before == nil) then error_code = 1
	end
	if (allow_negative ~= 1 and (amount < 0 and wallet_before < -0.00001)) then
		error_code = 2
	end
	if (allow_negative ~= 1 and (amount < 0 and wallet_before < -(amount+0.00001))) then
		error_code = 3
	end
	if (error_code == 0) then
		wallet_after = wallet_before + amount
		redis.call("set", wallet_key, wallet_after)
	end
	return { tostring(wallet_before), tostring(wallet_after), tostring(amount), error_code }

end



-- user asset
-- user_asset:balance:1:btc
-- user_asset:locked:1:usdt
local function add_user_balance(user_id, coin, amount)
    redis.call("INCRBYFLOAT", "user_asset:balance:" .. user_id .. ":" .. coin, amount)
end

local function sub_user_balance(user_id, coin, amount)
    redis.call("INCRBYFLOAT", "user_asset:balance:" .. user_id .. ":" .. coin, -amount)
end

local function add_user_locked(user_id, coin, amount)
    redis.call("INCRBYFLOAT", "user_asset:locked:" .. user_id .. ":" .. coin, amount)
end

local function sub_user_locked(user_id, coin, amount)
    redis.call("INCRBYFLOAT", "user_asset:locked:" .. user_id .. ":" .. coin, -amount)
end

local function get_user_balance_asset(user_id, coin)
    local asset = redis.call("GET", "user_asset:balance:" .. user_id .. ":" .. coin)
    if not asset then
        redis.call("SET", "user_asset:balance:" .. user_id .. ":" .. coin, 0.0)
        return 0.0
    end
    return tonumber(asset)
end

local function get_user_locked_asset(user_id, coin)
    local asset = redis.call("GET", "user_asset:locked:" .. user_id .. ":" .. coin)
    if not asset then
        redis.call("SET", "user_asset:locked:" .. user_id .. ":" .. coin, 0.0)
        return 0.0
    end
    return tonumber(asset)
end

local function deposit_for_user(user_id, coin, amount)
    add_user_balance(user_id, coin, amount)
    return true
end

local function withdraw_apply_user(user_id, coin, amount)
    add_user_locked(user_id, coin, amount)
end

local function withdraw_success_user(user_id, coin, amount)
    -- atomic
    sub_user_locked(user_id, coin, amount)
end


local exchange = {
    get_user_balance_asset = get_user_balance_asset,
    get_user_locked_asset = get_user_locked_asset,
    deposit_for_user = deposit_for_user,
    withdraw_apply_user = withdraw_apply_user,
    withdraw_success_user = withdraw_success_user,
}

return wallet
