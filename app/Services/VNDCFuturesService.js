const FuturesOrderLog = use('App/Models/Mongo/FuturesOrderLog')
const { Type: LogType, ReasonCloseCode, FuturesOrderLogError } = use('App/Models/Mongo/FuturesOrderLog')
const FutureOrder = use('App/Models/Futures/FuturesOrder')
const { Status } = use('App/Models/Futures/FuturesOrder')
const TransactionHistory = use('App/Models/Mongo/TransactionHistory')

const { ObjectId } = require('mongoose').Types

const { NamiFuturesOrder } = use('App/Library/Enum')

const _ = require('lodash')

async function getHistories (options = {}) {
    const {
        userId, // Filter symbol, side
        side, symbol, // Filter canceled
        // For paging
        // Filter time
        timeFrom = 0, timeTo = 0, sortField = '', sortDirection = ''
    } = options

    const page = parseInt(options.page || 1, 10)
    const pageSize = parseInt(options.pageSize || 10, 10)

    const conditions = { user_id: userId, status: NamiFuturesOrder.Status.CLOSED }

    if (timeFrom) {
        _.assign(conditions, { closed_at: { $gte: new Date(parseInt(timeFrom, 10)) } })
    }

    if (timeTo) {
        _.merge(conditions, { closed_at: { $lte: new Date(parseInt(timeTo, 10)) } })
    }

    if (side) {
        _.assign(conditions, { side })
    }

    if (symbol) {
        _.assign(conditions, { symbol })
    }

    let sort = { closed_at: 'desc', created_at: 'desc' }
    if (sortField && ['asc', 'desc'].includes(sortDirection)) {
        sort = { [sortField]: sortDirection }
    }

    const orders = await FutureOrder.find(conditions)
        .sort(sort)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .read('s')
    const total = await FutureOrder.countDocuments(conditions).read('s')

    return { orders, total }
}

