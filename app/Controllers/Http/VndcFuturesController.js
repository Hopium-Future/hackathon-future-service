'use strict'

const FuturePrice = use('App/Models/Future/FuturePrice')
const _ = require('lodash')
const { v4: uuidv4 } = require('uuid')
const crypto = require('crypto')

const { NamiFuturesOrder: NamiFuturesOrderEnum } = use("App/Library/Enum")
const NamiFuturesService = use('App/Services/NamiFuturesService')
const Error = use("Config")
    .get("error")
const Promise = require('bluebird')

const Throttle = use('Throttle')
const FutureOrderMongo = use('App/Models/Futures/FuturesOrder')
const Logger = use('Logger')
const VndcFutureOrder = use('App/Models/VndcFuture/VndcFutureOrder')
const UserPreferencesServices = use('App/Services/UserPreferencesService')
const VNDCFuturesService = use('App/Services/VNDCFuturesService')
// const sentry = use('Sentry')
const BANNED_FUTURES_USER = use('Env')
    .get('BANNED_FUTURES_USER', '')
const FuturesConfigMongo = use('App/Models/Config/FuturesConfig')
const FutureOrder = use('App/Models/Future/FutureOrder')
const FundingRateService = use('App/Services/FundingRateService')
const FuturesOrderCacheRedis = use('App/Models/VndcFuture/CacheRedis')
const User = use('App/Models/User')
const UserServices = use('App/Services/UserService')
const FuturesService = use('App/Services/FuturesService')

class VndcFuturesController {
    async getFavoriteSymbols ({ user, request, response }) {
        const { tradingMode } = request.get()
        const data = await UserPreferencesServices.get(user.id, UserPreferencesServices.Keys.FavoriteSymbol)
        const symbols = _.get(data, tradingMode, [])
        response.sendSuccess(symbols)
    }

    checkIsBannedFuturesUser (userId) {
        const bannedUsers = BANNED_FUTURES_USER !== '' ? BANNED_FUTURES_USER.split(',')
            .map(item => +item) : []
        return bannedUsers.indexOf(userId) >= 0
    }

    validateSignature (userCode, timestamp, signature) {
        if (userCode && timestamp && signature && Math.abs(Date.now() - timestamp) < 10000) {
            const md5 = crypto.createHash('md5').update(userCode.slice(0, 10) + timestamp).digest('hex')
            return md5 === signature
        }
        return false
    }

    handleThrottle ({ user, request, response }) {
        return null
        if (request.method() === 'GET') {
            Throttle.resource(`${request.method()}:${request.url()}:${user.id}`, 120, 60, 10, 10 * 60)
        } else {
            Throttle.resource(`${request.method()}:${request.url()}:${user.id}`, 60, 60, 10, 10 * 60)
        }
        if (!Throttle.isBanned()) {
            throw Error.TOO_MANY_REQUESTS
        }
        // Check rate limit
        if (!Throttle.attempt()) {
            Throttle.incrementExpiration()
            throw Error.TOO_MANY_REQUESTS
        }
    }

    async getOrder ({ user, request, response }) {
        const requestId = uuidv4()
        try {
            this.handleThrottle({ user, request, response })
            let {
                status,
                pageSize,
                page,
                sorted,
                side,
                symbol,
                timeFrom = 0,
                timeTo = 0,
                sortField = '',
                sortDirection = '',
                marginCurrency
            } = request.get()
            page = +page || 0
            pageSize = +pageSize || 50
            sorted = +sorted || []
            status = +status
            timeFrom = +timeFrom
            timeTo = +timeTo
            let orders = []
            let pagesCount = 0
            let total = 0
            if (status === NamiFuturesOrderEnum.GroupStatus.OPENING) {
                // orders = await NamiFuturesService.getOpeningOrder(user, { status, page, pageSize, sorted })

                // Get opening order by redis (new structure data)
                if (!user) throw Error.UNKNOWN
                orders = await FuturesOrderCacheRedis.getOpenOrders({ user_id: user.id })
                orders = orders?.filter(e => (!marginCurrency || +e.margin_currency === +marginCurrency)) ?? []
            } else if (status === NamiFuturesOrderEnum.GroupStatus.HISTORY) {
                const {
                    orders: _orders,
                    pageCount: _pageCount,
                    total: _total
                } = await NamiFuturesService.getHistoryOrder(user, {
                    page,
                    pageSize,
                    side,
                    symbol,
                    timeFrom,
                    timeTo,
                    sortField,
                    sortDirection,
                    marginCurrency
                })
                orders = _orders
                pagesCount = _pageCount
                total = _total
            }

            return response.sendSuccess({ orders, pagesCount, total })
        } catch (e) {
            return this.handleError({ user, request, response, functionName: 'getOrder', error: e })
        }
    }

