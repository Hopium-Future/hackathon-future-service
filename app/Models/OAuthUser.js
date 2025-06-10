'use strict'

const _ = require("lodash")

const Database = use("Database")
const BaseModel = use("App/Models/BaseModel")

class OAuthUser extends BaseModel {
    static async getOAuthUser (options = {}, pageIndex = 1, pageSize = 10) {
        const query = Database.select("*").from("o_auth_users")

        if (options.id !== undefined) {
            query.where("id", options.id)
        }

        if (options.ids !== undefined) {
            query.whereIn("id", options.ids)
        }

        if (options.not_id !== undefined) {
            query.whereNot("id", options.not_id)
        }

        if (options.auth_id !== undefined) {
            query.where("auth_id", options.auth_id)
        }

        if (options.name !== undefined) {
            query.where("name", options.name)
        }

        if (options.type !== undefined) {
            query.where("type", options.type)
        }

        if (options.access_token !== undefined) {
            query.where("access_token", options.access_token)
        }

        if (options.search !== undefined && options.search.length > 0) {
            query.where("name", "LIKE", `%${options.search}%`)
        }

        query.orderBy("created_at", "desc")
        query.forPage(pageIndex, pageSize)

        const records = await query
        const result = []

        if (records.length > 0) {
            for (const item of records) {
                result.push({
                    id: item.id,
                    type: item.type,
                    name: item.name,
                    first_name: item.first_name,
                    last_name: item.last_name,
                    middle_name: item.middle_name,
                    auth_id: item.auth_id,
                    created_at: new Date(item.created_at).toLocaleString(),
                    updated_at: new Date(item.updated_at).toLocaleString(),
                    avatar: item.avatar,
                    access_token: item.access_token
                })
            }
        }

        return result
    }

    static async getOnusIdFromUserId (userId) {
        const _key = this.buildCacheKey('OAuthUser.getOnusIdFromUserId', arguments)
        const _cData = await this.getCacheData(_key)
        if (_cData) {
            return _cData
        }
        const [[data]] = await Database.raw('select tb1.id, tb2.auth_id  from users as tb1, o_auth_users as tb2 where tb1.onus_user_id = tb2.id and tb1.id = ?', [userId])
        const result = data.auth_id
        await this.setCacheData(_key, result, 30 * 24 * 60 * 60 * 1000)
        return result
    }

    static async getUserIdFromOnusId (onusId) {
        const _key = this.buildCacheKey('OAuthUser.getUserIdFromOnusId', arguments)
        const _cData = await this.getCacheData(_key)
        if (_cData) {
            return _cData
        }
        const [[data]] = await Database.raw('select tb1.id, tb2.auth_id  from users as tb1, o_auth_users as tb2 where tb1.onus_user_id = tb2.id and tb2.auth_id = ?', [onusId])
        const result = data.id
        await this.setCacheData(_key, result, 30 * 24 * 60 * 60 * 1000)
        return result
    }
}

module.exports = OAuthUser

OAuthUser.Type = {
    GOOGLE: 1,
    FACEBOOK: 2,
    NAMI_ASSISTANT: 3,
    FINANCE_X: 4,
    NAMI: 5,
    VNDC: 6,
    APPLE: 7,
    ONUS: 8
}

OAuthUser.Service = ['google', 'facebook', 'nami', 'vndc', 'apple', 'onus']
OAuthUser.UserTableColumnName = {
    [OAuthUser.Type.GOOGLE]: 'google_user_id',
    [OAuthUser.Type.FACEBOOK]: 'fb_user_id',
    [OAuthUser.Type.FINANCE_X]: 'financex_user_id',
    [OAuthUser.Type.NAMI]: '',
    [OAuthUser.Type.VNDC]: 'vndc_user_id',
    [OAuthUser.Type.APPLE]: 'apple_user_id',
    [OAuthUser.Type.ONUS]: 'onus_user_id'
}
