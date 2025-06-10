const ms = require('ms')

exports.User = {
    Role: {
        ROOT_ACCOUNT: 99, // Luu tru cac khoan phi rut/nap
        ADMIN: 1,
        VERIFIER: 2,
        MASTER_IB: 3,
        IB: 4,
        USER: 5,
        // Has role to create challenge  survival room
        LEVEL_1: 6,
        CHAT_SUPPORTER: 10
    },
    Language: {
        VI: 'vi',
        EN: 'en'
    },

    RootUser: {

        NAMI_SPOT_FEE: 'nami_spot_fee',
        NAMI_SPOT_COMMISSION: 'nami_spot_commission',
        NAMI_SPOT: 'nami_spot',
        NAMI_SPOT_BINANCE: 'nami_spot_binance',
        NAMI_STAKE: 'nami_stake',
        NAMI_SWAP_FEE: 'nami_swap_fee',
        USDT_VNDC_GATEWAY: 'usdt_vndc_gateway',
        NAMI_FEE: 'nami_fee',
        NAMI_GATEWAY_BINANCE: 'nami_gateway_binance',
        NAMI_SWAP_COMMISSION: 'nami_swap_commission',
        NAMI_SWAP: 'nami_swap',
        NAMI_CONVERT: 'nami_convert',
        NAMI_GATEWAY_VNDC: 'nami_gateway_vndc',
        NAMI_GATEWAY_FEE: 'nami_gateway_fee',
        NAMI_GATEWAY: 'nami_gateway'

    },
    IbType: {
        NORMAL: 0, // Lv mặc định
        IB_LV1: 1,
        TB_LV2: 2,
        NAMI_SALE: 3, // Nami Sale
        NAMI_SALE_MANAGER_LV_1: 4,
        NAMI_SALE_MANAGER_LV_2: 5, // Head Buisiness

        NAMI_BROKER_USER: 6, // User under nami sale

        OLA_BROKER_MASTER: 7, // 584982
        OLA_BROKER_USER: 8,

        MB_BROKER_MASTER: 9, // 583415
        MB_BROKER_USER: 10
    },
    ReferSource: {
        UNKNOWN: 0,
        BITBATTLE: 1,
        LAUNCHPAD: 2
    },
    Gender: {
        UNKNOWN: 0,
        MALE: 1,
        FEMALE: 2
    },
    KycStatus: {
        NO_KYC: 0,
        PENDING: 1,
        VERIFIED: 2
    }
}
const Otp = {
    Type: {
        AUTHEN_SOCKETIO: 1,
        VERIFY_EMAIL: 2,
        RESET_PASSWORD: 3,
        VERIFY_DEVICE_EMAIL: 4
    },
    Status: {
        USED: 1,
        UNUSED: 0
    }
}
Otp.TimeOut = {
    [Otp.Type.AUTHEN_SOCKETIO]: ms('2 day'),
    [Otp.Type.VERIFY_EMAIL]: ms('1 day'),
    [Otp.Type.RESET_PASSWORD]: ms('15 minutes'),
    [Otp.Type.VERIFY_DEVICE_EMAIL]: ms('15 minutes')
}
exports.Otp = Otp

const OAuthUser = {
    Type: {
        GOOGLE: 1,
        FACEBOOK: 2,
        NAMI_ASSISTANT: 3,
        FINANCE_X: 4,
        NAMI: 5,
        VNDC: 6,
        APPLE: 7
    },
    Service: ['google', 'facebook', 'nami', 'vndc', 'apple']
}

OAuthUser.UserTableColumnName = {
    [OAuthUser.Type.GOOGLE]: 'google_user_id',
    [OAuthUser.Type.FACEBOOK]: 'fb_user_id',
    [OAuthUser.Type.FINANCE_X]: 'financex_user_id',
    [OAuthUser.Type.NAMI]: '',
    [OAuthUser.Type.VNDC]: 'vndc_user_id',
    [OAuthUser.Type.APPLE]: 'apple_user_id'
}

exports.OAuthUser = OAuthUser

exports.UserDevice = {
    Status: {
        NORMAL: 0, //
        REVOKED: 1, // Force logged out
        BANNED: 2, // Banned
        LOGGED_OUT: 3, // User logged out normally
        WAITING_FOR_AUTHORIZATION: 4 // Wait to be authorized
    },
    // eslint-disable-next-line no-bitwise
    Product: { AttlasExchange: 1 << 0 }
}