    async getOrderData ({ request, response }) {
        try {
            const { list_displaying_id } = request.get()
            if (!list_displaying_id) {
                return response.sendError()
            }

            const ids = list_displaying_id.split(',')
            const result = []
            for (let i = 0; i < ids.length; i++) {
                const order = await VndcFutureOrder.getOrderById(ids[i])
                if (order) {
                    result.push(order)
                }
            }
            return response.sendSuccess(result)
        } catch (e) {
            console.log(e)
            return response.sendError()
        }
    }

    async putOrderData ({ request, response }) {
        const requestId = uuidv4()
        Logger.error(`FUTURE putOrderData: requestId=${requestId} , params=${JSON.stringify(request.all())}`)
        try {
            const { displaying_id, metadata } = request.post()

            if (await VndcFutureOrder.checkIsProcessing(displaying_id))
                throw Error.TOO_MANY_REQUESTS
            await VndcFutureOrder.setIsProcessing({ displaying_id })

            const order = await VndcFutureOrder.getOrderRedis(displaying_id)
            if (!order) return
            const parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata
            order.metadata = { ...order.metadata, ...parsedMetadata }
            await FuturesOrderCacheRedis.upsertOrderRedis(order)

            await VndcFutureOrder.removeProcessing(displaying_id)
            return response.sendSuccess()
        } catch (e) {
            console.log(e)
            return this.handleError({ request, response, functionName: 'putOrderData', error: e, requestId })
        }
    }

    async getHistoryOrder ({ user, request, response }) {
        const requestId = uuidv4()
        try {
            this.handleThrottle({ user, request, response })
            let {
                pageSize,
                page,
                side,
                marginCurrency,
                reasonCloseCode,
                range
            } = request.get()
            page = +page || 0
            pageSize = +pageSize || 50
            if (range && ![1, 7, 30].includes(+range)) {
                range = null
            }
            const { orders, hasNext } = await NamiFuturesService.getHistoryOrderMobile(user, {
                page,
                pageSize,
                side,
                marginCurrency,
                reasonCloseCode,
                range
            })

            return response.sendSuccess({ orders, hasNext })
        } catch (e) {
            return this.handleError({ user, request, response, functionName: 'getOrder', error: e })
        }
    }

    async getOrderDetail ({ user, request, response }) {
        try {
            this.handleThrottle({ user, request, response })
            const { orderId } = request.get()
            if (!orderId) {
                return response.sendError()
            }
            const order = await VndcFutureOrder.getOrderDetail(user, orderId)
            if (!order) {
                throw Error.NOT_FOUND_ORDER
            }
            return response.sendSuccess(order)
        } catch (e) {
            console.log(e)
            return response.sendError()
        }
    }

    async getClosedOrderDetail ({ user, request, response }) {
        try {
            this.handleThrottle({ user, request, response })
            const { orderId } = request.get()
            if (!orderId) {
                return response.sendError()
            }
            let order = await VndcFutureOrder.getOrderDetail(user, orderId)
            if (order?.status !== 2) {
                // retry get order detail
                await Promise.delay(500)
                order = await VndcFutureOrder.getOrderDetail(user, orderId)
            }
            if (order?.status !== 2) {
                throw Error.NOT_FOUND_ORDER
            }
            return response.sendSuccess(order)
        } catch (e) {
            console.log(e)
            return response.sendError()
        }
    }

