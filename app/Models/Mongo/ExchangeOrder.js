'use strict'

const BaseModel = use('MongooseModel')
/**
 * @class ExchangeOrderV1
 */
class ExchangeOrderV1 extends BaseModel {
    static get schemaOptions () {
        return { collection: 'exchangeorders' }
    }

    /**
     * ExchangeOrderV1's schema
     */

    static get schema () {
        return {
            displaying_id: Number,
            user_id: Number,
            amount: Number,
            created_at: Date,
            updated_at: Date,
            remain_amount: Number,
            exchange_rate: Number,
            status: Number,
            action: Number,
            base_currency: Number,
            exchange_currency: Number,
            mode: Number,
            stop_exchange_rate: Number,
            stop_exchange_type: Number,
            comment: String,
            is_bot: Number,
            fee: { type: Number, default: 0 },
            liquidity_status: { type: Number, default: 0 }, // Trang thai chuyen lenh
            liquidity_amount: { type: Number, default: 0 }, // Khoi luong da liquidity
            liquidity_order_id: { type: Number, default: 0 }, // Khoi luong da liquidity
            liquidity_usdt_rate: { type: Number, default: 0 }, // Ti gia khi convert sang usdt
            liquidity_origin_rate: { type: Number, default: 0 } // Ti gia nguoi dung dat theo vndc
        }
    }
}

module.exports = ExchangeOrderV1.buildModel('ExchangeOrderV1')
