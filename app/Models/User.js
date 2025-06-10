'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Database = use('Database')
const BaseModel = use('App/Models/BaseModel')

/** @type {import('@adonisjs/framework/src/Hash')} */
const _ = use('lodash')

const Redis = use('Redis')

class User extends BaseModel {
    static get hidden () {
        return ['password', 'authenticator_secret']
    }

    static async updateUser (item = {}) {
        const query = Database.table('users')

        query.update('updated_at', new Date())

        if (item.code !== undefined) {
            query.update('code', item.code)
        }

        if (item.username !== undefined) {
            query.update('username', item.username)
        }

        if (item.name !== undefined) {
            query.update('name', item.name)
        }

        if (item.avatar !== undefined) {
            query.update('avatar', item.avatar)
        }

        if (item.email !== undefined) {
            query.update('email', item.email)
        }

        if (item.normalized_email !== undefined) {
            query.update('normalized_email', item.normalized_email)
        }

        if (item.status !== undefined) {
            query.update('status', item.status)
        }

        if (item.phone !== undefined) {
            query.update('phone', item.phone)
        }

        if (item.password !== undefined) {
            query.update('password', item.password)
        }

        if (item.role_id !== undefined) {
            query.update('role_id', item.role_id)
        }

        if (item.fb_user_id !== undefined) {
            query.update('fb_user_id', item.fb_user_id)
        }

        if (item.google_user_id !== undefined) {
            query.update('google_user_id', item.google_user_id)
        }

        if (item.referal_id !== undefined) {
            query.update('referal_id', item.referal_id)
        }

        if (item.referral_date !== undefined) {
            query.update('referral_date', item.referral_date)
        }

        if (item.fb_id_assistant_v3 !== undefined) {
            query.update('fb_id_assistant_v3', item.fb_id_assistant_v3)
        }

        if (item.first_name_assistant_v3 !== undefined) {
            query.update('first_name_assistant_v3', item.first_name_assistant_v3)
        }

        if (item.last_name_assistant_v3 !== undefined) {
            query.update('last_name_assistant_v3', item.last_name_assistant_v3)
        }

        if (item.gender_assistant_v3 !== undefined) {
            query.update('gender_assistant_v3', item.gender_assistant_v3)
        }

        if (item.bot_type !== undefined) {
            query.update('bot_type', item.bot_type)
        }

        if (item.code_refer !== undefined) {
            query.update('code_refer', item.code_refer)
        }

        if (item.ib_type !== undefined) {
            query.update('ib_type', item.ib_type)
        }

        if (item.refer_source !== undefined) {
            query.update('refer_source', item.refer_source)
        }

        if (item.fee_currency !== undefined) {
            query.update('fee_currency', item.fee_currency)
        }

        if (item.future_fee_currency !== undefined) {
            query.update('future_fee_currency', item.future_fee_currency)
        }

        if (item.future_fee_currency_vndc !== undefined) {
            query.update('future_fee_currency_vndc', item.future_fee_currency_vndc)
        }

        if (item.future_fee_currency_usdt !== undefined) {
            query.update('future_fee_currency_usdt', item.future_fee_currency_usdt)
        }

        if (item.gender !== undefined) {
            query.update('gender', item.gender)
        }
        query.where('id', item.id)

        return await query
    }

    static async getOne (options = {}) {
        const [user] = await this.getUser(options, 1, 1)
        return user
    }