    async getSingleOrder ({ user, request, response }) {
        try {
            this.handleThrottle({ user, request, response })
            const { orderId } = request.get()
            if (!orderId) {
                return response.sendError()
            }
            let order = null
            order = await FutureOrderMongo.findOne({ displaying_id: orderId, user_id: user.id }).read('s')
            return response.sendSuccess(order)
        } catch (e) {
            return response.sendError()
        }
    }

    async postOrder ({ user, request, response, isMobileApp }) {
        const requestId = uuidv4()
        Logger.error(`FUTURE postOrder: user_id=${user ? user.id : ''}, requestId=${requestId} , params=${JSON.stringify(request.all())}`)
        try {
            if (process.env.PENDING_UPGRADE === '1' && ![78].includes(user.id)) throw Error.UNKNOWN

            this.handleThrottle({ user, request, response })
            if (this.checkIsBannedFuturesUser(user.id)) throw Error.MAX_NUM_ORDERS
            const input = request.all()
            const clientRequestId = request.all()?.requestId
            input.requestId = requestId

            if (!clientRequestId) throw Error.TOO_MANY_REQUESTS

            const fundingError = await FundingRateService.checkRejectByFundingRate(user, input)
            console.log('FundingRateService.fundingError', { user_id: user.id, input, fundingError })
            if (fundingError && fundingError.reject) {
                if (fundingError.delay > 0) await Promise.delay(fundingError.delay)
                return this.handleError({
                    user,
                    request,
                    response,
                    functionName: 'postOrder',
                    error: fundingError?.error,
                    requestId
                })
            }
            const filterError = await VndcFutureOrder.precheckPlaceOrder(user, input)
            if (filterError) throw filterError
            // Claim request id
            if (clientRequestId) {
                const {
                    lastReasonClose,
                    errorCode
                } = await VndcFutureOrder.claimFuturesPlaceOrderLock(user.id, clientRequestId)
                if (errorCode) {
                    Logger.error(`lock_futures_order_reject placeOrder Lệnh #${clientRequestId} processKey: ${processKey} đang xử lý ${lastReasonClose}`)
                    return response.sendSuccess()
                }
            }
            const processKey = `place_order:${Math.floor(Date.now() / 2000)}`
            // Rate limit
            const {
                lastReasonClose,
                errorCode: placeErrorCode
            } = await VndcFutureOrder.claimFuturesPlaceOrderLock(user.id, processKey)
            if (placeErrorCode) {
                Logger.error(`lock_futures_order_reject placeOrder Lệnh #${clientRequestId} processKey: ${processKey} đang xử lý ${lastReasonClose}`)
                throw Error.TOO_MANY_REQUESTS
            }

            const data = await VndcFutureOrder.addToQueue(user, 'place', input)
            Logger.notice('FUTURE_PLACE_ORDER_REQUEST', {
                log_type: 'FUTURE_PLACE_ORDER_REQUEST',
                isMobileApp,
                user_id: user.id,
                data
            })
            return response.sendSuccess(data)
        } catch (error) {
            console.log(error)
            return this.handleError({ user, request, response, functionName: 'postOrder', error, requestId })
        }
    }

