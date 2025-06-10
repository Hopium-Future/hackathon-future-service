const { WalletType, ErrorCode, MoneyType, TransactionStatus } = use('App/Library/Enum').Wallet
const RedisWallet = use('Redis').connection('wallet')
const Wallet = use('App/Models/Wallet')
const AssetConfig = use('App/Models/Config/AssetConfig')
const RedisSocket = use('Redis').connection('socket')
const SysNoti = use('App/Library/SysNoti')
const TransactionHistory = use('App/Models/Mongo/TransactionHistory')

const QUEUE_REDIS_TRANSACTION_HISTORY = 'queue:history:transaction'
const QUEUE_REDIS_PORTFOLIO_HISTORY = 'queue:portfolio:transaction'

const _ = require('lodash')
const zeroFill = require('zero-fill')

class WalletService {
    static async generateTransactionId (prefix) {
        let redisHkey = prefix
        if (!redisHkey) {
            redisHkey = 'no_prefix'
        }
        let nextCount = await RedisWallet.hincrby('transaction_number_counter', redisHkey, 1)
        if (nextCount < 500e2) {
            nextCount = _.random(500e2, 600e2)
            await RedisWallet.hset('transaction_number_counter', redisHkey, nextCount)
        }
        const countSuffix = zeroFill(9, nextCount)
        if (prefix) {
            return `${prefix}${countSuffix}`
        }
        return countSuffix
    }

    static async changeBalance (userId, assetId, moneyValueChange, lockedValueChange, category, note, options = null) {
        let _options = {}
        try {
            if (options) {
                if (typeof options === 'string') {
                    _options = JSON.parse(options)
                } else if (typeof options === 'object') {
                    _options = options
                }
            }
        } catch (e) {
            Logger.error('Parse options error', e)
        }

        const DEFAULT_OPTIONS = {
            transactionId: null,
            rollbackTransactionId: null,
            status: null,
            metadata: null,
            allowNegative: false,
            walletType: WalletType.MAIN,
            portfolio: null, // {price: xxx, recorded: true|false},
            fromUser: null,
            toUser: null,
            saveCache: false
        }

        if (!(assetId > 0)) throw 'INVALID_ASSET_ID'
        const additionalOptions = _.defaults(_options, DEFAULT_OPTIONS)
        const walletType = additionalOptions
        && additionalOptions.walletType ? additionalOptions.walletType : WalletType.MAIN
        try {
            Logger.info(`Wallet: change balance of user #${userId}, assetId=${assetId}, amount=${moneyValueChange}, amount locked=${lockedValueChange}, note=${note}, options`, additionalOptions)

            const wallet = await Wallet.getOrCreateWallet(userId, assetId, walletType)

            const walletToEmit = {
                userId,
                assetId,
                value: wallet.value,
                lockedValue: wallet.lockedValue,
                walletType
            }

            // Common
            const transactionHistory = {}
            transactionHistory.userId = userId
            transactionHistory.category = category
            transactionHistory.assetId = assetId
            transactionHistory.walletType = walletType

            transactionHistory.transactionId = additionalOptions.transactionId
                ? additionalOptions.transactionId
                : await this.generateTransactionIdForTransaction(assetId)

            transactionHistory.status = additionalOptions.status
                ? additionalOptions.status
                : TransactionStatus.SUCCESS

            if (additionalOptions.rollbackTransactionId) transactionHistory.rollbackTransactionId = additionalOptions.rollbackTransactionId
            if (additionalOptions.fromUser) transactionHistory.fromUser = additionalOptions.fromUser
            if (additionalOptions.toUser) transactionHistory.toUser = additionalOptions.toUser
            if (additionalOptions.detailSource) transactionHistory.detailSource = additionalOptions.detailSource

            if (additionalOptions.portfolio) transactionHistory.portfolio = additionalOptions.portfolio
            if (additionalOptions.metadata) transactionHistory.metadata = additionalOptions.metadata

            transactionHistory.createdAt = new Date().toISOString()
            transactionHistory.updatedAt = transactionHistory.createdAt

            if (lockedValueChange) {
                const walletKey = Wallet.getWalletHash(userId, MoneyType.LOCK_BALANCE, walletType)
                // eslint-disable-next-line no-shadow,prefer-const,max-len
                let [moneyBefore, moneyAfter, lockedChange, errorCode] = await RedisWallet.wallet_transfer(walletKey, assetId, lockedValueChange, additionalOptions.allowNegative ? 1 : 0)
                // eslint-disable-next-line no-unused-expressions,no-sequences
                moneyBefore = +moneyBefore, moneyAfter = +moneyAfter, lockedChange = +lockedChange
                if (errorCode !== 0) {
                    throw ErrorCode[errorCode]
                }
                walletToEmit.lockedValue = +moneyAfter
                transactionHistory.note = `LOCK: ${note}`
                transactionHistory.moneyUse = +lockedValueChange
                transactionHistory.moneyBefore = +moneyBefore
                transactionHistory.moneyAfter = +moneyAfter
                transactionHistory.mainBalance = 0

                await Promise.all([
                    RedisWallet.rpush(QUEUE_REDIS_TRANSACTION_HISTORY, JSON.stringify(transactionHistory)),
                    RedisWallet.rpush(QUEUE_REDIS_PORTFOLIO_HISTORY, JSON.stringify(transactionHistory)).catch(e => Logger.warning(`Submit transaction to portfolio error`, e)),
                    RedisWallet.hset(this.KeyChangeBalanceRedis, `${walletKey}__${assetId}`, Date.now())
                ])
            }
            if (moneyValueChange) {
                const walletKey = Wallet.getWalletHash(userId, MoneyType.MAIN_BALANCE, walletType)
                // eslint-disable-next-line no-shadow,prefer-const,max-len
                let [moneyBefore, moneyAfter, lockedChange, errorCode] = await RedisWallet.wallet_transfer(walletKey, assetId, moneyValueChange, additionalOptions.allowNegative ? 1 : 0)
                // eslint-disable-next-line no-unused-expressions,no-sequences
                moneyBefore = +moneyBefore, moneyAfter = +moneyAfter, lockedChange = +lockedChange
                if (errorCode !== 0) {
                    throw ErrorCode[errorCode]
                }

                walletToEmit.value = +moneyAfter
                transactionHistory.note = `BALANCE: ${note}`
                transactionHistory.moneyUse = +moneyValueChange
                transactionHistory.moneyBefore = +moneyBefore
                transactionHistory.moneyAfter = +moneyAfter
                transactionHistory.mainBalance = 1

                await Promise.all([
                    RedisWallet.rpush(QUEUE_REDIS_TRANSACTION_HISTORY, JSON.stringify(transactionHistory)),
                    RedisWallet.hset(this.KeyChangeBalanceRedis, `${walletKey}__${assetId}`, Date.now())
                ])
            }

            this.emitBalanceToUser(userId, walletToEmit)

            if (transactionHistory) {
                Logger.info(`Wallet change balance, transaction history:`, transactionHistory)
            }

            try {
                if (additionalOptions.saveCache === true) await TransactionHistory.setCacheGetOne({ transactionId: transactionHistory.transactionId }, transactionHistory)
            } catch (e) {
                Logger.info(`Set cache data error   :`, e)
            }

            return transactionHistory
        } catch (err) {
            // Rollback wallet
            Logger.error(`Wallet change balance error`, JSON.stringify(err), arguments)
            throw err
        }
    }

