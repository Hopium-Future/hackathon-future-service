const Wallet = use('App/Models/Wallet')
const SysNoti = use('App/Library/SysNoti')
const Error = use('Config')
    .get('error')

class SecurityService {
    static async isValidLock (userId, assetId, lockedValue = undefined) {
        const locked = lockedValue !== undefined ? lockedValue : await Wallet.getLocked(userId, assetId)
        if (locked < -0.00001) {
            Logger.error(`[Spot service] ${userId} negative lock ${assetId}: ${locked}`)
            SysNoti.notify(`[Spot service] ${userId} negative lock ${assetId}: ${locked}`,
                {
                    toSlackExchange: true,
                    toSlackMention: [SysNoti.SlackUserID.DEV_TRUNGND]
                })
            throw Error.ACCOUNT_BAN_TRADE
        }
        return true
    }
}

module.exports = SecurityService