    async putOrder ({ user, request, response }) {
        const requestId = uuidv4()
        Logger.error(`FUTURE putOrder: user_id=${user ? user.id : ''}, requestId=${requestId} , params=${JSON.stringify(request.all())}`)
        try {
            if (process.env.PENDING_UPGRADE === '1' && ![78].includes(user.id)) throw Error.UNKNOWN
            this.handleThrottle({ user, request, response })
            const { displaying_id, sl, tp, price } = request.post()
            const order = await VndcFutureOrder.getOrderRedis(displaying_id)
            if (!order || order.user_id !== user.id) throw Error.NOT_FOUND_ORDER
            Logger.info('putOrder', user.id, request.post(), order)
            if (!VndcFutureOrder.checkIsBetaVndcFuturesUser(user.id)) {
                throw Error.PRICE_CHANGED
            }
            if (await VndcFutureOrder.checkIsProcessing(displaying_id)) throw Error.TOO_MANY_REQUESTS
            await VndcFutureOrder.setIsProcessing({ displaying_id })
            await VndcFutureOrder.modifyOrder(user, { displaying_id, sl, tp, price })
            return response.sendSuccess()
        } catch (e) {
            return this.handleError({ user, request, response, functionName: 'putOrder', error: e, requestId })
        }
    }

    // closeType: Market, Limit, Stop
    async partialCloseOrderV2 ({ user, request, response }) {
        // this will change Margin Size Volume UnPnL
        const requestId = uuidv4()
        Logger.error(`FUTURE partialCloseOrder v2: user_id=${user ? user.id : ''}, requestId=${requestId} , params=${JSON.stringify(request.all())}`)
        try {
            if (process.env.PENDING_UPGRADE === '1' && ![78].includes(user.id)) throw Error.UNKNOWN
            this.handleThrottle({ user, request, response })
            const input = request.post()
            if (input?.closeType && input?.closeType === 'Stop Market') {
                input.closeType = 'Stop'
            }
            const { displaying_id, closeVolume, closeQuantity, price, closeType, useQuoteQty = false } = input
            if ((closeVolume && closeQuantity) || (!closeVolume && !closeQuantity)) throw Error.INVALID_CLOSE_VOLUME
            if (await VndcFutureOrder.checkIsProcessing(displaying_id)) throw Error.TOO_MANY_REQUESTS
            const order = await VndcFutureOrder.getOrderRedis(displaying_id)
            if (!order || order.user_id !== user.id) {
                throw Error.NOT_FOUND_ORDER
            }
            if (!VndcFutureOrder.checkIsBetaVndcFuturesUser(user.id)) {
                throw Error.PRICE_CHANGED
            }
            if (order.status !== 1) throw Error.INVALID_ORDER_STATUS
            const config = await FuturesConfigMongo.getOneCached({ symbol: order.symbol })
            let decimal = FutureOrder.getDecimalScale(+(_.find(config.filters, { filterType: 'PRICE_FILTER' }).tickSize))
            if (!decimal) decimal = 0
            if (closeQuantity && closeQuantity > 1) {
                throw Error.INVALID_CLOSE_VOLUME
            }
            if (closeVolume && +order.order_value.toFixed(decimal) < +closeVolume.toFixed(decimal)) {
                throw Error.INVALID_CLOSE_VOLUME
            }

            const totalOpenedValue = await VndcFutureOrder.sumTotalLimitPartialCloseOrders(order.user_id, displaying_id)
            if ((totalOpenedValue + closeVolume) > order.order_value) throw Error.INVALID_CLOSE_VOLUME

            await VndcFutureOrder.setIsProcessing({ displaying_id: order.displaying_id })
            const filterStatus = await VndcFutureOrder.filterOrderInput({
                user_id: user.id,
                side: order.side === "Buy" ? "Sell" : "Buy",
                type: closeType,
                symbol: order.symbol,
                price,
                quantity: closeQuantity,
                quoteQty: closeVolume,
                useQuoteQty,
                isClosePosition: true
            })
            if (filterStatus) throw filterStatus

            const data = await VndcFutureOrder.addToQueue(user, 'partial_close', input)

            await VndcFutureOrder.removeProcessing(order.displaying_id)
            Logger.notice('FUTURE_PARTIAL_CLOSE_ORDER_REQUEST', {
                log_type: 'FUTURE_PARTIAL_CLOSE_ORDER_REQUEST',
                user_id: user.id,
                input
            })
            return response.sendSuccess()
        } catch (error) {
            return this.handleError({ user, request, response, functionName: 'partialCloseOrderV2', error, requestId })
        }
    }