exports.Wallet = {
    ErrorCode: {
        1: 'NOT_FOUND_WALLET_KEY',
        2: 'NEGATIVE_WALLET_VALUE',
        3: 'MONEY_IS_NOT_ENOUGH'
    },

    MoneyType: {
        MAIN_BALANCE: 'MAIN',
        LOCK_BALANCE: 'LOCK'
    },
    WalletType: {
        MAIN: 'MAIN',
        SPOT: 'SPOT',
        MARGIN: 'MARGIN',
        FUTURES: 'FUTURES',
        P2P: 'P2P',
        POOL: 'POOL',
        BROKER: 'BROKER',
        EARN: 'EARN'
    },

    Result: {
        INVALID_USER: 'INVALID_USER',
        INVALID_USER_ROLE: 'INVALID_USER_ROLE',
        INVALID_INPUT: 'INVALID_INPUT',
        NOT_ENOUGH_NAC: 'NOT_ENOUGH_NAC',
        NOT_ENOUGH_ETH: 'NOT_ENOUGH_ETH',
        NOT_ENOUGH_CURRENCY: 'NOT_ENOUGH_CURRENCY',
        UNKNOWN_ERROR: 'UNKNOWN_ERROR',
        INVALID_TIME_BACK_ETH: 'INVALID_TIME_BACK_ETH'
    },
    KeyChangeBalanceRedis: 'redis:wallet:change:balance',
    TransactionStatus: {
        FAILED: 0, // Khi bị rollback thì cập nhật status = failed
        SUCCESS: 1,
        ROLLBACK: 2
    }
}

exports.ExchangeConfig = {
    FilterType: {
        PRICE_FILTER: 'PRICE_FILTER',
        PERCENT_PRICE: 'PERCENT_PRICE',
        LOT_SIZE: 'LOT_SIZE',
        MIN_NOTIONAL: 'MIN_NOTIONAL',
        MAX_NUM_ORDERS: 'MAX_NUM_ORDERS'
    }
}

exports.FuturesConfig = {
    FilterType: {
        PRICE_FILTER: 'PRICE_FILTER',
        PERCENT_PRICE: 'PERCENT_PRICE',
        LOT_SIZE: 'LOT_SIZE',
        MARKET_LOT_SIZE: 'MARKET_LOT_SIZE',
        MIN_NOTIONAL: 'MIN_NOTIONAL',
        MAX_NUM_ORDERS: 'MAX_NUM_ORDERS',
        MAX_TOTAL_VOLUME: 'MAX_TOTAL_VOLUME'
    }
}

exports.ExchangeOrder = {
    StopLimitType: {
        GREATER_OR_EQUAL: 1,
        LESS_OR_EQUAL: 2
    },
    Side: {
        BUY: 'BUY',
        SELL: 'SELL'
    },
    Status: {
        NEW: 'NEW',
        PARTIALLY_FILLED: 'PARTIALLY_FILLED',
        FILLED: 'FILLED',
        CANCELED: 'CANCELED',
        FAILED: 'FAILED'
    },
    MatchingEngineStatus: {
        NEW: 'create',
        PARTIALLY_FILLED: 'part',
        FILLED: 'finish',
        CANCELED: 'cancel',
        FAILED: 'failed'
    },
    Type: {
        MARKET: 'MARKET',
        LIMIT: 'LIMIT',
        STOP_LIMIT: 'STOP_LIMIT'
    },
    NotificationType: {
        PLACE_ORDER: 'PLACE_ORDER',
        CLOSE_ORDER: 'CLOSE_ORDER'
    },
    LiquidityStatus: {
        HOLD: 'HOLD',
        TRANSFERRED: 'TRANSFERRED',
        TRANSFERRED_ERROR: 'TRANSFERRED_ERROR'
    },
    RedisKeyChangeOrder: 'redis:change:order',
    RedisKeyPushNotification: 'redis:notification:order',
    RedisKeyPushTrade: 'redis:trade:order'
}

exports.NamiFuturesOrder = {
    GroupStatus: {
        OPENING: 0,
        HISTORY: 1
    },
    Status: {
        PENDING: 0,
        ACTIVE: 1,
        CLOSED: 2,
        OPENING: 3,
        CLOSING: 4
    },
    Side: {
        BUY: 'Buy',
        SELL: 'Sell'
    },
    Type: {
        MARKET: 'Market',
        LIMIT: 'Limit',
        STOP: 'Stop'
    },
    ReasonCloseCode: {
        NORMAL: 0,
        HIT_SL: 1,
        HIT_TP: 2,
        LIQUIDATE: 3,
        HIT_LIMIT_CLOSE: 4
    },
    BitmexTransferError: {
        PROCESS_SUCCESSFULLY: 0,
        PLACE_ORDER_WITHOUT_SL_TP: 1, // Dat duoc lenh chinh nhung khong dat duoc lenh SL, TP
        ACTIVE_ORDER_ERROR: 2, // Lenh Stop hoac Limit duoc active nhung khong dat duoc SL, TP
        HIT_SL_TP_ERROR: 3 // Hit SL hoac TP nhung khong dong duoc lenh con lai
    },
    PromoteProgram: {
        NORMAL: 0,
        LUCKY_MONEY_2020: 1,
        AIRDROP_VNDC: 2
    },
    SpecialMode: {
        NORMAL: 0,
        ONLY_LIMIT: 1
    },

    LiquidityBroker: {
        BINANCE: 'BINANCE',
        BITMEX: 'BITMEX'
    },

    KafkaEvent: {
        CREATED: 'order_created',
        UPDATED: 'order_updated',
        CLOSED: 'order_closed'
    },

    ActionType: {
        CREATE_ORDER: 'CREATE_ORDER',
        UPDATE_ORDER: 'UPDATE_ORDER',
        CLOSE_ORDER: 'CLOSE_ORDER'
    }
}

