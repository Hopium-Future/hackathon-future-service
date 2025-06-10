'use strict'

const Error = use("Config").get("error")
const BinanceFuturesService = use('App/Services/BinanceFuturesService')
const VNDCFuturesService = use('App/Services/VNDCFuturesService')
const _ = require('lodash')
const { v4: uuidv4 } = require('uuid')

const FuturesLeverage = use('App/Models/Futures/FuturesLeverage')
class TradeController {
    async postOrder ({ user, request, response }) {
        const requestId = uuidv4()
        try {
            const {
                symbol,
                side,
                positionSide,
                type,
                quantity,
                reduceOnly,
                price,
                newClientOrderId,
                stopPrice,
                closePosition,
                activationPrice,
                callbackRate,
                workingType,
                priceProtect,
                newOrderRespType
            } = request.all()
            const _input = request.all()
            _input.userId = user.id
            const filterError = await BinanceFuturesService.filterOrderInputApi(_input)
            Logger.info('postOrder 0', requestId, user.id, filterError, request.all())
            if (filterError) {
                return response.sendDetailedError({
                    ...filterError,
                    data: { requestId }
                })
            }

            const result = await BinanceFuturesService.newOrder(_input)
            return response.sendSuccess(result)
        } catch (error) {
            return this.handleError({ user, request, response, functionName: 'postOrder', error, requestId })
        }
    }

    async getOrder ({ user, request, response }) {
        const requestId = uuidv4()
        try {
            const _input = request.all()
            _input.userId = user.id
            const result = await BinanceFuturesService.getOrder(_input)
            return response.sendSuccess(result)
        } catch (error) {
            return this.handleError({ user, request, response, functionName: 'getOrder', error, requestId })
        }
    }

    async getOpenOrders ({ user, request, response }) {
        const requestId = uuidv4()
        try {
            const _input = request.all()
            _input.userId = user.id
            const result = await BinanceFuturesService.getOpenOrder(_input)
            return response.sendSuccess(result)
        } catch (error) {
            return this.handleError({ user, request, response, functionName: 'getOpenOrders', error, requestId })
        }
    }

    async deleteOrder ({ user, request, response }) {
        const requestId = uuidv4()
        try {
            const _input = request.all()
            _input.userId = user.id
            const result = await BinanceFuturesService.deleteOrder(_input)
            return response.sendSuccess(result)
        } catch (error) {
            return this.handleError({ user, request, response, functionName: 'deleteOrder', error, requestId })
        }
    }

    async deleteOpenOrders ({ user, request, response }) {
        const requestId = uuidv4()
        try {
            const _input = request.all()
            _input.userId = user.id
            const result = await BinanceFuturesService.deleteOpenOrders(_input)
            return response.sendSuccess(result)
        } catch (error) {
            return this.handleError({ user, request, response, functionName: 'deleteOpenOrders', error, requestId })
        }
    }

    async getUserTrade ({ user, request, response }) {
        const requestId = uuidv4()
        try {
            const _input = request.all()
            _input.userId = user.id
            const result = await BinanceFuturesService.getUserTrade(_input)
            return response.sendSuccess(result)
        } catch (error) {
            return this.handleError({ user, request, response, functionName: 'getUserTrade', error, requestId })
        }
    }

    async getIncomeHistory ({ user, request, response }) {
        const requestId = uuidv4()
        try {
            const _input = request.all()
            _input.userId = user.id
            const result = await BinanceFuturesService.getIncomeHistory(_input)
            return response.sendSuccess(result)
        } catch (error) {
            return this.handleError({ user, request, response, functionName: 'getIncomeHistory', error, requestId })
        }
    }

    async postMarginType ({ user, request, response }) {
        const requestId = uuidv4()
        try {
            const { symbol, marginType } = request.all()
            const params = {
                userId: user.id,
                symbol,
                marginType
            }
            const result = await BinanceFuturesService.setFuturesMarginType(params)
            return response.sendSuccess(result)
        } catch (e) {
            Logger.error('postMarginType:', e)
            if (Error[e?.status]) {
                return response.sendDetailedError({ ...Error[e?.status] })
            }
            return response.sendDetailedError(Error.UNKNOWN)
        }
    }

    async postPositionSide ({ user, request, response }) {
        const requestId = uuidv4()
        try {
            const { dualSidePosition } = request.all()
            const params = {
                userId: user.id,
                dualSidePosition
            }
            const result = await BinanceFuturesService.setFuturesPositionSide(params)
            return response.sendSuccess(result)
        } catch (e) {
            Logger.error('postMarginType:', e)
            if (Error[e?.status]) {
                return response.sendDetailedError({ ...Error[e?.status] })
            }
            return response.sendDetailedError(Error.UNKNOWN)
        }
    }