    async deleteOrder ({ user, request, response, isMobileApp, apiVersion }) {
        const requestId = uuidv4()
        Logger.error(`FUTURE deleteOrder: user_id=${user ? user.id : ''}, requestId=${requestId} , params=${JSON.stringify(request.all())}`)
        try {
            if (process.env.PENDING_UPGRADE === '1' && ![78].includes(user.id)) throw Error.UNKNOWN
            this.handleThrottle({ user, request, response })
            const { displaying_id, special_mode, type } = request.post()
            const order = await VndcFutureOrder.getOrderRedis(displaying_id)
            if (!order) throw Error.NOT_FOUND_ORDER

            if (type === 'CANCEL_ORDER' && order.status === 1) {
                throw Error.ORDER_ALREADY_ACTIVE
            }
            Logger.info('deleteOrder', user.id, request.post(), order)
            if (!VndcFutureOrder.checkIsBetaVndcFuturesUser(user.id)) {
                throw Error.PRICE_CHANGED
            }
            const inputCloseOrder = { displaying_id, special_mode }
            if (await VndcFutureOrder.checkIsProcessing(displaying_id)) throw Error.TOO_MANY_REQUESTS
            await VndcFutureOrder.setIsProcessing({ displaying_id })
            await VndcFutureOrder.addToQueue(user, 'close', inputCloseOrder)
            VndcFutureOrder.removeProcessing(displaying_id)
            Logger.notice('FUTURE_CLOSE_ORDER_REQUEST', {
                log_type: 'FUTURE_CLOSE_ORDER_REQUEST',
                isMobileApp,
                user_id: user.id
            })
            return response.sendSuccess({ requestId })
        } catch (e) {
            return this.handleError({ user, request, response, functionName: 'deleteOrder', error: e, requestId })
        }
    }

    async findAllOrderByCondition ({
        user,
        request,
        response,
        isMobileApp
    }) {
        try {
            if (process.env.PENDING_UPGRADE === '1' && ![78].includes(user.id)) throw Error.UNKNOWN
            this.handleThrottle({
                user,
                request,
                response
            })
            const { type, pair, product, mode } = request.post()
            Logger.info('closeAllOrder', user.id, request.post())
            const closingOrders = await VndcFutureOrder.findAllOrderByCondition(user, type, pair, product, { mode })
            Logger.notice('FUTURE_FIND_ALL_ORDER_REQUEST', {
                log_type: 'FUTURE_FIND_ALL_ORDER_REQUEST',
                isMobileApp,
                user_id: user.id
            })
            return response.sendSuccess(closingOrders)
        } catch (e) {
            return this.handleError({
                user,
                request,
                response,
                functionName: 'deleteOrder',
                error: e
            })
        }
    }

    async closeAllOrderByCondition ({
        user,
        request,
        response,
        isMobileApp
    }) {
        try {
            if (process.env.PENDING_UPGRADE === '1' && ![78].includes(user.id)) throw Error.UNKNOWN
            this.handleThrottle({ user, request, response })
            const { type, pair, product, mode } = request.post()
            Logger.info('closeAllOrder', user.id, request.post())
            const closingOrders = await VndcFutureOrder.closeAllOrderByCondition(user, type, pair, product, { mode })
            Logger.notice('FUTURE_CLOSE_ALL_ORDER_REQUEST', {
                log_type: 'FUTURE_CLOSE_ALL_ORDER_REQUEST',
                isMobileApp,
                user_id: user.id
            })
            return response.sendSuccess(closingOrders)
        } catch (e) {
            return this.handleError({ user, request, response, functionName: 'deleteOrder', error: e })
        }
    }

