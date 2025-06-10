'use strict'

const _ = require("lodash")

const BaseModel = use('App/Models/BaseModelMongo')
const FuturesConfig = use("App/Models/Config/FuturesConfig")
const Error = use('Config').get('error')

/**
 * @class FuturesLeverage
 */
class FuturesLeverage extends BaseModel {
    static get schemaOptions () {
        return { collection: 'futureleverages' }
    }

    static boot ({ schema }) {
        // Hooks:
        // this.addHook('preSave', () => {})
        // this.addHook('preSave', 'FuturesLeverage.method')
        // Indexes:
        // this.index({}, {background: true})
    }

    /**
     * FuturesLeverage's schema
     */

    static get schema () {
        return {
            user_id: Number,
            leverage: { type: Number, default: 5 },
            symbol: String
        }
    }

    static async getFutureLeverageCached (userId, symbol) {
        // eslint-disable-next-line prefer-rest-params
        const _key = `getUserLeverage:${userId}:${symbol}`
        const _cData = await this.getCacheData(_key)
        if (_cData) {
            return _cData
        }
        const result = await this.getFutureLeverage(userId, symbol)
        await this.setCacheData(_key, result)
        return result
    }

    static async getFutureLeverage (userId, symbol) {
        let leverageData = null
        const config = await FuturesConfig.getOneCached({ symbol })
        if (!config) throw Error.BAD_SYMBOL
        const defaultLeverage = config?.leverageConfig?.default
        leverageData = await this.findOne({ user_id: userId, symbol }).read('s')
        if (!leverageData) {
            const [newData] = await this.create([
                {
                    userId,
                    symbol,
                    leverage: defaultLeverage
                }])
            leverageData = newData
        }
        return { [symbol]: leverageData ? leverageData.leverage : defaultLeverage }
    }

    static async setFutureLeverage (options = {}) {
        const { userId, symbol, leverage } = _.defaults(options, {
            userId: null,
            symbol: null,
            leverage: null
        })
        const config = await FuturesConfig.getOneCached({ symbol })
        if (!config) throw Error.BAD_SYMBOL
        const { min, max } = config?.leverageConfig
        if (!_.isNumber(leverage) || +leverage < min || +leverage > max) throw Error.INVALID_LEVERAGE
        const leverageData = await this.findOneAndUpdate({
            user_id: userId,
            symbol
        }, {
            user_id: userId,
            symbol,
            leverage
        },
        { upsert: true, new: true, setDefaultsOnInsert: true })
        const _key = `getUserLeverage:${userId}:${symbol}`
        await this.invalidCache(_key)
        Logger.notice(`FUTURE_UPDATE_LEVERAGE`, {
            log_type: 'FUTURE_UPDATE_LEVERAGE',
            user_id: userId,
            symbol,
            leverage
        })
        return { [symbol]: leverageData.leverage }
    }
}

module.exports = FuturesLeverage.buildModel('FuturesLeverage')
