'use strict'

const Error = use("Config").get("error")
const _ = require("lodash")
const { v4: uuidv4 } = require("uuid")

class FuturesController {
    // async postCommission ({
    //     user,
    //     request,
    //     response
    // }) {
    //     try {
    //         const {
    //             symbol,
    //             leverage
    //         } = request.all()
    //         return response.sendSuccess()
    //     } catch (e) {
    //         return response.sendDetailedError(Error.UNKNOWN)
    //     }
    // }

    async getCommission ({
        user,
        request,
        response
    }) {
        Logger.info('getCommission', request.all())
        try {
            const { timestamp } = request.all()
            const OnusCommissionLog = use('App/Models/Commission/OnusCommissionLog')
            const data = await OnusCommissionLog.find({ time: new Date(+timestamp) })
            const result = {}
            data.map(item => {
                const { onus_user_id, metadata } = item
                result[onus_user_id] = metadata
            })
            return response.sendSuccess(result)
        } catch (e) {
            Logger.error('getCommission error', e)
            return response.sendDetailedError(Error.UNKNOWN)
        }
    }
}

module.exports = FuturesController
