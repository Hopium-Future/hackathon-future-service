'use strict'

const BaseModel = use('MongooseModel')

/**
 * @class VndcFuturesOrder
 */
class VndcFuturesOrder extends BaseModel {
    /**
	 * VndcFuturesOrder's schema
	 */

    static get schemaOptions () {
        return { collection: 'futureorders' }
    }

    static get schema () {
        return {
            displaying_id: Number,
            user_id: Number,
            status: Number,
            side: String,
            liquidity_broker: String,
            liquidity_user_id: Number, // Cai nay su dung cho binance
            type: String,
            symbol: String,
            price: Number,

            quantity: Number,
            executed_quantity: Number,

            equivalent_quantity: Number,
            equivalent_currency: String,
            xbt_quantity: Number,

            remain_quantity: Number,

            leverage: Number,
            sl: Number,
            tp: Number,
            fee: Number,
            fee_currency: Number,

            swap: { type: Number, default: 0 },
            swap_currency: Number,

            profit: { type: Number, default: 0 },
            raw_profit: { type: Number, default: 0 },

            margin: Number,
            margin_currency: Number,

            order_value: Number,
            order_value_currency: Number,

            bitmex_main_order_id: String,
            bitmex_sl_order_id: String,
            bitmex_tp_order_id: String,

            open_price: Number,
            opened_at: Date,

            close_price: Number,
            closed_at: Date,

            liquidity_price: Number, // Su dung cho vndc order

            reason_close: String,
            reason_close_code: Number,
            promote_program: { type: Number, default: 0 },
            // Private data
            transfer_error: { type: Number, default: 0 },
            retry_transfer_count: { type: Number, default: 0 },
            last_retry_time: Date,
            open_mode: { type: Number, default: 0 }, // Loai lenh la limit, status chuyen tu pending -> active
            open_limit_price: { type: Number, default: 0 },
            close_mode: { type: Number, default: 0 }, // Loai lenh la bat ky, status la active -> closed
            close_limit_price: { type: Number, default: 0 },
            retry_modify_limit_count: { type: Number, default: 0 },
            fee_metadata: Object, // {place_order: {value, currency}, close_order: {value, currency}}
            request_id: Object, // {place: 'Req_123456', close: 'Req_123456'}

            // Copy trade
            is_copy_trade_master: Boolean,
            copy_from: Number,
            master_id: Number,
            share_to_master: Number,

            // Notification
            notification_metadata: Object,
            last_time_check_future_point: Date,
            nami_profit: Object,
            hold_profit: Object,
            transfer_quantity: { type: Number, default: 0 },
            hold_quantity: { type: Number, default: 0 }, // So luong hold tren Nami
            dashboard_metadata: { type: Object, default: {} }, // So luong hold tren Nami
            _m: { type: Number, default: 0 }
        }
    }
}

module.exports = VndcFuturesOrder.buildModel('FutureOrder')
module.exports.Status = {
    PENDING: 0,
    ACTIVE: 1,
    CLOSED: 2
}