    static async getUser (options = {}, pageIndex = 1, pageSize = 10, cacheTime = null) {
        const _key = this.buildCacheKey('getUser', arguments)
        const _cData = await this.getCacheData(_key)
        if (_cData) {
            return _cData
        }

        if (!(options && Object.keys(options).length)) return []
        const query = Database.select('*').from('users')

        if (options.id !== undefined) {
            query.where('id', options.id)
        }

        if (options.ids !== undefined) {
            query.whereIn('id', options.ids)
        }

        if (options.username !== undefined) {
            query.where('username', options.username)
        }

        if (options.name !== undefined) {
            query.where('name', options.name)
        }

        if (options.email !== undefined) {
            query.where('email', options.email)
        }

        if (options.normalized_email !== undefined) {
            query.where('normalized_email', options.normalized_email)
        }

        if (options.code !== undefined) {
            query.where('code', options.code)
        }

        if (options.list_code !== undefined) {
            query.whereIn('code', options.list_code)
        }

        if (options.role_id !== undefined) {
            query.where('role_id', options.role_id)
        }

        if (options.fb_user_id !== undefined) {
            query.where('fb_user_id', options.fb_user_id)
        }

        if (options.google_user_id !== undefined) {
            query.where('google_user_id', options.google_user_id)
        }

        if (options.status !== undefined) {
            query.where('status', options.status)
        }

        if (options.referal_id !== undefined) {
            query.where('referal_id', options.referal_id)
        }

        if (options.fb_id_assistant_v3 !== undefined) {
            query.where('fb_id_assistant_v3', options.fb_id_assistant_v3)
        }

        if (options.bot_type !== undefined) {
            query.where('bot_type', options.bot_type)
        }

        if (options.code_refer !== undefined) {
            query.where('code_refer', options.code_refer)
        }

        if (options.authenticator_secret !== undefined) {
            query.where('authenticator_secret', options.authenticator_secret)
        }

        if (options.fee_currency !== undefined) {
            query.where('fee_currency', options.fee_currency)
        }

        if (options.ib_type !== undefined) {
            query.where('ib_type', options.ib_type)
        }

        if (options.future_fee_currency !== undefined) {
            query.where('future_fee_currency', options.future_fee_currency)
        }

        if (options.future_fee_currency_vndc !== undefined) {
            query.where('future_fee_currency_vndc', options.future_fee_currency_vndc)
        }

        if (options.future_fee_currency_usdt !== undefined) {
            query.where('future_fee_currency_usdt', options.future_fee_currency_usdt)
        }

        if (options.phone !== undefined) {
            query.where('phone', options.phone)
        }

        if (options.vndc_user_id !== undefined) {
            query.where('vndc_user_id', options.vndc_user_id)
        }

        if (options.ola_user_id !== undefined) {
            query.where('ola_user_id', options.ola_user_id)
        }

        if (options.check_onus_user_id !== undefined) {
            query.where('onus_user_id', '>', 0)
        }

        if (options.gender !== undefined) {
            query.where('gender', options.gender)
        }

        if (options.search !== undefined && options.search.length > 0) {
            query.where('email', 'LIKE', `%${options.search}%`)
            query.orWhere('name', 'LIKE', `%${options.search}%`)
            query.orWhere('username', 'LIKE', `%${options.search}%`)
            query.orWhere('code', 'LIKE', `%${options.search}%`)
        }

        query.orderBy('created_at', 'desc')
        query.forPage(pageIndex, pageSize)

        const records = await query
        const result = []

        if (records.length > 0) {
            for (const item of records) {
                result.push({
                    id: item.id,
                    username: item.username,
                    name: item.name,
                    email: item.email,
                    code: item.code,
                    fb_user_id: item.fb_user_id,
                    google_user_id: item.google_user_id,
                    vndc_user_id: item.vndc_user_id,
                    ola_user_id: item.ola_user_id,
                    onus_user_id: item.onus_user_id,
                    created_at: item.created_at,
                    updated_at: item.updated_at,
                    role_id: item.role_id,
                    avatar: item.avatar,
                    referal_id: item.referal_id,
                    referral_date: item.referral_date,
                    fb_id_assistant_v3: item.fb_id_assistant_v3,
                    first_name_assistant_v3: item.first_name_assistant_v3,
                    last_name_assistant_v3: item.last_name_assistant_v3,
                    gender_assistant_v3: item.gender_assistant_v3,
                    bot_type: item.bot_type,
                    code_refer: item.code_refer,
                    refer_source: item.refer_source,
                    ib_type: item.ib_type,
                    gender: item.gender,
                    isTfaEnabled: !!item.authenticator_secret,
                    fee_currency: item.fee_currency,
                    future_fee_currency: item.future_fee_currency,
                    future_fee_currency_vndc: item.future_fee_currency_vndc,
                    future_fee_currency_usdt: item.future_fee_currency_usdt,
                    future_individual_refer_level: item.future_individual_refer_level,
                    kyc_status: item.kyc_status,
                    kyc_time: item.kyc_time,
                    partner_type: item.partner_type
                })
            }
        }

        if (cacheTime) {
            await this.setCacheData(_key, result, cacheTime)
        } else {
            await this.setCacheData(_key, result)
        }
        return result
    }

    static isValidUsername (username) {
        return /^[a-zA-Z][a-zA-Z0-9]{5,14}$/.test(username.trim())
    }

    static async checkIsBot (userId) {
        return false
        const userData = await this.getOne({ id: userId })
        return userData && !_.isNil(userData.bot_type)
    }

    static async getUserCategory (userId) {
        const userData = await this.getOne({ id: userId, check_onus_user_id: true })
        let category = 0
        if (userData && !_.isNil(userData.onus_user_id)) category = this.UserCategory.FRAME_ONUS
        return category
    }

    static async getAvatar (userId) {
        const KEY = buildCacheAvatarKey()

        let result = await Redis.hget(KEY, userId)
        if (result == null) {
            console.log('GET AVATAR USER NOT CACHED', userId)
            const user = await User.query().select('avatar').where('id', userId).first()
            if (!user) result = null
            else result = user.avatar

            // Cache
            Redis.hset(KEY, userId, result)
        }

        return result
    }

    static async getRootUser () {
        // Vi tong
        return await this.getOne({ username: 'root', role_id: this.role.ROOT_ACCOUNT })
    }