    async closeAllOrderByLoan ({ request, response }) {
        try {
            const { userId } = request.post()
            if (process.env.PENDING_UPGRADE === '1' && ![78].includes(userId)) throw Error.UNKNOWN
            this.handleThrottle({ user: { id: userId }, request, response })
            Logger.info('closeAllOrderByLoan', userId, request.post())
            const closingOrders = await VndcFutureOrder.closeAllOrderByLoan({ id: +userId })
            return response.sendSuccess(closingOrders)
        } catch (e) {
            return this.handleError({ user: { id: null }, request, response, functionName: 'deleteOrder', error: e })
        }
    }

    async countOpenOrder ({ request, response }) {
        try {
            const { userId } = request.get()
            const count = await VndcFutureOrder.countOrders({ id: +userId })
            return response.sendSuccess(count)
        } catch (e) {
            return this.handleError({ user: { id: null }, request, response, functionName: 'deleteOrder', error: e })
        }
    }

    async countUserOpenOrder ({ user, request, response }) {
        try {
            const count = await VndcFutureOrder.countOrders({ id: user.id })
            return response.sendSuccess(count)
        } catch (e) {
            return this.handleError({ user: { id: null }, request, response, functionName: 'deleteOrder', error: e })
        }
    }

    async getRecentTrade ({ request, response }) {
        try {
            const { symbol } = request.get()
            if (!symbol) throw Error.BAD_SYMBOL
            const result = await FuturePrice.getRecentTrade(symbol)
            return response.sendSuccess(result)
        } catch (e) {
            return this.handleError({ user: null, request, response, functionName: 'getRecentTrade', error: e })
        }
    }

    async editMargin ({ user, request, response }) {
        const requestId = uuidv4()
        Logger.error(`FUTURE editMargin: user_id=${user ? user.id : ''}, requestId=${requestId} , params=${JSON.stringify(request.all())}`)
        try {
            if (process.env.PENDING_UPGRADE === '1' && ![78].includes(user.id)) throw Error.UNKNOWN
            this.handleThrottle({ user, request, response })
            const { displaying_id, margin_change, type } = request.post()
            const order = await VndcFutureOrder.getOrderRedis(displaying_id)
            if (!order || order.user_id !== +user.id) throw Error.NOT_FOUND_ORDER
            Logger.info('editMargin', user.id, request.post(), order)
            if (await VndcFutureOrder.checkIsProcessing(displaying_id)) throw Error.TOO_MANY_REQUESTS
            await VndcFutureOrder.setIsProcessing({ displaying_id })
            await VndcFutureOrder.editMarginOrder(user, { displaying_id, margin_change, type })
            return response.sendSuccess()
        } catch (e) {
            return this.handleError({ user, request, response, functionName: 'editMargin', error: e, requestId })
        }
    }

    async changeFeeCurrencyOrder ({ user, request, response }) {
        const requestId = uuidv4()
        Logger.error(`FUTURE changeFeeCurrencyOrder: user_id=${user ? user.id : ''}, requestId=${requestId} , params=${JSON.stringify(request.all())}`)
        try {
            if (process.env.PENDING_UPGRADE === '1' && ![78].includes(user.id)) throw Error.UNKNOWN
            this.handleThrottle({ user, request, response })
            const { displaying_id, currency_change, set_default } = request.post()
            const order = await VndcFutureOrder.getOrderRedis(displaying_id)
            if (!order || order.user_id !== +user.id) {
                throw Error.NOT_FOUND_ORDER
            }
            Logger.info('changeFeeCurrencyOrder', user.id, request.post(), order)
            if (+order.fee_metadata?.close_order?.currency === +currency_change && !set_default) {
                return response.sendSuccess()
            }
            if (await VndcFutureOrder.checkIsProcessing(displaying_id)) throw Error.TOO_MANY_REQUESTS
            await VndcFutureOrder.setIsProcessing({ displaying_id })
            await VndcFutureOrder.changeFeeCurrencyOrder(user, { displaying_id, currency_change, set_default })
            return response.sendSuccess()
        } catch (e) {
            return this.handleError({
                user,
                request,
                response,
                functionName: 'changeFeeCurrencyOrder',
                error: e,
                requestId
            })
        }
    }

