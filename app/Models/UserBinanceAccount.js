'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Database = use('Database')
const BaseModel = use('App/Models/BaseModel')
const Env = use('Env')
const SysNoti = use('App/Library/SysNoti')
const Logger = use('Logger')
const Encryptor = require('simple-encryptor')(
    Env.get('USER_BITMEX_ACCOUNT_SECRET') ? Env.get('USER_BITMEX_ACCOUNT_SECRET') : '123456789123456789'
)
const _ = require('lodash')

class UserBinanceAccount extends BaseModel {
    static boot () {
        super.boot()
        this.addHook('beforeCreate', async instance => {
            if (instance.email) instance.email = Encryptor.encrypt(instance.email)
            if (instance.api_key) instance.api_key = Encryptor.encrypt(instance.api_key)
            if (instance.api_secret) instance.api_secret = Encryptor.encrypt(instance.api_secret)
            if (instance.tfa_secret) instance.tfa_secret = Encryptor.encrypt(instance.tfa_secret)
        })
    }

    static async getOne (options = {}, cacheTime = null) {
        const [user] = await this.getList(options, cacheTime)
        return user
    }

    static async activeUserBinanceAccount (userId) {
        // Transaction
        const trx = await Database.beginTransaction()
        try {
            // Check if having binance account already
            const exitingAccount = await this.getOne({ status: this.Status.ACTIVE, user_id: userId, type: this.Type.NORMAL })
            if (exitingAccount) {
                // await this.addSocketSubcribe(exitingAccount.id);
                return {
                    user_id: exitingAccount.user_id,
                    deposit_addess: exitingAccount.deposit_addess,
                    status: exitingAccount.status
                }
            }

            let inActiveAccount = await UserBinanceAccount.query()
                .where('status', UserBinanceAccount.Status.INACTIVE)
                .where(function() {
                    this.where('user_id', userId)
                        .orWhereNull('user_id')
                })
                .orderBy('created_at', 'desc')
                .first()
            if (!inActiveAccount) {
                Logger.info(`Activating user binance account for user #${userId} but no account is available, creating new one…`)
                inActiveAccount = await this.create(userId)
            }
            if (!inActiveAccount) {
                throw 'NOT_HAVE_INACTIVE_ACCOUNT'
            }

            if (inActiveAccount.user_id == null) {
                inActiveAccount.user_id = userId
            }
            inActiveAccount.status = this.Status.ACTIVE
            await inActiveAccount.save(trx)
            Logger.notice('FUTURE_ACTIVE_ACCOUNT', { log_type: 'FUTURE_ACTIVE_ACCOUNT', user_id: userId, account_id: inActiveAccount.account_id })
			// TODO add socket futures
            // await this.addSocketSubscribe(inActiveAccount.id)
            await trx.commit()
            // Reset cache
            this.resetCache(BaseModel.CacheType.MODEL_USER_BINANCE_ACCOUNT)
            return {
                user_id: inActiveAccount.user_id,
                deposit_addess: inActiveAccount.deposit_addess,
                status: inActiveAccount.status
            }
        } catch (e) {
            Logger.error('activeUserBinanceAccount ERROR :   ', e)
            if (trx) await trx.rollback()
            throw e
        } finally {
            trx.commit().catch(() => {})
        }
    }

    static async deactiveUserBinanceAccount (userId) {
        // Transaction
        const trx = await Database.beginTransaction()

        try {
            const inActiveAccount = await this.findBy({ status: this.Status.ACTIVE, user_id: userId })
            if (!inActiveAccount) throw 'NOT_HAVE_INACTIVE_ACCOUNT'

            inActiveAccount.status = this.Status.INACTIVE
            await inActiveAccount.save(trx)
            Logger.notice('FUTURE_DEACTIVE_ACCOUNT', { log_type: 'FUTURE_DEACTIVE_ACCOUNT', user_id: userId, account_id: inActiveAccount.account_id })

            await trx.commit()
            // Reset cache
            this.resetCache(BaseModel.CacheType.MODEL_USER_BITMEX_ACCOUNT)
            return {
                user_id: inActiveAccount.user_id,
                deposit_addess: inActiveAccount.deposit_addess,
                status: inActiveAccount.status
            }
        } catch (e) {
            Logger.error('CREATE CHALLENGE ROOM ERROR :   ', e)
            if (trx) await trx.rollback()
            throw e
        }
    }

