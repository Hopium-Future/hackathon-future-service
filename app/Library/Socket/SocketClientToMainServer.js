const SocketClient = require('./SocketClient')

const Env = use('Env')
const MAIN_SERVER_SOCKET_URL = Env.get('MAIN_SERVER_SOCKET_URL', 'http://localhost:9328')

class SocketClientToMainServer extends SocketClient {
    constructor (props) {
        super(props)

        this.Channel = { FUTURES_ORDER: 'futures:order' }

        this.Event = {
            UPDATE_SPIN_AMOUNT: 'spin:update_spin_amount',
            UPDATE_SPIN: 'spin:update_spin',
            PUSH_SPIN_ASK_FOR_FEEDBACK: 'spin:ask_for_feedback',
            UPDATE_PRIZE: 'spin:update_prize',
            UPDATE_SPREAD: 'spin:update_spread',
            SET_SPIN_PRIZE_ALL_LEVELS: 'spin:set_spin_prize_all_levels',

            UPDATE_BALANCE: 'user:update_balance', // user:update_balance + wallet_type_id
            UPDATE_USER_DATA: 'user:update_data',

            UPDATE_OPENING_ORDER_MARKET: 'user:update_opening_order_market',

            UPDATE_DEPOSIT_HISTORY: 'user:update_deposit_history',
            UPDATE_WITHDRAW_HISTORY: 'user:update_withdraw_history',

            PUSH_NEW_CHALLENGE_ROOM: 'challenge:new_room',
            REWARD_CHALLENGE_ROOM: 'challenge:reward',
            PUSH_INVITE_CHALLENGE_ROOM: 'challenge:invite_room',
            UPDATE_CHALLENGE_ROOM_RANK: 'challenge:update_rank',
            UPDATE_CHALLENGE_ROOM_PRIZE: 'challenge:update_prize',
            UPDATE_REMAIN_CONQUEST_SPIN: 'challenge:update_remain_conquest_spin',
            NOTI_WHEN_SURVIVAL_ROOM_REWARDED: 'challenge:noti_when_survival_room_rewarded',
            UPDATE_CHALLENGE_ROOM_DATA: 'challenge:update_room_data',

            EXCHANGE_UPDATE_RATE: 'exchange:update_rate',
            EXCHANGE_UPDATE_RATE_PAIR: 'exchange:update_rate_pair',
            EXCHANGE_UPDATE_INFOR: 'exchange:update_infor',
            EXCHANGE_UPDATE_OPENING_ORDER: 'exchange:update_opening_order',
            EXCHANGE_UPDATE_HISTORY_ORDER: 'exchange:update_history_order',
            EXCHANGE_PLACE_MARKET_ORDER_RESULT: 'exchange:place_market_order_result',

            UPDATE_BUY_BACK_LOAN: 'user:update_loan',

            // Future
            FUTURE_UDPATE_PRICE: 'future:update_price',
            FUTURE_UDPATE_MARKET_WATCH: 'future:update_market_watch',
            FUTURE_UPDATE_OPENING_ORDER: 'future:update_opening_order',
            FUTURE_UPDATE_OPENING_ORDER_NAO: 'future:update_opening_order_nao',
            FUTURE_UDPATE_HISTORY_ORDER: 'future:update_history_order',
            FUTURE_UDPATE_PLACE_ORDER_RESULT: 'future:place_order_result',
            FUTURE_UPDATE_RECENT_TRADE: 'future:update_recent_trade',
            FUTURE_ORDER_BOOK: 'future:order_book',
            FUTURE_UPDATE_COUNT_OPENING_ORDER: 'future:update_count_opening_order',
            FUTURE_UPDATE_LIQUIDATION_PRICE: 'future:update_liquidation_price',
            FUTURE_DONE_CLOSING_ALL_ORDERS: 'future:done_closing_all_orders',
            FUTURE_PROCESSING_ORDER_ERROR: 'future:processing_order_error',
            FUTURE_PROCESSING_ORDER_ERROR_NAO: 'future:processing_order_error_nao',
            FUTURE_WEB_LAUNCH_NAO: 'future:web_launch_nao'
        }
    }

    init () {
        try {
            super.init('MAIN', MAIN_SERVER_SOCKET_URL, '/ws_bitmex_service')
        } catch (e) {
            console.error('__ init socket error', e)
        }
    }

    onConnected () {
        super.onConnected()
    }

    async onMessage () {
        // super.onMessage();
        try {
            const [{ data }] = arguments
            console.log('onMessage', data)
        } catch (e) {
            console.error('onMessage  error ', e)
        }
    }

    emitToUser (userId, event, message, callback = null) {
        this.emit('emit_to_user', {
            userId,
            event,
            message
        }, callback)
    }

    emitOrderBook (exchange_currency, base_currency, callback = null) {
        this.emit('emit_order_book', {
            exchange_currency,
            base_currency
        }, callback)
    }

    emitRecentTrade (exchange_currency, base_currency, callback = null) {
        this.emit('emit_recent_trade', {
            exchange_currency,
            base_currency
        }, callback)
    }

    pushNotification (notificationData, callback = null) {
        this.emit('push_notification', notificationData, callback)
    }

    pushNotificationMobile (userId, type, data, cb) {
        this.emit('push_notification', {
            targetDevice: 'mobile',
            toUserId: userId,
            type,
            data
        }, cb)
    }
}

module.exports = new SocketClientToMainServer()
