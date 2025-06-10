'use strict'

const BaseModel = use('MongooseModel')
const Mongoose = use('Mongoose')
/**
 * @class ExchangeOrderHistoryV1
 */
class ExchangeOrderHistoryV1 extends BaseModel {
    static get schemaOptions () {
        return { collection: 'exchangeorderhistories' }
    }

    /**
     * ExchangeOrderHistoryV1's schema
     */
    static get schema () {
        return {
            displaying_id: String,
            request_order_id: String,
            request_user_id: Number,
            created_at: Date,
            updated_at: Date,
            order_id: String,
            order_displaying_id: Number,
            user_id: Number,
            exchange_amount: Number,
            base_amount: Number,
            exchange_rate: Number,
            exchange_currency: Number,
            base_currency: Number,
            fee: Number,
            fee_currency: { type: Number, default: 0 },
            status: Number,
            mode: Number,
            action: Number,
            order_action: Number,
            order_stop_exchange_rate: Number,
            order_stop_exchange_type: Number,
            comment: String,
            is_bot: { type: Number, default: 0 },
            buyer_lock: { type: Object, default: {} }
        }
    }
}

module.exports = ExchangeOrderHistoryV1.buildModel('ExchangeOrderHistoryV1')
