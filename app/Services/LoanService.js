const { WalletType } = use('App/Library/Enum').Wallet
const WalletCurrency = use('Config').get('walletCurrencies')
const RedisLoan = use('Redis').connection('loan')
const RedisCache = use('Redis').connection('cache')
const Wallet = use('App/Models/Wallet')
const LoanConfig = use('App/Models/Mongo/LoanConfig')
const Env = use('Env')
const Big = require('big.js')
const axios = require('axios')

const KafkaProducer = use('KafkaProducer')

const RECENT_TRADE_QUEUE_PREFIX = 'RECENT_TRADE_QUEUE_PREFIX:'
const LOAN_CONFIG_CACHE_PREFIX = 'na3-spot:loanConfigs'
const LOANING_USER_KEY = 'LOANING_USER'
const LOANING_USER_VALUE_PREFIX = 'LOANING_USER_VALUE:'
const LOAN_HOST = Env.get('LOAN_HOST', 'http://na3-spot-service:9004')
const LOAN_API_PRIVATE_KEY = Env.get('LOAN_API_PRIVATE_KEY', '123456')
const CUSDT_ASSET_ID = WalletCurrency.CUSDT

class LoanService {
    static async getLastPrice (baseAssetId, quoteAssetId) {
        try {
            const key = `${RECENT_TRADE_QUEUE_PREFIX}${baseAssetId}:${quoteAssetId}`
            const data = await RedisLoan.lrange(key, 0, 0)
            if (!data.length) return 0
            return +JSON.parse(data[0])?.p || 0
        } catch (error) {
            return 0
        }
    }

    static async getAvailableBalance (userId, assetId, walletType = WalletType.MAIN) {
        const { value, lockedValue } = await Wallet.getOrCreateWallet(
            userId,
            assetId,
            walletType
        )
        return +Big(value).minus(lockedValue)
    }

    static async getLoanConfigLTV () {
        const key = `${LOAN_CONFIG_CACHE_PREFIX}getListLTV`
        const cacheData = await RedisCache.get(key)
        if (cacheData) return JSON.parse(cacheData)
        const data = await LoanConfig.find({ status: 'active' }, { baseAssetId: 1, ltv: 1 }).lean()
        const result = data.reduce((acc, item) => {
            acc[item.baseAssetId] = item.ltv
            return acc
        }, {})
        await RedisCache.setex(key, 60, JSON.stringify(result))
        return result
    }

    static async getMaxLoan (userId, isMargin = false) {
        const ltvConfigs = await this.getLoanConfigLTV()
        const assetIds = Object.keys(ltvConfigs)
        const assetValues = await Promise.all(
            assetIds.map(async assetId => {
                const available = await this.getAvailableBalance(
                    userId,
                    assetId
                )
                const price = await this.getLastPrice(assetId, 22)
                return +Big(available).times(price).times(+ltvConfigs[assetId])
            })
        )
        let cusdtAvailable = 0
        if (!isMargin) {
            cusdtAvailable = await this.getAvailableBalance(userId, CUSDT_ASSET_ID) || 0
        }
        const totalLoan = assetValues.reduce((sum, usdtValue) => +Big(sum).plus(usdtValue), 0)
        return +Big(totalLoan).plus(Math.max(+cusdtAvailable, 0))
    }

    static async saveLoanUser (userId, type = 'add') {
        try {
            Logger.info(`saveLoanUser userId=${userId} type=${type}`)
            const { value, lockedValue } = await Wallet.getOrCreateWallet(
                userId,
                22,
                WalletType.MAIN
            )
            if (+lockedValue <= +value && type === 'add') return
            if (+lockedValue > +value && type === 'remove') return
            const key = LOANING_USER_KEY
            const checkExist = await RedisLoan.exists(key)
            if (!Number(checkExist)) {
                // todo: get all loaning users from order
                let loaningUsers = await Wallet.find({
                    lockedValue: { $gt: 0 },
                    assetId: 22,
                    walletType: WalletType.MAIN
                }).distinct('userId')
                if (type === 'add') loaningUsers.push(userId)
                else loaningUsers = loaningUsers.filter(item => +item !== +userId)
                await RedisLoan.rpush(key, loaningUsers)
                return
            }
            await RedisLoan.lrem(key, 0, userId)
            if (type === 'add') await RedisLoan.rpush(key, userId)
        } catch (error) {
            Logger.error(`saveLoanUserError userId=${userId} type=${type}`, error?.message)
        }
    }

    static async liquidateLoanAsset (userId, displayingId, value) {
        try {
            Logger.info(`liquidateLoanAsset userId=${userId} displayingId=${displayingId} value=${value}`)
            await RedisLoan.incrbyfloat(`${LOANING_USER_VALUE_PREFIX}${userId}`, value)
            try {
                await KafkaProducer.sendMessage("liquidate_loan_asset", {
                    userId,
                    usdtAmount: value,
                    metadata: { orderId: displayingId }
                })
            } catch (error) {
                await axios.post(`${LOAN_HOST}/api/spot/loan/liquidate-loan-asset`, {
                    userId,
                    usdtAmount: value,
                    metadata: { orderId: displayingId }
                }, { headers: { 'api-private-key': LOAN_API_PRIVATE_KEY } })
                throw error
            }
        } catch (error) {
            Logger.error(`liquidateLoanAssetError userId=${userId} displayingId=${displayingId} value=${value}`, error?.message)
        }
    }

    static async getLoanUserValue (userId) {
        const value = await RedisLoan.get(`${LOANING_USER_VALUE_PREFIX}${userId}`)
        return Math.max(0, +(value || 0))
    }
}

module.exports = LoanService