    static async getBurnUser () {
        // Vi dai dien tong SPIN da burn
        return await this.getOne({ username: 'burn', role_id: this.role.ROOT_ACCOUNT })
    }

    static async getCustomerUser () {
        // Vi dai dien tong SPIN khach hang
        return await this.getOne({ username: 'customer', role_id: this.role.ROOT_ACCOUNT })
    }

    static async getExchangeUser () {
        // Vi chua thanh khoan cua cac tai khoan
        return await this.getOne({ username: 'exchange', role_id: this.role.ROOT_ACCOUNT })
    }

    static async getFuturesCopyTradeUser () {
        // Vi chua loi nhuan tu viec copy trade (1% profit ve Nami)
        return await this.getOne({ username: 'future_copy_trade', role_id: this.role.ROOT_ACCOUNT })
    }

    static async getSavingXbtRootUser () {
        // Vi chua loi nhuan tu viec copy trade (1% profit ve Nami)
        return await this.getOne({ username: 'xbt_saving', role_id: this.role.ROOT_ACCOUNT })
    }

    static async getExchangeFeeUser () {
        // Vi chua phi exchange
        return await this.getOne({ username: 'exchange_fee', role_id: this.role.ROOT_ACCOUNT })
    }

    static async getAdminPromotionUser () {
        // Vi chua tien lam promotion
        return await this.getOne({ email: 'promotion@nami.exchange', role_id: this.role.ROOT_ACCOUNT })
    }

    static async getAdminWithdrawalFeeUser () {
        // Vi chua tien phí rút
        return await this.getOne({ username: 'admin_withdrawal_fee', role_id: this.role.ROOT_ACCOUNT })
    }

    static async getVndcFutureFeeUser () {
        // Vi chua phi vndc futures cho Nami
        return await this.getOne({ username: 'vndc_future_fee', role_id: this.role.ROOT_ACCOUNT })
    }

    static async getVndcFutureRawProfitUser () {
        // Vi chua profit vndc furtures cho ben VNDC
        return await this.getOne({ username: 'vndc_future_raw_profit', role_id: this.role.ROOT_ACCOUNT })
    }

    static async getUsdtFutureFeeUser () {
        // Vi chua phi usdt futures cho Nami
        return await this.getOne({ username: 'vndc_future_fee', role_id: this.role.ROOT_ACCOUNT })
    }

    static async getUsdtFutureRawProfitUser () {
        // Vi chua profit usdt furtures cho ben USDT
        return await this.getOne({ username: 'vndc_future_raw_profit', role_id: this.role.ROOT_ACCOUNT })
    }

    static async setLanguage (userId, language) {
        await Redis.hset(buildLanguageKey(), userId, language.substring(0, 10))
    }

    async editOlaId (newOlaId) {
        if (!newOlaId) {
            return
        }

        const otherUserOlaId = await User.find()
    }

    getIsTfaEnabled () {
        return !!this.authenticator_secret
    }
}

function buildCacheAvatarKey () {
    return `cache:avatar:user_id`
}

function buildLanguageKey () {
    return `user:language`
}

module.exports = User

User.role = {
    ROOT_ACCOUNT: 99, // Luu tru cac khoan phi rut/nap

    ADMIN: 1,
    VERIFIER: 2,
    MASTER_IB: 3,
    IB: 4,
    USER: 5,
    // Has role to create challenge survival room
    LEVEL_1: 6,

    HEAD_OF_BUSINESS: 9,
    CHAT_SUPPORTER: 10
}

User.Result = {
    INVALID_USER: 'INVALID_USER',
    INVALID_USER_ROLE: 'INVALID_USER_ROLE',
    INVALID_INPUT: 'INVALID_INPUT',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
    NOT_FOUND_REFER_USER: 'NOT_FOUND_REFER_USER'
}

User.Language = {
    VI: 'vi',
    EN: 'en'
}

User.IbType = {
    NORMAL: 0, // Lv mặc định
    IB_LV1: 1,
    TB_LV2: 2,
    NAMI_SALE: 3, // Nami Sale
    NAMI_SALE_MANAGER_LV_1: 4,
    NAMI_SALE_MANAGER_LV_2: 5, // Head Buisiness

    NAMI_BROKER_USER: 6, // User under nami sale

    OLA_BROKER_MASTER: 7, // 584982
    OLA_BROKER_USER: 8,

    MB_BROKER_MASTER: 9, // 583415
    MB_BROKER_USER: 10
}

User.ReferSource = {
    UNKNOWN: 0,
    BITBATTLE: 1,
    LAUNCHPAD: 2
}

User.UserCategory = {
    NAMI: 0,
    FRAME_ONUS: 1,
    FRAME_NAMI: 2
}

User.Gender = {
    UNKNOWN: 0,
    MALE: 1,
    FEMALE: 2
}
