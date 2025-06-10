'use strict'

const Error = use("Config")
    .get("error")
const FuturesConfig = use("App/Models/Config/FuturesConfig")
const AssetConfig = use('App/Models/Config/AssetConfig')
const UserPreferencesServices = use('App/Services/UserPreferencesService')
const FuturesLeverage = use('App/Models/Futures/FuturesLeverage')
const FuturesService = use('App/Services/FuturesService')
const VndcFutureFee = use('App/Models/VndcFuture/VndcFutureFee')
const _ = require("lodash")
const bb = require('bluebird')

class FuturesController {
    async postLeverage ({
        user,
        request,
        response
    }) {
        try {
            const {
                symbol,
                leverage
            } = request.all()
            const result = await FuturesLeverage.setFutureLeverage({ userId: user.id, symbol, leverage })
            return response.sendSuccess(result)
        } catch (e) {
            return response.sendDetailedError(Error.UNKNOWN)
        }
    }

    async getLeverage ({
        user,
        request,
        response
    }) {
        try {
            const { symbol } = request.all()
            const result = await FuturesLeverage.getFutureLeverageCached(user.id, symbol)
            return response.sendSuccess(result)
        } catch (e) {
            return response.sendDetailedError(Error.UNKNOWN)
        }
    }

    async getConfig ({
        user,
        request,
        response
    }) {
        try {
            const filter = { status: { $in: ["TRADING", "MAINTAIN", "PENDING"] } }
            const { symbol } = request.all()
            if (_.isString(symbol) && symbol.length) {
                filter.symbol = symbol
            }

            const config = await FuturesConfig.getListCached(filter, {
                project: {
                    _id: 0,
                    created_at: 0,
                    updated_at: 0,
                    __v: 0
                }
            })
            return response.sendSuccess(config)
        } catch (e) {
            return response.sendDetailedError(Error.UNKNOWN)
        }
    }

    async getAssetConfig ({ user, request, response }) {
        try {
            const filter = {}
            const { assetCode, id } = request.all()
            if (_.isString(assetCode) && assetCode.length) {
                filter.assetCode = assetCode
            }
            if (_.isNumber(+id) && +id > 0) {
                filter.id = +id
            }
            const config = await AssetConfig.getListCached(filter, { project: { _id: 0, created_at: 0, updated_at: 0, __v: 0 } })
            return response.sendSuccess(config)
        } catch (e) {
            console.error('getAssetConfig', e)
            return response.sendError()
        }
    }

    async getFeeConfig ({ request, response }) {
        try {
            const { walletType, feeType } = request.all()
            const feeSetting = await VndcFutureFee.getFeeConfig(walletType, feeType)
            return response.sendSuccess(feeSetting)
        } catch (e) {
            Logger.error('getFeeSetting', e)
            return response.sendError()
        }
    }

    async getFavoriteSymbols ({ user, request, response }) {
        const { tradingMode } = request.get()
        const data = await UserPreferencesServices.get(user.id, UserPreferencesServices.Keys.FavoriteSymbol)
        const symbols = _.get(data, tradingMode, [])
        return response.sendSuccess(symbols)
    }