    // static async addSocketSubscribe (id) {
    //     const key = id % BINANCE_SERVICE_HASH
    //     // Check bitmex service online
    //     if (socket.checkBinanceServiceOnline(BINANCE_SERVICE_HASH, key)) {
    //         socket.emitToBinanceService(BINANCE_SERVICE_HASH, key, 'subscribe_socket', { userBinanceAccountId: id })
    //     } else {
    //         // Notify
    //         SysNoti.notify(
    //             `[FUTURE] Binance service socket disconnected HASH ID ${id} ${BINANCE_SERVICE_HASH} KEY ${key} `, {
    //                 toSlackFuture: true,
    //                 toSlackMention: [
    //                     SysNoti.SlackUserID.DEV_TRUNGND
    //                 ]
    //             }
    //         )
    //         throw 'BINANCE_SERVICE_DISCONNECTED'
    //     }
    // }

    static async getList (options = {}, cacheTime = null) {
        const _key = this.buildCacheKey('getList', arguments)
        const _cData = await this.getCacheData(_key)
        if (_cData) {
            return _cData
        }
        let records = []
        const result = []
        if (options && Object.keys(options).length) {
            const query = Database.select('*').from('user_binance_accounts')
            if (options.id !== undefined) {
                query.where('id', options.id)
            }
            if (options.status !== undefined) {
                query.where('status', options.status)
            }
            if (options.user_id !== undefined) {
                query.where('user_id', options.user_id)
            }
            if (options.account_id !== undefined) {
                query.where('account_id', options.account_id)
            }
            if (options.type !== undefined) {
                query.where('type', options.type)
            }
            records = await query
        }
        if (records.length > 0) {
            for (const item of records) {
                const returnItem = {
                    user_id: item.user_id,
                    deposit_addess: item.deposit_address,
                    status: item.status,
                    type: item.type,
                    created_at: item.created_at,
                    updated_at: item.updated_at,
                    master_account_id: item.master_account_id,
                    sub_account_id: item.sub_account_id
                }
                if (options.getSecretInformation === 1) {
                    returnItem.email = Encryptor.decrypt(item.email)
                    returnItem.api_key = Encryptor.decrypt(item.api_key)
                    returnItem.api_secret = Encryptor.decrypt(item.api_secret)
                    returnItem.tfa_secret = Encryptor.decrypt(item.tfa_secret)
                    returnItem.account_id = item.account_id
                }
                result.push(returnItem)
            }
        }
        if (cacheTime) {
            await this.setCacheData(_key, result, cacheTime)
        } else {
            await this.setCacheData(_key, result)
        }
        return result
    }

    static async create (reservedForUserId) {
        // Create new account here
        const BinanceService = use('App/Services/BinanceService')
        const subAccount = await BinanceService.createSubAccount()
        Logger.info(`Create new binance sub account reserved for user #${reservedForUserId || 'none'}`, subAccount)
        const errorCode = _.get(subAccount, 'code')
        if (+errorCode < 0) {
            // Loi cmnr
            const msg = _.get(subAccount, 'msg', '(unknown err)')
            SysNoti.notifyDelayed(
                `🔴 Không active được tài khoản Binance client: ${msg}`,
                'loi_active_binance_client',
                {
                    toSlackMention: [
                        SysNoti.SlackUserID.DEV_TRUNGND,
                        SysNoti.SlackUserID.DEV_HIEPTH
                    ]
                }
            )
            return null
        }

        if (subAccount && subAccount.subaccountId) {
            const enableFunction = await BinanceService.enableFuturesSubAccount({
                subAccountId: subAccount.subaccountId,
                futures: true
            })

            if (!(enableFunction && enableFunction.enableFutures)) {
                return null
            }

            const subAccountApi = await BinanceService.createApiSubAccount({
                subAccountId: subAccount.subaccountId,
                canTrade: true,
                futuresTrade: true
            })

            if (subAccountApi && subAccountApi.apiKey && subAccountApi.secretKey) {
                const uba = new UserBinanceAccount()
                uba.sub_account_id = subAccount.subaccountId
                uba.email = subAccount.email
                uba.status = 0
                uba.user_id = reservedForUserId || null
                uba.api_key = subAccountApi.apiKey
                uba.api_secret = subAccountApi.secretKey
                uba.tfa_secret = null
                uba.account_id = null

                uba.type = 1
                uba.enable_spot = true
                uba.enable_margin = false
                uba.enable_futures = true
                uba.api_enable_spot = true
                uba.api_enable_margin = false
                uba.api_enable_futures = true
                uba.master_account_id = 1
                await uba.save()
                return uba
            }
        }
        return null
    }
}

module.exports = UserBinanceAccount
UserBinanceAccount.Status = {
    INACTIVE: 0,
    ACTIVE: 1,
    BANNED: 2
}
UserBinanceAccount.Type = {
    NORMAL: 0,
    FUTURE_50_PROMOTE: 1 // Chuong trinh khuyen mai cho 50 user
}