    static async generateTransactionIdForTransaction (assetId) {
        const assetConfig = await AssetConfig.getOneCached({ id: assetId })
        let idPrefix
        if (!assetConfig) {
            idPrefix = null
        } else {
            idPrefix = assetConfig.assetCode
        }
        return this.generateTransactionId(idPrefix)
    }

    static async rollbackWallet (transactionHistories) {
        try {
            if (!transactionHistories || !transactionHistories.length) return

            for (let i = 0; i < transactionHistories.length; i++) {
                const history = transactionHistories[i]
                await this.changeBalance(
                    history.userId,
                    history.assetId,
                    history.mainBalance ? -history.moneyUse : 0,
                    history.mainBalance ? 0 : -history.moneyUse,
                    history.category,
                    `rollback ${history.transactionId}`,
                    {
                        allowNegative: true,
                        walletType: history.walletType,
                        status: TransactionStatus.ROLLBACK,
                        rollbackTransactionId: history.transactionId,
                        transactionId: `ROLLBACK_${history.transactionId}`
                    }
                )
            }
        } catch (e) {
            Logger.error('Rollback wallet error ', e, transactionHistories)
            SysNoti.notify(`Rollback balance error ${JSON.stringify(transactionHistories)}`)
            // eslint-disable-next-line consistent-return
            return -1
        }
    }

    static async emitBalanceToUser (userId, wallet) {
        try {
            const balance = {}
            balance[wallet.assetId] = wallet
            const socketEvent = `user:update_balance:${wallet.walletType}`
            const payload = {
                data: {
                    data: balance,
                    userId,
                    event: socketEvent
                }
            }
            await RedisSocket.publish(
                'socket:emit:user',
                JSON.stringify(payload),
                (err, count) => {
                    if (err) {
                        console.error('Error publishing event:', err)
                        throw err
                    } else {
                        console.log(`Event published to ${count} subscribers.`)
                    }
                }
            )
        } catch (e) {
            Logger.error('EMIT BALANCE TO USER ERROR ', e)
        }
    }
}

module.exports = WalletService

WalletService.KeyChangeBalanceRedis = 'redis:wallet:change:balance'
