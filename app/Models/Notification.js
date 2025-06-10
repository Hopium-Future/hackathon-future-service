'use strict'

const Model = use('Model')
const socket = use('App/Library/Socket/SocketClientToMainServer')

class Notification extends Model {
    static async pushNotification (toUserId, category, content, options = {}) {
        return socket.pushNotification({
            toUserId,
            category,
            content,
            options
        })
    }

}

module.exports = Notification

Notification.Status = {
    EMITTED: 1,
    READ: 2,
    DELETED: 3
}

Notification.Category = {
    DEFAULT: 0,
    COMPLETE_TASK: 1,
    COMPLETE_SPIN_LEVEL: 2,
    CHAT_MENTION: 3,
    INVITE_ROOM: 4,
    REWARD_CHALLENGE_ROOM: 5,
    CHALLENGE_ROOM_REMIND: 6,
    DEPOSIT_REBATE: 7,
    WELCOME_MESSAGE: 8,
    MARKET_EXCHANGE: 9,
    CHALLENGE_MODE_SURVIVAL: 10,
    WAVES_BUY_NAMI: 12,
    DEPOSIT_ERC20: 14,
    PARTNER_ORDER: 15
}
