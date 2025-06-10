'use strict'

const BaseModel = use('MongooseModel')
const Type = {
    OPEN: 'OPEN',
    ACTIVE: 'ACTIVE',
    MODIFY: 'MODIFY',
    MODIFY_MARGIN: 'MODIFY_MARGIN',
    CLOSE: 'CLOSE',
    MODIFY_FEE_CURRENCY: 'MODIFY_FEE_CURRENCY',
    PARTIAL_CLOSE: 'PARTIAL_CLOSE',
    ADD_VOLUME: 'ADD_VOLUME',
    REMOVE_MARGIN_FUNDING_FEE: 'REMOVE_MARGIN_FUNDING_FEE',
}
const ReasonCloseCode = {
    NORMAL: 0,
    HIT_SL: 1,
    HIT_TP: 2,
    LIQUIDATE: 3,
    HIT_LIMIT_CLOSE: 4
}

/**
 * @class FuturesOrderLog
 */
class FuturesOrderLog extends BaseModel {
    static get schemaOptions () {
        return { collection: 'futuresorderlogs' }
    }

    /**
	 * FuturesOrderLogs's schema
	 */

    static get schema () {
        return {
            orderId: {
                type: Number,
                required: true
            },
            type: {
                type: String,
                enum: Object.values(Type),
                required: true
            },
            metadata: {
                modify_price: {
                    before: Number,
                    after: Number
                },
                modify_sl: {
                    before: Number,
                    after: Number
                },
                modify_tp: {
                    before: Number,
                    after: Number
                },
				modify_margin: {
					before: Number,
					after: Number
				},
                modify_fee_currency: {
                    before: Number,
                    after: Number
                },
                sl: Number,
                tp: Number,
                price: Number,
                reason_close_code: {
                    type: Number,
                    enum: Object.values(ReasonCloseCode)
                },
                reason_close: { type: String },
                profit: { type: Number },
                open_price: { type: Number },
                child_id: { type: Number },
                side: { type: String },
                type: { type: String },
                modify_order_value: { type: Object },
                modify_leverage: { type: Object },
                modify_open_price: { type: Object },
                modify_liq_price: { type: Object },
                fee_metadata: { type: Object },
                fee_data: { type: Object },
                remove_margin: { type: Object },
                action_by: { type: String }
            }
        }
    }
}

module.exports = FuturesOrderLog.buildModel('FuturesOrderLog')

module.exports.Type = Type
module.exports.ReasonCloseCode = ReasonCloseCode
module.exports.FuturesOrderLogError = { INVALID_TYPE: 'Invalid type log order.', NOT_FOUND: 'Futures order log not found.' }
