const axios = require('axios')
const Promise = require('bluebird')

const Logger = use('Logger')
const Redis = use('Redis')

const SocialNotificationType = {
    SPIN_TASK: 40,
    SPIN_PRIZE: 41,
    SPIN_REMIND_TASK: 42
}

const SlackUserID = {
    DEV_TRUNGND: '<@U7TRL8XSQ>',
    DEV_NGOCDV: '<@U8ER3TV2S>',
    DEV_HIEPTH: '<@U8G1VN56X>',
    DEV_CHAUMN: '<@U8XRKS493>',
    DEV_KHOADD: '<@U01DGJ0B0A0>',
    ADMIN_LONGLD: '<@U7TQGU4E6>',
    ADMIN_MAIHB: '<@U8KRKKD9V>',
    CEO_DAIGV: '<@U7TMPA4JX>',
    CHANNEL_CURRENT: '<!channel>',
    CHANNEL_SOLUTION: '<!solutions>'
}

exports.SlackUserID = SlackUserID
exports.SocialNotificationType = SocialNotificationType

exports.notify = async function notify (message, options = {
    toSlack: true,
    toSlackContest: false,
    toSlackExchange: false,
    toSlackExchangeError: false,
    toSlackFuture: false,
    toSlackCopyTrade: false,
    toPartner: false,
    toSlackMention: [],
    data: null
}) {
    try {
        const promises = []
        let mentionText = ''
        if (options.toSlackMention && options.toSlackMention.length) {
            // eslint-disable-next-line array-callback-return
            options.toSlackMention.map(mention => {
                mentionText += mention
            })
        }

        const data = options?.data ? options?.data : { text: mentionText + message }

        if (options.toSlackExchange && process.env.EXCHANGE_NOTIFY_SLACK_URL) {
            promises.push(axios.post(process.env.EXCHANGE_NOTIFY_SLACK_URL, data))
        } if (options.toPartner && process.env.PARTNER_NOTIFY_SLACK_URL) {
            promises.push(axios.post(process.env.PARTNER_NOTIFY_SLACK_URL, data))
        } else if (options.toSlackFuture && process.env.SLACK_NAMI_FUTURE_NOTI) {
            promises.push(axios.post(process.env.SLACK_NAMI_FUTURE_NOTI, data))
        } else if (options.toSlackCopyTrade && process.env.SLACK_NAMI_COPY_TRADE_NOTI) {
            promises.push(axios.post(process.env.SLACK_NAMI_COPY_TRADE_NOTI, data))
        } else if (options.toSlackContest && process.env.SLACK_CONTEST_NOTIFICATION_API) {
            promises.push(axios.post(process.env.SLACK_CONTEST_NOTIFICATION_API, data))
        } else if (options.toSlack && process.env.NOTIFY_SLACK_URL) {
            promises.push(axios.post(process.env.NOTIFY_SLACK_URL, data))
        } else if (options.toSlackExchangeError && process.env.EXCHANGE_NOTIFY_SLACK_EXCHANGE_ERROR_URL) {
            promises.push(axios.post(process.env.EXCHANGE_NOTIFY_SLACK_EXCHANGE_ERROR_URL, data))
        }

        await Promise.all(promises)

        Logger.info('SysNoti', message)
    } catch (e) {
        Logger.error('SysNoti error:', e)
    }
}

exports.markTime = async function lastTimeNotify (category, value) {
    if (value != null) {
        return Redis.hset('deposit::transfer_to_root_notify_time', category, value)
    }
    const val = await Redis.hget('deposit::transfer_to_root_notify_time', category)
    if (val == null) return 0
    return +val
}