exports.FuturesOrder = {
    StopLimitType: {
        GREATER_OR_EQUAL: 1,
        LESS_OR_EQUAL: 2
    },
    PositionSide: {
        SHORT: 'SHORT',
        LONG: 'LONG'
    },
    Side: {
        BUY: 'BUY',
        SELL: 'SELL'
    },
    Status: {
        NEW: 'NEW',
        PARTIALLY_FILLED: 'PARTIALLY_FILLED',
        FILLED: 'FILLED',
        CANCELED: 'CANCELED',
        FAILED: 'FAILED'
    },
    MatchingEngineStatus: {
        NEW: 'create',
        PARTIALLY_FILLED: 'part',
        FILLED: 'finish',
        CANCELED: 'cancel',
        FAILED: 'failed'
    },
    Type: {
        LIMIT: 'LIMIT',
        MARKET: 'MARKET',
        STOP: 'STOP',
        STOP_MARKET: 'STOP_MARKET',
        TAKE_PROFIT: 'TAKE_PROFIT',
        TAKE_PROFIT_MARKET: 'TAKE_PROFIT_MARKET',
        TRAILING_STOP_MARKET: 'TRAILING_STOP_MARKET'
    },
    EditMarginType: {
        ADD: 'ADD',
        REMOVE: 'REMOVE'
    },
    NotificationType: {
        PLACE_ORDER: 'PLACE_ORDER',
        CLOSE_ORDER: 'CLOSE_ORDER'
    },
    LiquidityStatus: {
        HOLD: 'HOLD',
        TRANSFERRED: 'TRANSFERRED',
        TRANSFERRED_ERROR: 'TRANSFERRED_ERROR'
    },
    RedisKeyChangeOrder: 'redis:change:order',
    RedisKeyPushNotification: 'redis:notification:order',
    RedisKeyPushTrade: 'redis:trade:order'
}

exports.ExchangeOrderHistory = {

    Action: {
        MATCH_ORDER: 1,
        CLOSE_ORDER: 2,
        MATCH_MARKET_ORDER: 3,
        UPDATE_ORDER: 4
    },
    Status: { MATCH_ORDER_SUCCESSFULLY: 1 }

}

exports.Swap = {

    Status: {
        TRADING: 'TRADING',
        BREAK: 'BREAK'
    },
    Mode: {
        NO_ACTION: 'NO_ACTION',
        POOL: 'POOL', // Sử dụng 1 pool usdt sau đó chuyển lệnh
        SPOT: 'SPOT' // Sử dụng trực tiếp orderbook exchange
    }

}

exports.Platform = {
    WEB_APP: 'WEB_APP',
    IOS_APP: 'IOS_APP',
    ANDROID_APP: 'ANDROID_APP',
    MOBILE_APP: 'MOBILE_APP',
    API: 'API'
}

exports.LiquidityBroker = {
    NAMI_SPOT: 'NAMI_SPOT',
    NAMI_FUTURES: 'NAMI_FUTURES',
    BINANCE_SPOT: 'BINANCE_SPOT',
    BINANCE_FUTURES: 'BINANCE_FUTURES'
}

exports.Socket = {
    Channel: {
        FUTURES_ORDER: 'futures:order',
        FUTURES_RECENT_TRADE: 'futures:recent_trade'
    },
    Event: {
        FUTURE_UPDATE_OPENING_ORDER: 'future:update_opening_order',
        FUTURE_PROCESSING_ORDER_ERROR: 'future:processing_order_error',
        FUTURE_UPDATE_RECENT_TRADE: 'future:update_recent_trade'
    },
    RedisPubKey: {
        SOCKET_EMIT_USER: 'socket:emit:user',
        SOCKET_EMIT: 'socket:emit'
    }
}

exports.MMRConfig = {
    25: 0.004,
    50: 0.003,
    75: 0.002,
    100: 0.001,
    125: 0.001
}
