'use strict'

const Model = use('Model')
const randomstring = require('randomstring')
const ms = require('ms')

class Otp extends Model {
    static async getOrCreate (user, type, target, metaData) {
        // Tìm otp gần nhất, chưa expire thì gửi lại
        const recentOtp = await this.getOtp(user, type, null, target)
        if (recentOtp) return recentOtp

        // Create new Otp
        const otp = new Otp()
        otp.user_id = user ? user.id : null
        otp.target = target
        otp.type = type
        otp.expired_at = new Date(Date.now() + Otp.Timeout[type])
        otp.status = Otp.Status.UNUSED
        if (metaData != null) {
            try {
                if (typeof metaData === 'string') otp.meta_data = metaData
                else if (typeof metaData === 'object') otp.meta_data = JSON.stringify(metaData)
            } catch (err) {
                console.error('Create otp', err)
            }
        }

        switch (type) {
        case Otp.Type.AUTHEN_SOCKETIO: {
            otp.code = randomstring.generate(20)
        } break
        case Otp.Type.VERIFY_EMAIL: {
            otp.code = randomstring.generate(30)
        } break
        case Otp.Type.RESET_PASSWORD: {
            otp.code = randomstring.generate(60)
        } break
        case Otp.Type.VERIFY_DEVICE_EMAIL: {
            otp.code = randomstring.generate({ length: 6, charset: 'numeric' })
        } break
        case Otp.Type.WITHDRAWAL_CONFIRM_EMAIL: {
            otp.code = randomstring.generate({ length: 6, charset: 'numeric' })
        } break

        default: {
            otp.code = randomstring.generate(10)
        }
        }
        await otp.save()
        return otp
    }

    static async getOtp (user, type, otpCode, target) {
        const chain = this.query()
            .where('type', type)
            .where('status', Otp.Status.UNUSED)
            .where('expired_at', '>', new Date())

        if (user) chain.where('user_id', user.id)
        if (otpCode) chain.where('code', otpCode)
        if (target) chain.where('target', target.toString())

        return await chain.first()
    }

    async markAsUsed () {
        this.status = Otp.Status.USED
        await this.save()
        return this
    }
}

Otp.Type = {
    AUTHEN_SOCKETIO: 1,
    VERIFY_EMAIL: 2,
    RESET_PASSWORD: 3,
    VERIFY_DEVICE_EMAIL: 4,
    WITHDRAWAL_CONFIRM_EMAIL: 5
}
Otp.Timeout = {
    [Otp.Type.AUTHEN_SOCKETIO]: ms('2 day'),
    [Otp.Type.VERIFY_EMAIL]: ms('1 day'),
    [Otp.Type.RESET_PASSWORD]: ms('15 minutes'),
    [Otp.Type.VERIFY_DEVICE_EMAIL]: ms('15 minutes'),
    [Otp.Type.WITHDRAWAL_CONFIRM_EMAIL]: ms('10 minutes')
}

Otp.Status = {
    USED: 1,
    UNUSED: 0
}
module.exports = Otp
