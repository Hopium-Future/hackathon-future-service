'use strict'

const BaseModel = use('MongooseModel')

/**
 * @class FuturesOrder
 */
class FuturesOrder extends BaseModel {
    static boot ({ schema }) {
        // Hooks:
        schema.pre('save', async function(next) {
            this.updated_at = new Date()
        })
    }

    static get timestamps () {
        return false
    }

    static get schemaOptions () {
        return {
            collection: 'futureorders',
            timestamps: { updatedAt: 'updated_at' }
        }
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

            initial_margin: Number,
            margin: Number,
            margin_currency: Number,
            maintenance_margin: Number,

            order_value: Number,
            order_value_currency: Number,

            // For analytics
            // Lệnh DCA thì chỉ cần open_order_value, open_fee_metadata
            // Lệnh đóng từng phần thì chỉ cần close_order_value, open_fee_metadata
            // Lệnh bình thường sẽ có cả 2 thông số này
            open_order_value: { type: Number, default: 0 },
            open_fee_metadata: Object, // {value, currency}
            close_order_value: { type: Number, default: 0 },
            close_fee_metadata: Object, // {value, currency}

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

            // Notification
            notification_metadata: Object,
            last_time_check_future_point: Date,
            nami_profit: Object,
            hold_profit: Object,
            transfer_quantity: { type: Number, default: 0 },
            hold_quantity: { type: Number, default: 0 }, // So luong hold tren Nami
            dashboard_metadata: { type: Object, default: {} }, // So luong hold tren Nami
            _m: { type: Number, default: 0 },
            _b: { type: Boolean, default: false },
            promotion_category: { type: Number, default: 0 }, // Mark promotion
            user_category: { type: Number, default: 0 },
            metadata: {
                is_bot: Number, // 1: Bot Nao Futures
                nid: Number, // Nao Displaying ID
                is_share_post: Number, // 1: already share as post
                follow_order_id: Number,
                caller_user_id: Number,
                side: String,
                partial_close_metadata: { type: Object }, // Du lieu dong lenh 1 phan
                dca_order_metadata: { type: Object } // Du lieu them volume
            },
            main_order_closed_at: Date,
            origin_order_value: Number,
            pending_swap: { type: Number, default: 0 },
            fee_data: Object,
            volume_data: Object,
            funding_fee: {
                total: { type: Number, default: 0 },
                balance: { type: Number, default: 0 },
                margin: { type: Number, default: 0 }
            },
            created_at: { type: Date, default: new Date() },
            open_platform: String,
            close_platform: String,
            partner_type: { type: Number, default: 0 },
            is_liquidation_loan: { type: Boolean },
            user_metadata: {
                username: String,
                photo_url: String
            },

            // Feed
            share_to_master: Number,

            profit_metadata: {
                usdt: { type: Number, default: 0 },
                loan: { type: Number, default: 0 },
            }
        }
    }
}

module.exports = FuturesOrder.buildModel('FuturesOrder')