    async getBalance ({ user, request, response }) {
        const requestId = uuidv4()
        try {
            const params = { userId: user.id }
            const result = await BinanceFuturesService.getFuturesBalance(params)
            return response.sendSuccess(result)
        } catch (error) {
            return this.handleError({ user, request, response, functionName: 'getBalance', error, requestId })
        }
    }

    async getFuturesLeverageBracket ({ user, request, response }) {
        const requestId = uuidv4()
        try {
            const params = { userId: user.id }
            const result = await BinanceFuturesService.getFuturesUserSetting(params)
            return response.sendSuccess(result)
        } catch (error) {
            return this.handleError({ user, request, response, functionName: 'getFuturesLeverageBracket', error, requestId })
        }
    }

    async getFuturesUserSetting ({ user, request, response }) {
        const requestId = uuidv4()
        try {
            const params = { userId: user.id }
            const result = await BinanceFuturesService.getFuturesUserSetting(params)
            return response.sendSuccess(result)
        } catch (error) {
            return this.handleError({ user, request, response, functionName: 'getFuturesUserSetting', error, requestId })
        }
    }

    async postLeverage ({ user, request, response }) {
        const requestId = uuidv4()
        try {
            const { symbol, leverage } = request.all()
            const params = {
                userId: user.id,
                symbol,
                leverage: +leverage
            }
            const result = await FuturesLeverage.setFutureLeverage(params)
            return response.sendSuccess(result)
        } catch (error) {
            return this.handleError({ user, request, response, functionName: 'postLeverage', error, requestId })
        }
    }

    async getLeverage ({ user, request, response }) {
        const requestId = uuidv4()
        try {
            const { symbol } = request.all()
            const result = await FuturesLeverage.getFutureLeverageCached(user.id, symbol)
            return response.sendSuccess(result)
        } catch (error) {
            return this.handleError({ user, request, response, functionName: 'getLeverage', error, requestId })
        }
    }

    async postPositionMargin ({ user, request, response }) {
        const requestId = uuidv4()
        try {
            const _input = request.all()
            _input.userId = user.id
            const result = await BinanceFuturesService.putPositionMargin(_input)
            return response.sendSuccess(result)
        } catch (error) {
            return this.handleError({ user, request, response, functionName: 'postPositionMargin', error, requestId })
        }
    }

    async getPosition ({ user, request, response }) {
        const requestId = uuidv4()
        try {
            const _input = request.all()
            _input.userId = user.id
            const result = await BinanceFuturesService.getPosition(_input)
            return response.sendSuccess(result)
        } catch (error) {
            return this.handleError({ user, request, response, functionName: 'getPosition', error, requestId })
        }
    }

    async getVNDCOrderHistories ({ user, request, response }) {
        const requestId = uuidv4()
        try {
            const _input = request.all()
            _input.userId = user.id
            const result = await VNDCFuturesService.getHistories(_input)
            return response.sendSuccess(result)
        } catch (error) {
            return this.handleError({ user, request, response, functionName: 'getVNDCOrderHistories', error, requestId })
        }
    }

    async updateVNDCOrder ({ user, request, response }) {
        const requestId = uuidv4()
        try {
            const _input = request.all()
            const result = await VNDCFuturesService.putOrderLog(_input)
            return response.sendSuccess(result)
        } catch (error) {
            return this.handleError({ user, request, response, functionName: 'updateVNDCOrder', error, requestId })
        }
    }

    async getOrderLogs ({ user, request, response, params }) {
        const requestId = uuidv4()
        try {
            const _input = params.id
            const result = await VNDCFuturesService.getOrderLogs(_input)
            return response.sendSuccess(result)
        } catch (error) {
            return this.handleError({ user, request, response, functionName: 'updateVNDCOrder', error, requestId })
        }
    }

    handleError ({ user, request, response, functionName, error, requestId }) {
        console.error(`FUTURE ${functionName} ERROR: user_id=${user ? user.id : ''}, requestId=${requestId} , params=${JSON.stringify(request.all())}`, error)
        Logger.error(`FUTURE ${functionName} ERROR: user_id=${user ? user.id : ''}, requestId=${requestId} , params=${JSON.stringify(request.all())}`, error)
        if (Error[error?.status]) {
            return response.sendDetailedError({ ...Error[error?.status] })
        }
        if (error?.code && error?.msg) {
            return response.sendDetailedError({ code: error?.code, message: error?.msg, data: { requestId } })
        }
        return response.sendDetailedError(Error.UNKNOWN)
    }
}

module.exports = TradeController