async function putOrderLog (preOrder, options = {}) {
    const metadata = {}
    if (options.action_by) {
        metadata.action_by = options.action_by
    }

    switch (options.type) {
    case LogType.OPEN: {
        _.assign(metadata, { price: options.price, sl: options.sl, tp: options.tp })
        break
    }
    case LogType.MODIFY: {
        const beforePrice = _.get(preOrder, ['price']) || _.get(preOrder, ['open_price'])
        const beforeSL = _.get(preOrder, ['sl'])
        const beforeTP = _.get(preOrder, ['tp'])

        if (beforePrice !== options.price) {
            _.assign(metadata, { modify_price: { before: beforePrice, after: options.price } })
        }

        if (beforeSL !== options.sl) {
            _.assign(metadata, { modify_sl: { before: beforeSL, after: options.sl } })
        }

        if (beforeTP !== options.tp) {
            _.assign(metadata, { modify_tp: { before: beforeTP, after: options.tp } })
        }

        break
    }
    case LogType.MODIFY_MARGIN: {
        const beforeMargin = _.get(preOrder, ['margin'])
        if (beforeMargin !== options.margin) {
            _.assign(metadata, { modify_margin: { before: beforeMargin, after: options.margin } })
        }
        break
    }
    case LogType.MODIFY_FEE_CURRENCY: {
        const beforeFeeCurrency = _.get(preOrder, ['fee_metadata'])
        if (+beforeFeeCurrency.close_order.currency !== +options.fee_metadata.close_order.currency) {
            _.assign(metadata, { modify_fee_currency: { before: +beforeFeeCurrency.close_order.currency, after: +options.fee_metadata.close_order.currency } })
        }
        break
    }
    case LogType.ADD_VOLUME: {
        const beforeOrderValue = _.get(preOrder, ['order_value'])
        if (beforeOrderValue !== options.order_value) {
            _.assign(metadata, { modify_order_value: { before: beforeOrderValue, after: options.order_value } })
        }
        const beforeLeverage = _.get(preOrder, ['leverage'])
        if (beforeLeverage !== options.leverage) {
            _.assign(metadata, { modify_leverage: { before: beforeLeverage, after: options.leverage } })
        }
        const beforeMargin = _.get(preOrder, ['margin'])
        if (beforeMargin !== options.margin) {
            _.assign(metadata, { modify_margin: { before: beforeMargin, after: options.margin } })
        }
        const beforeOpenPrice = _.get(preOrder, ['open_price'])
        if (beforeOpenPrice !== options.open_price) {
            _.assign(metadata, { modify_open_price: { before: beforeOpenPrice, after: options.open_price } })
        }
        if (preOrder.liq_price !== options.liq_price) {
            _.assign(metadata, { modify_liq_price: { before: preOrder.liq_price, after: options.liq_price } })
        }
        _.assign(metadata, {
            fee_metadata: options.fee_metadata,
            fee_data: options.fee_data,
            side: options.side,
            type: options.typeOrder,
            child_id: options.child_id
        })
        break
    }
    case LogType.ACTIVE: {
        _.assign(metadata, { price: options.price })
        break
    }
    case LogType.CLOSE: {
        const reason_close = Object.keys(ReasonCloseCode)
            .find(key => ReasonCloseCode[key] === parseInt(options.reason_close_code, 10))
        _.assign(metadata, { price: options.price, reason_close_code: options.reason_close_code, reason_close })
        break
    }
    case LogType.PARTIAL_CLOSE: {
        const change_properties = ['order_value', 'margin']
        const include_properties = ['side', 'profit', 'fee_metadata', 'fee_data']
        for (const property in options) {
            if (change_properties.includes(property)) {
                _.assign(metadata, {
                    [`modify_${property}`]: {
                        before: preOrder[property],
                        after: preOrder[property] - options[property]
                    }
                })
            }
            if (include_properties.includes(property)) {
                _.assign(metadata, { [property]: options[property] })
            }
        }
        options.orderId = preOrder.displaying_id
        _.assign(metadata, { child_id: options.displaying_id, type: options.closeType, open_price: options.close_price })
        break
    }
    default:
        throw FuturesOrderLogError.INVALID_TYPE
    }

    if (!_.isEmpty(metadata)) {
        return FuturesOrderLog.create({ orderId: parseInt(options.orderId, 10), type: options.type, metadata })
    }
}

async function getListTransaction (user, options) {
    const {
        timeFrom, timeTo, category, lastId, mainBalance = 1, walletType = 2
        // limit = 20
    } = options
    const limit = 50
    const userId = user.id
    const start = Date.now()
    const conditions = { user_id: userId, wallet_type: walletType, main_balance: mainBalance }

    const AcceptCategories = [
        4, // Deposit
        723, // Withdraw
        600, 601, 602, 603, 606, 608, 609, 610, 611, 612, 801, 1019,
        662
    ]
    if (category && AcceptCategories.includes(+category)) {
        conditions.category = +category
    } else {
        conditions.category = { $in: AcceptCategories }
    }

    if (lastId) {
        conditions._id = { $lt: ObjectId(lastId) }
    }

    if (+timeFrom && +timeTo) {
        conditions.created_at = { $gte: new Date(+timeFrom), $lte: new Date(+timeTo) }
    }
    const result = await TransactionHistory.find(conditions).sort({ _id: -1 }).limit(limit + 1).read('s')
    // 	const result = await TransactionHistory.aggregate([
    // 		{ $match: conditions },
    // 		{ $sort: { _id: -1 } },
    // 		{ $limit: (limit + 1) }
    // 	])
    // ]).read('s')

    Logger.info(`VNDCFuturesService.getListTransaction time: ${Date.now() - start}`, { userId: user.id, options, conditions })
    const hasNext = result.length > limit
    return { result: result.slice(0, limit), hasNext: !!hasNext }
}

async function getOrderLogs (orderId) {
    return FuturesOrderLog.find({ orderId: parseInt(orderId, 10) })
        .sort({ createdAt: -1 })
        .lean()
        .read('s')
}

module.exports = { getHistories, putOrderLog, getOrderLogs, getListTransaction }
