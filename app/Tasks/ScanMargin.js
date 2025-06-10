'use strict'

const Task = use('Task')
const Wallet = use('App/Models/Wallet')
const { WalletType } = use('App/Library/Enum').Wallet
const FutureOrderMongo = use('App/Models/Futures/FuturesOrder')
const LoanService = use('App/Services/LoanService')
const FuturesOrderCacheRedis = use('App/Models/VndcFuture/CacheRedis')
const SysNoti = use('App/Library/SysNoti')
const WalletService = use('App/Services/WalletService')
const _ = require('lodash')

class ScanMargin extends Task {
    static get schedule () {
        return '30 * * * * *'
    }

    async handle () {
        const now = new Date()
        const min = now.getMinutes()

        if (min % 2 === 0) {
            await this.usdtLockFix()
        } else {
            await this.processWrongMargin()
        }
    }

    async usdtLockFix () {
        const users = await Wallet.find({
            assetId: 22,
            walletType: WalletType.MAIN,
            lockedValue: { $lt: -1 }
        }).distinct('userId')
        if (users.length > 0) {
            Logger.info('Na3LockError', users)
            for (let i = 0; i < users.length; i++) {
                const userId = users[i]
                this.process(userId, 22, 'negative_lock', WalletType.MAIN)
            }
        }
    }

    async processWrongMargin () {
        const wrongData = await FutureOrderMongo.find({
            status: 2,
            $or: [
                { opened_at: { $gt: new Date(Date.now() - 4 * 60 * 1000), $lt: new Date(Date.now() - 1 * 60 * 1000) } },
                { closed_at: { $gt: new Date(Date.now() - 4 * 60 * 1000), $lt: new Date(Date.now() - 1 * 60 * 1000) } }
            ]
        }).distinct('user_id').read('s')
        for (let i = 0; i < wrongData.length; i++) {
            const userId = wrongData[i]
            console.log(`__ process user_id=${userId} ${i}/${wrongData.length}`)
            await this.process(userId, 22, 'wrong_margin', WalletType.MAIN)
        }
    }

    async process (userId, marginCurrency, type, walletType) {
        const lock = await Wallet.getLocked(userId, marginCurrency, walletType)
        const loanValue = await LoanService.getLoanUserValue(userId)

        const orders = await FuturesOrderCacheRedis.getOpenOrders({ user_id: userId })
        let orderMargin = 0
        let orderOpenFee = 0
        if (orders.length) {
            orderMargin = _.sumBy(orders, 'margin')
            orderOpenFee = _.sumBy(orders, 'fee')
        }
        orderMargin += orderOpenFee
        if (orderMargin >= 0 && (lock < -10 || (orderMargin + loanValue - lock) > 0.001)) {
            const trans = []
            const recheckLock = await Wallet.getLocked(userId, marginCurrency, walletType)
            if (Math.abs(recheckLock - lock) < 0.0001) {
                Logger.info('wrong margin', recheckLock, lock, loanValue, orderMargin)
                SysNoti.notify(`🆖 Người dùng Na3: ${userId} walletType: ${walletType}, ${type} sai lock đã fix ${lock} -> ${orderMargin + loanValue}`, { toSlackFuture: true }).catch()
                trans.push(await WalletService.changeBalance(userId, marginCurrency, 0, orderMargin + loanValue - recheckLock, 608, `Rollback wrong margin ${userId}`, { allowNegative: true, walletType }))
                Logger.info('fix_margin', arguments, trans)
            }
        }
    }
}

module.exports = ScanMargin
