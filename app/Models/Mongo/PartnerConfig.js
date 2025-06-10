'use strict'

const BaseModel = use('App/Models/BaseModelMongo')

// * @class LoanConfig

class PartnerConfig extends BaseModel {
    static get schemaOptions () {
        return { collection: 'partners' }
    }

    static get schema () {
        return {
            _id: Number,
            name: String,
            feeTaker: Number,
            feeMaker: Number,
            metadata: {
                accumulatedVolume: Number,
                rewards: [
                    {
                        assetId: Number,
                        assetQuantity: Number
                    }
                ]
            }
        }
    }

    static boot ({ schema }) {
    }

    static async getListCached (filter = {}) {
        const _key = this.buildCacheKey("getListCached", filter)// tạo key redis
        const _cData = await this.getCacheData(_key)
        if (_cData) {
            return _cData
        }
        const result = await this.getList(filter)
        await this.setCacheData(_key, result, 120 * 1000)
        return result
    }

    static async getOneCached (filter = {}) {
        const _key = this.buildCacheKey("getOneCached", filter)// tạo key redis
        const _cData = await this.getCacheData(_key)
        if (_cData) {
            return _cData
        }
        const result = await this.getOne(filter)
        await this.setCacheData(_key, result, 120 * 1000)
        return result
    }

    static async getOne (filter = {}) {
        const data = await this.findOne(filter).read('s')
        return data
    }

    static async getList (filter = {}) {
        const data = await this.find(filter).read('s')
        return data
    }
}

module.exports = PartnerConfig.buildModel('PartnerConfig')
