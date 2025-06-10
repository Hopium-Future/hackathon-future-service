const Env = use('Env')

module.exports = {
    /*
    |--------------------------------------------------------------------------
    | connection
    |--------------------------------------------------------------------------
    |
    | Redis connection to be used by default.
    |
    */
    connection: Env.get('REDIS_CONNECTION', 'local'),
    // local: Env.get('REDIS_URL', "redis://default:@127.0.0.1:6379/0?allowUsernameInURI=true"),
    local: {
        host: Env.get('REDIS_HOST', '127.0.0.1'),
        port: Env.get('REDIS_PORT', 6379),
        password: Env.get('REDIS_PASSWORD') || undefined,
        db: Env.get('REDIS_DB', 0),
        keyPrefix: ''
    },
    cache: Env.get('REDIS_CACHE_URL', "redis://default:@127.0.0.1:6379/0?allowUsernameInURI=true"),
    beequeue: {
        host: Env.get('REDIS_BEEQUEUE_HOST', '127.0.0.1'),
        port: Env.get('REDIS_BEEQUEUE_PORT', 6379),
        password: Env.get('REDIS_BEEQUEUE_PASSWORD') || undefined,
        db: Env.get('REDIS_BEEQUEUE_DB') || 8
    },
    cache_market_maker: Env.get('REDIS_MM_URL', "redis://default:@127.0.0.1:6379/0?allowUsernameInURI=true"),
    loan: Env.get('REDIS_LOAN_URL', "redis://default:@127.0.0.1:6379/0?allowUsernameInURI=true"),
    stream_cache: Env.get('REDIS_STREAM_CACHE_URL', "redis://default:@127.0.0.1:6379/0?allowUsernameInURI=true"),
    wallet: Env.get('REDIS_WALLET_URL', "redis://default:@127.0.0.1:6379/0?allowUsernameInURI=true"),
    socket: Env.get('REDIS_SOCKET_URL', "redis://default:@127.0.0.1:6379/0?allowUsernameInURI=true"),
    futures_locker: Env.get('REDIS_FUTURES_LOCKER', "redis://default:@127.0.0.1:6379/0?allowUsernameInURI=true"),
    futures_order_master: Env.get('REDIS_FUTURES_ORDER_MASTER', "redis://default:@127.0.0.1:6379/11?allowUsernameInURI=true"),
    futures_order_slave: Env.get('REDIS_FUTURES_ORDER_SLAVE', "redis://default:@127.0.0.1:6379/11?allowUsernameInURI=true"),
    futures_bot_order: Env.get('REDIS_FUTURES_BOT_ORDER', "redis://default:@127.0.0.1:6379/12?allowUsernameInURI=true")
}
