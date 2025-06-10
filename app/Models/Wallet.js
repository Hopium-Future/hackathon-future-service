const BaseModel = use('MongooseModel')
const { MoneyType, WalletType } = use('App/Library/Enum').Wallet
const RedisWallet = use('Redis').connection('wallet')

/**
 * @class Wallet
 */
class Wallet extends BaseModel {
    /**
     * Wallet's schema
     */

    static get schema () {
        return {
            userId: Number,
            assetId: Number,
            walletType: String,
            value: { type: Number, default: 0 },
            lockedValue: { type: Number, default: 0 }
        }
    }

    static boot ({ schema }) {
        // Hooks:
        // this.addHook('preSave', () => {})
        // Indexes:
        // Virtuals, etc:
        // schema.virtual('something').get(.......)
    }

    static getWalletKey (userId, assetId, moneyType, walletType = WalletType.MAIN) {
        console.log('__ check get wallet key ', arguments)
        return `wallet:${userId}:${assetId}:${walletType}:${moneyType}`
    }

    static getWalletHash (userId, moneyType, walletType = WalletType.MAIN) {
        return `wallet:${walletType}:${moneyType}:${userId}`
    }

    static async getOrCreateWallet (userId, assetId, walletType = WalletType.MAIN) {
        const walletHashValue = this.getWalletHash(userId, MoneyType.MAIN_BALANCE, walletType)
        const walletHashLock = this.getWalletHash(userId, MoneyType.LOCK_BALANCE, walletType)
        const [walletValue, walletLock] = await RedisWallet.multi().hget(walletHashValue, assetId).hget(walletHashLock, assetId).exec()

        /* eslint-disable no-unused-vars,prefer-const */
        let [temp1, value] = walletValue
        let [temp2, lock] = walletLock

        if ((value === null || value === '') || (lock === null || lock === '')) {
            const _w = await this.findOrCreate(
                { userId: userId, assetId, walletType },
                { userId: userId, assetId, value: 0, lockedValue: 0, walletType }
            )

            value = _w.value
            lock = _w.lockedValue
            await RedisWallet.multi().hset(walletHashValue, assetId, value).hset(walletHashLock, assetId, lock).exec()
        }

        return { value: +value, lockedValue: +lock, walletType }
    }

    static async isWalletExists (userId, assetId, walletType = WalletType.MAIN) {
        const wallet = await this.findOne({ userId, assetId, walletType })
        return !!wallet
    }

    static async createWallet (userId, assetId, walletType = WalletType.MAIN) {
        const wallet = new Wallet()
        wallet.userId = userId
        wallet.assetId = assetId
        wallet.walletType = walletType
        await wallet.save()
        return wallet
    }

    static async findOrCreate (query, obj) {
        const exist = await this.findOne(query)
        if (exist) return exist
        return this.create(obj)
    }

    static async getAvailable (userId, assetId, walletType = WalletType.MAIN) {
        const wallet = await this.getOrCreateWallet(userId, assetId, walletType)
        return Math.max(+wallet.value, 0) - Math.max(+wallet.lockedValue, 0)
    }

    static async getLocked (userId, assetId, walletType = WalletType.MAIN) {
        const wallet = await this.getOrCreateWallet(userId, assetId, walletType)
        return +wallet.lockedValue
    }

    static async getBalance (userId, assetId, walletType = WalletType.MAIN) {
        const wallet = await this.getOrCreateWallet(userId, assetId, walletType)
        return +wallet.value
    }

    static async getWallet (userId, assetId, walletType = WalletType.MAIN) {
        return this.getOrCreateWallet(userId, assetId, walletType)
    }
}

module.exports = Wallet.buildModel('Wallet')
