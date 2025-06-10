'use strict'

const Env = use('Env')
const _ = require('lodash')
const axios = require('axios')

const NA3_CHAT_BOT_HOST = Env.get('NA3_CHAT_BOT_HOST', 'http://na3-chatbot-service:5000')
const CHATBOT_API_KEY = Env.get('CHATBOT_API_KEY', '123456')
const NA3_BE_HOST = Env.get('NA3_BE_HOST', 'http://na3-be:3001')
const NA3_BE_API_KEY = Env.get('NA3_BE_API_KEY', '123456')

const NOTIFICATION_URL = Env.get(
    "NOTIFICATION_URL",
    ""
);

const API_NOTIFICATION_PRIVATE_KEY = Env.get(
    "API_NOTIFICATION_PRIVATE_KEY",
    "123456a@"
);

class NotificationService {
    static async mapTelegramId (userId) {
        try {
            const { data } = await axios.post(`${NA3_BE_HOST}/api/users/internal/map-ids`, { userIds: [userId] }, { headers: { 'x-api-key': NA3_BE_API_KEY } })
            return data?.[userId]
        } catch (e) {
            Logger.error(`mapTelegramIdError userIds=${userId}`, e?.message)
            return null
        }
    }

    static async pushNotification (userId, telegramId, template, content) {
        try {
            let tId = telegramId
            if (!tId) tId = await this.mapTelegramId(userId)
            Logger.info(`pushNotification userId=${userId} telegramId=${tId} template=${template}`)
            const payload = {
                userId: tId,
                templateName: template,
                params: content,
                language: 'en'
            }
            await axios.post(`${NA3_CHAT_BOT_HOST}/api/chatbot/notice/send-template`, payload, { headers: { 'x-api-key': CHATBOT_API_KEY } })
        } catch (e) {
            Logger.error(`pushNotificationError userId=${userId} telegramId=${telegramId} template=${template}`, e?.message)
        }
    }

    static axiosNotification = axios.create({
        baseURL: NOTIFICATION_URL,
        headers: {"X-API-KEY": API_NOTIFICATION_PRIVATE_KEY},
    });
    static async sendChatBotNotify(data) {
        const { template, userId, context } = data;
        try {
            const rs = await this.axiosNotification.post(
                "/push-notification",
                {"notification": [data]},
                {
                    headers: {
                        'x-auth-user': JSON.stringify({"id": userId })
                    }
                }
            );
            Logger.info("payment_send_noti", { data, rs: rs.data });
            return rs.data?.data;
        } catch (e) {
            Logger.error(
                "catch_futures_push_noti_to_notification",
                { data, resData: e?.response?.data }
            );
            throw "NOTI_ERROR";
        }
    }
}

module.exports = NotificationService

NotificationService.Category = {
    DEFAULT: 0,
    DEPOSIT_REBATE: 7,
    MARKET_EXCHANGE: 9
}

NotificationService.Template = {
    // NOTIFY ////////////////////
    FUTURES_LIQUIDATE: 'FUTURES_LIQUIDATE',
    FUTURES_OPEN_POSITION: 'FUTURES_OPEN_POSITION',

    // CHATBOT ///////////////////
    CLOSE_NORMAL: 'PARTNER_ORDER',
    FUTURE_CLOSE_POSITION: 'FUTURE_CLOSE_POSITION',
    FUTURE_OPEN_POSITION: 'FUTURE_OPEN_POSITION',
    FUTURE_OPEN_SELL: 'FUTURE_OPEN_SELL'
}