    async addFavoriteSymbols ({ user, request, response }) {
        try {
            const { tradingMode, pairKey, pairs, type } = request.post()

            if (+tradingMode !== 2) {
                return response.sendError()
            }

            const symbols = await FuturesConfig.getList({ status: "TRADING" }, { project: { symbol: 1 } })

            if (pairs && _.isArray(pairs)) {
                const newWatchList = []
                await bb.map(pairs, async (_pairKey, index) => {
                    const currencies = _pairKey.split('_')
                    if (!currencies[0] || !currencies[1]) {
                        throw new Error('INVALID_SYMBOL')
                    }
                    const symbol = currencies.join('')
                    if (symbols.findIndex(e => e.symbol === symbol) === -1) {
                        throw new Error('INVALID_SYMBOL')
                    }
                    newWatchList[index] = _pairKey
                }, { concurrency: 10 })
                // Check pair key
                const existingData = await UserPreferencesServices.get(user.id, UserPreferencesServices.Keys.FavoriteSymbol, {})
                if (!existingData[tradingMode]) {
                    existingData[tradingMode] = []
                }
                if (type === 'add') {
                    newWatchList.forEach(e => {
                        const existingSymbol = existingData[tradingMode].find(item => item === e)
                        if (!existingSymbol) {
                            existingData[tradingMode].push(e)
                        }
                    })
                } else {
                    existingData[tradingMode] = newWatchList
                }
                await UserPreferencesServices.set(user.id, UserPreferencesServices.Keys.FavoriteSymbol, existingData)
                return response.sendSuccess(existingData[tradingMode])
            }
            if (!pairKey) {
                return response.sendError()
            }
            // Check pair key
            const currencies = pairKey.split('_')
            if (!currencies[0] || !currencies[1]) {
                return response.sendError()
            }

            const existingData = await UserPreferencesServices.get(user.id, UserPreferencesServices.Keys.FavoriteSymbol, {})
            if (!existingData[tradingMode]) {
                existingData[tradingMode] = []
            }
            const existingSymbol = existingData[tradingMode].find(e => e === pairKey)
            if (existingSymbol) {
                return response.sendSuccess(existingData[tradingMode])
            }
            existingData[tradingMode].push(pairKey)
            await UserPreferencesServices.set(user.id, UserPreferencesServices.Keys.FavoriteSymbol, existingData)
            return response.sendSuccess(existingData[tradingMode])
        } catch (e) {
            console.error('addFavoriteSymbols', e)
            return response.sendError()
        }
    }

    async removeFavoriteSymbols ({ user, request, response }) {
        const { tradingMode, pairKey } = request.post()
        if (+tradingMode !== 2 || !pairKey) {
            return response.sendError()
        }

        const existingData = await UserPreferencesServices.get(user.id, UserPreferencesServices.Keys.FavoriteSymbol)
        if (!existingData[tradingMode]) {
            return response.sendSuccess([])
        }
        const existingSymbolIndex = existingData[tradingMode].findIndex(e => e === pairKey)
        if (existingSymbolIndex !== -1) {
            existingData[tradingMode].splice(existingSymbolIndex, 1)
        }
        await UserPreferencesServices.set(user.id, UserPreferencesServices.Keys.FavoriteSymbol, existingData)
        return response.sendSuccess(existingData[tradingMode] || [])
    }

    async getRecentTrade ({ request, response }) {
        try {
            let { limit } = request.all()
            limit = limit || 6
            const result = await FuturesService.getRecentTrade(+limit)
            return response.sendSuccess(result)
        } catch (e) {
            Logger.error('getRecentTradeControllerError', e)
            return response.sendError()
        }
    }

    async getFundingHistories ({ user, request, response }) {
        try {
            let {
                pageSize,
                page,
                baseAsset,
                range
            } = request.get()
            page = parseInt(page, 10)
            pageSize = parseInt(pageSize, 10)
            if (Number.isNaN(page) || page < 0) page = 0
            if (Number.isNaN(pageSize) || pageSize < 1) pageSize = 20
            page = Math.min(page, 20)
            pageSize = Math.min(pageSize, 50)
            if (range && ![1, 7, 30].includes(+range)) {
                range = null
            }
            if (baseAsset) {
                baseAsset = baseAsset.toUpperCase()
            }
            const { histories, hasNext } = await FuturesService.getFundingHistories(user?.id, {
                page,
                pageSize,
                baseAsset,
                range
            })
            return response.sendSuccess({ histories, hasNext })
        } catch (e) {
            Logger.error('getFundingHistory', e)
            return response.sendError()
        }
    }

    async getFundingLoanHistories ({ user, request, response }) {
        try {
            const { fohId } = request.get()
            const result = await FuturesService.getFundingLoanHistories(user?.id, fohId)
            return response.sendSuccess(result)
        } catch (e) {
            Logger.error('getFundingLoanHistories', e)
            return response.sendError()
        }
    }
}

module.exports = FuturesController