    async dcaOrder ({ user, request, response }) {
        const requestId = uuidv4()
        Logger.error(`FUTURE dcaOrder: user_id=${user ? user.id : ''}, requestId=${requestId} , params=${JSON.stringify(request.all())}`)
        try {
            if (process.env.PENDING_UPGRADE === '1' && ![78].includes(user.id)) throw Error.UNKNOWN

            this.handleThrottle({ user, request, response })
            const input = request.all()
            const order = await VndcFutureOrder.getOrderRedis(input.displaying_id)
            if (!order || order.user_id !== +user.id) throw Error.NOT_FOUND_ORDER
            if (input?.type !== VndcFutureOrder.Type.MARKET) throw Error.INVALID_ORDER_TYPE

            const fundingRateInput = { ...input, symbol: order.symbol }
            const fundingError = await FundingRateService.checkRejectByFundingRate(user, fundingRateInput)
            console.log('FundingRateService.fundingError', { user_id: user.id, input: fundingRateInput, fundingError })
            if (fundingError && fundingError.reject) {
                if (fundingError.delay > 0) await Promise.delay(fundingError.delay)
                return this.handleError({
                    user,
                    request,
                    response,
                    functionName: 'postOrder',
                    error: fundingError?.error,
                    requestId
                })
            }
            Logger.info('dcaOrder', user.id, request.post(), order)
            if (await VndcFutureOrder.checkIsProcessing(input.displaying_id)) throw Error.TOO_MANY_REQUESTS
            await VndcFutureOrder.setIsProcessing({ displaying_id: input.displaying_id })
            await VndcFutureOrder.dcaOrder(user, input, order)
            return response.sendSuccess()
        } catch (e) {
            return this.handleError({ user, request, response, functionName: 'dcaOrder', error: e, requestId })
        }
    }

    async getListTransaction ({ user, request, response }) {
        const requestId = uuidv4()
        Logger.error(`FUTURE getListTransaction: user_id=${user ? user.id : ''}, requestId=${requestId} , params=${JSON.stringify(request.all())}`)
        try {
            const result = await VNDCFuturesService.getListTransaction(user, request.all())
            return response.sendSuccess(result)
        } catch (e) {
            return this.handleError({ user, request, response, functionName: 'editMargin', error: e, requestId })
        }
    }

    async getFundingRateHistory ({ user, request, response }) {
        const requestId = uuidv4()
        Logger.error(`FUTURE getFundingRateHistory: user_id=${user ? user.id : ''}, requestId=${requestId} , params=${JSON.stringify(request.all())}`)
        try {
            const {
                symbol,
                page = 0,
                pageSize = 20
            } = request.get()
            if (!symbol) {
                throw Error.BAD_SYMBOL
            }
            const result = await FundingRateService.getFundingRateHistory(symbol, page * pageSize, +pageSize)
            return response.sendSuccess(result)
        } catch (e) {
            return this.handleError({
                user,
                request,
                response,
                functionName: 'getFundingRateHistory',
                error: e,
                requestId
            })
        }
    }

    handleError ({ user, request, response, functionName, error, requestId }) {
        Logger.error(`FUTURE ${functionName} ERROR: user_id=${user ? user.id : ''}, requestId=${requestId} , params=${JSON.stringify(request.all())}`, error)
        _.set(error, 'data.requestId', requestId)
        if (Error[error?.status]) {
            return response.sendDetailedError(error)
        }
        if (error?.code && error?.message) {
            return response.sendDetailedError({ code: error?.code, message: error?.message, data: { requestId } })
        }
        return response.sendDetailedError(Error.UNKNOWN)
    }
}

module.exports = VndcFuturesController
